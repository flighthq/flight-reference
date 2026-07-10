import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createClipRegionFromRectangle,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  RichTextKind,
  setDisplayObjectClip,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  clip: true,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const maskedContainer = createDisplayContainer();
addNodeChild(root, maskedContainer);

const birdImage = createBitmap();
birdImage.data.image = atlas;
birdImage.data.sourceRectangle = createRectangle(1, 145, 165, 163);
birdImage.x = (GameWidth - 165) / 2;
birdImage.y = 80;
addNodeChild(maskedContainer, birdImage);

const maskRadius = 100;
setDisplayObjectClip(
  maskedContainer,
  createClipRegionFromRectangle({
    x: GameWidth / 2 - maskRadius,
    y: 80 + 163 / 2 - maskRadius,
    width: maskRadius * 2,
    height: maskRadius * 2,
  }),
);

const indicator = createShape();
appendShapeBeginFill(indicator, 0xea8220);
appendShapeRectangle(indicator, 0, 0, maskRadius * 2, maskRadius * 2);
appendShapeEndFill(indicator);
indicator.alpha = 0.15;
indicator.x = GameWidth / 2 - maskRadius;
indicator.y = 80 + 163 / 2 - maskRadius;
addNodeChild(root, indicator);

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 16, color: 0xffffff };
infoText.x = (GameWidth - 256) / 2;
infoText.y = 280;
infoText.data.width = 256;
infoText.data.height = 128;
infoText.data.text = 'Move the mouse (or a finger) over the screen to move the mask.';
addNodeChild(root, infoText);

render(root);

document.addEventListener('mousemove', (e) => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  setDisplayObjectClip(
    maskedContainer,
    createClipRegionFromRectangle({
      x: mx - maskRadius,
      y: my - maskRadius,
      width: maskRadius * 2,
      height: maskRadius * 2,
    }),
  );

  indicator.x = mx - maskRadius;
  indicator.y = my - maskRadius;
  invalidateNodeLocalTransform(indicator);
  invalidateNodeAppearance(maskedContainer);
  render(root);
});
