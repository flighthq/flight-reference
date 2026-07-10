import type { Bitmap, DisplayObject, RichText } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createInteractionManager,
  createInputManager,
  createRectangle,
  createRichText,
  getNodeChildCount,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  removeNodeChild,
  removeNodeChildAt,
  RichTextKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

const TargetFps = 60;
const FrameTimeWindow = 10;
const MaxFailCount = 100;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();
root.scaleX = target.scale;
root.scaleY = target.scale;

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');
const objectRectangle = createRectangle(770, 173, 32, 32);

const container = createDisplayContainer();
container.x = CenterX;
container.y = CenterY;
addNodeChild(root, container);

const statusText = createRichText();
statusText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0x000000 };
statusText.x = 20;
statusText.y = 10;
statusText.data.width = 280;
statusText.data.height = 30;
addNodeChild(root, statusText);

let resultText: RichText | null = null;

registerDefaultHitTestPoints();
const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, target.scale);

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
startBtn.root.y = 15;
startBtn.connect(interaction);
addNodeChild(root, startBtn.root);

function setButtonVisible(value: boolean): void {
  startBtn.root.visible = value;
  invalidateNodeAppearance(startBtn.root);
}

const objectPool: Bitmap[] = [];

function getObjectFromPool(): Bitmap {
  const pooled = objectPool.pop();
  if (pooled) return pooled;

  const object = createBitmap();
  object.data.image = atlas;
  object.data.sourceRectangle = objectRectangle;
  object.pivotX = 16;
  object.pivotY = 16;
  return object;
}

function putObjectToPool(object: Bitmap): void {
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
    const object = removeNodeChildAt(container, numChildren) as Bitmap | null;
    if (object !== null) putObjectToPool(object);
  }
}

let started = false;
let phase = 0;
let failCount = 0;
let frameCount = 0;
let frameTimes: number[] = [];

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

  statusText.data.text = '';
  invalidateNodeAppearance(statusText);

  target.render(root);
}

function benchmarkComplete(measuredFps: number): void {
  started = false;
  setButtonVisible(true);

  const numChildren = getNodeChildCount(container);

  resultText = createRichText();
  resultText.data.defaultTextFormat = {
    font: 'DejaVu Sans, sans-serif',
    size: 24,
    color: 0x000000,
  };
  resultText.x = CenterX - 120;
  resultText.y = CenterY - 60;
  resultText.data.width = 240;
  resultText.data.height = 120;
  resultText.data.text = `Result:\n${numChildren} objects\nwith ${Math.round(measuredFps)} fps`;
  addNodeChild(root, resultText);

  removeTestObjects(numChildren);

  container.scaleX = 1;
  container.scaleY = 1;
  invalidateNodeLocalTransform(container);

  statusText.data.text = '';
  invalidateNodeAppearance(statusText);
}

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 32,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 42 + 4;
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
      statusText.data.text = `${getNodeChildCount(container)} objects, ${Math.round(measuredFps)} fps`;
      invalidateNodeAppearance(statusText);
    }
  }

  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(enterFrame);
}

target.render(root);
requestAnimationFrame(enterFrame);
