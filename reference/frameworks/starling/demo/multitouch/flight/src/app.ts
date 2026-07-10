import {
  addNodeChild,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

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

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 12, color: 0xffffff };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 25;
infoText.data.text = '[drag the bird image to move it]';
addNodeChild(root, infoText);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const sheet = createBitmap();
sheet.data.image = atlas;
sheet.data.sourceRectangle = createRectangle(579, 1, 228, 171);
sheet.x = CenterX - 114;
sheet.y = CenterY - 86;
sheet.rotation = 0.1745;
addNodeChild(root, sheet);

render(root);

let dragging = false;
let lastX = 0;
let lastY = 0;

const canvas = document.querySelector('canvas')!;

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  const sx = sheet.x;
  const sy = sheet.y;
  const sw = 228;
  const sh = 171;

  if (mx >= sx && mx <= sx + sw && my >= sy && my <= sy + sh) {
    dragging = true;
    lastX = mx;
    lastY = my;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  sheet.x += mx - lastX;
  sheet.y += my - lastY;
  lastX = mx;
  lastY = my;
  invalidateNodeLocalTransform(sheet);
  render(root);
});

canvas.addEventListener('pointerup', () => {
  dragging = false;
});
