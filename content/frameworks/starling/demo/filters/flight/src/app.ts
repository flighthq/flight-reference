import type { BlurEffect, DisplacementEffect, DropShadowEffect, OuterGlowEffect } from '@flighthq/effects';
import {
  createBlurEffect,
  createDisplacementEffect,
  createDropShadowEffect,
  createOuterGlowEffect,
} from '@flighthq/effects';
import { computeDropShadowEffectCss, computeOuterGlowEffectCss } from '@flighthq/effects-canvas';
import {
  applyColorMatrixPassToGl,
  applyDisplacementEffectToGl,
  applyDropShadowEffectToGl,
  applyGlEffectBoxBlur,
  applyOuterGlowEffectToGl,
} from '@flighthq/effects-gl';
import type { ColorMatrixAdjustment } from '@flighthq/adjustments';
import {
  createBrightnessColorMatrix,
  createContrastColorMatrix,
  createGrayscaleColorMatrix,
  createHueRotateColorMatrix,
  createIdentityColorMatrix,
  createInvertColorMatrix,
  createSaturationColorMatrix,
} from '@flighthq/adjustments';
import type {
  Bitmap,
  CanvasRenderState,
  DisplayObject,
  DomRenderState,
  GlRenderState,
  GlRenderTarget,
  GlRenderTargetPool,
  Matrix,
} from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  beginGlRenderPass,
  BitmapKind,
  clearGlRenderTarget,
  computeNodeBoundsRectangle,
  computeRenderCacheTransform,
  computeRenderTargetSize,
  connectInputToInteraction,
  copyMatrix,
  createBitmap,
  createDisplayContainer,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRectangle,
  createRenderCache,
  createRichText,
  createGlRenderTarget,
  createGlRenderTargetPool,
  drawGlRenderTargetResult,
  enableDomCssFilterSupport,
  endGlRenderPass,
  ensureCanvasRenderCacheTarget,
  getRenderProxy2D,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTests,
  renderGlBackground,
  renderGlDisplayObject,
  RichTextKind,
  setGlRenderTransform2D,
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
  blur?: BlurEffect;
  dropShadow?: DropShadowEffect;
  glow?: OuterGlowEffect;
  colorMatrix?: ColorMatrixAdjustment;
  displacementMap?: DisplacementEffect;
}

const HueDegrees = 180;

function createColorMatrixAdjustment(matrix: readonly number[]): ColorMatrixAdjustment {
  return { kind: 'ColorMatrixAdjustment', colorMatrix: matrix };
}

