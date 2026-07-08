import {
  addNodeChild,
  connectSignal,
  createApplication,
  createBitmap,
  createDisplayObject,
  createTween,
  createTweenManager,
  easeOutElastic,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
  loadImageResourceFromUrl,
  startApplicationLoop,
  updateTweens,
} from '@flighthq/sdk';

import { render, scale } from './render';

const STAGE_WIDTH = 550;
const STAGE_HEIGHT = 400;

const manager = createTweenManager();
const main = createDisplayObject();
main.scaleX = scale;
main.scaleY = scale;
const container = createDisplayObject();
const bitmap = createBitmap();

container.alpha = 0;
container.scaleX = 0;
container.scaleY = 0;
container.x = STAGE_WIDTH / 2;
container.y = STAGE_HEIGHT / 2;

addNodeChild(container, bitmap);
addNodeChild(main, container);

const image = await loadImageResourceFromUrl('assets/openfl.png');
bitmap.data.image = image;
bitmap.data.smoothing = true;
bitmap.x = -image.width / 2;
bitmap.y = -image.height / 2;

const alphaTween = createTween(manager, container, 3000, { alpha: 1 });
const scaleTween = createTween(
  manager,
  container,
  6000,
  { scaleX: 1, scaleY: 1 },
  { delay: 400, ease: easeOutElastic },
);
connectSignal(alphaTween.onUpdate, () => invalidateNodeRender(container));
connectSignal(scaleTween.onUpdate, () => {
  invalidateNodeLocalTransform(container);
  invalidateNodeRender(container);
});

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateTweens(manager, delta));
connectSignal(app.onRender, () => {
  render(main);
});
startApplicationLoop(app);
