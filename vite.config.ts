import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const repoRoot = resolve(__dirname);
const openflContentDir = join(repoRoot, 'content', 'frameworks', 'openfl');
const starlingContentDir = join(repoRoot, 'content', 'frameworks', 'starling');
const awayjsContentDir = join(repoRoot, 'content', 'frameworks', 'awayjs');

function resolveFlightWorkspaceRoot(): string | null {
  const candidate = process.env.FLIGHT_REPO;
  if (!candidate) return null;

  const packageJson = join(candidate, 'package.json');
  if (!existsSync(packageJson)) return null;

  try {
    const manifest = JSON.parse(readFileSync(packageJson, 'utf8')) as { name?: string };
    if (manifest.name === 'flight') return candidate;
  } catch {
    // Ignore malformed manifest.
  }

  return null;
}

function buildFlightPackageAliases(workspaceRoot: string): Record<string, string> {
  const aliases: Record<string, string> = {};
  const packagesDir = join(workspaceRoot, 'packages');
  if (!existsSync(packagesDir)) return aliases;

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const packageJson = join(packagesDir, entry.name, 'package.json');
    const sourceIndex = join(packagesDir, entry.name, 'src', 'index.ts');
    if (!existsSync(packageJson) || !existsSync(sourceIndex)) continue;

    try {
      const manifest = JSON.parse(readFileSync(packageJson, 'utf8')) as { name?: string };
      if (manifest.name?.startsWith('@flighthq/')) {
        aliases[manifest.name] = sourceIndex;
      }
    } catch {
      // Ignore malformed manifests while enumerating the upstream workspace.
    }
  }

  return aliases;
}

function buildFlightHarnessAliases(workspaceRoot: string): Record<string, string> {
  const aliases: Record<string, string> = {};
  const renderPath = join(workspaceRoot, 'tools', 'harness', 'render.ts');
  const verifyPath = join(workspaceRoot, 'tools', 'harness', 'verify.ts');

  if (existsSync(renderPath)) aliases['@ft/render'] = renderPath;
  if (existsSync(verifyPath)) aliases['@ft/verify'] = verifyPath;

  return aliases;
}

const flightWorkspaceRoot = resolveFlightWorkspaceRoot();
const flightPackageAliases = flightWorkspaceRoot ? buildFlightPackageAliases(flightWorkspaceRoot) : {};
const flightHarnessAliases = flightWorkspaceRoot ? buildFlightHarnessAliases(flightWorkspaceRoot) : {};
const flightLocalSource =
  flightWorkspaceRoot !== null &&
  existsSync(join(flightWorkspaceRoot, 'node_modules')) &&
  typeof flightPackageAliases['@flighthq/sdk'] === 'string';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface PreviewRenderer {
  id: string;
  label: string;
  url: string;
}

interface ImplementationSummary {
  id: string;
  mode: 'preview' | 'source';
  path: string;
  fileCount: number;
  previewUrl?: string;
}

interface ReferenceCase {
  id: string;
  framework: string;
  corpus: string;
  name: string;
  title: string;
  summary: string;
  previewRenderers: PreviewRenderer[];
  flightPreviewRenderers?: PreviewRenderer[];
  implementations: ImplementationSummary[];
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function routeSegment(renderer: string): string {
  return renderer.replace(':', '-');
}

function splitFirst(str: string, sep: string): [string, string] {
  const index = str.indexOf(sep);
  if (index === -1) return [str, ''];
  return [str.slice(0, index), str.slice(index + sep.length)];
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(full);
    else if (entry.isFile()) count++;
  }

  return count;
}

function hasImplementationDir(caseDir: string, implementationId: string): boolean {
  const implementationDir = join(caseDir, implementationId);
  return existsSync(implementationDir) && statSync(implementationDir).isDirectory();
}

