import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuRenderState,
  defaultWgpuRichTextRenderer,
  defaultWgpuBeginFill,
  defaultWgpuDrawRectangle,
  defaultWgpuShapeRenderer,
  prepareDisplayObjectRender,
  registerDefaultWgpuMaterial,
  registerRenderer,
  registerWgpuShapeCommands,
  renderWgpuBackground,
  renderWgpuDisplayObject,
  RichTextKind,
  ShapeKind,
  submitWgpuRenderPass,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = 800 * pixelRatio;
canvas.height = 600 * pixelRatio;
canvas.style.width = '800px';
canvas.style.height = '600px';
canvas.style.display = 'block';
document.body.style.margin = '0';
document.body.appendChild(canvas);

export const container = canvas;
export const state = await createWgpuRenderState(canvas, {
  backgroundColor: 0xa0a0a0ff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, RichTextKind, defaultWgpuRichTextRenderer);
registerRenderer(state, ShapeKind, defaultWgpuShapeRenderer);
registerWgpuShapeCommands([defaultWgpuBeginFill, defaultWgpuDrawRectangle]);
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
