import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuRenderState,
  defaultWgpuRichTextRenderer,
  defaultWgpuShapeCommands,
  defaultWgpuShapeRenderer,
  prepareScene2DRender,
  registerStandardWgpuMaterial,
  registerRenderer,
  registerWgpuShapeCommands,
  renderWgpuBackground,
  renderWgpuScene2D,
  RichTextKind,
  ShapeKind,
  submitWgpuRenderPass,
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
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = await createWgpuRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xa0a0a0ff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, RichTextKind, defaultWgpuRichTextRenderer);
registerRenderer(state, ShapeKind, defaultWgpuShapeRenderer);
registerWgpuShapeCommands(defaultWgpuShapeCommands);
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
