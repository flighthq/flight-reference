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
packages/capture/       — @flighthq/capture library (fingerprint, snapshot)
scripts/                — build and release utilities
agents/                 — codebase map and conventions (this file)
  conventions/          — domain-specific rules
.claude/                — Claude Code settings
.husky/                 — git hooks (pre-commit, commit-msg, pre-push)
```

## Commands

- `npm run dev` — Vite dev server for the reference harness
- `npm run build` — build capture package then the Vite app
- `npm run preview` — preview the production build
- `npm run check` — full CI: typecheck, lint, format:check, test, build
- `npm run fix` — auto-fix lint and format issues
- `npm run test` — run capture package tests
- `npm run typecheck` — typecheck app and capture package
- `npm run prepush` — pre-push gate: typecheck + vitest on affected files

## Content

Reference cases live under `content/frameworks/<framework>/<corpus>/<case>/<implementation>/`. Each case may have multiple implementations (e.g. `openfl/`, `openfl-haxe/`, `flight/`). The Vite plugin discovers cases at build time and generates preview routes.

External framework implementations are behavioral and visual references, not API templates. Flight ports should use idiomatic Flight APIs while preserving the sample's observable behavior, dimensions, assets, timing, and visual intent.

Content files are linted with relaxed rules (no `consistent-type-imports`, `no-console`, `no-unused-vars`, or `no-restricted-imports` enforcement) but still get correctness checks.

## Packages

- **@flighthq/capture** — capture primitives: log collection, fingerprinting, snapshot comparison. The only publishable package. Has its own typecheck and test suite.

## Conventions

- [commit messages](conventions/commits.md) — before writing a commit.