function fallbackTitle(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function previewHtml(title: string, scriptSrc: string, baseHref: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${baseHref}" />
  <link rel="icon" href="data:," />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #ffffff; }
    body { font-family: sans-serif; }
    #app, #openfl-content { width: 100%; height: 100%; }
    canvas { display: block; }
  </style>
  <script>requestAnimationFrame(function(){requestAnimationFrame(function(){window.dispatchEvent(new Event("resize"))})})</script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${scriptSrc}"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// OpenFL case discovery
// ---------------------------------------------------------------------------

function hasUpstreamOpenflImplementation(caseDir: string): boolean {
  return hasImplementationDir(caseDir, 'openfl') || hasImplementationDir(caseDir, 'openfl-haxe');
}

function readTitle(caseDir: string, fallback: string): string {
  const titlePath = join(caseDir, 'title.txt');
  if (existsSync(titlePath)) return readFileSync(titlePath, 'utf-8').trim();

  const projectXmlPath = join(caseDir, 'openfl-haxe', 'project.xml');
  if (!existsSync(projectXmlPath)) return fallback;

  const match = readFileSync(projectXmlPath, 'utf8').match(/<meta[^>]*title="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function openflPreviewRenderers(caseDir: string): string[] {
  const srcDir = join(caseDir, 'openfl', 'src');
  if (!existsSync(srcDir)) return [];

  const files = readdirSync(srcDir);
  const appRenderers = files
    .map((file) => /^app\.([a-z0-9]+)\.ts$/.exec(file))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1])
    .filter((renderer): renderer is string => typeof renderer === 'string');

  if (appRenderers.length > 0) return appRenderers.sort();
  if (!existsSync(join(srcDir, 'app.ts'))) return [];

  const pkgPath = join(caseDir, 'openfl', 'package.json');
  if (!existsSync(pkgPath)) return ['webgl'];

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { renderers?: string[] };
  return pkg.renderers?.length ? pkg.renderers : ['webgl'];
}

function flightPreviewRenderers(caseDir: string): string[] {
  const srcDir = join(caseDir, 'flight', 'src');
  if (!existsSync(join(srcDir, 'app.ts'))) return [];
  return ['webgl'];
}

function flightPreviewUrl(framework: string, corpus: string, name: string, renderer: string): string {
  if (renderer === 'default') return `${framework}-tests/${corpus}/${name}/flight/`;
  return `${framework}-tests/${corpus}/${name}/flight/${routeSegment(renderer)}/`;
}

function openflImplementationSummaries(
  caseDir: string,
  corpus: string,
  name: string,
  openflPreviewCount: number,
  flightRenderer: string | null,
): ImplementationSummary[] {
  const results: ImplementationSummary[] = [];
  const hasOpenflTs = hasImplementationDir(caseDir, 'openfl');

  for (const implementationId of ['openfl', 'openfl-haxe', 'flight']) {
    if (implementationId === 'openfl-haxe' && hasOpenflTs) continue;
    if (!hasImplementationDir(caseDir, implementationId)) continue;

    const previewUrl =
      implementationId === 'flight' && flightRenderer !== null
        ? flightPreviewUrl('openfl', corpus, name, flightRenderer)
        : undefined;

    results.push({
      id: implementationId,
      mode:
        (implementationId === 'openfl' && openflPreviewCount > 0) ||
        (implementationId === 'flight' && flightRenderer !== null)
          ? 'preview'
          : 'source',
      path: join(caseDir, implementationId).replace(repoRoot + '/', ''),
      fileCount: countFiles(join(caseDir, implementationId)),
      ...(previewUrl ? { previewUrl } : {}),
    });
  }

  return results;
}

const excludedSamples = new Set(['custompreloader', 'gamepadinput', 'usingswfassets', 'writingcustomshaders']);

function discoverOpenflCases(): ReferenceCase[] {
  if (!existsSync(openflContentDir)) return [];

  const cases: ReferenceCase[] = [];
  const corpora = readdirSync(openflContentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'harness')
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const corpusEntry of corpora) {
    const corpus = corpusEntry.name;
    const corpusDir = join(openflContentDir, corpus);
    const caseEntries = readdirSync(corpusDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const caseEntry of caseEntries) {
      const name = caseEntry.name;
      const caseDir = join(corpusDir, name);
      if (excludedSamples.has(name)) continue;
      if (!hasUpstreamOpenflImplementation(caseDir)) continue;

      const previewRenderers = openflPreviewRenderers(caseDir).map((renderer) => ({
        id: renderer,
        label: renderer,
        url: `openfl-tests/${corpus}/${name}/${routeSegment(renderer)}/`,
      }));
      const enabledFlightPreviewRenderers = flightPreviewRenderers(caseDir).map((renderer) => ({
        id: renderer,
        label: renderer,
        url: flightPreviewUrl('openfl', corpus, name, renderer),
      }));
      const title = readTitle(caseDir, fallbackTitle(name));

      cases.push({
        id: `openfl/${corpus}/${name}`,
        framework: 'openfl',
        corpus,
        name,
        title,
        summary:
          previewRenderers.length > 0
            ? `${title} imported from the OpenFL ${corpus} corpus.`
            : `${title} imported as source-only OpenFL material.`,
        previewRenderers,
        ...(enabledFlightPreviewRenderers.length > 0 ? { flightPreviewRenderers: enabledFlightPreviewRenderers } : {}),
        implementations: openflImplementationSummaries(
          caseDir,
          corpus,
          name,
          previewRenderers.length,
          enabledFlightPreviewRenderers[0]?.id ?? null,
        ),
      });
    }
  }

  return cases;
}

