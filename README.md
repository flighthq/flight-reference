# Flight Reference

A standalone reference harness for side-by-side visual comparison of [Flight SDK](https://github.com/flighthq/flight) implementations against equivalent demos from established rendering frameworks.

## About this repository

This repository contains a browser-based comparison tool and a corpus of demo implementations. Each demo case provides an original framework implementation alongside a Flight implementation that reproduces the same observable behavior — same assets, same dimensions, same visual output.

**Flight is an independent project.** The frameworks compared here predate Flight, but Flight's features were developed independently — not derived from these frameworks' codebases. The reference implementations are behavioral comparisons that validate Flight can produce equivalent visual output, not the origin of Flight's API design. The presence of a framework in this repository does not imply that Flight is licensed under that framework.

Each framework's sample code is redistributed under its own license — see `content/frameworks/<framework>/LICENSE` for details.

## Quick start

```bash
npm install
npm run dev
```

## Commands

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                     |
| `npm run build`     | Production build                              |
| `npm run preview`   | Preview the production build                  |
| `npm run check`     | Full CI gate (typecheck, lint, format, build) |
| `npm run fix`       | Auto-fix lint and formatting                  |
| `npm run typecheck` | TypeScript type checking only                 |

## Repository layout

```
src/                    — Vite app source (React UI)
index.html              — App entry point
vite.config.ts          — Vite config with reference plugin
content/                — Demo corpus
  frameworks/openfl/    — OpenFL reference cases
  frameworks/starling/  — Starling reference cases
  frameworks/awayjs/    — AwayJS reference cases
  assets/               — Shared assets (images, fonts)
  harness/              — Rendering harness utilities
agents/                 — Codebase map and conventions
```

Demo cases live under `content/frameworks/<framework>/<corpus>/<case>/`. Each case may have multiple implementation columns (e.g. `openfl/`, `flight/`, `openfl-haxe/`). The Vite plugin discovers cases at build time and generates preview routes.

## Reference frameworks

| Framework                                      | License      | Content                                        |
| ---------------------------------------------- | ------------ | ---------------------------------------------- |
| [OpenFL](https://github.com/openfl/openfl)     | MIT          | 2D rendering, display list, text, filters      |
| [Starling](https://github.com/openfl/starling) | BSD-2-Clause | 2D sprite batching, texture atlases, particles |
| [AwayJS](https://github.com/awayjs)            | Apache-2.0   | 3D rendering, materials, primitives, skyboxes  |

## Linking strategy

This repo resolves Flight SDK packages from npm. When working locally against an unpublished Flight change, use a workspace override or `npm link` flow.
