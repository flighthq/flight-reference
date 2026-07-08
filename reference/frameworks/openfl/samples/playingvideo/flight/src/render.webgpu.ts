import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuRenderState,
  defaultWgpuVideoRenderer,
  prepareDisplayObjectRender,
  registerDefaultWgpuMaterial,
  registerRenderer,
  renderWgpuBackground,
  renderWgpuDisplayObject,
  submitWgpuRenderPass,
  VideoKind,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = 550 * pixelRatio;
canvas.height = 400 * pixelRatio;
canvas.style.width = '550px';
canvas.style.height = '400px';
canvas.style.display = 'block';
document.body.style.margin = '0';
document.body.style.background = '#000';
document.body.appendChild(canvas);

export const container = canvas;
export const state = await createWgpuRenderState(canvas, {
  backgroundColor: 0x000000ff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, VideoKind, defaultWgpuVideoRenderer);
registerDefaultWgpuMaterial(state);
export const scale = pixelRatio;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderWgpuBackground(state);
  renderWgpuDisplayObject(state, root);
  submitWgpuRenderPass(state);
}

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
