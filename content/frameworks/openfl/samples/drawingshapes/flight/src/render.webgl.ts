import type { DisplayObject } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  defaultGlBeginFill,
  defaultGlCurveTo,
  defaultGlDrawCircle,
  defaultGlDrawEllipse,
  defaultGlDrawRectangle,
  defaultGlDrawRoundRectangle,
  defaultGlLineStyle,
  defaultGlLineTo,
  defaultGlMoveTo,
  defaultGlShapeRenderer,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  ShapeKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(650, 400, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands([
  defaultGlBeginFill,
  defaultGlCurveTo,
  defaultGlDrawCircle,
  defaultGlDrawEllipse,
  defaultGlDrawRectangle,
  defaultGlDrawRoundRectangle,
  defaultGlLineStyle,
  defaultGlLineTo,
  defaultGlMoveTo,
]);
registerDefaultGlMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}
