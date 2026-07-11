import type {
  BlurFilter,
  ColorMatrixFilter,
  DisplacementMapFilter,
  DropShadowFilter,
  OuterGlowFilter,
} from '@flighthq/filters';
import {
  createBlurFilter,
  createColorMatrixFilter,
  createDisplacementMapFilter,
  createDropShadowFilter,
  createOuterGlowFilter,
} from '@flighthq/filters';
import { computeBlurFilterCss, computeDropShadowFilterCss, computeOuterGlowFilterCss } from '@flighthq/filters-css';
import {
  applyBoxBlurFilterToGl,
  applyColorMatrixFilterToGl,
  applyDisplacementMapFilterToGl,
  applyDropShadowFilterToGl,
  applyOuterGlowFilterToGl,
} from '@flighthq/filters-gl';
import {
  createBrightnessColorMatrix,
  createContrastColorMatrix,
  createGrayscaleColorMatrix,
  createHueRotateColorMatrix,
  createIdentityColorMatrix,
  createInvertColorMatrix,
  createSaturationColorMatrix,
} from '@flighthq/filters';
import type {
  Bitmap,
  CanvasRenderState,
  DisplayObject,
  DomRenderState,
  GlRenderState,
  GlRenderTarget,
  Matrix,
} from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  beginGlRenderTarget,
  BitmapKind,
  clearGlRenderTarget,
  computeNodeBoundsRectangle,
  computeRenderCacheTransform,
  computeRenderTargetSize,
  connectInputToInteraction,
  copyMatrix,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRectangle,
  createRenderCache,
  createRichText,
  createGlRenderTarget,
  drawGlRenderTargetResult,
  enableDomCssFilterSupport,
  endGlRenderTarget,
  ensureCanvasRenderCacheTarget,
  getRenderProxy2D,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  renderGlBackground,
  renderGlDisplayObject,
  RichTextKind,
  setDomCssFilter,
  TextLabelKind,
  useRenderCache,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

type FilterType = 'none' | 'blur' | 'dropShadow' | 'glow' | 'colorMatrix' | 'displacementMap';

interface FilterEntry {
  name: string;
  type: FilterType;
  cssFilter: string;
  blur?: BlurFilter;
  dropShadow?: DropShadowFilter;
  glow?: OuterGlowFilter;
  colorMatrix?: ColorMatrixFilter;
  displacementMap?: DisplacementMapFilter;
}

const HueDegrees = 180;

const filterInfos: FilterEntry[] = [
  { name: 'Identity', type: 'none', cssFilter: 'none' },
  {
    name: 'Blur',
    type: 'blur',
    cssFilter: 'blur(1px)',
    blur: createBlurFilter({ blurX: 1, blurY: 1 }),
  },
  {
    name: 'Drop Shadow',
    type: 'dropShadow',
    cssFilter: 'drop-shadow(2.8px 2.8px 1px rgba(0,0,0,0.5))',
    dropShadow: createDropShadowFilter({ distance: 4, blurX: 1, blurY: 1, quality: 1 }),
  },
  {
    name: 'Glow',
    type: 'glow',
    cssFilter: 'drop-shadow(0 0 1px yellow)',
    glow: createOuterGlowFilter({ color: 0xffff00, blurX: 1, blurY: 1, strength: 1, quality: 1 }),
  },
  {
    name: 'Displacement Map',
    type: 'displacementMap',
    cssFilter: 'none',
    displacementMap: createDisplacementMapFilter({ componentX: 0, componentY: 1, scaleX: 25, scaleY: 25 }),
  },
  {
    name: 'Invert',
    type: 'colorMatrix',
    cssFilter: 'invert(1)',
    colorMatrix: createColorMatrixFilter(createInvertColorMatrix()),
  },
  {
    name: 'Grayscale',
    type: 'colorMatrix',
    cssFilter: 'grayscale(1)',
    colorMatrix: createColorMatrixFilter(createGrayscaleColorMatrix()),
  },
  {
    name: 'Saturation',
    type: 'colorMatrix',
    cssFilter: 'saturate(2)',
    colorMatrix: createColorMatrixFilter(createSaturationColorMatrix(2)),
  },
  {
    name: 'Contrast',
    type: 'colorMatrix',
    cssFilter: 'contrast(1.75)',
    colorMatrix: createColorMatrixFilter(createContrastColorMatrix(1.75)),
  },
  {
    name: 'Brightness',
    type: 'colorMatrix',
    cssFilter: 'brightness(0.75)',
    colorMatrix: createColorMatrixFilter(createBrightnessColorMatrix(-63.75)),
  },
  {
    name: 'Hue',
    type: 'colorMatrix',
    cssFilter: `hue-rotate(${HueDegrees.toFixed(1)}deg)`,
    colorMatrix: createColorMatrixFilter(createHueRotateColorMatrix(HueDegrees)),
  },
  {
    name: 'Hue + Shadow',
    type: 'colorMatrix',
    cssFilter: `hue-rotate(${HueDegrees.toFixed(1)}deg) drop-shadow(2.8px 2.8px 4px rgba(0,0,0,0.5))`,
    colorMatrix: createColorMatrixFilter(createHueRotateColorMatrix(HueDegrees)),
    dropShadow: createDropShadowFilter({ distance: 4, blurX: 1, blurY: 1, quality: 1 }),
  },
];

