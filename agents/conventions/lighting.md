# Lighting Value Conversion (AwayJS → Flight)

Read this before porting lighting values from AwayJS demos.

## Why values differ

Flight renders in **linear HDR space** and applies gamma correction (`linearToSrgb`) as a post-process pass (`gamma.ts`). AwayJS computes lighting directly in **sRGB space** with no gamma correction. Because the gamma pass compresses linear values into the sRGB curve, raw AwayJS intensities produce dimmer-than-expected results in Flight.

## Conversion rules

### Directional and point light intensity

Multiply the AwayJS `diffuse` multiplier by **π (≈ 3.14)** as a starting point. This compensates for the energy-conservation factor in Flight's Blinn-Phong BRDF that AwayJS omits.

| AwayJS diffuse | Starting Flight intensity | Typical tuned range |
| -------------- | ------------------------- | ------------------- |
| 0.5            | 1.6                       | 3 – 5               |
| 0.7            | 2.2                       | 5 – 6               |
| 1.0            | 3.1                       | 5 – 8               |
| 1.2            | 3.8                       | 3.5 – 5             |
| 2.8            | 8.8                       | 6 – 8               |

For PBR materials (`StandardPbrMaterial`), use a smaller boost (2–3×) since PBR is designed for linear-space intensities.

### Ambient light intensity

AwayJS folds ambient into each directional light as a `light.ambient` multiplier (typically 0.1–0.5). Flight has a separate `AmbientLight` object.

Use **1.5–2.0** for most scenes. The exact value depends on how many lights contribute ambient in the AwayJS original and the ambient color brightness.

### Point light range

Map AwayJS `fallOff` (the outer attenuation radius) to Flight's `range`. Do **not** use AwayJS `radius` (the inner full-intensity radius) — that produces a much smaller light volume.

### Colors

AwayJS stores light and ambient colors as 24-bit sRGB hex (`0xRRGGBB`). Flight light colors are 32-bit RGBA (`0xRRGGBBAA`) and the Blinn-Phong shader consumes them in linear space.

The SDK provides conversion functions via `@flighthq/sdk`:

- `unpackColorToLinear(out, color)` — unpack 0xRRGGBBAA to linear [R,G,B,A]
- `packLinearToColor(linear)` — pack linear [R,G,B,A] to 0xRRGGBBAA
- `computeSrgbToLinear(x)` — single-channel sRGB → linear
- `computeLinearToSrgb(x)` — single-channel linear → sRGB

For `ambientColor`, move it to the Flight `AmbientLight`'s `color` property (appending `ff` for full alpha). If the AwayJS ambient color is very dark (e.g., `0x101025`), consider lightening it slightly (e.g., `0x303040`) since linear-space lighting dims dark ambient colors more than sRGB-space lighting does.

### Specular

AwayJS `specular` multiplier on lights doesn't have a direct Flight equivalent. Flight's Blinn-Phong materials control specular via `shininess` and `specular` (a color). A higher directional intensity naturally produces brighter specular highlights.

## Conversion helpers

**SDK (via `@flighthq/sdk`):** `computeSrgbToLinear`, `computeLinearToSrgb`, `unpackColorToLinear`, `packLinearToColor`, `createLinearColor`.

## Quick checklist

1. Set directional intensity ≈ AwayJS `diffuse` × π.
2. Set ambient intensity ≈ 1.5–2.0.
3. Set point light range = AwayJS `fallOff`.
4. Preserve light and ambient colors (hex values).
5. Run the demo and tune visually — the formula is a starting point.
