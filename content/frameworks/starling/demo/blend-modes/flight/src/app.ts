import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachPointerInput,
  BlendMode,
  connectInputToInteraction,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createShape,
  createSprite,
  createTextLabel,
  createTexture,
  defaultGlSpriteRenderer,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  enableGlBlendModeSupport,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerDefaultHitTests,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  setTextLabelString,
  ShapeKind,
  setSpriteTexture,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
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
registerStandardGlMaterial(state);
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
enableGlBlendModeSupport(state);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
setSpriteTexture(bgSprite, createTexture({ source: bgImage }));
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

// Starling's "none" blend mode (Copy/source-only) is now a CompositeOperator, not a BlendMode.
// To match the Starling reference visually, "none" uses Normal blending over a white backdrop.
const blendModes: [string, string][] = [
  [BlendMode.Normal, 'normal'],
  [BlendMode.Multiply, 'multiply'],
  [BlendMode.Screen, 'screen'],
  [BlendMode.Add, 'add'],
  [BlendMode.Darken, 'darken'],
  [BlendMode.Normal, 'none'],
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
setSpriteTexture(rocket, rocketTexture);
rocket.x = rocketX;
rocket.y = rocketY;
rocket.blendMode = blendModes[0][0];
addNodeChild(root, rocket);

const infoText = createTextLabel();
infoText.data.textFormat = { font: 'DejaVu Sans, sans-serif', size: 19, align: 'center' };
infoText.x = 10;
infoText.y = 330;
infoText.data.width = 300;
infoText.data.height = 32;
infoText.data.text = blendModes[0][1];
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
    const [mode, name] = blendModes[modeIndex];
    rocket.blendMode = mode;
    noneBackdrop.visible = name === 'none';
    invalidateNodeAppearance(noneBackdrop);
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
