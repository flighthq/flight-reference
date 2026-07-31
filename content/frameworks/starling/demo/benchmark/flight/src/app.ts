import type { BitmapText, DisplayObject, RichText, Sprite } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  connectInputToInteraction,
  createBitmapText,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createGlyphSourceFromBitmapFont,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRichText,
  createSprite,
  createTexture,
  createTextureAtlasFromImageResource,
  defaultGlSpriteRenderer,
  defaultGlQuadBatchRenderer,
  defaultGlRichTextRenderer,
  defaultGlTextLabelRenderer,
  registerGlColorAdjustmentMaterialFeature,
  getNodeChildCount,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  parseBitmapFontXml,
  prepareScene2DRender,
  QuadBatchKind,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerDefaultHitTests,
  registerRenderer,
  removeNodeChild,
  removeNodeChildAt,
  renderGlBackground,
  renderGlScene2D,
  RichTextKind,
  setNodeColorAdjustmentsTint,
  setSpriteTexture,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
  updateBitmapText,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

const TargetFps = 30;
const FrameTimeWindow = 10;
const MaxFailCount = 100;

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

registerGlColorAdjustmentMaterialFeature(state);
registerStandardGlMaterial(state);
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, QuadBatchKind, defaultGlQuadBatchRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
setSpriteTexture(bgSprite, createTexture({ source: bgImage }));
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');
const objectTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(objectTexture, 770, 173, 32, 32);

const container = createDisplayObject();
container.x = CenterX;
container.y = CenterY;
addNodeChild(root, container);

const miniFntText = await (await fetch('starling/fonts/1x/mini.fnt')).text();
const miniImage = await loadImageResourceFromUrl('starling/fonts/1x/mini.png');
const miniAtlas = createTextureAtlasFromImageResource(miniImage);
const miniFont = parseBitmapFontXml(miniFntText, { resolvePage: () => miniAtlas });
const miniGlyphSource = miniFont ? createGlyphSourceFromBitmapFont(miniFont) : null;

const statusText = createBitmapText(miniGlyphSource, {
  text: '',
  align: 'center',
  wrapWidth: 140,
});
statusText.x = 20;
statusText.y = 10;
statusText.scaleX = 2;
statusText.scaleY = 2;

setNodeColorAdjustmentsTint(statusText, 0x000000ff);

updateBitmapText(statusText);
invalidateNodeAppearance(statusText);
addNodeChild(root, statusText);

let resultText: RichText | null = null;

registerDefaultHitTests();
const input = createInputManager();
attachPointerInput(input, canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const startBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Start benchmark',
  width: 128,
  height: 32,
  onTriggered: () => {
    if (!started) startBenchmark();
  },
});
startBtn.root.x = CenterX - 64;
startBtn.root.y = 20;
startBtn.connect(interaction);
addNodeChild(root, startBtn.root);

function setButtonVisible(value: boolean): void {
  startBtn.root.visible = value;
  invalidateNodeAppearance(startBtn.root);
}

const objectPool: Sprite[] = [];

function getObjectFromPool(): Sprite {
  const pooled = objectPool.pop();
  if (pooled) return pooled;

  const object = createSprite();
  setSpriteTexture(object, objectTexture);
  object.pivotX = 16;
  object.pivotY = 16;
  return object;
}

function putObjectToPool(object: Sprite): void {
  objectPool.push(object);
}

function addTestObjects(count: number): void {
  const containerScale = 1 / container.scaleX;

  for (let i = 0; i < count; i++) {
    const object = getObjectFromPool();
    const distance = (100 + Math.random() * 100) * containerScale;
    const angle = Math.random() * Math.PI * 2;

    object.x = Math.cos(angle) * distance;
    object.y = Math.sin(angle) * distance;
    object.rotation = angle + Math.PI / 2;
    object.scaleX = containerScale;
    object.scaleY = containerScale;

    addNodeChild(container, object);
    invalidateNodeLocalTransform(object);
  }
}

function removeTestObjects(count: number): void {
  let numChildren = getNodeChildCount(container);
  const removeCount = Math.min(count, numChildren);

  for (let i = 0; i < removeCount; i++) {
    numChildren--;
    const object = removeNodeChildAt(container, numChildren) as Sprite | null;
    if (object !== null) putObjectToPool(object);
  }
}

let started = false;
let phase = 0;
let failCount = 0;
let frameCount = 0;
let frameTimes: number[] = [];

function updateStatusText(text: string): void {
  statusText.data.text = text;
  updateBitmapText(statusText);
  invalidateNodeAppearance(statusText);
}

function startBenchmark(): void {
  if (resultText !== null) {
    removeNodeChild(root, resultText);
    resultText = null;
  }

  setButtonVisible(false);
  started = true;
  phase = 0;
  failCount = 0;
  frameCount = 0;

  frameTimes = [];
  for (let i = 0; i < FrameTimeWindow; i++) frameTimes[i] = 1 / TargetFps;

  updateStatusText('');

  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
}

function benchmarkComplete(measuredFps: number): void {
  started = false;
  setButtonVisible(true);

  const numChildren = getNodeChildCount(container);

  resultText = createRichText();
  resultText.data.defaultTextFormat = {
    font: 'DejaVu Sans, sans-serif',
    size: 30,
    color: 0x000000,
    align: 'center',
  };
  resultText.x = CenterX - 120;
  resultText.y = CenterY - 100;
  resultText.data.width = 240;
  resultText.data.height = 200;
  resultText.data.text = `Result:\n${numChildren} objects\nwith ${Math.round(measuredFps)} fps`;
  addNodeChild(root, resultText);

  removeTestObjects(numChildren);

  container.scaleX = 1;
  container.scaleY = 1;
  invalidateNodeLocalTransform(container);

  updateStatusText('');
}

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

let lastTime = performance.now();

function enterFrame(now: number): void {
  const passedTime = (now - lastTime) / 1000;
  lastTime = now;

  if (started) {
    frameCount++;
    container.rotation += passedTime * 0.5;
    invalidateNodeLocalTransform(container);

    frameTimes[FrameTimeWindow] = 0;
    for (let i = 0; i < FrameTimeWindow; i++) frameTimes[i] += passedTime;
    const measuredFps = FrameTimeWindow / (frameTimes.shift() as number);

    if (phase === 0) {
      if (measuredFps < 0.985 * TargetFps) {
        failCount++;
        if (failCount === MaxFailCount) phase = 1;
      } else {
        addTestObjects(16);
        container.scaleX *= 0.99;
        container.scaleY *= 0.99;
        invalidateNodeLocalTransform(container);
        failCount = 0;
      }
    } else {
      if (measuredFps > 0.99 * TargetFps) {
        failCount--;
        if (failCount === 0) benchmarkComplete(measuredFps);
      } else {
        removeTestObjects(1);
        container.scaleX /= 0.9993720513;
        container.scaleY /= 0.9993720513;
        invalidateNodeLocalTransform(container);
      }
    }

    if (started && frameCount % Math.round(TargetFps / 4) === 0) {
      updateStatusText(`${getNodeChildCount(container)} objects`);
    }
  }

  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(enterFrame);
}

prepareScene2DRender(state, root);
renderGlBackground(state);
renderGlScene2D(state, root);
requestAnimationFrame(enterFrame);
