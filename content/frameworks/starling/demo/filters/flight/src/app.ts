import type { Adjustment, DisplayObject, RenderEffect } from '@flighthq/sdk';
import {
  createBlurEffect,
  createDisplacementEffect,
  createDropShadowEffect,
  createOuterGlowEffect,
} from '@flighthq/effects';
import {
  createBrightnessColorMatrix,
  createColorMatrixAdjustment,
  createContrastColorMatrix,
  createGrayscaleAdjustment,
  createHueRotateColorMatrix,
  createInvertAdjustment,
  createSaturationColorMatrix,
} from '@flighthq/adjustments';
import {
  addNodeChild,
  applyGlRenderEffectsToRenderTexture,
  attachPointerInput,
  connectInputToInteraction,
  createDisplayObject,
  createGlCanvasElement,
  createGlOffscreenRenderState,
  createGlRenderState,
  createGlRenderTexturePool,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRenderTexture,
  createRichText,
  createSprite,
  createTexture,
  defaultGlDisplacementEffectRunner,
  defaultGlRichTextRenderer,
  defaultGlSpriteRenderer,
  defaultGlTextLabelRenderer,
  enableGlBlendModeSupport,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerDefaultHitTests,
  registerGlBlurEffect,
  registerGlColorAdjustmentMaterialFeature,
  registerGlRenderEffect,
  registerRenderer,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  renderGlBackground,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  RichTextKind,
  setNodeColorAdjustments,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
  withGlRenderTextures,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const RocketWidth = 256;
const RocketHeight = 142;
const EffectPadding = 28;
const RocketX = CenterX - RocketWidth / 2;
const RocketY = 170;
const HueDegrees = 180;

interface FilterEntry {
  name: string;
  adjustment?: Adjustment;
  effect?: RenderEffect;
}

const filterInfos: FilterEntry[] = [
  { name: 'Identity' },
  { name: 'Blur', effect: createBlurEffect({ blurX: 1.5, blurY: 1.5 }) },
  {
    name: 'Drop Shadow',
    effect: createDropShadowEffect({ distance: 4, blurX: 1, blurY: 1, alpha: 0.5, quality: 1 }),
  },
  {
    name: 'Glow',
    effect: createOuterGlowEffect({ color: 0xffff00, blurX: 3, blurY: 3, quality: 1 }),
  },
  {
    name: 'Displacement Map',
    effect: createDisplacementEffect({ intensity: 2, frequency: 100 }),
  },
  { name: 'Invert', adjustment: createInvertAdjustment() },
  { name: 'Grayscale', adjustment: createGrayscaleAdjustment() },
  {
    name: 'Saturation',
    adjustment: createColorMatrixAdjustment(createSaturationColorMatrix(2)),
  },
  {
    name: 'Contrast',
    adjustment: createColorMatrixAdjustment(createContrastColorMatrix(1.75)),
  },
  {
    name: 'Brightness',
    adjustment: createColorMatrixAdjustment(createBrightnessColorMatrix(-63.75)),
  },
  {
    name: 'Hue',
    adjustment: createColorMatrixAdjustment(createHueRotateColorMatrix(HueDegrees)),
  },
  {
    name: 'Hue + Shadow',
    adjustment: createColorMatrixAdjustment(createHueRotateColorMatrix(HueDegrees)),
    effect: createDropShadowEffect({ distance: 4, blurX: 1, blurY: 1, alpha: 0.5, quality: 1 }),
  },
];

let filterIndex = 0;

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(GameWidth, GameHeight, pixelRatio);
document.body.appendChild(canvas);

const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  sceneGraphSyncPolicy: 'refreshDerivedState',
});

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
registerStandardGlMaterial(state);
registerStandardGlTextureResolvers(state);
registerGlColorAdjustmentMaterialFeature(state);
registerGlBlurEffect(state);
registerGlRenderEffect(state, 'DisplacementEffect', defaultGlDisplacementEffectRunner);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
enableGlBlendModeSupport(state);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
bgSprite.data.texture = createTexture({ source: bgImage });
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');
const rocketTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(rocketTexture, 322, 1, RocketWidth, RocketHeight);

const rocket = createSprite();
rocket.data.texture = rocketTexture;
rocket.x = RocketX;
rocket.y = RocketY;
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
attachPointerInput(inputMgr, canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(inputMgr, interaction, 1);

const descriptor = {
  width: RocketWidth + EffectPadding * 2,
  height: RocketHeight + EffectPadding * 2,
};
const sourceTexture = createRenderTexture(descriptor);
const filteredTexture = createRenderTexture(descriptor);
const renderTexturePool = createGlRenderTexturePool();

const bakeRoot = createDisplayObject();
const bakeRocket = createSprite();
bakeRocket.data.texture = rocketTexture;
bakeRocket.x = EffectPadding;
bakeRocket.y = EffectPadding;
addNodeChild(bakeRoot, bakeRocket);

const offscreenState = createGlOffscreenRenderState(state);
renderIntoGlRenderTexture(state, sourceTexture, () => {
  prepareScene2DRender(offscreenState, bakeRoot);
  renderGlScene2D(offscreenState, bakeRoot);
});

function applySelectedFilter(): void {
  const entry = filterInfos[filterIndex];
  setNodeColorAdjustments(rocket, entry.adjustment === undefined ? null : [entry.adjustment]);

  let displayTexture = rocketTexture;
  let usesPaddedTexture = false;
  const effect = entry.effect;
  if (effect !== undefined) {
    const applied = withGlRenderTextures(state, renderTexturePool, [descriptor], ([scratch]) =>
      applyGlRenderEffectsToRenderTexture(state, renderTexturePool, sourceTexture, filteredTexture, scratch, [effect]),
    );
    // SDK 1220 has public runners for blur and displacement, but not for glow or shadow. The generic
    // pipeline reports that gap instead of populating the destination, so keep the baked source as a
    // deterministic fallback rather than sampling an uninitialized render texture.
    displayTexture = applied ? filteredTexture : sourceTexture;
    usesPaddedTexture = true;
  }

  rocket.data.texture = displayTexture;
  rocket.x = RocketX - (usesPaddedTexture ? EffectPadding : 0);
  rocket.y = RocketY - (usesPaddedTexture ? EffectPadding : 0);
}

function switchFilter(): void {
  filterIndex = (filterIndex + 1) % filterInfos.length;
  infoText.data.text = filterInfos[filterIndex].name;
  invalidateNodeAppearance(infoText);
  applySelectedFilter();
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

applySelectedFilter();

function frame(): void {
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