// ---------------------------------------------------------------------------
// Starling case discovery
// ---------------------------------------------------------------------------

function discoverStarlingCases(): ReferenceCase[] {
  if (!existsSync(starlingContentDir)) return [];

  const cases: ReferenceCase[] = [];
  const corpora = readdirSync(starlingContentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const corpusEntry of corpora) {
    const corpus = corpusEntry.name;
    const corpusDir = join(starlingContentDir, corpus);
    const caseEntries = readdirSync(corpusDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const caseEntry of caseEntries) {
      const name = caseEntry.name;
      const caseDir = join(corpusDir, name);
      if (!hasImplementationDir(caseDir, 'starling')) continue;

      const srcDir = join(caseDir, 'starling', 'src');
      if (!existsSync(join(srcDir, 'app.ts'))) continue;

      const previewRenderers: PreviewRenderer[] = [
        {
          id: 'webgl',
          label: 'webgl',
          url: `starling-tests/${corpus}/${name}/webgl/`,
        },
      ];

      const enabledFlightPreviewRenderers = flightPreviewRenderers(caseDir).map((renderer) => ({
        id: renderer,
        label: renderer,
        url: flightPreviewUrl('starling', corpus, name, renderer),
      }));

      const titlePath = join(caseDir, 'title.txt');
      const title = existsSync(titlePath) ? readFileSync(titlePath, 'utf-8').trim() : fallbackTitle(name);

      cases.push({
        id: `starling/${corpus}/${name}`,
        framework: 'starling',
        corpus,
        name,
        title,
        summary: `${title} from the Starling ${corpus}.`,
        previewRenderers,
        ...(enabledFlightPreviewRenderers.length > 0 ? { flightPreviewRenderers: enabledFlightPreviewRenderers } : {}),
        implementations: [
          {
            id: 'starling',
            mode: 'preview',
            path: join(caseDir, 'starling').replace(repoRoot + '/', ''),
            fileCount: countFiles(join(caseDir, 'starling')),
          },
          ...(enabledFlightPreviewRenderers.length > 0
            ? [
                {
                  id: 'flight' as const,
                  mode: 'preview' as const,
                  path: join(caseDir, 'flight').replace(repoRoot + '/', ''),
                  fileCount: countFiles(join(caseDir, 'flight')),
                  previewUrl: enabledFlightPreviewRenderers[0]!.url,
                },
              ]
            : []),
        ],
      });
    }
  }

  return cases;
}

// ---------------------------------------------------------------------------
// AwayJS case discovery
// ---------------------------------------------------------------------------

