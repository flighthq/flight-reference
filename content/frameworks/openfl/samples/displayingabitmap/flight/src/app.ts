import {
  addNodeChild,
  createDisplayObject,
  createSprite,
  createTexture,
  loadImageResourceFromUrl,
} from '@flighthq/sdk';

import { render, scale } from './render';

const main = createDisplayObject();
main.scaleX = scale;
main.scaleY = scale;

const bitmap = createSprite();

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon_large.png');
bitmap.data.texture = createTexture({ source: image });
bitmap.x = (800 - image.width) / 2;
bitmap.y = (600 - image.height) / 2;
addNodeChild(main, bitmap);

function enterFrame() {
  render(main);
  requestAnimationFrame(enterFrame);
}

enterFrame();
