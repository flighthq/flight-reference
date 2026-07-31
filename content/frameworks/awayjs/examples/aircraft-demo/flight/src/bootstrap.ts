import {
  createGlCanvasElement,
  createGlRenderState,
  defaultGlBloomEffectRunner,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  registerGlRenderEffect,
  registerStandardGlTextureResolvers,
  registerGlStandardPbrMaterial,
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
// Textured materials resolve their maps through the backing-kind registry; without this every
// texture resolves to null and the scene renders untextured.
registerStandardGlTextureResolvers(glState);
registerGlStandardPbrMaterial(glState);
registerGlRenderEffect(glState, 'BloomEffect', defaultGlBloomEffectRunner);
registerGlRenderEffect(glState, 'FxaaEffect', defaultGlFxaaEffectRunner);
registerGlRenderEffect(glState, 'ToneMapEffect', defaultGlToneMapEffectRunner);

export const verifyFrame = createGlFrameVerifier(glState);
