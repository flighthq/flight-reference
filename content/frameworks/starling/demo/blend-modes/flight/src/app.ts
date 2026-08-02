import type { DisplayObject } from '@flighthq/sdk';
import { createCompositeEffect } from '@flighthq/effects';
import {
  addNodeChild,
  applyGlRenderEffectsToRenderTexture,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachPointerInput,
  bindGlRenderTexture,
  BlendMode,
  CompositeOperator,
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
  createShape,
  createSprite,
  createTextLabel,
  createTexture,
  defaultGlSpriteRenderer,
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  enableGlBlendModeSupport,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerGlStandardMaterial,
  registerStandardGlTextureResolvers,
  registerDefaultHitTests,
  registerGlBlendEffectBackdrop,
  registerGlCompositeEffect,
  registerGlShapeCommands,
  registerGlShapeRasterizer,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  setTextLabelString,
  ShapeKind,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
  withGlRenderTextures,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

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
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerGlShapeRasterizer(state, createCanvasShapeRasterizer(createCanvasTextureResolvers(), true));
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
enableGlBlendModeSupport(state);
registerGlCompositeEffect(state);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgTexture = createTexture({ source: bgImage });
const bgSprite = createSprite();
bgSprite.data.texture = bgTexture;
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const blendModes: ReadonlyArray<{ blendMode: string; name: string }> = [
  { blendMode: BlendMode.Normal, name: 'normal' },
  { blendMode: BlendMode.Multiply, name: 'multiply' },
  { blendMode: BlendMode.Screen, name: 'screen' },
  { blendMode: BlendMode.Add, name: 'add' },
  { blendMode: BlendMode.Normal, name: 'erase' },
  // Starling's "none" mode is source-only Copy, which this scene represents over a white backdrop.
  { blendMode: BlendMode.Normal, name: 'none' },
];

let modeIndex = 0;

const rocketWidth = 256;
const rocketHeight = 142;
const rocketX = CenterX - 128;
const rocketY = 170;

const noneBackdrop = createShape();
appendShapeBeginFill(noneBackdrop, 0xffffff);
appendShapeRectangle(noneBackdrop, rocketX, rocketY, rocketWidth, rocketHeight);
noneBackdrop.visible = false;
addNodeChild(root, noneBackdrop);

const rocketTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(rocketTexture, 322, 1, 256, 142);
const rocket = createSprite();
rocket.data.texture = rocketTexture;
rocket.x = rocketX;
rocket.y = rocketY;
rocket.blendMode = blendModes[0].blendMode;
addNodeChild(root, rocket);

// Erase is a Porter-Duff operation, not a fixed-function BlendMode. Bake the source layer and its
// backdrop separately, then composite DestinationOut once into the texture shown for that mode.
const eraseDescriptor = { width: GameWidth, height: GameHeight, clearColors: [0x00000000] };
const eraseSource = createRenderTexture(eraseDescriptor);
const eraseBackdrop = createRenderTexture(eraseDescriptor);
const eraseResult = createRenderTexture(eraseDescriptor);
const erasePool = createGlRenderTexturePool();
// Open each bake pass on the SAME state that draws it. renderIntoGlRenderTexture binds the target on the
// state it is given, so passing the screen state would leave the offscreen state projecting into
// canvas space while the render texture is bound, silently shrinking the bake by canvas/target.
const offscreenState = createGlOffscreenRenderState(state);

const eraseSourceRoot = createDisplayObject();
const eraseSourceRocket = createSprite();
eraseSourceRocket.data.texture = rocketTexture;
eraseSourceRocket.x = rocketX;
eraseSourceRocket.y = rocketY;
addNodeChild(eraseSourceRoot, eraseSourceRocket);
renderIntoGlRenderTexture(offscreenState, eraseSource, () => {
  prepareScene2DRender(offscreenState, eraseSourceRoot);
  renderGlScene2D(offscreenState, eraseSourceRoot);
});

const eraseBackdropRoot = createDisplayObject();
const eraseBackdropSprite = createSprite();
eraseBackdropSprite.data.texture = bgTexture;
addNodeChild(eraseBackdropRoot, eraseBackdropSprite);
renderIntoGlRenderTexture(offscreenState, eraseBackdrop, () => {
  prepareScene2DRender(offscreenState, eraseBackdropRoot);
  renderGlScene2D(offscreenState, eraseBackdropRoot);
});

const eraseBackdropHandle = bindGlRenderTexture(state, eraseBackdrop);
let eraseApplied = false;
if (eraseBackdropHandle !== null) {
  const backdropKey = 'starling.blendModes.erase';
  registerGlBlendEffectBackdrop(state, backdropKey, eraseBackdropHandle);
  eraseApplied = withGlRenderTextures(state, erasePool, [eraseDescriptor], ([scratch]) =>
    applyGlRenderEffectsToRenderTexture(state, erasePool, eraseSource, eraseResult, scratch, [
      createCompositeEffect(CompositeOperator.DestinationOut, { backdropKey }),
    ]),
  );
}

const eraseLayer = createSprite();
eraseLayer.data.texture = eraseApplied ? eraseResult : eraseBackdrop;
eraseLayer.visible = false;
addNodeChild(root, eraseLayer);

const infoText = createTextLabel();
infoText.data.textFormat = { font: 'DejaVu Sans, sans-serif', size: 19, align: 'center' };
infoText.x = 10;
infoText.y = 330;
infoText.data.width = 300;
infoText.data.height = 32;
infoText.data.text = blendModes[0].name;
infoText.blendMode = BlendMode.Normal;
addNodeChild(root, infoText);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const switchBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Switch Mode',
  width: 128,
  height: 32,
  onTriggered: () => {
    modeIndex = (modeIndex + 1) % blendModes.length;
    const { blendMode, name } = blendModes[modeIndex];
    const erase = name === 'erase';
    rocket.blendMode = blendMode;
    bgSprite.visible = !erase;
    rocket.visible = !erase;
    eraseLayer.visible = erase;
    noneBackdrop.visible = name === 'none';
    invalidateNodeAppearance(bgSprite);
    invalidateNodeAppearance(noneBackdrop);
    invalidateNodeAppearance(eraseLayer);
    setTextLabelString(infoText, name);
    invalidateNodeAppearance(rocket);
  },
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

function frame(): void {
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
