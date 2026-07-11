# Repository roadmap

## Decision summary

- The reference harness is the application for this repo, not an incidental test target.
- Capture tooling uses upstream `@flighthq/tool-capture` (via `.cache/flight-latest/`).
- Static scenario assets are committed locally under `assets/`.
- Deterministic capture stays available, but it is not the only acceptable validation path.
- Side-by-side comparison is a core harness feature, even before the real adapters land.

## Near-term direction

1. Move reference samples into `reference/frameworks/...` with committed manifests and assets.
2. Keep the harness in `tools/reference` thin and adapter-oriented.
3. Leverage `@flighthq/tool-capture` for:
   - deterministic browser capture (frame-halt, seeded PRNG, preserveDrawingBuffer)
   - baseline store (sha256 comparison)
   - log collection and structured output
4. Keep repo tooling small: build, typecheck, test, and local dev.

## Harness direction

The long-term target is a comparison harness with two renderer surfaces:

- left pane: Flight, hard-coded to the GL implementation
- right pane: alternative framework, also hard-coded to GL
- both panes constrained to comparable widths with shared margins

The current app shell already centers the layout around that shape so future adapter work does not require a repo rewrite.

## Input mirroring

Driving one surface should eventually drive both surfaces. The practical path is:

1. Normalize user interactions into harness-level events.
2. Feed those events into both adapters.
3. Record the event stream via `@flighthq/tool-capture`.
4. Compare fingerprints, logs, and optional snapshots instead of requiring every sample to be fully deterministic.

That avoids binding the harness to DOM-level event replay too early while still keeping lockstep behavior as the goal.

## Linking Flight locally

Default to published package references when possible. Local linking should stay an override for development against unpublished changes, not the baseline install path for this repository. The exact helper script can wait until the upstream Flight package boundaries are stable enough to avoid encoding the wrong topology here.

## Incoming branch compatibility

There is already detached-branch work using:

- `tools/reference` for the Vite harness
- `reference/frameworks/openfl/samples` for the OpenFL corpus
- compatibility shims and asset staging scripts under `tools/reference` and `scripts/`

That structure is the right compatibility target even if the exact contents are still in flight.
