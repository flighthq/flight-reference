import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import pc from 'picocolors';

function capture(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function readPushBase(): string | null {
  if (process.stdin.isTTY) return null;
  let raw: string;
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return null;
  }
  const zero = /^0+$/;
  for (const line of raw.split('\n').filter(Boolean)) {
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || zero.test(localSha)) continue;
    if (!remoteSha || zero.test(remoteSha)) return null;
    return capture(`git rev-parse --verify --quiet ${remoteSha}^{commit}`) ? remoteSha : null;
  }
  return null;
}

function resolveBase(): string | null {
  const upstream = capture('git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}"');
  if (upstream) return upstream;
  for (const ref of ['origin/main', 'main']) {
    if (capture(`git rev-parse --verify --quiet ${ref}`)) return ref;
  }
  return capture('git rev-parse --verify --quiet HEAD~1') ? 'HEAD~1' : null;
}

function run(cmd: string): void {
  console.log(pc.dim(`$ ${cmd}`));
  execSync(cmd, { stdio: 'inherit' });
}

const base = readPushBase() ?? resolveBase();

run('npm run typecheck');

if (!base) {
  console.log(pc.yellow('pre-push: no base commit to diff against — CI will cover the tests.'));
  process.exit(0);
}

const changed = (capture(`git diff --name-only ${base}...HEAD`) ?? '').split('\n').filter(Boolean);
const affectsPackageTests = changed.some((file) => /^packages\/[^/]+\/src\/.+\.(ts|tsx)$/.test(file));

console.log(pc.cyan(`pre-push: ${changed.length} file(s) changed vs ${base}`));

if (affectsPackageTests) {
  run(`npx vitest run --changed ${base}`);
} else {
  console.log(pc.dim('pre-push: no package source changed — skipping vitest'));
}
