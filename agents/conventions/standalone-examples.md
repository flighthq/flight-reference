# Standalone Examples

Every Flight example is a **standalone reference**. Someone should be able to open one `app.ts` and read the whole thing — scene construction, render-state setup, material and resolver registration, the frame loop — without following an import into a shared helper.

This is a documentation product, not an application. The duplication is the point: a reader porting their own project copies one file, not one file plus a harness they have to reconstruct.

## The rule

**Do not create shared Flight rendering code between examples.**

Concretely, none of the following may live in a `_shared/` module and be imported by examples:

- render-state creation (`createGlRenderState`, canvas setup, pixel-ratio handling)
- renderer, material, effect, or **texture-resolver** registration
- render-effect pipeline setup, or the per-frame draw/present sequence
- skybox, shadow, or post-process passes

If two examples need the same setup, each gets its own copy.

## The one exception

**Framework-convention translation may be shared** — the arithmetic that converts an AwayJS, OpenFL, or Starling value into its Flight equivalent. That code is about the _source_ framework's conventions, not about how Flight renders, and getting it right once matters more than showing it repeatedly.

Current sanctioned helpers under `content/frameworks/awayjs/examples/_shared/flight/src/`:

| module                       | why it is allowed                                                              |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `camera.ts`                  | AwayJS camera/position/direction → Flight. See [camera conversion](camera.md). |
| `lighting.ts`                | AwayJS light values → Flight. See [lighting conversion](lighting.md).          |
| `materials.ts`               | Phong shininess → PBR roughness.                                               |
| `pbrConvert.ts`              | AwayJS specular/gloss maps → metallic-roughness.                               |
| `cubemap.ts`, `particles.ts` | AwayJS asset-shape conversion.                                                 |

`verify.ts` is capture-harness plumbing for the reference tool itself, not example content, and is exempt for the same reason `@ft/render` and `@ft/verify` are.

When in doubt: **does this code teach the reader something about Flight?** If yes, inline it. If it only reconciles a quirk of the source framework, it may be shared.

## Why this exists

A `_shared/flight/src/scene3d.ts` grew to own render-state creation and all registration for 17 awayjs examples. When SDK 1220 made texture-resolver registration the application's job, the missing one-line registration sat in that shared file and silently untextured **every** 3D example at once — and because no example showed its own setup, nothing in the corpus demonstrated the call a reader needed to copy. It was removed and inlined per example.

A shared harness turns one omission into a corpus-wide outage and hides the very API surface the corpus exists to document.
