// Requires: assets/openfl.png
// Port of the OpenFL glow functional test. Shows outer glow and inner glow filter variants.
// Abstract filter descriptors are created here; each render layer applies them with
// the strategy that suits its substrate:
//   - DOM:    element CSS filter (computeOuterGlowEffectCss → setDomCssFilter)
//   - Canvas: baked once into an offscreen render cache via CSS drop-shadow(0,0,σ,color)
//   - Gl:  offscreen render target + applyOuterGlowEffectToGl /
//             applyInnerGlowEffectToGl shader passes
// CSS only covers non-knockout outer glow; inner glow and knockout are Gl-only.
import type { InnerGlowEffect, OuterGlowEffect } from '@flighthq/effects';
import { computeGaussianSigmaFromRadius, createInnerGlowEffect, createOuterGlowEffect } from '@flighthq/effects';
import { computeOuterGlowEffectCss } from '@flighthq/effects-canvas';
import { applyInnerGlowEffectToGl, applyOuterGlowEffectToGl } from '@flighthq/effects-gl';
import type {
  Bitmap,
  CanvasRenderState,
  DisplayObject,
  DomRenderState,
  Matrix,
  GlRenderState,
  GlRenderTarget,
  GlRenderTargetPool,
} from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  beginGlRenderTarget,
  BitmapKind,
  clearGlRenderTarget,
  computeNodeBoundsRectangle,
  computeRenderCacheTransform,
  computeRenderTargetSize,
  copyMatrix,
  createBitmap,
  createDisplayContainer,
  createMatrix,
  createRectangle,
  createRenderCache,
  createShape,
  createGlRenderTarget,
  createGlRenderTargetPool,
  drawGlRenderTargetResult,
  enableDomCssFilterSupport,
  endGlRenderTarget,
  ensureCanvasRenderCacheTarget,
  getRenderProxy2D,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  renderGlBackground,
  renderGlDisplayObject,
  setDomCssFilter,
  ShapeKind,
  useRenderCache,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  kinds: [BitmapKind, ShapeKind],
  cache: true,
});
const { scale } = target;

const root = createDisplayContainer();
root.scaleX = scale;
root.scaleY = scale;

const W = target.width / scale;
const H = target.height / scale;

const bg = createShape();
appendShapeBeginFill(bg, 0xffffff);
appendShapeRectangle(bg, 0, 0, W, H);
appendShapeEndFill(bg);
addNodeChild(root, bg);

const image = await loadImageResourceFromUrl('assets/openfl.png');

const colSpacing = image.width + 50;

type FilterEntry = { node: DisplayObject; filter: OuterGlowEffect | InnerGlowEffect };
const filtered: FilterEntry[] = [];

for (let i = 0; i < 4; i++) {
  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.data.smoothing = true;
  bmp.x = 50 + i * colSpacing;
  bmp.y = 50;
  addNodeChild(root, bmp);
  filtered.push({
    node: bmp,
    filter: createOuterGlowEffect({
      color: 0xff0000,
      blurX: computeGaussianSigmaFromRadius(6),
      blurY: computeGaussianSigmaFromRadius(6),
      strength: 2,
      quality: 3,
    }),
  });
}
filtered[1].filter = createInnerGlowEffect({
  color: 0xff0000,
  blurX: computeGaussianSigmaFromRadius(6),
  blurY: computeGaussianSigmaFromRadius(6),
  strength: 2,
  quality: 3,
});
filtered[2].filter = createOuterGlowEffect({
  color: 0xff0000,
  blurX: computeGaussianSigmaFromRadius(6),
  blurY: computeGaussianSigmaFromRadius(6),
  strength: 2,
  quality: 3,
  knockout: true,
});
filtered[3].filter = createInnerGlowEffect({
  color: 0xff0000,
  blurX: computeGaussianSigmaFromRadius(6),
  blurY: computeGaussianSigmaFromRadius(6),
  strength: 2,
  quality: 3,
});

const _bounds = createRectangle();
const _identity = createMatrix();
const MAX_PADDING = Math.ceil(10 * 3 + 4);

let frame: () => void;

if (target.kind === 'canvas') {
  const caches = initCanvasGlow(target.state, filtered);
  frame = () => {
    updateFilters();
    renderCanvasGlowFrame(target.state, caches);
    target.render(root);
  };
} else if (target.kind === 'webgl') {
  const { entries, pool } = initGlGlow(target.state, filtered);
  frame = () => {
    updateFilters();
    for (let i = 0; i < entries.length; i++) entries[i].filter = filtered[i].filter;
    renderGlGlowFrame(target.state, entries, pool, root);
  };
} else if (target.kind === 'dom') {
  enableDomCssFilterSupport(target.state);
  frame = () => {
    updateFilters();
    applyDomGlow(target.state, filtered);
    target.render(root);
  };
} else {
  frame = () => {
    target.render(root);
  };
}

function enterFrame(): void {
  frame();
  requestAnimationFrame(enterFrame);
}
enterFrame();

function updateFilters(): void {
  const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
  const blur = computeGaussianSigmaFromRadius(2 + sinT * 8);
  filtered[0].filter = createOuterGlowEffect({ color: 0xff0000, blurX: blur, blurY: blur, strength: 2, quality: 3 });
  filtered[1].filter = createInnerGlowEffect({ color: 0xff0000, blurX: blur, blurY: blur, strength: 2, quality: 3 });
  filtered[2].filter = createOuterGlowEffect({
    color: 0xff0000,
    blurX: blur,
    blurY: blur,
    strength: 2,
    quality: 3,
    knockout: true,
  });
  filtered[3].filter = createInnerGlowEffect({ color: 0xff0000, blurX: blur, blurY: blur, strength: 2, quality: 3 });
}

