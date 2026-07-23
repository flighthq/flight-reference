# Haxe-only OpenFL sample sources

The detached OpenFL branch also surfaced a real split between:

- Haxe sample sources that already exist as upstream references
- TypeScript OpenFL ports that are runnable inside the Vite-based harness

That split matters for planning. Some samples can participate in side-by-side comparison immediately, while others still need either:

- a TypeScript OpenFL port, or
- a Haxe build path that the reference harness can drive

Keep the Haxe-only backlog explicit here so the harness can distinguish "present in corpus" from "runnable in compare mode".
