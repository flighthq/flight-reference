# Numeric Domains

Flight uses `number` for packed colors, normalized factors, physical magnitudes, and a few encoded values. TypeScript therefore accepts a value from the wrong domain, and the renderer can turn it into a plausible result instead of reporting an error. Identify the field's domain before judging the value.

## Color domains

| domain | common Flight fields | valid form | implementation to confirm |
| --- | --- | --- | --- |
| packed RGBA32 | material `baseColor`, `diffuse`, `specular`, `emissive`, and `tint`; direct SDK light colors; render-state `backgroundColor`; render-texture clear colors; bitmap pixels | `0xRRGGBBAA` | `unpackColorToLinear` in `@flighthq/color` and `setRenderStateBackgroundColor` in `@flighthq/render` |
| RGB24 | `TextFormat.color`, shape fill and line colors, gradient color stops, glow and shadow colors whose alpha is separate, and source-framework colors before conversion | `0xRRGGBB` | `computeRgbHexString` in `@flighthq/color` |
| normalized factors | object and effect alpha, PBR metallic and roughness, PBR specular factor, and bitmap gradient alpha stops | decimal `0..1` | the consumer that applies or clamps the field; for gradient stops, `buildBitmapGradientRamp` in `@flighthq/bitmap` |

The right column names where to _read_ the decoding, not what to call. `setRenderStateBackgroundColor` in particular is internal to `@flighthq/render` — open `render/dist/renderColor.js` to confirm it, but do not try to import it.

Use `packOpaqueColor` when an RGB24 source-framework color crosses into an RGBA32 Flight field. Use `packColor` when starting from separate normalized channels and `getColorRgb` when crossing back to RGB24. Do not move bytes by eye: opaque black is `0x000000ff` in Flight, even though its numeric value is only 255.

Intensity, strength, emissive strength, distance, range, texture scale, and world coordinates are magnitudes, not normalized factors. Values above 1 can be correct. Resolve the receiving API before clamping them.

## Traps already found here

- `ShadedMaterial.specular` is a packed RGBA32 color. Passing `0.15` typechecked, but `unpackColorToLinear` bit-coerced it to zero, silently disabling the specular lobe. A dim neutral specular color must still be packed, such as `0x262626ff`.
- `FunctionalTargetOptions.background` is forwarded unchanged to Flight's render-state `backgroundColor`. `0xff000000` is ARGB opaque black but Flight RGBA transparent red; `setRenderStateBackgroundColor` reads alpha from the low byte. Alpha-disabled presentation made several affected demos still look black.
- `buildBitmapGradientRamp` takes RGB24 colors, normalized alpha stops, and byte-domain ratios. Passing alpha stops `[255, 255, 255]` saturated back to opaque in its `Uint8ClampedArray`, so the pixels looked right while the input domain was wrong. Use `[1, 1, 1]`.
- `TextFormat.color` is RGB24. Passing RGBA white `0xffffffff` happened to survive because `computeRgbHexString` masks the low 24 bits to `0xffffff`; a non-white RGBA color would silently shift channels.

## Review checklist

- Treat a fractional or small decimal in a packed-color field as suspicious. Confirm the consumer; do not flag the correctly spelled packed black `0x000000ff`.
- Treat an eight-digit hex value in an RGB24 field as suspicious. White is invariant under the masking mistake and can hide it.
- Treat a normalized field outside `0..1` as suspicious, especially alpha. Local percent-domain data is fine only when it is explicitly divided before crossing into Flight.
- Treat a large magnitude as a question, not a bug. Point-light adapters in this corpus deliberately derive multi-million intensities to compensate inverse-square falloff.
- Check the decoder named above before trusting a nearby comment. A rationalizing comment may describe an intended value that never took effect.