type CanvasGlowCache = {
  node: DisplayObject;
  idx: number;
  cache: ReturnType<typeof createRenderCache>;
};

function initCanvasGlow(state: CanvasRenderState, list: FilterEntry[]): CanvasGlowCache[] {
  const caches: CanvasGlowCache[] = [];
  for (let i = 0; i < list.length; i++) {
    const { node, filter } = list[i];
    if (filter.kind === 'InnerGlowEffect') continue;
    const img = (node as Bitmap).data.image;
    if (img === null || img.source === null) continue;
    computeNodeBoundsRectangle(_bounds, node, node);
    const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
    const cache = createRenderCache();
    useRenderCache(state, node, cache);
    ensureCanvasRenderCacheTarget(state, cache, w, h);
    caches.push({ node, idx: i, cache });
  }
  return caches;
}

function renderCanvasGlowFrame(state: CanvasRenderState, caches: CanvasGlowCache[]): void {
  for (const { node, idx, cache } of caches) {
    const { filter } = filtered[idx];
    const css = computeOuterGlowEffectCss(filter as OuterGlowEffect);
    if (css === null) continue;
    const img = (node as Bitmap).data.image;
    if (img === null || img.source === null) continue;
    computeNodeBoundsRectangle(_bounds, node, node);
    const padding = glowPadding(filter);
    const { width: w, height: h } = computeRenderTargetSize(_bounds, padding, 1, 1);
    const renderTarget = ensureCanvasRenderCacheTarget(state, cache, w, h);
    const ctx = renderTarget.context;
    ctx.clearRect(0, 0, renderTarget.canvas.width, renderTarget.canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = css;
    ctx.drawImage(img.source, padding - _bounds.x, padding - _bounds.y);
    ctx.filter = 'none';
    computeRenderCacheTransform(cache.transform, _bounds, padding, padding);
  }
}

type GlowEntry = {
  node: DisplayObject;
  filter: OuterGlowEffect | InnerGlowEffect;
  source: GlRenderTarget;
  dest: GlRenderTarget;
  cacheTransform: Matrix;
  sceneTransform: Matrix;
};

function initGlGlow(state: GlRenderState, list: FilterEntry[]): { entries: GlowEntry[]; pool: GlRenderTargetPool } {
  const pool: GlRenderTargetPool = createGlRenderTargetPool();
  const entries: GlowEntry[] = [];
  for (const { node, filter } of list) {
    computeNodeBoundsRectangle(_bounds, node, node);
    const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
    entries.push({
      node,
      filter,
      source: createGlRenderTarget(state, { width: w, height: h }),
      dest: createGlRenderTarget(state, { width: w, height: h }),
      cacheTransform: createMatrix(),
      sceneTransform: createMatrix(),
    });
  }
  return { entries, pool };
}

function renderGlGlowFrame(
  state: GlRenderState,
  entries: GlowEntry[],
  pool: GlRenderTargetPool,
  root: DisplayObject,
): void {
  prepareDisplayObjectRender(state, root);

  for (const entry of entries) {
    const renderProxy = getRenderProxy2D(state, entry.node);
    if (renderProxy !== undefined) copyMatrix(entry.sceneTransform, renderProxy.transform2D);
  }

  for (const entry of entries) {
    const { node, filter, source, dest } = entry;
    const padding = glowPadding(filter);
    computeNodeBoundsRectangle(_bounds, node, node);
    computeRenderCacheTransform(entry.cacheTransform, _bounds, padding, padding);
    const renderProxy = getRenderProxy2D(state, node);
    if (renderProxy === undefined) continue;
    setTranslation(renderProxy.transform2D, padding - _bounds.x, padding - _bounds.y);
    beginGlRenderTarget(state, source, _identity);
    clearGlRenderTarget(state, source);
    renderGlDisplayObject(state, node);
    clearGlRenderTarget(state, dest);
    if (filter.kind === 'InnerGlowEffect') {
      applyInnerGlowEffectToGl(state, source, dest, pool, filter);
    } else {
      applyOuterGlowEffectToGl(state, source, dest, pool, filter);
    }
    endGlRenderTarget(state);
  }

  for (const entry of entries) {
    const renderProxy = getRenderProxy2D(state, entry.node);
    if (renderProxy !== undefined) copyMatrix(renderProxy.transform2D, entry.sceneTransform);
  }

  renderGlBackground(state);
  renderGlDisplayObject(state, root);

  for (const entry of entries) {
    const renderProxy = getRenderProxy2D(state, entry.node);
    if (renderProxy === undefined) continue;
    drawGlRenderTargetResult(state, renderProxy, entry.dest, entry.cacheTransform);
  }
}

function applyDomGlow(state: DomRenderState, list: FilterEntry[]): void {
  for (const { node, filter } of list) {
    if (filter.kind === 'InnerGlowEffect') continue;
    setDomCssFilter(state, node, computeOuterGlowEffectCss(filter as OuterGlowEffect));
  }
}

function glowPadding(filter: Readonly<OuterGlowEffect | InnerGlowEffect>): number {
  return Math.ceil(Math.max(filter.blurX ?? 3, filter.blurY ?? 3) * 3 + 4);
}

function setTranslation(out: Matrix, tx: number, ty: number): void {
  out.a = 1;
  out.b = 0;
  out.c = 0;
  out.d = 1;
  out.tx = tx;
  out.ty = ty;
}
