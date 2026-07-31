// Requires: images/openfl_icon.png
// Port of the OpenFL glow functional test. Shows outer glow and inner glow filter variants.
// The source icon is baked once into a render texture; each frame the animated filter chain runs
// from that source into the per-column result texture the visible sprite samples.
// Per-node effects are a Gl-only capability in the SDK, so other backends show the unfiltered icon.
import type { InnerGlowEffect, OuterGlowEffect } from '@flighthq/sdk';
import { computeGaussianSigmaFromRadius, createInnerGlowEffect, createOuterGlowEffect } from '@flighthq/effects';
import type { GlRenderState, RenderTexture, Sprite, Texture } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  applyGlRenderEffectsToRenderTexture,
  computeRenderEffectPadding,
  createDisplayObject,
  createGlOffscreenRenderState,
  createGlRenderTexturePool,
  createRenderTexture,
  createShape,
  createSprite,
  createTexture,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerGlInnerGlowEffect,
  registerGlOuterGlowEffect,
  registerInnerGlowEffectPaddingResolver,
  registerOuterGlowEffectPaddingResolver,
  registerStandardGlTextureResolvers,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  ShapeKind,
  SpriteKind,
  withGlRenderTextures,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  kinds: [SpriteKind, ShapeKind],
  cache: true,
});
const root = createDisplayObject();

// The functional target's renderTransform2D already carries devicePixelRatio, so the scene is
// authored directly in logical units — matching the OpenFL reference (800×600, bitmaps at natural
// size). Scaling the root by `scale` on top of that would render everything pixelRatio× too large.
const W = target.width;
const H = target.height;

const bg = createShape();
appendShapeBeginFill(bg, 0xffffff);
appendShapeRectangle(bg, 0, 0, W, H);
appendShapeEndFill(bg);
addNodeChild(root, bg);

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon.png');
const iconTexture = createTexture({ source: image });

const colSpacing = image.width + 50;

function makeFilter(index: number, blur: number): OuterGlowEffect | InnerGlowEffect {
  const base = { color: 0xff0000, blurX: blur, blurY: blur, strength: 2, quality: 3 };
  switch (index) {
    case 1:
      return createInnerGlowEffect(base);
    case 2:
      return createOuterGlowEffect({ ...base, sourceMode: 'knockout' });
    case 3:
      return createInnerGlowEffect({ ...base, sourceMode: 'hide' });
    default:
      return createOuterGlowEffect(base);
  }
}

type Column = { sprite: Sprite; filter: OuterGlowEffect | InnerGlowEffect; result: RenderTexture | null };

const columns: Column[] = [];
for (let i = 0; i < 4; i++) {
  const sprite = createSprite();
  sprite.data.texture = iconTexture;
  sprite.x = 50 + i * colSpacing;
  sprite.y = 50;
  addNodeChild(root, sprite);
  columns.push({ sprite, filter: makeFilter(i, computeGaussianSigmaFromRadius(6)), result: null });
}

const pool = createGlRenderTexturePool();

function bakeSource(state: GlRenderState, destination: RenderTexture, texture: Texture, pad: number): void {
  const bakeRoot = createDisplayObject();
  const icon = createSprite();
  icon.data.texture = texture;
  icon.x = pad;
  icon.y = pad;
  addNodeChild(bakeRoot, icon);

  // A second pipeline over the same context: it inherits the screen state's registrations but keeps
  // its own identity render transform, so the icon bakes at texture scale rather than scene scale.
  const offscreen = createGlOffscreenRenderState(state);
  renderIntoGlRenderTexture(state, destination, () => {
    prepareScene2DRender(offscreen, bakeRoot);
    renderGlScene2D(offscreen, bakeRoot);
  });
}

function initGlGlow(state: GlRenderState): () => void {
  registerStandardGlTextureResolvers(state);
  // next.1315 exports per-kind effect registration and padding resolvers; both are needed — the
  // runner draws the glow, the padding resolver sizes the target so the glow is not clipped.
  registerGlOuterGlowEffect(state);
  registerGlInnerGlowEffect(state);
  registerOuterGlowEffectPaddingResolver(state);
  registerInnerGlowEffectPaddingResolver(state);

  // Allocate every texture at the widest padding the animation reaches, so the pool hands back the
  // same descriptor each frame instead of reallocating as the blur radius breathes.
  const widest = computeRenderEffectPadding(state, makeFilter(0, computeGaussianSigmaFromRadius(10)));
  const pad = Math.ceil(Math.max(widest.left, widest.right, widest.top, widest.bottom));
  const width = image.width + pad * 2;
  const height = image.height + pad * 2;
  const descriptor = { width, height };

  const source = createRenderTexture({
    width,
    height,
    // Clear to transparent: the effect runners derive the glow/shadow silhouette from the source's
    // alpha, so an opaque clear makes the whole texture rectangle the silhouette.
    clearColors: [0x00000000],
  });
  bakeSource(state, source, iconTexture, pad);

  for (const column of columns) {
    const result = createRenderTexture({
      width,
      height,
      // Clear to transparent: the effect runners derive the glow/shadow silhouette from the source's
      // alpha, so an opaque clear makes the whole texture rectangle the silhouette.
      clearColors: [0x00000000],
    });
    column.result = result;
    column.sprite.data.texture = result;
    column.sprite.x -= pad;
    column.sprite.y -= pad;
  }

  // applyGlRenderEffectsToRenderTexture skips effect kinds with no registered runner and leaves the
  // destination untouched — a sprite pointed at it would sample a never-written texture. On 1220 only
  // blur has a public registrar (registerGlBlurEffect); the glow runners exist but are not exported
  // from @flighthq/effects-gl, so probe once and fall back to the unfiltered source if they are absent.
  const filtered = withGlRenderTextures(state, pool, [descriptor], ([scratch]) =>
    applyGlRenderEffectsToRenderTexture(state, pool, source, columns[0].result!, scratch, [columns[0].filter]),
  );
  if (!filtered) {
    for (const column of columns) column.sprite.data.texture = source;
    return () => target.render(root);
  }

  return () => {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const blur = computeGaussianSigmaFromRadius(2 + sinT * 8);
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const result = column.result;
      if (result === null) continue;
      column.filter = makeFilter(i, blur);
      withGlRenderTextures(state, pool, [descriptor], ([scratch]) => {
        applyGlRenderEffectsToRenderTexture(state, pool, source, result, scratch, [column.filter]);
      });
    }
    target.render(root);
  };
}

const renderFrame: () => void =
  target.kind === 'webgl' ? initGlGlow(target.state as GlRenderState) : () => target.render(root);

function enterFrame(): void {
  renderFrame();
  requestAnimationFrame(enterFrame);
}
enterFrame();
