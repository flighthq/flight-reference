// Color helpers for porting AwayJS values to Flight.
// See agents/conventions/lighting.md for the full porting guide.

// Widen a 24-bit AwayJS 0xRRGGBB color to Flight's 32-bit 0xRRGGBBAA
// packed sRGB format with full opacity. Flight packed colors are sRGB
// (decoded to linear at render time) — do not pre-linearize.
export function packOpaqueColor(awdHex: number): number {
  return ((awdHex << 8) | 0xff) >>> 0;
}
