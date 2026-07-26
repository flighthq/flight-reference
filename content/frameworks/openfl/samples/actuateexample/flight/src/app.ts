import {
  addNodeChildAt,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  connectSignal,
  createApplication,
  createDisplayObject,
  createShape,
  createTween,
  createTweenManager,
  createTweenTimer,
  easeOutQuadratic,
  invalidateNodeLocalTransform,
  stepApplicationLoop,
  updateTweens,
} from '@flighthq/sdk';

import { render, scale } from './render';

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;
const CIRCLE_COUNT = 80;
const MIN_RADIUS = 25;
const MAX_RADIUS = 60;
const MIN_DURATION = 1500;
const MAX_DURATION = 6000;
const MAX_START_DELAY = 10000;
const FRAME_DELTA = 1000 / 30;

const manager = createTweenManager();
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

function animateCircle(circle: ReturnType<typeof createShape>): void {
  const duration = MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  const targetX = Math.random() * STAGE_WIDTH;
  const targetY = Math.random() * STAGE_HEIGHT;
  const tween = createTween(manager, circle, duration, { x: targetX, y: targetY }, { ease: easeOutQuadratic });
  connectSignal(tween.onComplete, () => animateCircle(circle));
  connectSignal(tween.onUpdate, () => invalidateNodeLocalTransform(circle));
}

function createCircle(): ReturnType<typeof createShape> {
  const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
  const circle = createShape();

  appendShapeBeginFill(circle, Math.floor(Math.random() * 0xffffff));
  appendShapeCircle(circle, 0, 0, radius);
  appendShapeEndFill(circle);

  circle.alpha = 0.2 + Math.random() * 0.6;
  circle.x = Math.random() * STAGE_WIDTH;
  circle.y = Math.random() * STAGE_HEIGHT;
  invalidateNodeLocalTransform(circle);

  addNodeChildAt(root, circle, 0);
  return circle;
}

for (let i = 0; i < CIRCLE_COUNT; i++) {
  const delay = Math.max(FRAME_DELTA, Math.random() * MAX_START_DELAY);
  const timer = createTweenTimer(manager, delay);
  connectSignal(timer.onComplete, () => {
    const circle = createCircle();
    animateCircle(circle);
  });
}

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateTweens(manager, delta));
connectSignal(app.onRender, () => render(root));

let prevTime = performance.now();

function enterFrame(): void {
  const currentTime = performance.now();
  const delta = currentTime - prevTime;
  stepApplicationLoop(app, delta);
  prevTime = currentTime;
  requestAnimationFrame(enterFrame);
}

requestAnimationFrame(enterFrame);
