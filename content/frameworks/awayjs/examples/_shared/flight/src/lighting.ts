// sRGB ↔ linear conversion helpers for porting lighting values from
// sRGB-space engines (AwayJS) to Flight's linear HDR pipeline.
//
// Flight computes lighting in linear space and applies a linearToSrgb
// gamma-correction pass (see gamma.ts). AwayJS computes lighting
// directly in sRGB space with no gamma correction. Reusing raw AwayJS
// intensity values in Flight produces visually different (usually dimmer)
// results because the gamma pass compresses highlights.
//
// See agents/conventions/lighting.md for porting guidance.

export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

// Convert AwayJS-style sRGB diffuse/specular multipliers to a starting
// linear intensity for Flight.  The factor of π compensates for the
// energy-conservation denominator present in Flight's Blinn-Phong BRDF
// but absent from AwayJS's sRGB-space lighting model.
//
// The result is a reasonable starting point — visual tuning may still be
// needed for scenes with colored lights, environment maps, or PBR
// materials (which typically need a smaller boost, around 2–3×).
export function srgbIntensityToLinear(srgbIntensity: number): number {
  return srgbIntensity * Math.PI;
}
