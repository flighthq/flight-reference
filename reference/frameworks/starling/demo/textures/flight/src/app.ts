import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const flight00 = createBitmap();
flight00.data.image = atlas;
flight00.data.sourceRectangle = createRectangle(1, 145, 165, 163);
flight00.x = -20;
flight00.y = 0;
addNodeChild(root, flight00);

const flight04 = createBitmap();
flight04.data.image = atlas;
flight04.data.sourceRectangle = createRectangle(808, 1, 200, 108);
flight04.x = 90;
flight04.y = 85;
addNodeChild(root, flight04);

const flight08 = createBitmap();
flight08.data.image = atlas;
flight08.data.sourceRectangle = createRectangle(851, 492, 165, 129);
flight08.x = 100;
flight08.y = -60;
addNodeChild(root, flight08);

const fallback = createRichText();
fallback.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0xffffff };
fallback.x = CenterX - 110;
fallback.y = 280;
fallback.data.width = 220;
fallback.data.height = 128;
fallback.data.text = 'ATF textures are not fully supported in non Flash/Air targets.';
addNodeChild(root, fallback);

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
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;
  if (mx >= backBtnX && mx <= backBtnX + backBtnW && my >= backBtnY && my <= backBtnY + backBtnH) {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  }
});
