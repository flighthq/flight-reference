// Lighting-value porting helpers for AwayJS → Flight.
//
// Flight computes lighting in linear space and applies a linearToSrgb
// gamma-correction pass (see gamma.ts). AwayJS computes lighting
// directly in sRGB space with no gamma correction. Reusing raw AwayJS
// intensity values in Flight produces visually different (usually dimmer)
// results because the gamma pass compresses highlights.
//
// The SDK already provides the low-level color-space primitives via
// @flighthq/sdk (re-exported from @flighthq/materials and @flighthq/effects):
//
//   computeSrgbToLinear(x)      — single channel sRGB → linear
//   computeLinearToSrgb(x)      — single channel linear → sRGB
//   unpackColorToLinear(out, c) — 0xRRGGBBAA → linear [R, G, B, A]
//   packLinearToColor(linear)   — linear [R, G, B, A] → 0xRRGGBBAA
//   createLinearColor()         — allocate a zeroed [0, 0, 0, 0]
//
// This module adds AwayJS-specific porting utilities on top.
// See agents/conventions/lighting.md for the full porting guide.

import type { LinearColor } from '@flighthq/sdk';
import { computeSrgbToLinear, createLinearColor, packLinearToColor, unpackColorToLinear } from '@flighthq/sdk';

// Convert an AwayJS sRGB diffuse/specular multiplier to a starting linear
// intensity for Flight.  The factor of π compensates for the
// energy-conservation denominator in Flight's Blinn-Phong BRDF that
// AwayJS's sRGB-space model omits.
//
// Visual tuning is still needed — this is a starting point.
// For PBR materials, use a smaller boost (2–3×).
export function srgbIntensityToLinear(srgbIntensity: number): number {
  return srgbIntensity * Math.PI;
}

// Convert an AwayJS 0xRRGGBB sRGB color to a Flight 0xRRGGBBAA linear-encoded
// packed color suitable for light color properties.  AwayJS stores light and
// ambient colors as 24-bit sRGB hex; Flight light colors are 32-bit RGBA and
// the Blinn-Phong shader consumes them in linear space.
export function srgbColorToLinearPacked(srgbHex: number, alpha = 1): number {
  const r = computeSrgbToLinear(((srgbHex >>> 16) & 0xff) / 255);
  const g = computeSrgbToLinear(((srgbHex >>> 8) & 0xff) / 255);
  const b = computeSrgbToLinear((srgbHex & 0xff) / 255);
  const out: LinearColor = createLinearColor();
  out[0] = r;
  out[1] = g;
  out[2] = b;
  out[3] = alpha;
  return packLinearToColor(out);
}

// Unpack a Flight 0xRRGGBBAA packed color to a linear [R,G,B,A] array.
// Re-export for convenience — identical to the SDK function.
export { computeSrgbToLinear, createLinearColor, packLinearToColor, unpackColorToLinear };
export type { LinearColor };
