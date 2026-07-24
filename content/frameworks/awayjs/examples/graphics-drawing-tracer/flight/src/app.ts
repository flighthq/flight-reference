import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  clearShapeCommands,
  createDisplayContainer,
  createGlCanvasElement,
  createGlRenderState,
  createMatrix,
  createShape,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  ShapeKind,
} from '@flighthq/sdk';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;
const DEG_TO_RAD = Math.PI / 180;
const MAX_PATH_LENGTH = 500;

interface PathPoint {
  x: number;
  y: number;
}

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(WIDTH, HEIGHT, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x777777ff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  pixelRatio,
});
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

registerDefaultGlMaterial(state);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands(defaultGlShapeCommands);

const verifyFrame = createGlFrameVerifier(state);

const drawingPath: PathPoint[][] = [[], [], [], []];

const offsets: [number, number][] = [
  [-50, -50],
  [50, -50],
  [-50, 50],
  [50, 50],
];

const root = createDisplayContainer();

const shape = createShape();
addNodeChild(root, shape);

const movingRect = createDisplayContainer();
movingRect.x = WIDTH / 2;
movingRect.y = HEIGHT / 2;
invalidateNodeLocalTransform(movingRect);

for (const [dx, dy] of offsets) {
  const c = createShape();
  appendShapeBeginFill(c, 0xdddddd, 1);
  appendShapeCircle(c, 0, 0, 5);
  appendShapeEndFill(c);
  c.x = dx;
  c.y = dy;
  invalidateNodeLocalTransform(c);
  addNodeChild(movingRect, c);
}

addNodeChild(root, movingRect);

let dirX = 0;
let dirY = 0;
let rotationRate = 3 * DEG_TO_RAD;
let scaleChange = 0;

function drawTracerShape(): void {
  const cos = Math.cos(movingRect.rotation);
  const sin = Math.sin(movingRect.rotation);
  const sx = movingRect.scaleX;
  const sy = movingRect.scaleY;

  for (let i = 0; i < 4; i++) {
    const [dx, dy] = offsets[i];
    const worldX = movingRect.x + (dx * cos - dy * sin) * sx;
    const worldY = movingRect.y + (dx * sin + dy * cos) * sy;
    drawingPath[i].push({ x: worldX, y: worldY });
    if (drawingPath[i].length > MAX_PATH_LENGTH) {
      drawingPath[i].shift();
    }
  }

  clearShapeCommands(shape);

  for (let p = 0; p < 4; p++) {
    if (drawingPath[p].length === 0) continue;

    let color = 0x000000;
    appendShapeLineStyle(shape, 1, color, 1);
    appendShapeMoveTo(shape, drawingPath[p][0].x, drawingPath[p][0].y);

    for (let i = 1; i < drawingPath[p].length; i++) {
      if (i > drawingPath[p].length * 0.9) {
        if (color !== 0xffffff) {
          color = 0xffffff;
          appendShapeLineStyle(shape, 5, color, 1);
        }
      } else if (i > drawingPath[p].length * 0.5) {
        if (color !== 0xcccccc) {
          color = 0xcccccc;
          appendShapeLineStyle(shape, 3, color, 1);
        }
      }
      appendShapeLineTo(shape, drawingPath[p][i].x, drawingPath[p][i].y);
    }
  }

  invalidateNodeAppearance(shape);
}

function enterFrame(): void {
  rotationRate += (0.1 - Math.random() * 0.2) * DEG_TO_RAD;
  scaleChange = 0.005 - Math.random() * 0.01;
  dirX += 0.1 - Math.random() * 0.2;
  dirY += 0.1 - Math.random() * 0.2;

  if (movingRect.x <= -71 * movingRect.scaleX || movingRect.x >= WIDTH + 71 * movingRect.scaleX) {
    dirX *= -1;
  }
  if (movingRect.y <= -71 * movingRect.scaleX || movingRect.y >= HEIGHT + 71 * movingRect.scaleX) {
    dirY *= -1;
  }

  movingRect.x += dirX;
  movingRect.y += dirY;
  movingRect.rotation += rotationRate;
  movingRect.scaleX += scaleChange;
  movingRect.scaleY += scaleChange;
  invalidateNodeLocalTransform(movingRect);

  drawTracerShape();
  prepareDisplayObjectRender(state, root);
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
  verifyFrame();
  requestAnimationFrame(enterFrame);
}

window.addEventListener('resize', () => {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  canvas.width = WIDTH * pr;
  canvas.height = HEIGHT * pr;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${HEIGHT}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
});

enterFrame();