const filterInfos: FilterEntry[] = [
  { name: 'Identity', type: 'none', cssFilter: 'none' },
  {
    name: 'Blur',
    type: 'blur',
    cssFilter: 'blur(1.5px)',
    blur: createBlurEffect({ blurX: 1.5, blurY: 1.5 }),
  },
  {
    name: 'Drop Shadow',
    type: 'dropShadow',
    cssFilter: 'drop-shadow(2.8px 2.8px 1px rgba(0,0,0,0.5))',
    dropShadow: createDropShadowEffect({ distance: 4, blurX: 1, blurY: 1, alpha: 0.5, quality: 1 }),
  },
  {
    name: 'Glow',
    type: 'glow',
    cssFilter: 'drop-shadow(0 0 1.5px yellow)',
    glow: createOuterGlowEffect({ color: 0xffff00, blurX: 1.5, blurY: 1.5, quality: 1 }),
  },
  {
    name: 'Displacement Map',
    type: 'displacementMap',
    cssFilter: 'none',
    displacementMap: createDisplacementEffect({ intensity: 20, frequency: 12 }),
  },
  {
    name: 'Invert',
    type: 'colorMatrix',
    cssFilter: 'invert(1)',
    colorMatrix: createColorMatrixAdjustment(createInvertColorMatrix()),
  },
  {
    name: 'Grayscale',
    type: 'colorMatrix',
    cssFilter: 'grayscale(1)',
    colorMatrix: createColorMatrixAdjustment(createGrayscaleColorMatrix()),
  },
  {
    name: 'Saturation',
    type: 'colorMatrix',
    cssFilter: 'saturate(2)',
    colorMatrix: createColorMatrixAdjustment(createSaturationColorMatrix(2)),
  },
  {
    name: 'Contrast',
    type: 'colorMatrix',
    cssFilter: 'contrast(1.75)',
    colorMatrix: createColorMatrixAdjustment(createContrastColorMatrix(1.75)),
  },
  {
    name: 'Brightness',
    type: 'colorMatrix',
    cssFilter: 'brightness(0.75)',
    colorMatrix: createColorMatrixAdjustment(createBrightnessColorMatrix(-63.75)),
  },
  {
    name: 'Hue',
    type: 'colorMatrix',
    cssFilter: `hue-rotate(${HueDegrees.toFixed(1)}deg)`,
    colorMatrix: createColorMatrixAdjustment(createHueRotateColorMatrix(HueDegrees)),
  },
  {
    name: 'Hue + Shadow',
    type: 'colorMatrix',
    cssFilter: `hue-rotate(${HueDegrees.toFixed(1)}deg) drop-shadow(2.8px 2.8px 4px rgba(0,0,0,0.5))`,
    colorMatrix: createColorMatrixAdjustment(createHueRotateColorMatrix(HueDegrees)),
    dropShadow: createDropShadowEffect({ distance: 4, blurX: 1, blurY: 1, alpha: 0.5, quality: 1 }),
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

registerDefaultHitTests();
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
  const pool: GlRenderTargetPool = createGlRenderTargetPool();
  const scratch = createGlRenderTarget(state, { width: w, height: h });
  const cacheTransform = createMatrix();
  const sceneTransform = createMatrix();

  function renderFrame(): void {
    const entry = filterInfos[filterIndex];

    prepareDisplayObjectRender(state, root);
    const proxy = getRenderProxy2D(state, rocket);
    if (proxy !== undefined) copyMatrix(sceneTransform, proxy.transform2D);

    if (entry.type !== 'none' && proxy !== undefined) {
      computeNodeBoundsRectangle(_bounds, rocket, rocket);
      computeRenderCacheTransform(cacheTransform, _bounds, MAX_PADDING, MAX_PADDING);
      setTranslation(proxy.transform2D, MAX_PADDING - _bounds.x, MAX_PADDING - _bounds.y);

      beginGlRenderPass(state, source, { preserveColor: true, preserveDepth: true });
      setGlRenderTransform2D(state, _identity);
      clearGlRenderTarget(state, source);
      renderGlDisplayObject(state, rocket);
      clearGlRenderTarget(state, dest);

      if (entry.type === 'blur' && entry.blur !== undefined) {
        applyGlEffectBoxBlur(state, source, dest, scratch, entry.blur);
      } else if (entry.type === 'dropShadow' && entry.dropShadow !== undefined) {
        applyDropShadowEffectToGl(state, source, dest, pool, entry.dropShadow);
      } else if (entry.type === 'glow' && entry.glow !== undefined) {
        applyOuterGlowEffectToGl(state, source, dest, pool, entry.glow);
      } else if (entry.type === 'displacementMap' && entry.displacementMap !== undefined) {
        applyDisplacementEffectToGl(state, source, dest, entry.displacementMap);
      } else if (entry.type === 'colorMatrix' && entry.colorMatrix !== undefined) {
        if (entry.dropShadow !== undefined) {
          applyColorMatrixPassToGl(state, source, scratch, entry.colorMatrix.colorMatrix);
          applyDropShadowEffectToGl(state, scratch, dest, pool, entry.dropShadow);
        } else {
          applyColorMatrixPassToGl(state, source, dest, entry.colorMatrix.colorMatrix);
        }
      }

      endGlRenderPass(state);

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