function discoverAwayjsCases(): ReferenceCase[] {
  if (!existsSync(awayjsContentDir)) return [];

  const cases: ReferenceCase[] = [];
  const corpora = readdirSync(awayjsContentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const corpusEntry of corpora) {
    const corpus = corpusEntry.name;
    const corpusDir = join(awayjsContentDir, corpus);
    const caseEntries = readdirSync(corpusDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const caseEntry of caseEntries) {
      const name = caseEntry.name;
      const caseDir = join(corpusDir, name);
      if (!hasImplementationDir(caseDir, 'awayjs')) continue;

      const srcDir = join(caseDir, 'awayjs', 'src');
      if (!existsSync(join(srcDir, 'app.ts'))) continue;

      const previewRenderers: PreviewRenderer[] = [
        {
          id: 'webgl',
          label: 'webgl',
          url: `awayjs-tests/${corpus}/${name}/webgl/`,
        },
      ];

      const enabledFlightPreviewRenderers = flightPreviewRenderers(caseDir).map((renderer) => ({
        id: renderer,
        label: renderer,
        url: flightPreviewUrl('awayjs', corpus, name, renderer),
      }));

      const titlePath = join(caseDir, 'title.txt');
      const title = existsSync(titlePath) ? readFileSync(titlePath, 'utf-8').trim() : fallbackTitle(name);

      cases.push({
        id: `awayjs/${corpus}/${name}`,
        framework: 'awayjs',
        corpus,
        name,
        title,
        summary: `${title} from the AwayJS ${corpus}.`,
        previewRenderers,
        ...(enabledFlightPreviewRenderers.length > 0 ? { flightPreviewRenderers: enabledFlightPreviewRenderers } : {}),
        implementations: [
          {
            id: 'awayjs',
            mode: 'preview',
            path: join(caseDir, 'awayjs').replace(repoRoot + '/', ''),
            fileCount: countFiles(join(caseDir, 'awayjs')),
          },
          ...(enabledFlightPreviewRenderers.length > 0
            ? [
                {
                  id: 'flight' as const,
                  mode: 'preview' as const,
                  path: join(caseDir, 'flight').replace(repoRoot + '/', ''),
                  fileCount: countFiles(join(caseDir, 'flight')),
                  previewUrl: enabledFlightPreviewRenderers[0]!.url,
                },
              ]
            : []),
        ],
      });
    }
  }

  return cases;
}

// ---------------------------------------------------------------------------
// Combined discovery
// ---------------------------------------------------------------------------

function discoverAllCases(): ReferenceCase[] {
  return [...discoverOpenflCases(), ...discoverStarlingCases(), ...discoverAwayjsCases()];
}

// ---------------------------------------------------------------------------
// Entry-point resolution
// ---------------------------------------------------------------------------

function openflPreviewEntrySource(corpus: string, name: string, renderer: string): string | null {
  const srcDir = join(openflContentDir, corpus, name, 'openfl', 'src');
  if (!existsSync(srcDir)) return null;

  const rendererApp = join(srcDir, `app.${renderer}.ts`);
  if (existsSync(rendererApp)) return rendererApp;

  const app = join(srcDir, 'app.ts');
  if (existsSync(app)) return app;

  return null;
}

function flightPreviewSource(framework: string, corpus: string, name: string): string | null {
  const referenceDir =
    framework === 'starling' ? starlingContentDir : framework === 'awayjs' ? awayjsContentDir : openflContentDir;
  const app = join(referenceDir, corpus, name, 'flight', 'src', 'app.ts');
  return existsSync(app) ? app : null;
}

function awayjsPreviewEntrySource(corpus: string, name: string): string | null {
  const app = join(awayjsContentDir, corpus, name, 'awayjs', 'src', 'app.ts');
  return existsSync(app) ? app : null;
}

function starlingPreviewEntrySource(corpus: string, name: string): string | null {
  const app = join(starlingContentDir, corpus, name, 'starling', 'src', 'app.ts');
  return existsSync(app) ? app : null;
}

// ---------------------------------------------------------------------------
// Vite plugin
// ---------------------------------------------------------------------------

