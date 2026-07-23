import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeCurveTo,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  appendShapeRectangle,
  attachPointerInput,
  clearShapeCommands,
  connectSignal,
  createDisplayContainer,
  createGlCanvasElement,
  createGlRenderState,
  createInputManager,
  createMatrix,
  createShape,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  ShapeKind,
} from '@flighthq/sdk';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

interface DrawingPathEntry {
  cmd: string;
  x: number;
  y: number;
  cx?: number;
  cy?: number;
}

const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(width, height, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0xddddddff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  pixelRatio,
});
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

registerDefaultGlMaterial(state);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands(defaultGlShapeCommands);

const verifyFrame = createGlFrameVerifier(state);

const drawingPath: DrawingPathEntry[] = [];
let isMouseDown = false;

const root = createDisplayContainer();

const bgShape = createShape();
appendShapeBeginFill(bgShape, 0xdddddd);
appendShapeRectangle(bgShape, 0, 0, window.innerWidth, window.innerHeight);
appendShapeEndFill(bgShape);
addNodeChild(root, bgShape);

const shape = createShape();
addNodeChild(root, shape);

const circleGraphic = createShape();
appendShapeBeginFill(circleGraphic, 0xff0000);
appendShapeCircle(circleGraphic, 0, 0, 30);
appendShapeEndFill(circleGraphic);
circleGraphic.alpha = 0;
invalidateNodeAppearance(circleGraphic);
addNodeChild(root, circleGraphic);

function drawShape(): void {
  clearShapeCommands(shape);
  appendShapeBeginFill(shape, 0xffffff);
  appendShapeLineStyle(shape, 5, 0xff0000, 1, false, undefined, 'round', 'miter', 1.8);

  if (drawingPath.length === 0) {
    invalidateNodeRender(shape);
    return;
  }

  appendShapeMoveTo(shape, drawingPath[0].x, drawingPath[0].y);
  for (let i = 1; i < drawingPath.length; i++) {
    if (drawingPath[i].cmd === 'l') {
      appendShapeLineTo(shape, drawingPath[i].x, drawingPath[i].y);
    } else if (drawingPath[i].cmd === 'c') {
      appendShapeCurveTo(shape, drawingPath[i].cx!, drawingPath[i].cy!, drawingPath[i].x, drawingPath[i].y);
    }
  }
  appendShapeEndFill(shape);
  invalidateNodeRender(shape);
}

function updateNewPointForMousePosition(x: number, y: number): void {
  if (isMouseDown) {
    const last = drawingPath[drawingPath.length - 1];
    const deltaX = x - last.x;
    const deltaY = y - last.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 20) {
      last.cmd = 'c';
      last.cx = last.x - deltaX;
      last.cy = last.y - deltaY;
    } else {
      last.cmd = 'l';
    }
    drawShape();
  }
}

const input = createInputManager();
attachPointerInput(input, canvas);

connectSignal(input.onPointerDown, (data) => {
  circleGraphic.x = data.x;
  circleGraphic.y = data.y;
  circleGraphic.alpha = 1;
  circleGraphic.scaleX = 1;
  circleGraphic.scaleY = 1;
  invalidateNodeLocalTransform(circleGraphic);
  invalidateNodeAppearance(circleGraphic);

  drawingPath.push({
    cmd: 'l',
    x: data.x,
    y: data.y,
  });

  if (drawingPath.length !== 2) {
    drawShape();
  }
  isMouseDown = true;
});

connectSignal(input.onPointerMove, (data) => {
  updateNewPointForMousePosition(data.x, data.y);
});

connectSignal(input.onPointerUp, (data) => {
  updateNewPointForMousePosition(data.x, data.y);
  isMouseDown = false;
});

function enterFrame(): void {
  if (circleGraphic.alpha > 0) {
    circleGraphic.alpha -= 0.05;
    invalidateNodeAppearance(circleGraphic);
  }
  if (circleGraphic.scaleX > 0.1) {
    circleGraphic.scaleX -= 0.05;
    circleGraphic.scaleY -= 0.05;
    invalidateNodeLocalTransform(circleGraphic);
  }

  prepareDisplayObjectRender(state, root);
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
  verifyFrame();
  requestAnimationFrame(enterFrame);
}

enterFrame();