let filterIndex = 0;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  blend: true,
  cache: true,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const rocket = createBitmap();
rocket.data.image = atlas;
rocket.data.sourceRectangle = createRectangle(322, 1, 256, 142);
rocket.x = CenterX - 128;
rocket.y = 170;
addNodeChild(root, rocket);

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, align: 'center' };
infoText.x = 10;
infoText.y = 330;
infoText.data.width = 300;
infoText.data.height = 32;
infoText.data.text = filterInfos[0].name;
addNodeChild(root, infoText);

registerDefaultHitTestPoints();
const inputMgr = createInputManager();
attachPointerInput(inputMgr, (target.state as { canvas: HTMLCanvasElement }).canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(inputMgr, interaction, 1);

function switchFilter(): void {
  filterIndex = (filterIndex + 1) % filterInfos.length;
  infoText.data.text = filterInfos[filterIndex].name;
  invalidateNodeAppearance(infoText);
}

const switchBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Switch Filter',
  width: 128,
  height: 32,
  onTriggered: switchFilter,
});
switchBtn.root.x = CenterX - 64;
switchBtn.root.y = 15;
switchBtn.connect(interaction);
addNodeChild(root, switchBtn.root);

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 50,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 50 + 4;
backBtn.connect(interaction);
addNodeChild(root, backBtn.root);

const _bounds = createRectangle();
const _identity = createMatrix();
const MAX_PADDING = Math.ceil(8 * 3 + 4);

function generateNoiseCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const d = imageData.data;

  function hash(x: number, y: number, channel: number): number {
    let h = 5 + x * 374761393 + y * 668265263 + channel * 1274126177;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  function smoothNoise(px: number, py: number, freq: number, channel: number): number {
    const fx = px / freq;
    const fy = py / freq;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const sx = fx - ix;
    const sy = fy - iy;
    const u = sx * sx * (3 - 2 * sx);
    const v = sy * sy * (3 - 2 * sy);
    const a = hash(ix, iy, channel);
    const b = hash(ix + 1, iy, channel);
    const cc = hash(ix, iy + 1, channel);
    const dd = hash(ix + 1, iy + 1, channel);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let amp = 1;
      let total = 0;
      for (let oct = 0; oct < 3; oct++) {
        const freq = 20 / (1 << oct);
        r += smoothNoise(x, y, freq, oct * 2) * amp;
        g += smoothNoise(x, y, freq, oct * 2 + 1) * amp;
        total += amp;
        amp *= 0.5;
      }
      const idx = (y * width + x) * 4;
      d[idx] = Math.round((r / total) * 255);
      d[idx + 1] = Math.round((g / total) * 255);
      d[idx + 2] = 128;
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return c;
}

if (target.kind === 'webgl') {
  runGl(target.state);
} else if (target.kind === 'canvas') {
  runCanvas(target.state);
} else if (target.kind === 'dom') {
  runDom(target.state);
} else {
  target.render(root);
}

function runGl(state: GlRenderState): void {
  computeNodeBoundsRectangle(_bounds, rocket, rocket);
  const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
  const source = createGlRenderTarget(state, { width: w, height: h });
  const dest = createGlRenderTarget(state, { width: w, height: h });
  const scratch: [GlRenderTarget, GlRenderTarget, GlRenderTarget] = [
    createGlRenderTarget(state, { width: w, height: h }),
    createGlRenderTarget(state, { width: w, height: h }),
    createGlRenderTarget(state, { width: w, height: h }),
  ];
  const mapTarget = createGlRenderTarget(state, { width: w, height: h });
  const cacheTransform = createMatrix();
  const sceneTransform = createMatrix();

  const noiseBmp = createBitmap();
  noiseBmp.data.image = createImageResourceFromCanvas(generateNoiseCanvas(w, h));
  addNodeChild(root, noiseBmp);
  prepareDisplayObjectRender(state, root);
  {
    const noiseProxy = getRenderProxy2D(state, noiseBmp);
    if (noiseProxy !== undefined) setTranslation(noiseProxy.transform2D, 0, 0);
    beginGlRenderTarget(state, mapTarget, _identity);
    clearGlRenderTarget(state, mapTarget);
    renderGlDisplayObject(state, noiseBmp);
    endGlRenderTarget(state);
  }
  noiseBmp.alpha = 0;
  invalidateNodeAppearance(noiseBmp);

  function renderFrame(): void {
    const entry = filterInfos[filterIndex];

    prepareDisplayObjectRender(state, root);
    const proxy = getRenderProxy2D(state, rocket);
    if (proxy !== undefined) copyMatrix(sceneTransform, proxy.transform2D);

    if (entry.type !== 'none' && proxy !== undefined) {
      computeNodeBoundsRectangle(_bounds, rocket, rocket);
      computeRenderCacheTransform(cacheTransform, _bounds, MAX_PADDING, MAX_PADDING);
      setTranslation(proxy.transform2D, MAX_PADDING - _bounds.x, MAX_PADDING - _bounds.y);

      beginGlRenderTarget(state, source, _identity);
      clearGlRenderTarget(state, source);
      renderGlDisplayObject(state, rocket);
      clearGlRenderTarget(state, dest);
      for (const s of scratch) clearGlRenderTarget(state, s);

      if (entry.type === 'blur' && entry.blur !== undefined) {
        applyBoxBlurFilterToGl(state, source, dest, scratch[0], entry.blur);
      } else if (entry.type === 'dropShadow' && entry.dropShadow !== undefined) {
        applyDropShadowFilterToGl(state, source, dest, scratch, entry.dropShadow);
      } else if (entry.type === 'glow' && entry.glow !== undefined) {
        applyOuterGlowFilterToGl(state, source, dest, scratch, entry.glow);
      } else if (entry.type === 'displacementMap' && entry.displacementMap !== undefined) {
        applyDisplacementMapFilterToGl(state, source, mapTarget, dest, entry.displacementMap);
      } else if (entry.type === 'colorMatrix' && entry.colorMatrix !== undefined) {
        if (entry.dropShadow !== undefined) {
          applyColorMatrixFilterToGl(state, source, scratch[0], entry.colorMatrix);
          applyDropShadowFilterToGl(state, scratch[0], dest, [scratch[1], scratch[2], source], entry.dropShadow);
        } else {
          applyColorMatrixFilterToGl(state, source, dest, entry.colorMatrix);
        }
      }

      endGlRenderTarget(state);

      copyMatrix(proxy.transform2D, sceneTransform);
      proxy.visible = false;
      renderGlBackground(state);
      renderGlDisplayObject(state, root);
      proxy.visible = true;
      drawGlRenderTargetResult(state, proxy, dest, cacheTransform);
    } else {
      renderGlBackground(state);
      renderGlDisplayObject(state, root);
    }

    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

function runCanvas(state: CanvasRenderState): void {
  const cache = createRenderCache();
  useRenderCache(state, rocket, cache);

  function renderFrame(): void {
    const entry = filterInfos[filterIndex];

    if (entry.type !== 'none') {
      const img = (rocket as Bitmap).data.image;
      if (img !== null && img.source !== null) {
        computeNodeBoundsRectangle(_bounds, rocket, rocket);
        const { width: w, height: h } = computeRenderTargetSize(_bounds, MAX_PADDING, 1, 1);
        const renderTarget = ensureCanvasRenderCacheTarget(state, cache, w, h);
        const ctx = renderTarget.context;
        ctx.clearRect(0, 0, renderTarget.canvas.width, renderTarget.canvas.height);
        ctx.imageSmoothingEnabled = true;

        const srcRect = rocket.data.sourceRectangle;
        if (srcRect !== null) {
          ctx.filter = entry.cssFilter;
          ctx.drawImage(
            img.source,
            srcRect.x,
            srcRect.y,
            srcRect.width,
            srcRect.height,
            MAX_PADDING - _bounds.x,
            MAX_PADDING - _bounds.y,
            srcRect.width,
            srcRect.height,
          );
        }
        ctx.filter = 'none';
        computeRenderCacheTransform(cache.transform, _bounds, MAX_PADDING, MAX_PADDING);
      }
    }

    target.render(root);
    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

function runDom(state: DomRenderState): void {
  enableDomCssFilterSupport(state);

  function renderFrame(): void {
    const entry = filterInfos[filterIndex];
    setDomCssFilter(state, rocket, entry.type === 'none' ? null : entry.cssFilter);
    target.render(root);
    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

function setTranslation(out: Matrix, tx: number, ty: number): void {
  out.a = 1;
  out.b = 0;
  out.c = 0;
  out.d = 1;
  out.tx = tx;
  out.ty = ty;
}
