import type { Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
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
  background: 0xffdddddd,
  kinds: [ShapeKind],
});

const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;
const root = createDisplayContainer();

let activeStar: Shape | null = null;
let startX = 0;
let startY = 0;
let activeSpikes = 5;
let activeInnerRatio = 0.5;
let activeFillColor = 0;
let activeStrokeColor = 0;
let activeAlpha = 1;
let activeThickness = 2;

function drawStar(star: Shape, outerRadius: number): void {
  const innerRadius = outerRadius * activeInnerRatio;

  clearShapeCommands(star);
  appendShapeBeginFill(star, activeFillColor, activeAlpha);
  appendShapeLineStyle(star, activeThickness, activeStrokeColor, activeAlpha, false, undefined, 'round', 'miter', 1.8);
  appendShapeMoveTo(star, outerRadius, 0);

  const step = Math.PI / activeSpikes;
  for (let i = 0; i < activeSpikes; i++) {
    const innerAngle = step * (2 * i + 1);
    const outerAngle = step * (2 * i + 2);
    appendShapeLineTo(star, innerRadius * Math.cos(innerAngle), innerRadius * Math.sin(innerAngle));
    appendShapeLineTo(star, outerRadius * Math.cos(outerAngle), outerRadius * Math.sin(outerAngle));
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
  activeSpikes = 3 + Math.floor(Math.random() * 10);
  activeInnerRatio = 0.3 + Math.random() * 0.4;
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  activeFillColor = (r << 16) | (g << 8) | b;
  activeStrokeColor = ((255 - r) << 16) | ((255 - g) << 8) | (255 - b);
  activeAlpha = 0.5 + Math.random() * 0.5;
  activeThickness = 1 + Math.random() * 4;

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
  const distance = Math.max(10, Math.sqrt(dx * dx + dy * dy));
  drawStar(activeStar, distance);
});

connectSignal(input.onPointerUp, () => {
  activeStar = null;
});

connectSignal(input.onKeyDown, (data) => {
  if (data.key === 'c') {
    removeNodeChildren(root);
  }
});

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
