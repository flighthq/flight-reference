import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuRenderState,
  defaultWgpuVideoRenderer,
  prepareScene2DRender,
  registerStandardWgpuMaterial,
  registerRenderer,
  renderWgpuBackground,
  renderWgpuScene2D,
  submitWgpuRenderPass,
  VideoKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = 800 * pixelRatio;
canvas.height = 600 * pixelRatio;
canvas.style.width = '800px';
canvas.style.height = '600px';
canvas.style.display = 'block';
document.body.style.margin = '0';
document.body.style.background = '#fff';
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = await createWgpuRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, VideoKind, defaultWgpuVideoRenderer);
registerStandardWgpuMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderWgpuBackground(state);
  renderWgpuScene2D(state, root);
  submitWgpuRenderPass(state);
}

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
