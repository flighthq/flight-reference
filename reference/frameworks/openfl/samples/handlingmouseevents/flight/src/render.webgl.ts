import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlBeginFill,
  defaultGlBitmapRenderer,
  defaultGlDrawCircle,
  defaultGlDrawEllipse,
  defaultGlDrawRectangle,
  defaultGlDrawRoundRectangle,
  defaultGlLineStyle,
  defaultGlLineTo,
  defaultGlMoveTo,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  ShapeKind,
  TextLabelKind,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(670, 400, pixelRatio);
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerGlShapeCommands([
  defaultGlBeginFill,
  defaultGlDrawCircle,
  defaultGlDrawEllipse,
  defaultGlDrawRectangle,
  defaultGlDrawRoundRectangle,
  defaultGlLineStyle,
  defaultGlLineTo,
  defaultGlMoveTo,
]);
registerDefaultGlMaterial(state);

export const scale = pixelRatio;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}
