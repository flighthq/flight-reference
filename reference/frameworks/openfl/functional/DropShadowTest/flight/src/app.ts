import type { DropShadowFilter, InnerShadowFilter } from '@flighthq/filters';
import { createDropShadowFilter, createInnerShadowFilter } from '@flighthq/filters';
import { computeDropShadowFilterCss } from '@flighthq/filters-css';
import { applyDropShadowFilterToGl, applyInnerShadowFilterToGl } from '@flighthq/filters-gl';
import type {
  Bitmap,
  CanvasRenderState,
  DisplayObject,
  DomRenderState,
  Matrix,
  GlRenderState,
  GlRenderTarget,
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
  height: 400,
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
const imageWidth = image.width;

const nodes: DisplayObject[] = [];
for (let i = 0; i < 6; i++) {
  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.data.smoothing = true;
  bmp.x = 50 + i * (imageWidth + 50);
  bmp.y = 50;
  addNodeChild(root, bmp);
  nodes.push(bmp);
}

type FilterFactory = (blur: number, angle: number) => DropShadowFilter | InnerShadowFilter;
const factories: FilterFactory[] = [
  (blur, angle) =>
    createDropShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
    }),
  (blur, angle) =>
    createInnerShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
    }),
  (blur, angle) =>
    createDropShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
      knockout: true,
    }),
  (blur, angle) =>
    createInnerShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
    }),
  (blur, angle) =>
    createDropShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
      hideObject: true,
    }),
  (blur, angle) =>
    createInnerShadowFilter({
      distance: 4,
      angle,
      color: 0x000000,
      alpha: 1,
      blurX: blur,
      blurY: blur,
      quality: 3,
    }),
];

function createFilters(blur: number, angle: number): (DropShadowFilter | InnerShadowFilter)[] {
  return factories.map((f) => f(blur, angle));
}

const _bounds = createRectangle();
const _identity = createMatrix();
const MAX_PADDING = Math.ceil(10 * 3 + 4 + 4);

if (target.kind === 'canvas') {
  animateCanvas(target.state);
} else if (target.kind === 'webgl') {
  animateGl(target.state);
} else if (target.kind === 'dom') {
  animateDom(target.state);
} else {
  target.render(root);
}

function animateCanvas(state: CanvasRenderState): void {
  const caches = nodes.map((node) => {
    const cache = createRenderCache();
    useRenderCache(state, node, cache);
    return cache;
  });

  function frame(): void {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const filters = createFilters(2 + sinT * 8, sinT * 360);

    for (let i = 0; i < nodes.length; i++) {
      const filter = filters[i];
      if (filter.kind === 'InnerShadowFilter') continue;
      const css = computeDropShadowFilterCss(filter);
      if (css === null) continue;
      const img = (nodes[i] as Bitmap).data.image;
      if (img === null || img.source === null) continue;
      computeNodeBoundsRectangle(_bounds, nodes[i], nodes[i]);
      const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
      const renderTarget = ensureCanvasRenderCacheTarget(state, caches[i], w, h);
      const ctx = renderTarget.context;
      ctx.clearRect(0, 0, renderTarget.canvas.width, renderTarget.canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.filter = css;
      ctx.drawImage(img.source, MAX_PADDING - _bounds.x, MAX_PADDING - _bounds.y);
      ctx.filter = 'none';
      computeRenderCacheTransform(caches[i].transform, _bounds, MAX_PADDING, MAX_PADDING);
    }

    target.render(root);
    requestAnimationFrame(frame);
  }

  frame();
}

type ShadowEntry = {
  node: DisplayObject;
  source: GlRenderTarget;
  dest: GlRenderTarget;
  scratch: [GlRenderTarget, GlRenderTarget, GlRenderTarget];
  cacheTransform: Matrix;
  sceneTransform: Matrix;
};

function animateGl(state: GlRenderState): void {
  const entries: ShadowEntry[] = [];
  for (const node of nodes) {
    computeNodeBoundsRectangle(_bounds, node, node);
    const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
    entries.push({
      node,
      source: createGlRenderTarget(state, { width: w, height: h }),
      dest: createGlRenderTarget(state, { width: w, height: h }),
      scratch: [
        createGlRenderTarget(state, { width: w, height: h }),
        createGlRenderTarget(state, { width: w, height: h }),
        createGlRenderTarget(state, { width: w, height: h }),
      ],
      cacheTransform: createMatrix(),
      sceneTransform: createMatrix(),
    });
  }

  function frame(): void {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const filters = createFilters(2 + sinT * 8, sinT * 360);

    prepareDisplayObjectRender(state, root);

    for (const entry of entries) {
      const renderProxy = getRenderProxy2D(state, entry.node);
      if (renderProxy !== undefined) copyMatrix(entry.sceneTransform, renderProxy.transform2D);
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const filter = filters[i];
      const { node, source, dest, scratch } = entry;
      computeNodeBoundsRectangle(_bounds, node, node);
      computeRenderCacheTransform(entry.cacheTransform, _bounds, MAX_PADDING, MAX_PADDING);
      const renderProxy = getRenderProxy2D(state, node);
      if (renderProxy === undefined) continue;
      setTranslation(renderProxy.transform2D, MAX_PADDING - _bounds.x, MAX_PADDING - _bounds.y);
      beginGlRenderTarget(state, source, _identity);
      clearGlRenderTarget(state, source);
      renderGlDisplayObject(state, node);
      for (const s of scratch) clearGlRenderTarget(state, s);
      if (filter.kind === 'InnerShadowFilter') {
        applyInnerShadowFilterToGl(state, source, dest, scratch, filter);
      } else {
        applyDropShadowFilterToGl(state, source, dest, scratch, filter);
      }
      endGlRenderTarget(state);
    }

    for (const entry of entries) {
      const renderProxy = getRenderProxy2D(state, entry.node);
      if (renderProxy === undefined) continue;
      copyMatrix(renderProxy.transform2D, entry.sceneTransform);
      renderProxy.visible = false;
    }

    renderGlBackground(state);
    renderGlDisplayObject(state, root);

    for (const entry of entries) {
      const renderProxy = getRenderProxy2D(state, entry.node);
      if (renderProxy === undefined) continue;
      renderProxy.visible = true;
      drawGlRenderTargetResult(state, renderProxy, entry.dest, entry.cacheTransform);
    }

    requestAnimationFrame(frame);
  }

  frame();
}

function animateDom(state: DomRenderState): void {
  enableDomCssFilterSupport(state);

  function frame(): void {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const filters = createFilters(2 + sinT * 8, sinT * 360);

    for (let i = 0; i < nodes.length; i++) {
      const filter = filters[i];
      if (filter.kind === 'InnerShadowFilter') continue;
      setDomCssFilter(state, nodes[i], computeDropShadowFilterCss(filter));
    }

    target.render(root);
    requestAnimationFrame(frame);
  }

  frame();
}

function setTranslation(out: Matrix, tx: number, ty: number): void {
  out.a = 1;
  out.b = 0;
  out.c = 0;
  out.d = 1;
  out.tx = tx;
  out.ty = ty;
}
