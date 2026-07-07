# flight-reference

`flight-reference` is a standalone repository for reference samples, harness tooling, and capture utilities. The repo's primary product is the reference harness itself; tests and snapshots support that harness instead of defining the repo boundary.

## Current shape

- `tools/reference` - the reference harness UI and the main entry point for this repository.
- `packages/capture` - reusable capture primitives for snapshots, logs, and stable fingerprints.
- `reference/frameworks/openfl/samples` - sample corpus content, manifests, notes, and framework-specific columns.
- `reference/assets` - committed static assets that belong to the reference corpus rather than the main Flight repo.
- `docs/roadmap.md` - repository decisions and the long-term side-by-side harness plan.

## Why this layout

The repo starts from the goals below and makes them concrete:

1. Promote the reference tests into the app surface for this repo.
2. Keep the repo narrow: only the harness, scenarios, assets, and utilities that directly serve reference work.
3. Treat capture as a real package, not a tool-only sidecar.
4. Make side-by-side Flight-vs-alternative rendering a first-class direction.
5. Keep input mirroring in the design from the start.
6. Commit reference assets locally so the corpus stays static and licensing boundaries stay clear.

## Quick start

```bash
npm install
npm run dev
```

That starts the reference harness from `tools/reference`.

Useful scripts:

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

## Linking strategy

This repo is intentionally not hard-coded to a local Flight checkout. The default assumption is that Flight packages resolve from npm when those packages exist. When working locally against an unpublished Flight change, prefer a documented workspace override or `npm link` flow once the upstream package boundaries are settled.

The harness is already laid out for that split:

- adapter-level wiring lives in `tools/reference`
- reusable capture logic lives in `packages/capture`
- committed assets and sample definitions stay local to this repo
- sample-framework content belongs under `reference/frameworks/...`

## Detached-branch context

You surfaced a detached branch with real reference content under `tools/reference` and `reference/frameworks/openfl/samples`. This repo is now shaped to match those paths, so that when that work lands it does not need a second repo-layout rewrite.

## Asset policy

Reference assets belong in this repository under `reference/assets/`. They are part of the reference corpus, not live product assets. That keeps the corpus static, reduces churn against the main Flight asset tree, and makes licensing boundaries easier to reason about.

The detached branch currently stages OpenFL sample binaries from local clones into cache directories. That is a reasonable bootstrap step, but it should stay transitional if the repo decision is to keep the reference corpus fully local and static.
