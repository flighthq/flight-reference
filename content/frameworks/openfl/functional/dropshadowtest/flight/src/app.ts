// Requires: images/openfl_icon.png
// Port of the OpenFL drop-shadow functional test. Shows drop shadow and inner shadow variants
// across knockout/hide source modes, with blur radius and shadow angle both animating.
// The source icon is baked once into a render texture; each frame the filter chain runs from that
// source into the per-column result texture the visible sprite samples.
// Per-node effects are a Gl-only capability in the SDK, so other backends show the unfiltered icon.
import type { DropShadowEffect, InnerShadowEffect } from '@flighthq/sdk';
import { computeGaussianSigmaFromRadius, createDropShadowEffect, createInnerShadowEffect } from '@flighthq/effects';
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
  createMatrix,
  createRenderTexture,
  createShape,
  createSprite,
  createTexture,
  getTextureHeight,
  getTextureWidth,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerDropShadowEffectPaddingResolver,
  registerGlDropShadowEffect,
  registerGlInnerShadowEffect,
  registerInnerShadowEffectPaddingResolver,
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
const imageWidth = image.width;

// `angle` is in degrees — the effect runners convert with Math.PI / 180.
type FilterFactory = (blur: number, angle: number) => DropShadowEffect | InnerShadowEffect;

function shadow(blur: number, angle: number, sourceMode?: 'knockout' | 'hide'): DropShadowEffect {
  return createDropShadowEffect({
    distance: 4,
    angle,
    color: 0x000000,
    alpha: 1,
    blurX: blur,
    blurY: blur,
    quality: 3,
    ...(sourceMode === undefined ? {} : { sourceMode }),
  });
}

function innerShadow(blur: number, angle: number, sourceMode?: 'hide'): InnerShadowEffect {
  return createInnerShadowEffect({
    distance: 4,
    angle,
    color: 0x000000,
    alpha: 1,
    blurX: blur,
    blurY: blur,
    quality: 3,
    ...(sourceMode === undefined ? {} : { sourceMode }),
  });
}

const factories: FilterFactory[] = [
  (blur, angle) => shadow(blur, angle),
  (blur, angle) => innerShadow(blur, angle),
  (blur, angle) => shadow(blur, angle, 'knockout'),
  (blur, angle) => innerShadow(blur, angle, 'hide'),
  (blur, angle) => shadow(blur, angle, 'hide'),
  (blur, angle) => innerShadow(blur, angle, 'hide'),
];

type Column = { sprite: Sprite; result: RenderTexture | null };

const columns: Column[] = factories.map((_, i) => {
  const sprite = createSprite();
  sprite.data.texture = iconTexture;
  sprite.x = 50 + i * (imageWidth + 50);
  sprite.y = 50;
  addNodeChild(root, sprite);
  return { sprite, result: null };
});

const pool = createGlRenderTexturePool();

function bakeSource(state: GlRenderState, destination: RenderTexture, texture: Texture, pad: number): void {
  const bakeRoot = createDisplayObject();
  const icon = createSprite();
  icon.data.texture = texture;
  icon.x = pad;
  icon.y = pad;
  addNodeChild(bakeRoot, icon);

  // createGlOffscreenRenderState shares the screen canvas, so the 2D walk projects into canvas space
  // (800x600) while the bound target is the render texture. Scale the offscreen render transform by
  // canvas/target on each axis so baked content lands 1:1 in the texture instead of being shrunk by
  // that ratio — non-uniformly, since the canvas is not square.
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

function initGlShadows(state: GlRenderState): () => void {
  registerStandardGlTextureResolvers(state);
  // next.1315 exports per-kind effect registration and padding resolvers; both are needed — the
  // runner draws the shadow, the padding resolver sizes the target for blur plus the offset.
  registerGlDropShadowEffect(state);
  registerGlInnerShadowEffect(state);
  registerDropShadowEffectPaddingResolver(state);
  registerInnerShadowEffectPaddingResolver(state);

  // Size everything at the widest padding the animation reaches, so the pool hands back the same
  // descriptor each frame. Measured across every factory at full blur, since the shadow's distance
  // offset extends the result further than the blur radius alone would.
  const widest = computeRenderEffectPadding(
    state,
    factories.map((f) => f(computeGaussianSigmaFromRadius(10), 45)),
  );
  const pad = Math.ceil(Math.max(widest.left, widest.right, widest.top, widest.bottom));
  const width = imageWidth + pad * 2;
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
  // blur has a public registrar (registerGlBlurEffect); the shadow runners exist but are not exported
  // from @flighthq/effects-gl, so probe once and fall back to the unfiltered source if they are absent.
  const filtered = withGlRenderTextures(state, pool, [descriptor], ([scratch]) =>
    applyGlRenderEffectsToRenderTexture(state, pool, source, columns[0].result!, scratch, [
      factories[0](computeGaussianSigmaFromRadius(4), 45),
    ]),
  );
  if (!filtered) {
    for (const column of columns) column.sprite.data.texture = source;
    return () => target.render(root);
  }

  return () => {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const blur = computeGaussianSigmaFromRadius(2 + sinT * 8);
    const angle = sinT * 360;
    for (let i = 0; i < columns.length; i++) {
      const result = columns[i].result;
      if (result === null) continue;
      const filter = factories[i](blur, angle);
      withGlRenderTextures(state, pool, [descriptor], ([scratch]) => {
        applyGlRenderEffectsToRenderTexture(state, pool, source, result, scratch, [filter]);
      });
    }
    target.render(root);
  };
}

const renderFrame: () => void =
  target.kind === 'webgl' ? initGlShadows(target.state as GlRenderState) : () => target.render(root);

function enterFrame(): void {
  renderFrame();
  requestAnimationFrame(enterFrame);
}
enterFrame();
