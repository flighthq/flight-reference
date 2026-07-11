import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  createInteractionManager,
  createInputManager,
  invalidateImageResource,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

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
drawCtx.fillStyle = 'black';
drawCtx.textAlign = 'center';
drawCtx.textBaseline = 'top';
drawCtx.fillText('Touch the screen', CenterX, 196);
drawCtx.fillText('to draw!', CenterX, 224);

const drawImage = createImageResourceFromCanvas(drawCanvas);
const canvasBmp = createBitmap();
canvasBmp.data.image = drawImage;
addNodeChild(root, canvasBmp);

const brushSrcX = 515;
const brushSrcY = 144;
const brushW = 62;
const brushH = 62;

const brushTintCanvas = document.createElement('canvas');
brushTintCanvas.width = brushW;
brushTintCanvas.height = brushH;
const brushTintCtx = brushTintCanvas.getContext('2d')!;

let eraseMode = false;
let currentBrushColor = 0xffffff;

registerDefaultHitTestPoints();
const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const modeBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Mode: Draw',
  width: 128,
  height: 32,
  onTriggered: () => {
    eraseMode = !eraseMode;
    modeBtn.setText(eraseMode ? 'Mode: Erase' : 'Mode: Draw');
  },
});
modeBtn.root.x = CenterX - 64;
modeBtn.root.y = 15;
modeBtn.connect(interaction);
addNodeChild(root, modeBtn.root);

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 50,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 50 + 4;
backBtn.connect(interaction);
addNodeChild(root, backBtn.root);

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();

function drawBrush(x: number, y: number): void {
  if (y < 0 || y > 435) return;

  drawCtx.save();
  drawCtx.translate(x, y);
  drawCtx.rotate(Math.random() * Math.PI * 2);

  if (eraseMode) {
    drawCtx.globalCompositeOperation = 'destination-out';
    drawCtx.drawImage(atlasImg, brushSrcX, brushSrcY, brushW, brushH, -brushW / 2, -brushH / 2, brushW, brushH);
  } else {
    const r = (currentBrushColor >> 16) & 0xff;
    const g = (currentBrushColor >> 8) & 0xff;
    const b = currentBrushColor & 0xff;
    brushTintCtx.clearRect(0, 0, brushW, brushH);
    brushTintCtx.globalCompositeOperation = 'source-over';
    brushTintCtx.drawImage(atlasImg, brushSrcX, brushSrcY, brushW, brushH, 0, 0, brushW, brushH);
    brushTintCtx.globalCompositeOperation = 'source-atop';
    brushTintCtx.fillStyle = `rgb(${r},${g},${b})`;
    brushTintCtx.fillRect(0, 0, brushW, brushH);
    drawCtx.globalCompositeOperation = 'source-over';
    drawCtx.drawImage(brushTintCanvas, -brushW / 2, -brushH / 2);
  }

  drawCtx.restore();

  invalidateImageResource(drawImage);
  invalidateNodeAppearance(canvasBmp);
}

const displayCanvas = (target.state as { canvas: HTMLCanvasElement }).canvas;
let isDrawing = false;

displayCanvas.addEventListener('pointerdown', (e) => {
  const rect = displayCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  currentBrushColor = Math.round(Math.random() * 0xffffff);
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
