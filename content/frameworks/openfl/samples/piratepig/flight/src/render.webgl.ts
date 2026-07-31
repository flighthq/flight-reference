import type { DisplayObject, Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  applyGlRenderEffectsToRenderTexture,
  computeRenderEffectPadding,
  copyShapeCommands,
  createBlurEffect,
  createDisplayObject,
  createGlOffscreenRenderState,
  createGlRenderTexturePool,
  createGlRenderState,
  createRenderTexture,
  createShape,
  createSprite,
  defaultGlSpriteRenderer,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  getNodeParent,
  getShapeBounds,
  prepareScene2DRender,
  registerBlurEffectPaddingResolver,
  registerGlBlurEffect,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerGlShapeCommands,
  registerRenderer,
  renderIntoGlRenderTexture,
  renderGlBackground,
  renderGlScene2D,
  ShapeKind,
  SpriteKind,
  setSpriteTexture,
  TextLabelKind,
  withGlRenderTextures,
  createMatrix,
  createRectangle,
  replaceNodeChild,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth * pixelRatio;
canvas.height = window.innerHeight * pixelRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerStandardGlMaterial(state);
registerBlurEffectPaddingResolver(state);
registerGlBlurEffect(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

export function render(root: DisplayObject): void {
  _applyBackgroundBlur?.();
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}

// Per-node effects are a GL-only SDK capability. The other backends render this panel unfiltered.
// Bake the panel once, then run the blur from that source into the visible Sprite's texture.
export function applyBackgroundBlur(node: Shape): () => void {
  const parent = getNodeParent(node);
  if (parent === null) return () => {};

  const effect = createBlurEffect({ blurX: 10, blurY: 10 });
  const padding = computeRenderEffectPadding(state, effect);
  const pad = Math.ceil(Math.max(padding.left, padding.right, padding.top, padding.bottom));
  const bounds = createRectangle();
  getShapeBounds(bounds, node);
  const width = Math.ceil(bounds.width) + pad * 2;
  const height = Math.ceil(bounds.height) + pad * 2;
  const descriptor = { width, height };

  const source = createRenderTexture(descriptor);
  const result = createRenderTexture(descriptor);
  const bakeRoot = createDisplayObject();
  const bakePanel = createShape();
  copyShapeCommands(bakePanel, node);
  bakePanel.x = pad - bounds.x;
  bakePanel.y = pad - bounds.y;
  addNodeChild(bakeRoot, bakePanel);

  const offscreen = createGlOffscreenRenderState(state);
  renderIntoGlRenderTexture(state, source, () => {
    prepareScene2DRender(offscreen, bakeRoot);
    renderGlScene2D(offscreen, bakeRoot);
  });

  const panel = createSprite();
  setSpriteTexture(panel, result);
  panel.x = node.x + bounds.x - pad;
  panel.y = node.y + bounds.y - pad;
  replaceNodeChild(parent, node, panel);

  const pool = createGlRenderTexturePool();
  _applyBackgroundBlur = () => {
    withGlRenderTextures(state, pool, [descriptor], ([scratch]) => {
      applyGlRenderEffectsToRenderTexture(state, pool, source, result, scratch, [effect]);
    });
  };
  return () => {};
}

let _applyBackgroundBlur: (() => void) | null = null;
