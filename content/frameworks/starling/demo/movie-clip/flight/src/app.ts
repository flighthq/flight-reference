import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRectangle,
  defaultGlBitmapRenderer,
  defaultGlTextLabelRenderer,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerDefaultGlMaterial,
  registerDefaultHitTests,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  TextLabelKind,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

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
registerDefaultGlMaterial(state);
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const movie = createDisplayObject();
movie.x = CenterX - FrameSize / 2;
movie.y = CenterY - FrameSize / 2;
addNodeChild(root, movie);

const bmp = createBitmap();
bmp.data.image = atlas;
addNodeChild(movie, bmp);

function showFrame(index: number): void {
  const frame = frames[index];
  bmp.data.sourceRectangle = createRectangle(frame.sx, frame.sy, frame.sw, frame.sh);
  bmp.x = -frame.fx;
  bmp.y = -frame.fy;
  invalidateNodeAppearance(bmp);
  invalidateNodeLocalTransform(bmp);
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