function referencePlugin(): Plugin[] {
  let viteBase = '/';

  return [
    {
      name: 'reference:modules',
      enforce: 'pre',

      config(_, env) {
        if (env.command !== 'build') return;

        const input: Record<string, string> = { main: resolve(__dirname, 'index.html') };
        for (const referenceCase of discoverAllCases()) {
          const routePrefix = `${referenceCase.framework}-tests`;

          for (const renderer of referenceCase.previewRenderers) {
            const virtualPrefix =
              referenceCase.framework === 'awayjs'
                ? 'virtual:awayjs-preview'
                : referenceCase.framework === 'starling'
                  ? 'virtual:starling-preview'
                  : 'virtual:openfl-preview';
            input[`${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/${routeSegment(renderer.id)}/index`] =
              `${virtualPrefix}:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
          }
          for (const renderer of referenceCase.flightPreviewRenderers ?? []) {
            input[
              renderer.id === 'default'
                ? `${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/flight/index`
                : `${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/flight/${routeSegment(renderer.id)}/index`
            ] =
              `virtual:flight-preview:${referenceCase.framework}:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
          }
        }

        return {
          build: {
            rollupOptions: {
              input,
              output: {
                entryFileNames(chunk) {
                  const id = chunk.facadeModuleId;
                  if (id?.startsWith('\0virtual:flight-preview:')) {
                    const rest = id.slice('\0virtual:flight-preview:'.length);
                    const [framework, r1] = splitFirst(rest, ':');
                    const [corpus, r2] = splitFirst(r1, ':');
                    const [name, renderer] = splitFirst(r2, ':');
                    return renderer === 'default'
                      ? `${framework}-tests/${corpus}/${name}/flight/index.js`
                      : `${framework}-tests/${corpus}/${name}/flight/${routeSegment(renderer)}/index.js`;
                  }
                  if (id?.startsWith('\0virtual:awayjs-preview:')) {
                    const [corpus, rest] = splitFirst(id.slice('\0virtual:awayjs-preview:'.length), ':');
                    const [name, renderer] = splitFirst(rest, ':');
                    return `awayjs-tests/${corpus}/${name}/${routeSegment(renderer)}/index.js`;
                  }
                  if (id?.startsWith('\0virtual:starling-preview:')) {
                    const [corpus, rest] = splitFirst(id.slice('\0virtual:starling-preview:'.length), ':');
                    const [name, renderer] = splitFirst(rest, ':');
                    return `starling-tests/${corpus}/${name}/${routeSegment(renderer)}/index.js`;
                  }
                  if (id?.startsWith('\0virtual:openfl-preview:')) {
                    const [corpus, rest] = splitFirst(id.slice('\0virtual:openfl-preview:'.length), ':');
                    const [name, renderer] = splitFirst(rest, ':');
                    return `openfl-tests/${corpus}/${name}/${routeSegment(renderer)}/index.js`;
                  }
                  return 'assets/[name]-[hash].js';
                },
              },
            },
          },
        };
      },

      configResolved(config) {
        viteBase = config.base;
      },

      resolveId(source) {
        if (source === 'virtual:reference-cases') return '\0virtual:reference-cases';
        if (source.startsWith('virtual:flight-preview:')) return '\0' + source;
        if (source.startsWith('virtual:openfl-preview:')) return '\0' + source;
        if (source.startsWith('virtual:starling-preview:')) return '\0' + source;
        if (source.startsWith('virtual:awayjs-preview:')) return '\0' + source;
      },

      load(id) {
        if (id === '\0virtual:reference-cases') {
          return `export const cases = ${JSON.stringify(discoverAllCases())};`;
        }

        if (id.startsWith('\0virtual:openfl-preview:')) {
          const [corpus, rest] = splitFirst(id.slice('\0virtual:openfl-preview:'.length), ':');
          const [name, renderer] = splitFirst(rest, ':');
          const source = openflPreviewEntrySource(corpus, name, renderer);
          if (!source) return null;
          return `await import(${JSON.stringify(source)});`;
        }

        if (id.startsWith('\0virtual:starling-preview:')) {
          const [corpus, rest] = splitFirst(id.slice('\0virtual:starling-preview:'.length), ':');
          const [name] = splitFirst(rest, ':');
          const source = starlingPreviewEntrySource(corpus, name);
          if (!source) return null;
          return `await import(${JSON.stringify(source)});`;
        }

        if (id.startsWith('\0virtual:awayjs-preview:')) {
          const [corpus, rest] = splitFirst(id.slice('\0virtual:awayjs-preview:'.length), ':');
          const [name] = splitFirst(rest, ':');
          const source = awayjsPreviewEntrySource(corpus, name);
          if (!source) return null;
          return `await import(${JSON.stringify(source)});`;
        }

        if (id.startsWith('\0virtual:flight-preview:')) {
          const rest = id.slice('\0virtual:flight-preview:'.length);
          const [framework, r1] = splitFirst(rest, ':');
          const [corpus, r2] = splitFirst(r1, ':');
          const [name, renderer] = splitFirst(r2, ':');
          const source = flightPreviewSource(framework, corpus, name);
          if (!source) return null;
          return renderer
            ? `await import(${JSON.stringify(`${source}?flight-renderer=${renderer}`)});`
            : `await import(${JSON.stringify(source)});`;
        }
      },

      transform(code, id) {
        const [filePath, query] = splitFirst(id, '?');
        if (!query || !filePath.endsWith('/flight/src/app.ts')) return null;

        const params = new URLSearchParams(query);
        const renderer = params.get('flight-renderer');
        if (!renderer || renderer === 'default') return null;

        return code.replace(/from\s+(['"])\\.\/render\1/g, `from './render.${renderer}'`);
      },

      generateBundle(_, bundle) {
        for (const referenceCase of discoverAllCases()) {
          const routePrefix = `${referenceCase.framework}-tests`;

          for (const renderer of referenceCase.previewRenderers) {
            const virtualPrefix =
              referenceCase.framework === 'awayjs'
                ? '\0virtual:awayjs-preview'
                : referenceCase.framework === 'starling'
                  ? '\0virtual:starling-preview'
                  : '\0virtual:openfl-preview';
            const entryId = `${virtualPrefix}:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
            const chunk = Object.values(bundle).find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (candidate) => candidate.type === 'chunk' && (candidate as any).facadeModuleId === entryId,
            ) as { fileName: string } | undefined;
            if (!chunk) continue;

            this.emitFile({
              type: 'asset',
              fileName: `${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/${routeSegment(renderer.id)}/index.html`,
              source: previewHtml(
                `${referenceCase.title} · ${renderer.label}`,
                `${viteBase}${chunk.fileName}`,
                viteBase,
              ),
            });
          }

          for (const renderer of referenceCase.flightPreviewRenderers ?? []) {
            const entryId = `\0virtual:flight-preview:${referenceCase.framework}:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
            const chunk = Object.values(bundle).find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (candidate) => candidate.type === 'chunk' && (candidate as any).facadeModuleId === entryId,
            ) as { fileName: string } | undefined;
            if (!chunk) continue;

            this.emitFile({
              type: 'asset',
              fileName:
                renderer.id === 'default'
                  ? `${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/flight/index.html`
                  : `${routePrefix}/${referenceCase.corpus}/${referenceCase.name}/flight/${routeSegment(renderer.id)}/index.html`,
              source: previewHtml(
                `${referenceCase.title} · Flight ${renderer.label}`,
                `${viteBase}${chunk.fileName}`,
                viteBase,
              ),
            });
          }
        }
      },
    },

    {
      name: 'reference:routes',

      configureServer(server) {
        server.watcher.add(openflContentDir);
        if (existsSync(starlingContentDir)) server.watcher.add(starlingContentDir);
        if (existsSync(awayjsContentDir)) server.watcher.add(awayjsContentDir);

        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url ?? '/').split('?')[0] ?? '/';
          const parts = urlPath.split('/').filter(Boolean);

          const prefix = parts[0] ?? '';
          if (prefix !== 'openfl-tests' && prefix !== 'starling-tests' && prefix !== 'awayjs-tests') return next();

          const framework = prefix === 'starling-tests' ? 'starling' : prefix === 'awayjs-tests' ? 'awayjs' : 'openfl';

          let corpus = '';
          let name = '';
          let rendererSegment = '';
          let flightRendererSegment = '';

          if (parts.length === 4) {
            corpus = parts[1] ?? '';
            name = parts[2] ?? '';
            rendererSegment = parts[3] ?? '';
          } else if (parts.length === 5 && parts[3] === 'flight') {
            corpus = parts[1] ?? '';
            name = parts[2] ?? '';
            rendererSegment = parts[3] ?? '';
            flightRendererSegment = parts[4] ?? '';
          } else {
            return next();
          }

          const referenceCase = discoverAllCases().find(
            (candidate) => candidate.framework === framework && candidate.corpus === corpus && candidate.name === name,
          );
          if (!referenceCase) return next();

          if (rendererSegment === 'flight') {
            const renderer =
              referenceCase.flightPreviewRenderers?.find((candidate) =>
                flightRendererSegment
                  ? routeSegment(candidate.id) === flightRendererSegment
                  : candidate.id === 'default',
              ) ?? referenceCase.flightPreviewRenderers?.[0];
            if (!renderer) return next();

            const virtualPrefix = `virtual:flight-preview:${framework}`;
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${viteBase}" />
  <link rel="icon" href="data:," />
  <title>${referenceCase.title} · Flight</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #ffffff; }
    body { font-family: sans-serif; }
    #app, #openfl-content { width: 100%; height: 100%; }
    canvas { display: block; }
  </style>
  <script>requestAnimationFrame(function(){requestAnimationFrame(function(){window.dispatchEvent(new Event("resize"))})})</script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${viteBase}@vite/client"></script>
  <script type="module" src="${viteBase}@id/__x00__${virtualPrefix}:${corpus}:${name}:${renderer.id}"></script>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(html);
            return;
          }

          const renderer = referenceCase.previewRenderers.find(
            (candidate) => routeSegment(candidate.id) === rendererSegment,
          );
          if (!renderer) return next();

          const virtualPrefix =
            framework === 'awayjs'
              ? 'virtual:awayjs-preview'
              : framework === 'starling'
                ? 'virtual:starling-preview'
                : 'virtual:openfl-preview';
          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${viteBase}" />
  <link rel="icon" href="data:," />
  <title>${referenceCase.title} · ${renderer.label}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #ffffff; }
    body { font-family: sans-serif; }
    #app, #openfl-content { width: 100%; height: 100%; }
    canvas { display: block; }
  </style>
  <script>requestAnimationFrame(function(){requestAnimationFrame(function(){window.dispatchEvent(new Event("resize"))})})</script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${viteBase}@vite/client"></script>
  <script type="module" src="${viteBase}@id/__x00__${virtualPrefix}:${corpus}:${name}:${renderer.id}"></script>
</body>
</html>`;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(html);
        });
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Vite config
// ---------------------------------------------------------------------------

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), ...referencePlugin()],
  publicDir: resolve(repoRoot, 'content/assets/public/openfl'),
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      define: {
        global: 'globalThis',
        $_: 'globalThis.$_',
      },
    },
    exclude: flightLocalSource ? ['@flighthq/sdk'] : [],
  },
  resolve: {
    alias: {
      '@ft/render': join(repoRoot, 'content', 'harness', 'render.ts'),
      '@ft/verify': join(repoRoot, 'content', 'harness', 'verify.ts'),
      ...(flightLocalSource ? { ...flightPackageAliases, ...flightHarnessAliases } : {}),
      'motion/Actuate': resolve(repoRoot, 'content/frameworks/openfl/compat/Actuate.ts'),
      'motion/easing/Elastic': resolve(repoRoot, 'content/frameworks/openfl/compat/Elastic.ts'),
      'motion/easing/Quad': resolve(repoRoot, 'content/frameworks/openfl/compat/Quad.ts'),
      openfl: resolve(repoRoot, 'node_modules/openfl/lib/openfl'),
      starling: resolve(repoRoot, 'node_modules/starling-framework/lib/starling'),
      'stats.js': resolve(repoRoot, 'node_modules/stats-js/src/Stats.js'),
    },
  },
  server: {
    fs: {
      allow: flightWorkspaceRoot ? [repoRoot, flightWorkspaceRoot] : [repoRoot],
    },
  },
});
