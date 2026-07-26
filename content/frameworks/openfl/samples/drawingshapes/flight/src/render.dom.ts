import type { DisplayObject } from '@flighthq/sdk';
import {
  createDomRenderState,
  defaultCanvasBeginFill,
  defaultCanvasCurveTo,
  defaultCanvasDrawCircle,
  defaultCanvasDrawEllipse,
  defaultCanvasDrawRectangle,
  defaultCanvasDrawRoundRectangle,
  defaultCanvasLineStyle,
  defaultCanvasLineTo,
  defaultCanvasMoveTo,
  defaultDomShapeRenderer,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
  ShapeKind,
} from '@flighthq/sdk';

const container = document.createElement('div');
container.style.position = 'relative';
container.style.width = '650px';
container.style.height = '400px';
document.getElementById('app')?.remove();
document.body.appendChild(container);

export const state = createDomRenderState(container, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, ShapeKind, defaultDomShapeRenderer);
registerCanvasShapeCommands([
  defaultCanvasBeginFill,
  defaultCanvasCurveTo,
  defaultCanvasDrawCircle,
  defaultCanvasDrawEllipse,
  defaultCanvasDrawRectangle,
  defaultCanvasDrawRoundRectangle,
  defaultCanvasLineStyle,
  defaultCanvasLineTo,
  defaultCanvasMoveTo,
]);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}
