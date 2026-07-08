import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuCanvasElement,
  createWgpuRenderState,
  defaultWgpuBeginFill,
  defaultWgpuDrawRectangle,
  defaultWgpuShapeRenderer,
  prepareDisplayObjectRender,
  registerDefaultWgpuMaterial,
  registerRenderer,
  registerWgpuShapeCommands,
  renderWgpuBackground,
  renderWgpuDisplayObject,
  ShapeKind,
  submitWgpuRenderPass,
} from '@flighthq/sdk';

const WIDTH = 550;
const HEIGHT = 400;
const pixelRatio = window.devicePixelRatio || 1;
const canvas = createWgpuCanvasElement(WIDTH, HEIGHT, pixelRatio);
document.body.appendChild(canvas);

export const container = canvas;
export const state = await createWgpuRenderState(canvas, {
  backgroundColor: 0xffffffff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
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
