# Flight Reference

A standalone reference harness for side-by-side comparison of external framework demos (OpenFL, Starling) with their Flight SDK equivalents. The app is a Vite+React browser tool; the content is a corpus of ~260 TypeScript demo files ported from external frameworks.

## Ground Rules

- Use `npm`, not `pnpm` or `yarn`.
- After editing source files, run `npm run fix` to apply linting and formatting. Unformatted or unlinted code will fail CI.
- Prefer single-line commit messages following Conventional Commits — see [commits](conventions/commits.md).

## Source Style

- `import type { Foo }` must be on its own `import type { }` line. Never mix type imports inline with value imports.
- Avoid structural divider comments such as `// ---- setup ----`. Use names, file boundaries, and package boundaries instead.
- No `TODO`, `FIXME`, or `HACK` comments in source — surface work items in status or conversation, not inline.
- Add comments only when the WHY is non-obvious.

## Repository Layout

```
src/                    — Vite app source (React UI)
index.html              — app entry point
vite.config.ts          — Vite config with reference plugin
content/                — demo corpus
  frameworks/openfl/    — OpenFL reference cases (includes compat/ shims)
  frameworks/starling/  — Starling reference cases
  assets/               — shared assets (images, fonts)
  baselines/            — visual regression baselines
scripts/                — build and release utilities
agents/                 — codebase map and conventions (this file)
  conventions/          — domain-specific rules
.claude/                — Claude Code settings
.husky/                 — git hooks (pre-commit, commit-msg, pre-push)
```

## Commands

- `npm run dev` — Vite dev server for the reference harness
- `npm run build` — build the Vite app
- `npm run preview` — preview the production build
- `npm run check` — full CI: typecheck, lint, format:check, build
- `npm run fix` — auto-fix lint and format issues
- `npm run typecheck` — typecheck the app
- `npm run prepush` — pre-push gate: typecheck

## Content

Reference cases live under `content/frameworks/<framework>/<corpus>/<case>/<implementation>/`. Each case may have multiple implementations (e.g. `openfl/`, `openfl-haxe/`, `flight/`). The Vite plugin discovers cases at build time and generates preview routes.

External framework implementations are behavioral and visual references, not API templates. Flight ports should use idiomatic Flight APIs while preserving the sample's observable behavior, dimensions, assets, timing, and visual intent.

Content files are linted with relaxed rules (no `consistent-type-imports`, `no-console`, `no-unused-vars`, or `no-restricted-imports` enforcement) but still get correctness checks.

## Upstream Flight SDK (`FLIGHT_REPO`)

The reference harness can build against an unreleased local checkout of the Flight SDK instead of the published `@flighthq/*` npm packages. This is how agents test Flight ports against development features that haven't shipped yet.

### How it works

Set the `FLIGHT_REPO` environment variable to the root of a local Flight SDK checkout (the directory containing its `package.json` with `"name": "flight"`). The Vite config (`vite.config.ts`) detects this and:

1. Aliases every `@flighthq/<package>` import to `$FLIGHT_REPO/packages/<package>/src/index.ts` — the harness compiles directly from Flight source, bypassing the published npm builds.
2. Aliases `@ft/render` and `@ft/verify` to the Flight repo's `tools/harness/` utilities when present.
3. Adds `$FLIGHT_REPO` to the Vite dev server's allowed filesystem roots.
4. Excludes `@flighthq/sdk` from Vite's dependency pre-bundling so the local source is used as-is.

### Requirements

- The Flight repo must have its own `node_modules` installed (`npm install` in `$FLIGHT_REPO`) so that Flight's internal dependencies resolve.
- The Flight repo's `package.json` must have `"name": "flight"` — this is the validation check.

### Usage

```bash
export FLIGHT_REPO=/path/to/flight
npm run dev    # dev server uses local Flight source
npm run check  # typecheck + build against local Flight source
```

When `FLIGHT_REPO` is unset (the default), the harness falls back to the `@flighthq/*` packages installed in `node_modules/`.

### When to use it

- **Porting against new APIs**: when upstream Flight adds a new function or type that isn't published yet, set `FLIGHT_REPO` to the branch with that work and import normally — Vite resolves to the local source.
- **Verifying SDK changes**: run `npm run dev` with `FLIGHT_REPO` set to visually confirm that an SDK change renders correctly in the reference demos.
- **CI against unreleased Flight**: automated builds can set `FLIGHT_REPO` to pin the harness against a specific Flight commit.

### What it does NOT do

- It does not modify `node_modules/` or install anything — the aliasing is purely at the Vite resolve layer.
- It does not affect the TypeScript project config (`tsconfig.*.json`) — typechecking uses Vite's resolution via `tsc` only when run through the Vite build pipeline. Standalone `tsc` without Vite will still resolve from `node_modules/`.

## Conventions

- [commit messages](conventions/commits.md) — before writing a commit.
- [lighting conversion](conventions/lighting.md) — before porting AwayJS lighting values to Flight.
