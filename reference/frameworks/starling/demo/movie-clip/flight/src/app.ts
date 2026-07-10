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
  invalidateNodeAppearance,
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
const FrameSize = 220;
const FrameRate = 15;
const FrameDuration = 1000 / FrameRate;

interface MovieFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  fx: number;
  fy: number;
}

const frames: MovieFrame[] = [
  { sx: 1, sy: 145, sw: 165, sh: 163, fx: -42, fy: -21 },
  { sx: 1, sy: 309, sw: 165, sh: 160, fx: -42, fy: -23 },
  { sx: 295, sy: 337, sw: 165, sh: 149, fx: -42, fy: -33 },
  { sx: 578, sy: 173, sw: 191, sh: 142, fx: -16, fy: -37 },
  { sx: 808, sy: 1, sw: 200, sh: 108, fx: -8, fy: -68 },
  { sx: 851, sy: 353, sw: 165, sh: 138, fx: -42, fy: -67 },
  { sx: 1, sy: 470, sw: 165, sh: 143, fx: -42, fy: -66 },
  { sx: 685, sy: 353, sw: 165, sh: 140, fx: -42, fy: -66 },
  { sx: 851, sy: 492, sw: 165, sh: 129, fx: -42, fy: -67 },
  { sx: 461, sy: 483, sw: 165, sh: 129, fx: -42, fy: -69 },
  { sx: 292, sy: 487, sw: 165, sh: 128, fx: -42, fy: -72 },
  { sx: 627, sy: 494, sw: 165, sh: 126, fx: -42, fy: -74 },
  { sx: 770, sy: 244, sw: 188, sh: 108, fx: -19, fy: -75 },
  { sx: 808, sy: 110, sw: 199, sh: 133, fx: -8, fy: -50 },
];

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

const movie = createDisplayContainer();
movie.x = CenterX - FrameSize / 2;
movie.y = CenterY - FrameSize / 2;
addNodeChild(root, movie);

const bmp = createBitmap();
bmp.data.image = atlas;
addNodeChild(movie, bmp);

function showFrame(index: number): void {
  const frame = frames[index];
  bmp.data.sourceRectangle = createRectangle(frame.sx, frame.sy, frame.sw, frame.sh);
  bmp.x = -frame.fx;
  bmp.y = -frame.fy;
  invalidateNodeAppearance(bmp);
  invalidateNodeLocalTransform(bmp);
}

let currentFrame = 0;
showFrame(currentFrame);

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

let lastFrameTime = performance.now();

function enterFrame(now: number): void {
  if (now - lastFrameTime >= FrameDuration) {
    lastFrameTime = now;
    currentFrame = (currentFrame + 1) % frames.length;
    showFrame(currentFrame);
    render(root);
  }

  requestAnimationFrame(enterFrame);
}

requestAnimationFrame(enterFrame);
