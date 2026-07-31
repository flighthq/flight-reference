import {
  addNodeChild,
  attachKeyboardInput,
  connectSignal,
  createApplication,
  createDisplayObject,
  createInputManager,
  createSprite,
  createTexture,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  startApplicationLoop,
} from '@flighthq/sdk';

import { render, scale } from './render';

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon.png');
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const logo = createSprite();
logo.data.texture = createTexture({ source: image });
logo.x = 100;
logo.y = 100;
addNodeChild(root, logo);

const held = new Set<string>();
const input = createInputManager();
attachKeyboardInput(input, window);
connectSignal(input.onKeyDown, (data) => held.add(data.key));
connectSignal(input.onKeyUp, (data) => held.delete(data.key));

const app = createApplication();
connectSignal(app.onUpdate, () => {
  if (held.has('ArrowDown')) logo.y += 5;
  if (held.has('ArrowLeft')) logo.x -= 5;
  if (held.has('ArrowRight')) logo.x += 5;
  if (held.has('ArrowUp')) logo.y -= 5;
  invalidateNodeLocalTransform(logo);
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
