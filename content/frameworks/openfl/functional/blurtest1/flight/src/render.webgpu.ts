import type { BlurEffect, DisplayObject, Sprite } from '@flighthq/sdk';
import {
  createWgpuCanvasElement,
  createWgpuRenderState,
  defaultWgpuRichTextRenderer,
  defaultWgpuShapeCommands,
  defaultWgpuShapeRenderer,
  defaultWgpuSpriteRenderer,
  prepareScene2DRender,
  registerRenderer,
  registerWgpuStandardMaterial,
  registerWgpuBitmapTextureResolver,
  registerWgpuImageTextureResolver,
  registerWgpuRenderTextureResolver,
  registerWgpuShapeCommands,
  renderWgpuScene2D,
  RichTextKind,
  ShapeKind,
  SpriteKind,
  submitWgpuRenderPass,
} from '@flighthq/sdk';

import { registerWgpuFunctionalTarget } from '@ft/verify';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createWgpuCanvasElement(800, 600, pixelRatio);
document.body.appendChild(canvas);

export const state = await createWgpuRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
});
registerRenderer(state, SpriteKind, defaultWgpuSpriteRenderer);
registerRenderer(state, ShapeKind, defaultWgpuShapeRenderer);
registerWgpuShapeCommands(defaultWgpuShapeCommands);
registerRenderer(state, RichTextKind, defaultWgpuRichTextRenderer);
registerWgpuStandardMaterial(state);
// Sprites resolve their texture through the backing-kind registry; Wgpu has no bundled equivalent
// of registerStandardGlTextureResolvers, so the individual resolvers are registered here.
registerWgpuBitmapTextureResolver(state);
registerWgpuImageTextureResolver(state);
registerWgpuRenderTextureResolver(state);
export const scale = pixelRatio;
export const width = 800;
export const height = 600;

// Per-node effects are a Gl-only capability in the SDK — applyGlRenderEffectsToRenderTexture and the
// blur helpers have no Wgpu counterpart, and the render-target pool and effect-runner registry are
// not public. So this backend draws the icons unfiltered; the Gl path is the one that exercises the
// blur. See render.webgl.ts for the filtered implementation.
export function applyBlurEffects(_list: { node: Sprite; filter: BlurEffect }[]): void {}

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderWgpuScene2D(state, root);
  submitWgpuRenderPass(state);
}

registerWgpuFunctionalTarget(state, scale);
