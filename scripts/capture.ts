import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

import type { BrowserContext } from '@playwright/test';

const toolCapture = '.cache/flight-latest/packages/tool-capture/src';
const { launchBrowser } = await import(`../${toolCapture}/captureBrowser.ts`);
const { getBaselineField, setBaselineField } = await import(`../${toolCapture}/baselineStore.ts`);
const { installAbortHandler, isBrowserClosedError } = await import(`../${toolCapture}/captureInterrupt.ts`);
const { formatStatusLine, formatSummaryLine, formatSummaryCount } = await import(`../${toolCapture}/captureFormat.ts`);

const repoRoot = resolve(import.meta.dirname!, '..');
const contentDir = join(repoRoot, 'content', 'frameworks');

interface CaptureTarget {
  caseId: string;
  implementation: string;
  renderer: string;
  url: string;
}

function discoverTargets(): CaptureTarget[] {
  const targets: CaptureTarget[] = [];

  for (const framework of ['openfl', 'starling']) {
    const frameworkDir = join(contentDir, framework);
    if (!existsSync(frameworkDir)) continue;

    for (const corpus of readdirSync(frameworkDir, { withFileTypes: true })) {
      if (!corpus.isDirectory()) continue;
      const corpusDir = join(frameworkDir, corpus.name);

      for (const caseEntry of readdirSync(corpusDir, { withFileTypes: true })) {
        if (!caseEntry.isDirectory() || caseEntry.name === '_shared') continue;
        const caseDir = join(corpusDir, caseEntry.name);
        const caseId = `${framework}/${corpus.name}/${caseEntry.name}`;
        const routePrefix = `${framework}-tests`;

        const flightApp = join(caseDir, 'flight', 'src', 'app.ts');
        if (existsSync(flightApp)) {
          targets.push({
            caseId,
            implementation: 'flight',
            renderer: 'webgl',
            url: `${routePrefix}/${corpus.name}/${caseEntry.name}/flight/webgl/`,
          });
        }

        if (framework === 'starling') {
          const starlingApp = join(caseDir, 'starling', 'src', 'app.ts');
          if (existsSync(starlingApp)) {
            targets.push({
              caseId,
              implementation: 'starling',
              renderer: 'webgl',
              url: `${routePrefix}/${corpus.name}/${caseEntry.name}/webgl/`,
            });
          }
        }

        if (framework === 'openfl') {
          const openflSrc = join(caseDir, 'openfl', 'src');
          if (existsSync(openflSrc)) {
            const renderers = readdirSync(openflSrc)
              .map((f) => /^app\.([a-z0-9]+)\.ts$/.exec(f)?.[1])
              .filter((r): r is string => r !== undefined);
            if (renderers.length === 0 && existsSync(join(openflSrc, 'app.ts'))) {
              renderers.push('webgl');
            }
            for (const renderer of renderers) {
              targets.push({
                caseId,
                implementation: 'openfl',
                renderer,
                url: `${routePrefix}/${corpus.name}/${caseEntry.name}/${renderer}/`,
              });
            }
          }
        }
      }
    }
  }

  return targets.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.implementation.localeCompare(b.implementation));
}

