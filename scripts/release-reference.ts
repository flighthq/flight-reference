import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    version: { type: 'string' },
    base: { type: 'string', default: '/' },
    release: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`Usage: tsx scripts/release-reference.ts [options]

Build and package the reference harness for release.

Options:
  --version VERSION   Version tag (default: read from tools/reference/package.json)
  --base PATH         Base URL path, e.g. /reference/ (default: /)
  --release           Create a GitHub release with the tarball
  -h, --help          Show this help

Examples:
  tsx scripts/release-reference.ts                                    # build with defaults
  tsx scripts/release-reference.ts --base /reference/                 # build for /reference/ subpath
  tsx scripts/release-reference.ts --base /reference/ --release       # build + create GitHub release
  tsx scripts/release-reference.ts --version 0.2.0 --base / --release # explicit version`);
  process.exit(0);
}

const repoRoot = resolve(import.meta.dirname!, '..');

let version = values.version;
if (!version) {
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
    version?: string;
  };
  version = manifest.version;
  if (!version) {
    console.error('error: could not read version from package.json');
    process.exit(1);
  }
}

const base = values.base!;
const tarball = `reference-dist-${version}.tgz`;

function run(command: string, env?: Record<string, string>): void {
  execSync(command, { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log(`Building reference harness v${version} (base: ${base})`);
run('npm run build', { VITE_BASE: base });

console.log(`Packaging ${tarball}`);
run(`tar -czf ${tarball} -C dist/ .`);
const size = (statSync(resolve(repoRoot, tarball)).size / 1024).toFixed(0);
console.log(`Created ${tarball} (${size}K)`);

if (values.release) {
  console.log(`Creating GitHub release ${version}`);
  run(`gh release create ${version} ${tarball} -t ${version} --notes ""`);
  console.log(`Released ${version}`);
}
