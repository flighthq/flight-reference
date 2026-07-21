import {
  createGlCanvasElement,
  createGlRenderState,
  registerDefaultGlRenderEffects,
  registerEmissiveGlMaterial,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
} from '@flighthq/sdk';

import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

export const width = window.innerWidth;
export const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
export const canvas = createGlCanvasElement(width, height, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

export const glState = createGlRenderState(canvas, {
  backgroundColor: 0x2c2c32ff,
  contextAttributes: {
    alpha: false,
    depth: true,
    preserveDrawingBuffer: false,
  },
  pixelRatio,
});
registerStandardPbrGlMaterial(glState);
// The ribbon contrail uses UnlitMaterial and the engine glow uses EmissiveMaterial; both need their GL
// renderers registered here or drawGlScene silently skips them (no renderer for the material kind).
registerUnlitGlMaterial(glState);
registerEmissiveGlMaterial(glState);
// Post-process runners (bloom lives here) for the render-effect pipeline used in app.ts renderScene.
registerDefaultGlRenderEffects(glState);

export const verifyFrame = createGlFrameVerifier(glState);