function startDevServer(): Promise<{ url: string; kill: () => void }> {
  return new Promise((resolveUrl, reject) => {
    const child = spawn('npx', ['vite', '--host', '0.0.0.0'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Vite dev server did not start within 30s'));
      }
    }, 30_000);

    const ansiPattern = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
    const onData = (data: Buffer) => {
      const text = data.toString().replace(ansiPattern, '');
      const match = /Local:\s+(https?:\/\/\S+)/.exec(text);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolveUrl({
          url: match[1]!.replace(/\/$/, ''),
          kill: () => child.kill('SIGTERM'),
        });
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

interface CaptureStatus {
  state: 'ready' | 'error';
  capturedAt: number;
  error: string | null;
  hash: string | null;
  baselineHash: string | null;
  changed: boolean | null;
}

async function captureTarget(
  context: BrowserContext,
  target: CaptureTarget,
  baseUrl: string,
  opts: {
    outBase: string;
    updateBaseline: boolean;
    captureFrames: number;
    failOnError: boolean;
    isAborted: () => boolean;
    extraWait: number;
  },
): Promise<'ok' | 'changed' | 'error'> {
  const baselineName = `${target.caseId}/${target.implementation}`;
  const outDir = join(opts.outBase, target.caseId, target.implementation, target.renderer);
  mkdirSync(outDir, { recursive: true });

  const finalScreenshot = join(outDir, 'screenshot.png');
  const tmpScreenshot = join(outDir, 'screenshot.tmp.png');
  const finalLogs = join(outDir, 'logs.jsonl');
  const tmpLogs = join(outDir, 'logs.tmp.jsonl');
  const statusPath = join(outDir, 'status.json');

  const logs: unknown[] = [];
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed !== null && typeof parsed === 'object' && '__flight' in parsed) {
        logs.push(parsed);
        return;
      }
    } catch {
      /* not structured */
    }
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      logs.push({
        __flight: true,
        t: -1,
        level: type === 'error' ? 'error' : 'warn',
        channel: 'console',
        data: { msg: text },
      });
    }
  });
  page.on('pageerror', (err) => {
    logs.push({ __flight: true, t: -1, level: 'pageerror', data: { msg: err.message } });
  });
  page.on('requestfailed', (req) => {
    logs.push({
      __flight: true,
      t: -1,
      level: 'error',
      channel: 'network',
      data: { msg: `request failed: ${req.url()} (${req.failure()?.errorText ?? 'unknown'})` },
    });
  });

  const label = `${target.caseId}/${target.implementation}`;
  const labelWidth = Math.max(6, label.length);

  try {
    const url = `${baseUrl}/${target.url}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForSelector('canvas', { timeout: 8_000 }).catch(() => {});

    if (opts.captureFrames > 0) {
      await page
        .waitForFunction(
          () => (window as unknown as { __captureFramesReached?: boolean }).__captureFramesReached === true,
          null,
          { timeout: 15_000 },
        )
        .catch(() => {});
    } else {
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
      );
    }

    if (opts.extraWait > 0) await page.waitForTimeout(opts.extraWait);

    const screenshotBuffer = await page
      .locator('canvas')
      .first()
      .screenshot()
      .catch(() => page.screenshot());

    const hash = createHash('sha256').update(screenshotBuffer).digest('hex');

    writeFileSync(tmpScreenshot, screenshotBuffer);
    writeFileSync(tmpLogs, logs.map((l) => JSON.stringify(l)).join('\n'));
    renameSync(tmpScreenshot, finalScreenshot);
    renameSync(tmpLogs, finalLogs);

    let baselineHash: string | null = null;
    let changed: boolean | null = null;

    if (opts.updateBaseline) {
      setBaselineField(repoRoot, 'content', baselineName, target.renderer, 'sha256', hash);
      baselineHash = hash;
      changed = false;
    } else {
      baselineHash = getBaselineField(repoRoot, 'content', baselineName, target.renderer, 'sha256');
      if (baselineHash !== null) changed = hash !== baselineHash;
    }

    if (changed === true) {
      console.log(formatStatusLine('fail', label, labelWidth, 'changed (hash differs from baseline)'));
    } else {
      console.log(formatStatusLine('pass', label, labelWidth, ''));
    }

    const status: CaptureStatus = { state: 'ready', capturedAt: Date.now(), error: null, hash, baselineHash, changed };
    writeFileSync(statusPath, JSON.stringify(status, null, 2));

    if (opts.failOnError) {
      await page.waitForTimeout(120);
      const errorLog = logs.find((l) => {
        const level = (l as { level?: string }).level;
        return level === 'pageerror' || level === 'error';
      });
      if (errorLog) {
        const detailMsg = (errorLog as { data?: { msg?: string } }).data?.msg ?? 'error logged';
        console.error(formatStatusLine('fail', label, labelWidth, detailMsg));
        return 'error';
      }
    }

    return changed === true ? 'changed' : 'ok';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.isAborted() || isBrowserClosedError(err)) return 'error';

    logs.push({ __flight: true, t: -1, level: 'capture-error', data: { msg: message } });
    writeFileSync(finalLogs, logs.map((l) => JSON.stringify(l)).join('\n'));
    writeFileSync(
      statusPath,
      JSON.stringify(
        { state: 'error', capturedAt: Date.now(), error: message, hash: null, baselineHash: null, changed: null },
        null,
        2,
      ),
    );
    console.error(formatStatusLine('fail', label, labelWidth, message));
    return 'error';
  } finally {
    await page.close().catch(() => {});
  }
}

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const failOnError = args.includes('--fail-on-error');
const captureFrames = (() => {
  const idx = args.indexOf('--frames');
  return idx >= 0 ? parseInt(args[idx + 1] ?? '1', 10) : 1;
})();
const extraWait = (() => {
  const idx = args.indexOf('--wait');
  return idx >= 0 ? parseInt(args[idx + 1] ?? '0', 10) : 0;
})();
const filterArg = (() => {
  const idx = args.indexOf('--filter');
  return idx >= 0 ? (args[idx + 1] ?? '') : '';
})();
const implFilter = (() => {
  const idx = args.indexOf('--impl');
  return idx >= 0 ? (args[idx + 1] ?? '') : '';
})();
const externalUrl = (() => {
  const idx = args.indexOf('--url');
  return idx >= 0 ? (args[idx + 1] ?? '') : '';
})();

const outBase = join(repoRoot, '.capture-output');
const isAborted = installAbortHandler();

let allTargets = discoverTargets();
if (filterArg) {
  allTargets = allTargets.filter((t) => t.caseId.includes(filterArg));
}
if (implFilter) {
  allTargets = allTargets.filter((t) => t.implementation === implFilter);
}

if (allTargets.length === 0) {
  console.log('No capture targets found.');
  process.exit(0);
}

console.log(`Capturing ${allTargets.length} target(s)…\n`);

let server: { url: string; kill: () => void } | null = null;
let baseUrl: string;

if (externalUrl) {
  baseUrl = externalUrl.replace(/\/$/, '');
} else {
  console.log('Starting Vite dev server…');
  server = await startDevServer();
  baseUrl = server.url;
  console.log(`Server ready at ${baseUrl}\n`);
}

const { browser, context } = await launchBrowser({ captureFrames, verify: false });

let captured = 0;
let changed = 0;
let failed = 0;

try {
  for (let i = 0; i < allTargets.length; i++) {
    if (isAborted()) break;
    const target = allTargets[i]!;

    const result = await captureTarget(context, target, baseUrl, {
      outBase,
      updateBaseline,
      captureFrames,
      failOnError,
      isAborted,
      extraWait,
    });

    if (result === 'ok') captured++;
    else if (result === 'changed') changed++;
    else failed++;
  }
} finally {
  await browser.close().catch(() => {});
  server?.kill();
}

console.log('');
console.log(
  formatSummaryLine(failed > 0, [
    formatSummaryCount(captured, 'captured', 'pass'),
    formatSummaryCount(changed, 'changed', 'warn'),
    formatSummaryCount(failed, 'failed', 'fail'),
  ]),
);

process.exit(failed > 0 ? 1 : 0);
