import type { DisplayObject } from '@flighthq/sdk';
import {
  createDomRenderState,
  defaultCanvasBeginFill,
  defaultCanvasDrawRectangle,
  defaultCanvasEndFill,
  defaultDomSpriteRenderer,
  defaultDomShapeRenderer,
  defaultDomTextLabelRenderer,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerDomImageTextureResolver,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
  ShapeKind,
  SpriteKind,
  TextLabelKind,
} from '@flighthq/sdk';

export const container = document.createElement('div');
document.getElementById('app')?.remove();
document.body.appendChild(container);

export const state = createDomRenderState(container, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerDomImageTextureResolver(state);
registerRenderer(state, SpriteKind, defaultDomSpriteRenderer);
registerRenderer(state, ShapeKind, defaultDomShapeRenderer);
registerRenderer(state, TextLabelKind, defaultDomTextLabelRenderer);
registerCanvasShapeCommands([defaultCanvasBeginFill, defaultCanvasDrawRectangle, defaultCanvasEndFill]);
export const scale = 1;

export function setSize(w: number, h: number): void {
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
}

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}

// Per-node render effects are currently GL-only in the SDK. DOM renders the panel unfiltered.
export function applyBackgroundBlur(node: DisplayObject): () => void {
  void node;
  return () => {};
}
