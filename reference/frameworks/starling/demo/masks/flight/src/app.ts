import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createClipRegionFromCircle,
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

const maskText = createRichText();
maskText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 20 };
maskText.x = (GameWidth - 256) / 2;
maskText.y = 260;
maskText.data.width = 256;
maskText.data.height = 128;
maskText.data.wordWrap = true;
maskText.data.text = 'Move the mouse (or a finger) over the screen to move the mask.';
addNodeChild(maskedContainer, maskText);

const maskRadius = 100;
const startX = GameWidth / 2;
const startY = 80 + 163 / 2;

setDisplayObjectClip(maskedContainer, createClipRegionFromCircle(startX, startY, maskRadius));

const indicator = createShape();
appendShapeBeginFill(indicator, 0xea8220);
appendShapeCircle(indicator, 0, 0, maskRadius);
appendShapeEndFill(indicator);
indicator.alpha = 0.1;
indicator.x = startX;
indicator.y = startY;
addNodeChild(root, indicator);

const backBtnW = 88;
const backBtnH = 42;
const backBtnX = GameWidth / 2 - backBtnW / 2;
const backBtnY = GameHeight - backBtnH + 4;

const backBtnBg = createShape();
appendShapeBeginFill(backBtnBg, 0x444488);
appendShapeRectangle(backBtnBg, backBtnX, backBtnY, backBtnW, backBtnH);
appendShapeEndFill(backBtnBg);
addNodeChild(root, backBtnBg);

const backBtnLabel = createRichText();
backBtnLabel.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0xffffff };
backBtnLabel.x = backBtnX;
backBtnLabel.y = backBtnY + 4;
backBtnLabel.data.width = backBtnW;
backBtnLabel.data.height = backBtnH;
backBtnLabel.data.text = 'Back';
addNodeChild(root, backBtnLabel);

render(root);

const canvas = document.querySelector('canvas')!;

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  setDisplayObjectClip(maskedContainer, createClipRegionFromCircle(mx, my, maskRadius));

  indicator.x = mx;
  indicator.y = my;
  invalidateNodeLocalTransform(indicator);
  invalidateNodeAppearance(maskedContainer);
  render(root);
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;
  if (mx >= backBtnX && mx <= backBtnX + backBtnW && my >= backBtnY && my <= backBtnY + backBtnH) {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  }
});
