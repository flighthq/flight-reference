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
  computeRenderEffectPadding,
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
  defaultGlRichTextRenderer,
  defaultGlSpriteRenderer,
  defaultGlTextLabelRenderer,
  enableGlBlendModeSupport,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerDefaultHitTests,
  registerBlurEffectPaddingResolver,
  registerDisplacementEffectPaddingResolver,
  registerDropShadowEffectPaddingResolver,
  registerGlBlurEffect,
  registerGlColorAdjustmentMaterialFeature,
  registerGlDisplacementEffect,
  registerGlDropShadowEffect,
  registerGlOuterGlowEffect,
  registerOuterGlowEffectPaddingResolver,
  registerRenderer,
  registerGlStandardMaterial,
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
registerGlStandardMaterial(state);
registerStandardGlTextureResolvers(state);
registerGlColorAdjustmentMaterialFeature(state);
registerGlBlurEffect(state);
registerBlurEffectPaddingResolver(state);
registerGlDisplacementEffect(state);
registerDisplacementEffectPaddingResolver(state);
registerGlDropShadowEffect(state);
registerDropShadowEffectPaddingResolver(state);
registerGlOuterGlowEffect(state);
registerOuterGlowEffectPaddingResolver(state);
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

const registeredEffects = filterInfos.flatMap((entry) => (entry.effect === undefined ? [] : [entry.effect]));
const padding = computeRenderEffectPadding(state, registeredEffects);
const effectPadding = Math.ceil(Math.max(padding.left, padding.right, padding.top, padding.bottom));
const descriptor = {
  width: RocketWidth + effectPadding * 2,
  height: RocketHeight + effectPadding * 2,
  // Filters must begin from transparent pixels so glow and shadow alpha can expand cleanly.
  clearColors: [0x00000000],
};
const sourceTexture = createRenderTexture(descriptor);
const filteredTexture = createRenderTexture(descriptor);
const renderTexturePool = createGlRenderTexturePool();

// Bake at the texture origin, NOT inset by effectPadding: the padded region is entirely headroom for
// the filter to expand into. Insetting the source as well put every filtered rocket exactly
// effectPadding px right and down of the unfiltered one, measured against the Starling reference.
const bakeRoot = createDisplayObject();
const bakeRocket = createSprite();
bakeRocket.data.texture = rocketTexture;
addNodeChild(bakeRoot, bakeRocket);

// Open the pass on the SAME state that draws it. renderIntoGlRenderTexture binds the target on the
// state it is given, so passing the screen state would leave the offscreen state projecting into
// canvas space while the render texture is bound, silently shrinking the bake by canvas/target.
const offscreenState = createGlOffscreenRenderState(state);
renderIntoGlRenderTexture(offscreenState, sourceTexture, () => {
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
    // Keep the checked fallback even with every runner registered: a missing future registration must
    // never leave the sprite sampling an unwritten render texture.
    displayTexture = applied ? filteredTexture : sourceTexture;
    usesPaddedTexture = true;
  }

  rocket.data.texture = displayTexture;
  rocket.x = RocketX - (usesPaddedTexture ? effectPadding : 0);
  rocket.y = RocketY - (usesPaddedTexture ? effectPadding : 0);
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
