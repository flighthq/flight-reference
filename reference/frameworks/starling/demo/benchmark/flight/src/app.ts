import type { Bitmap, RichText } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  getNodeChildCount,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  removeNodeChild,
  removeNodeChildAt,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

const TargetFps = 60;
const FrameTimeWindow = 10;
const MaxFailCount = 100;

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

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

const startButtonBg = createShape();
appendShapeBeginFill(startButtonBg, 0x444488);
appendShapeRectangle(startButtonBg, CenterX - 64, 15, 128, 32);
addNodeChild(root, startButtonBg);

const startButtonLabel = createRichText();
startButtonLabel.data.defaultTextFormat = {
  font: 'DejaVu Sans, sans-serif',
  size: 14,
  color: 0xffffff,
  align: 'center',
};
startButtonLabel.x = CenterX - 64;
startButtonLabel.y = 19;
startButtonLabel.data.width = 128;
startButtonLabel.data.height = 32;
startButtonLabel.data.text = 'Start benchmark';
addNodeChild(root, startButtonLabel);

let resultText: RichText | null = null;

function setButtonVisible(value: boolean): void {
  startButtonBg.visible = value;
  startButtonLabel.visible = value;
  invalidateNodeAppearance(startButtonBg);
  invalidateNodeAppearance(startButtonLabel);
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

  render(root);
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
    align: 'center',
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

document.addEventListener('click', () => {
  if (!started) startBenchmark();
});

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

    render(root);
  }

  requestAnimationFrame(enterFrame);
}

render(root);
requestAnimationFrame(enterFrame);
