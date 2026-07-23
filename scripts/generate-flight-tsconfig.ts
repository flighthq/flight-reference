import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const flightRepo = process.env.FLIGHT_REPO;
if (!flightRepo) {
  process.exit(0);
}

const packageJson = join(flightRepo, 'package.json');
if (!existsSync(packageJson)) {
  console.error(`FLIGHT_REPO=${flightRepo} has no package.json`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(packageJson, 'utf8')) as { name?: string };
if (manifest.name !== 'flight') {
  console.error(`FLIGHT_REPO=${flightRepo} package.json name is "${manifest.name}", expected "flight"`);
  process.exit(1);
}

const packagesDir = join(flightRepo, 'packages');
const paths: Record<string, string[]> = {
  '@ft/render': ['./content/harness/render.ts'],
  '@ft/verify': ['./content/harness/verify.ts'],
};

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const pkgJson = join(packagesDir, dir.name, 'package.json');
  const srcIndex = join(packagesDir, dir.name, 'src', 'index.ts');
  if (!existsSync(pkgJson) || !existsSync(srcIndex)) continue;

  const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as { name?: string };
  if (pkg.name?.startsWith('@flighthq/')) {
    paths[pkg.name] = [srcIndex];
  }
}

const config = {
  extends: './tsconfig.app.json',
  compilerOptions: { paths },
};

writeFileSync('tsconfig.flight.json', JSON.stringify(config, null, 2) + '\n');
