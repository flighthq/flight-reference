import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  connectInputToInteraction,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createSprite,
  createTexture,
  defaultGlSpriteRenderer,
  defaultGlTextLabelRenderer,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerDefaultHitTests,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  setSpriteTexture,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;
const FrameSize = 220;
const FrameRate = 15;
const FrameDuration = 1000 / FrameRate;

interface MovieFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  fx: number;
  fy: number;
}

const frames: MovieFrame[] = [
  { sx: 1, sy: 145, sw: 165, sh: 163, fx: -42, fy: -21 },
  { sx: 1, sy: 309, sw: 165, sh: 160, fx: -42, fy: -23 },
  { sx: 295, sy: 337, sw: 165, sh: 149, fx: -42, fy: -33 },
  { sx: 578, sy: 173, sw: 191, sh: 142, fx: -16, fy: -37 },
  { sx: 808, sy: 1, sw: 200, sh: 108, fx: -8, fy: -68 },
  { sx: 851, sy: 353, sw: 165, sh: 138, fx: -42, fy: -67 },
  { sx: 1, sy: 470, sw: 165, sh: 143, fx: -42, fy: -66 },
  { sx: 685, sy: 353, sw: 165, sh: 140, fx: -42, fy: -66 },
  { sx: 851, sy: 492, sw: 165, sh: 129, fx: -42, fy: -67 },
  { sx: 461, sy: 483, sw: 165, sh: 129, fx: -42, fy: -69 },
  { sx: 292, sy: 487, sw: 165, sh: 128, fx: -42, fy: -72 },
  { sx: 627, sy: 494, sw: 165, sh: 126, fx: -42, fy: -74 },
  { sx: 770, sy: 244, sw: 188, sh: 108, fx: -19, fy: -75 },
  { sx: 808, sy: 110, sw: 199, sh: 133, fx: -8, fy: -50 },
];

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
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
setSpriteTexture(bgSprite, createTexture({ source: bgImage }));
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');
const frameTextures = frames.map((frame) => {
  const texture = createTexture({ source: atlas });
  setTextureUvFromPixelRect(texture, frame.sx, frame.sy, frame.sw, frame.sh);
  return texture;
});

const movie = createDisplayObject();
movie.x = CenterX - FrameSize / 2;
movie.y = CenterY - FrameSize / 2;
addNodeChild(root, movie);

const sprite = createSprite();
addNodeChild(movie, sprite);

function showFrame(index: number): void {
  const frame = frames[index];
  setSpriteTexture(sprite, frameTextures[index]);
  sprite.x = -frame.fx;
  sprite.y = -frame.fy;
  invalidateNodeLocalTransform(sprite);
}

let currentFrame = 0;
showFrame(currentFrame);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

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

prepareScene2DRender(state, root);
renderGlBackground(state);
renderGlScene2D(state, root);

let lastFrameTime = performance.now();

function enterFrame(now: number): void {
  if (now - lastFrameTime >= FrameDuration) {
    lastFrameTime = now;
    currentFrame = (currentFrame + 1) % frames.length;
    showFrame(currentFrame);
  }
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(enterFrame);
}

requestAnimationFrame(enterFrame);
