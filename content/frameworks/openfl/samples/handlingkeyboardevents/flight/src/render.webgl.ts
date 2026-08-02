import type { DisplayObject } from '@flighthq/sdk';
import {
  SpriteKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlSpriteRenderer,
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  prepareScene2DRender,
  registerGlStandardMaterial,
  registerStandardGlTextureResolvers,
  registerGlShapeCommands,
  registerGlShapeRasterizer,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  ShapeKind,
  TextLabelKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(800, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerGlShapeRasterizer(state, createCanvasShapeRasterizer(createCanvasTextureResolvers(), true));
registerGlStandardMaterial(state);
registerStandardGlTextureResolvers(state);

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
