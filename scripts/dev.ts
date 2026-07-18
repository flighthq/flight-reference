import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));

const caseName = positional[0];
if (!caseName) {
  console.error('Usage: npm run dev -- <case> [--openfl|--starling|--awayjs]');
  console.error('       Defaults to the flight implementation when available.');
  process.exit(1);
}

const impl = flags.find((f) => ['--openfl', '--starling', '--awayjs'].includes(f))?.slice(2);

const viteBin = resolve(import.meta.dirname, '..', 'node_modules', '.bin', 'vite');
const child = spawn(viteBin, [], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CASE: caseName,
    ...(impl ? { IMPL: impl } : {}),
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
