import type { BlurEffect } from '@flighthq/sdk';
import { applyBlurEffectToGlRenderTextures } from '@flighthq/effects-gl';
import type { DisplayObject, RenderTexture, Sprite } from '@flighthq/sdk';
import {
  addNodeChild,
  createDisplayObject,
  createGlCanvasElement,
  createGlOffscreenRenderState,
  createGlRenderState,
  createRenderTexture,
  createSprite,
  defaultGlRichTextRenderer,
  defaultGlSpriteRenderer,
  getBlurEffectPadding,
  getTextureHeight,
  getTextureWidth,
  prepareScene2DRender,
  registerRenderer,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  renderGlBackground,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  RichTextKind,
  setSpriteTexture,
  SpriteKind,
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
registerStandardGlMaterial(state);
// Sprites resolve their texture through the backing-kind registry; without this both the baked
// source and the blurred result resolve to null and the sprites draw nothing.
registerStandardGlTextureResolvers(state);
export const scale = pixelRatio;
export const width = 800;
export const height = 600;

// Each blurred node keeps three same-sized render textures: `source` holds the unfiltered content,
// baked once, and the separable blur runs source → result using `temp` as the intermediate. The
// visible sprite samples `result`, so the blur composites through the normal 2D walk and picks up
// the node's scene transform (which carries the stage pixelRatio) for free.
type BlurEntry = {
  sprite: Sprite;
  filter: Readonly<BlurEffect>;
  source: RenderTexture;
  result: RenderTexture;
  temp: RenderTexture;
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
    const descriptor = { width: w, height: h };

    const source = createRenderTexture(descriptor);
    bakeSource(source, node, pad);

    const result = createRenderTexture(descriptor);
    setSpriteTexture(node, result);
    node.x -= pad;
    node.y -= pad;

    _entries.push({ sprite: node, filter, source, result, temp: createRenderTexture(descriptor) });
  }
}

export function render(root: DisplayObject): void {
  for (const entry of _entries) {
    applyBlurEffectToGlRenderTextures(state, entry.source, entry.result, entry.temp, entry.filter);
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
  setSpriteTexture(copy, node.data.texture);
  copy.x = pad;
  copy.y = pad;
  addNodeChild(bakeRoot, copy);

  const offscreen = createGlOffscreenRenderState(state);
  renderIntoGlRenderTexture(state, destination, () => {
    prepareScene2DRender(offscreen, bakeRoot);
    renderGlScene2D(offscreen, bakeRoot);
  });
}

const _entries: BlurEntry[] = [];
