import type { BlurEffect } from '@flighthq/sdk';
import type { DisplayObject, RenderTexture, Sprite } from '@flighthq/sdk';
import {
  addNodeChild,
  applyGlRenderEffectsToRenderTexture,
  createDisplayObject,
  createGlCanvasElement,
  createGlOffscreenRenderState,
  createGlRenderState,
  createGlRenderTexturePool,
  createMatrix,
  createRenderTexture,
  createSprite,
  clearGlRenderTexture,
  defaultGlRichTextRenderer,
  defaultGlSpriteRenderer,
  getBlurEffectPadding,
  getTextureHeight,
  getTextureWidth,
  prepareScene2DRender,
  registerGlBlurEffect,
  registerGlStandardMaterial,
  registerRenderer,
  registerStandardGlTextureResolvers,
  renderGlBackground,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  RichTextKind,
  SpriteKind,
  withGlRenderTextures,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(800, 600, pixelRatio);
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
});
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerGlStandardMaterial(state);
// Sprites resolve their texture through the backing-kind registry; without this both the baked
// source and the blurred result resolve to null and the sprites draw nothing.
registerStandardGlTextureResolvers(state);
registerGlBlurEffect(state);
export const scale = pixelRatio;
export const width = 800;
export const height = 600;

// Each blurred node keeps two same-sized render textures: `source` holds the unfiltered content,
// baked once, and the blur runs source → result each frame with a pooled scratch lease in between.
// The visible sprite samples `result`, so the blur composites through the normal 2D walk and picks
// up the node's scene transform (which carries the stage pixelRatio) for free.
type BlurEntry = {
  sprite: Sprite;
  filter: Readonly<BlurEffect>;
  source: RenderTexture;
  result: RenderTexture;
  descriptor: { width: number; height: number };
};

// The blur animates up to σ=64 and a Gaussian tail runs a few σ past the bounds, so every texture is
// allocated for the widest case rather than resized as the radius breathes.
const MAX_BLUR = 64;

export function applyBlurEffects(list: { node: Sprite; filter: BlurEffect }[]): void {
  const widest = getBlurEffectPadding({ kind: 'BlurEffect', blurX: MAX_BLUR, blurY: MAX_BLUR });
  const pad = Math.ceil(Math.max(widest.left, widest.right, widest.top, widest.bottom));

  for (const { node, filter } of list) {
    const texture = node.data.texture;
    if (texture === null) continue;
    const w = Math.ceil(getTextureWidth(texture)) + pad * 2;
    const h = Math.ceil(getTextureHeight(texture)) + pad * 2;
    // Clear to transparent: the blur derives its falloff from the source alpha, and an opaque clear
    // would smear the clear colour across the whole padded rect instead of the icon.
    const descriptor = { width: w, height: h, clearColors: [0x00000000] };

    const source = createRenderTexture(descriptor);
    bakeSource(source, node, pad);

    const result = createRenderTexture(descriptor);
    node.data.texture = result;
    node.x -= pad;
    node.y -= pad;

    _entries.push({ sprite: node, filter, source, result, descriptor: { width: w, height: h } });
  }
}

export function render(root: DisplayObject): void {
  for (const entry of _entries) {
    // Effect passes blend into their destination rather than replacing it, and a RenderTexture keeps
    // last frame's contents, so re-running the blur every frame would composite over itself and the
    // icon would darken toward opaque. Clearing first makes each frame's blur stand alone.
    clearGlRenderTexture(state, entry.result);
    withGlRenderTextures(state, _pool, [entry.descriptor], ([scratch]) => {
      applyGlRenderEffectsToRenderTexture(state, _pool, entry.source, entry.result, scratch, [entry.filter]);
    });
  }
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}

// Bakes the node's current texture into `destination` at `pad` inset, through a second pipeline over
// the same GL context so the content lands at texture scale rather than scene scale.
function bakeSource(destination: RenderTexture, node: Sprite, pad: number): void {
  const bakeRoot = createDisplayObject();
  const copy = createSprite();
  copy.data.texture = node.data.texture;
  copy.x = pad;
  copy.y = pad;
  addNodeChild(bakeRoot, copy);

  // createGlOffscreenRenderState shares the screen canvas, so the 2D walk projects into canvas space
  // while the bound target is the render texture. Scale by canvas/target per axis so baked content
  // lands 1:1 instead of being shrunk by that ratio.
  const offscreen = createGlOffscreenRenderState(state);
  offscreen.renderTransform2D = createMatrix(
    state.canvas.width / getTextureWidth(destination),
    0,
    0,
    state.canvas.height / getTextureHeight(destination),
    0,
    0,
  );
  renderIntoGlRenderTexture(state, destination, () => {
    prepareScene2DRender(offscreen, bakeRoot);
    renderGlScene2D(offscreen, bakeRoot);
  });
}

const _entries: BlurEntry[] = [];
const _pool = createGlRenderTexturePool();
