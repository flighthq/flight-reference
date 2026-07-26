import type { DisplayObject } from '@flighthq/sdk';
import {
  createWgpuCanvasElement,
  createWgpuRenderState,
  defaultWgpuBeginFill,
  defaultWgpuCurveTo,
  defaultWgpuDrawCircle,
  defaultWgpuDrawEllipse,
  defaultWgpuDrawRectangle,
  defaultWgpuDrawRoundRectangle,
  defaultWgpuLineStyle,
  defaultWgpuLineTo,
  defaultWgpuMoveTo,
  defaultWgpuShapeRenderer,
  prepareScene2DRender,
  registerDefaultWgpuMaterial,
  registerRenderer,
  registerWgpuShapeCommands,
  renderWgpuBackground,
  renderWgpuScene2D,
  ShapeKind,
  submitWgpuRenderPass,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createWgpuCanvasElement(650, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = await createWgpuRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, ShapeKind, defaultWgpuShapeRenderer);
registerWgpuShapeCommands([
  defaultWgpuBeginFill,
  defaultWgpuCurveTo,
  defaultWgpuDrawCircle,
  defaultWgpuDrawEllipse,
  defaultWgpuDrawRectangle,
  defaultWgpuDrawRoundRectangle,
  defaultWgpuLineStyle,
  defaultWgpuLineTo,
  defaultWgpuMoveTo,
]);
registerDefaultWgpuMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderWgpuBackground(state);
  renderWgpuScene2D(state, root);
  submitWgpuRenderPass(state);
}
