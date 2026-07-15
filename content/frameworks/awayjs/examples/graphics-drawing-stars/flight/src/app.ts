import type { Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  appendShapeRectangle,
  attachKeyboardInput,
  attachPointerInput,
  clearShapeCommands,
  connectSignal,
  createDisplayContainer,
  createInputManager,
  createShape,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
  prepareDisplayObjectRender,
  removeNodeChildren,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: window.innerWidth,
  height: window.innerHeight,
  background: 0x777777ff,
  kinds: [ShapeKind],
});

const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;
const root = createDisplayContainer();

let activeStar: Shape | null = null;
let startX = 0;
let startY = 0;
let activeSpikes = 5;
let activeFillColor = 0;
let activeStrokeColor = 0;
let activeAlpha = 1;
let activeThickness = 2;

function addBackground(): void {
  const bg = createShape();
  appendShapeBeginFill(bg, 0xdddddd, 1);
  appendShapeRectangle(bg, 0, 0, window.innerWidth, window.innerHeight);
  appendShapeEndFill(bg);
  addNodeChild(root, bg);
}

addBackground();

function packColor(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function drawStar(star: Shape, radiusOuter: number): void {
  const radiusInner = radiusOuter / 2 + Math.random() * (radiusOuter / 2);

  clearShapeCommands(star);
  appendShapeBeginFill(star, activeFillColor, activeAlpha);
  appendShapeLineStyle(star, activeThickness, activeStrokeColor, activeAlpha, false, undefined, 'round', 'miter', 1.8);
  appendShapeMoveTo(star, radiusOuter * Math.cos(0), radiusOuter * Math.sin(0));

  const aDelta = (360 / activeSpikes) * 0.5;
  let a = 0;
  for (let i = 0; i < activeSpikes; i++) {
    a += aDelta;
    appendShapeLineTo(star, radiusInner * Math.cos(a * (Math.PI / 180)), radiusInner * Math.sin(a * (Math.PI / 180)));
    a += aDelta;
    appendShapeLineTo(star, radiusOuter * Math.cos(a * (Math.PI / 180)), radiusOuter * Math.sin(a * (Math.PI / 180)));
  }
  appendShapeEndFill(star);
  invalidateNodeRender(star);
}

const input = createInputManager();
attachPointerInput(input, canvas);
attachKeyboardInput(input, window);

connectSignal(input.onPointerDown, (data) => {
  startX = data.x;
  startY = data.y;

  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);

  activeSpikes = Math.round(2 + Math.random() * 100);
  activeFillColor = packColor(r, g, b);
  activeStrokeColor = packColor(255 - r, 255 - g, 255 - b);
  activeThickness = 1 + Math.random() * 3;
  activeAlpha = 0.5 + Math.random() * 0.5;

  activeStar = createShape();
  activeStar.x = startX;
  activeStar.y = startY;
  invalidateNodeLocalTransform(activeStar);
  drawStar(activeStar, 10);
  addNodeChild(root, activeStar);
});

connectSignal(input.onPointerMove, (data) => {
  if (!activeStar) return;
  const dx = data.x - startX;
  const dy = data.y - startY;
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 10) distance = 10;
  drawStar(activeStar, distance);
});

connectSignal(input.onPointerUp, () => {
  activeStar = null;
});

connectSignal(input.onKeyDown, (data) => {
  if (data.key === 'c') {
    removeNodeChildren(root);
    addBackground();
  }
});

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
