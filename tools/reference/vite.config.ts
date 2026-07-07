import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const repoRoot = resolve(__dirname, '../..');
const openflReferenceDir = join(repoRoot, 'reference', 'frameworks', 'openfl');

interface OpenflPreviewRenderer {
  id: string;
  label: string;
  url: string;
}

interface ImplementationSummary {
  id: string;
  mode: 'preview' | 'source';
  path: string;
  fileCount: number;
}

interface OpenflReferenceCase {
  id: string;
  framework: 'openfl';
  corpus: string;
  name: string;
  title: string;
  summary: string;
  previewRenderers: OpenflPreviewRenderer[];
  implementations: ImplementationSummary[];
}

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

function readTitle(caseDir: string, fallback: string): string {
  const projectXmlPath = join(caseDir, 'openfl-haxe', 'project.xml');
  if (!existsSync(projectXmlPath)) return fallback;

  const match = readFileSync(projectXmlPath, 'utf8').match(/<meta[^>]*title="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function fallbackTitle(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
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

function implementationSummaries(caseDir: string): ImplementationSummary[] {
  const previewCount = openflPreviewRenderers(caseDir).length;
  const results: ImplementationSummary[] = [];

  for (const implementationId of ['openfl', 'openfl-haxe', 'flight']) {
    const implementationDir = join(caseDir, implementationId);
    if (!existsSync(implementationDir) || !statSync(implementationDir).isDirectory()) continue;

    results.push({
      id: implementationId,
      mode: implementationId === 'openfl' && previewCount > 0 ? 'preview' : 'source',
      path: implementationDir.replace(repoRoot + '/', ''),
      fileCount: countFiles(implementationDir),
    });
  }

  return results;
}

function discoverCases(): OpenflReferenceCase[] {
  if (!existsSync(openflReferenceDir)) return [];

  const cases: OpenflReferenceCase[] = [];
  const corpora = readdirSync(openflReferenceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'harness')
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const corpusEntry of corpora) {
    const corpus = corpusEntry.name;
    const corpusDir = join(openflReferenceDir, corpus);
    const caseEntries = readdirSync(corpusDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const caseEntry of caseEntries) {
      const name = caseEntry.name;
      const caseDir = join(corpusDir, name);
      const previewRenderers = openflPreviewRenderers(caseDir).map((renderer) => ({
        id: renderer,
        label: renderer,
        url: `/openfl-tests/${corpus}/${name}/${routeSegment(renderer)}/`,
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
        implementations: implementationSummaries(caseDir),
      });
    }
  }

  return cases;
}

function previewEntrySource(corpus: string, name: string, renderer: string): string | null {
  const srcDir = join(openflReferenceDir, corpus, name, 'openfl', 'src');
  if (!existsSync(srcDir)) return null;

  const rendererApp = join(srcDir, `app.${renderer}.ts`);
  if (existsSync(rendererApp)) return rendererApp;

  const app = join(srcDir, 'app.ts');
  if (existsSync(app)) return app;

  return null;
}

function previewHtml(title: string, scriptSrc: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" href="data:," />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #ffffff; }
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${scriptSrc}"></script>
</body>
</html>`;
}

function openflReferencePlugin(): Plugin[] {
  let viteBase = '/';

  return [
    {
      name: 'openfl-reference:modules',
      enforce: 'pre',

      config(_, env) {
        if (env.command !== 'build') return;

        const input: Record<string, string> = { main: resolve(__dirname, 'index.html') };
        for (const referenceCase of discoverCases()) {
          for (const renderer of referenceCase.previewRenderers) {
            input[`openfl-tests/${referenceCase.corpus}/${referenceCase.name}/${routeSegment(renderer.id)}/index`] =
              `virtual:openfl-preview:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
          }
        }

        return {
          build: {
            rollupOptions: {
              input,
              output: {
                entryFileNames(chunk) {
                  const id = chunk.facadeModuleId;
                  if (!id?.startsWith('\0virtual:openfl-preview:')) return 'assets/[name]-[hash].js';

                  const [corpus, rest] = splitFirst(id.slice('\0virtual:openfl-preview:'.length), ':');
                  const [name, renderer] = splitFirst(rest, ':');
                  return `openfl-tests/${corpus}/${name}/${routeSegment(renderer)}/index.js`;
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
        if (source === 'virtual:openfl-reference-cases') return '\0virtual:openfl-reference-cases';
        if (source.startsWith('virtual:openfl-preview:')) return '\0' + source;
      },

      load(id) {
        if (id === '\0virtual:openfl-reference-cases') {
          return `export const cases = ${JSON.stringify(discoverCases())};`;
        }

        if (id.startsWith('\0virtual:openfl-preview:')) {
          const [corpus, rest] = splitFirst(id.slice('\0virtual:openfl-preview:'.length), ':');
          const [name, renderer] = splitFirst(rest, ':');
          const source = previewEntrySource(corpus, name, renderer);
          if (!source) return null;
          return `await import(${JSON.stringify(source)});`;
        }
      },

      generateBundle(_, bundle) {
        for (const referenceCase of discoverCases()) {
          for (const renderer of referenceCase.previewRenderers) {
            const entryId = `\0virtual:openfl-preview:${referenceCase.corpus}:${referenceCase.name}:${renderer.id}`;
            const chunk = Object.values(bundle).find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (candidate) => candidate.type === 'chunk' && (candidate as any).facadeModuleId === entryId,
            ) as { fileName: string } | undefined;
            if (!chunk) continue;

            this.emitFile({
              type: 'asset',
              fileName: `openfl-tests/${referenceCase.corpus}/${referenceCase.name}/${routeSegment(renderer.id)}/index.html`,
              source: previewHtml(`${referenceCase.title} · ${renderer.label}`, `${viteBase}${chunk.fileName}`),
            });
          }
        }
      },
    },

    {
      name: 'openfl-reference:routes',

      configureServer(server) {
        server.watcher.add(openflReferenceDir);

        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url ?? '/').split('?')[0] ?? '/';
          const parts = urlPath.split('/').filter(Boolean);
          if (parts[0] !== 'openfl-tests' || parts.length !== 4) return next();

          const [, corpus, name, rendererSegment] = parts;
          const referenceCase = discoverCases().find(
            (candidate) => candidate.corpus === corpus && candidate.name === name,
          );
          const renderer = referenceCase?.previewRenderers.find(
            (candidate) => routeSegment(candidate.id) === rendererSegment,
          );
          if (!referenceCase || !renderer) return next();

          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" href="data:," />
  <title>${referenceCase.title} · ${renderer.label}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #ffffff; }
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/@vite/client"></script>
  <script type="module" src="/@id/__x00__virtual:openfl-preview:${corpus}:${name}:${renderer.id}"></script>
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

export default defineConfig({
  plugins: [react(), ...openflReferencePlugin()],
  publicDir: resolve(repoRoot, 'reference/assets/public/openfl'),
  resolve: {
    alias: {
      '@flighthq/capture': resolve(repoRoot, 'packages/capture/src/index.ts'),
      'motion/Actuate': resolve(repoRoot, 'tools/reference/openfl-compat/Actuate.ts'),
      'motion/easing/Elastic': resolve(repoRoot, 'tools/reference/openfl-compat/Elastic.ts'),
      'motion/easing/Quad': resolve(repoRoot, 'tools/reference/openfl-compat/Quad.ts'),
      openfl: resolve(repoRoot, 'node_modules/openfl/lib/openfl'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
