import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  createRichText,
  createShape,
  invalidateNodeAppearance,
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

const atlasImg = await new Promise<HTMLImageElement>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.src = 'starling/assets/textures/1x/atlas.png';
});

const drawCanvas = document.createElement('canvas');
drawCanvas.width = GameWidth;
drawCanvas.height = 435;
const drawCtx = drawCanvas.getContext('2d')!;

drawCtx.fillStyle = 'rgba(0, 0, 0, 0)';
drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

drawCtx.font = '24px DejaVu Sans, sans-serif';
drawCtx.fillStyle = 'white';
drawCtx.textAlign = 'center';
drawCtx.fillText('Touch the screen', CenterX, 200);
drawCtx.fillText('to draw!', CenterX, 230);

const canvasBmp = createBitmap();
canvasBmp.data.image = createImageResourceFromCanvas(drawCanvas);
canvasBmp.y = 45;
addNodeChild(root, canvasBmp);

const brushSrcX = 515;
const brushSrcY = 144;
const brushW = 62;
const brushH = 62;

let eraseMode = false;

const btnBg = createShape();
appendShapeBeginFill(btnBg, 0x444488);
appendShapeRectangle(btnBg, CenterX - 64, 15, 128, 32);
appendShapeEndFill(btnBg);
addNodeChild(root, btnBg);

const btnLabel = createRichText();
btnLabel.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0xffffff };
btnLabel.x = CenterX - 64;
btnLabel.y = 19;
btnLabel.data.width = 128;
btnLabel.data.height = 32;
btnLabel.data.text = 'Mode: Draw';
addNodeChild(root, btnLabel);

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

function drawBrush(x: number, y: number): void {
  const adjustedY = y - 45;
  if (adjustedY < 0 || adjustedY > 435) return;

  drawCtx.save();
  drawCtx.translate(x, adjustedY);
  drawCtx.rotate(Math.random() * Math.PI * 2);

  if (eraseMode) {
    drawCtx.globalCompositeOperation = 'destination-out';
    drawCtx.drawImage(atlasImg, brushSrcX, brushSrcY, brushW, brushH, -brushW / 2, -brushH / 2, brushW, brushH);
  } else {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    drawCtx.globalCompositeOperation = 'source-over';
    drawCtx.fillStyle = `rgb(${r},${g},${b})`;
    drawCtx.beginPath();
    drawCtx.arc(0, 0, brushW / 2, 0, Math.PI * 2);
    drawCtx.fill();
  }

  drawCtx.restore();

  canvasBmp.data.image = createImageResourceFromCanvas(drawCanvas);
  invalidateNodeAppearance(canvasBmp);
  render(root);
}

const displayCanvas = document.querySelector('canvas')!;
let isDrawing = false;

displayCanvas.addEventListener('pointerdown', (e) => {
  const rect = displayCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  if (mx >= backBtnX && mx <= backBtnX + backBtnW && my >= backBtnY && my <= backBtnY + backBtnH) {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
    return;
  }

  if (mx >= CenterX - 64 && mx <= CenterX + 64 && my >= 15 && my <= 47) {
    eraseMode = !eraseMode;
    btnLabel.data.text = eraseMode ? 'Mode: Erase' : 'Mode: Draw';
    invalidateNodeAppearance(btnLabel);
    render(root);
    return;
  }

  isDrawing = true;
  displayCanvas.setPointerCapture(e.pointerId);
  drawBrush(mx, my);
});

displayCanvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  const rect = displayCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;
  drawBrush(mx, my);
});

displayCanvas.addEventListener('pointerup', () => {
  isDrawing = false;
});
