import {
  addNodeChild,
  AdvancedBlendMode,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  BlendMode,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  createRichText,
  createShape,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import type {
  AdvancedBlendMode as AdvancedBlendModeType,
  BlendMode as BlendModeType,
  ImageResource,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

type FixedEntry = { kind: 'fixed'; mode: BlendModeType; name: string };
type AdvancedEntry = { kind: 'advanced'; mode: AdvancedBlendModeType; cssOp: GlobalCompositeOperation; name: string };
type BlendEntry = AdvancedEntry | FixedEntry;

const BLEND_ENTRIES: BlendEntry[] = [
  { kind: 'fixed', mode: BlendMode.Normal, name: 'normal' },
  { kind: 'fixed', mode: BlendMode.Multiply, name: 'multiply' },
  { kind: 'fixed', mode: BlendMode.Screen, name: 'screen' },
  { kind: 'fixed', mode: BlendMode.Lighten, name: 'lighten' },
  { kind: 'fixed', mode: BlendMode.Darken, name: 'darken' },
  { kind: 'fixed', mode: BlendMode.Add, name: 'add' },
  { kind: 'advanced', mode: AdvancedBlendMode.Difference, cssOp: 'difference', name: 'difference' },
  { kind: 'advanced', mode: AdvancedBlendMode.Overlay, cssOp: 'overlay', name: 'overlay' },
  { kind: 'advanced', mode: AdvancedBlendMode.HardLight, cssOp: 'hard-light', name: 'hardlight' },
  { kind: 'advanced', mode: AdvancedBlendMode.SoftLight, cssOp: 'soft-light', name: 'softlight' },
  { kind: 'advanced', mode: AdvancedBlendMode.Exclusion, cssOp: 'exclusion', name: 'exclusion' },
  { kind: 'advanced', mode: AdvancedBlendMode.ColorDodge, cssOp: 'color-dodge', name: 'color-dodge' },
  { kind: 'advanced', mode: AdvancedBlendMode.ColorBurn, cssOp: 'color-burn', name: 'color-burn' },
  { kind: 'advanced', mode: AdvancedBlendMode.Hue, cssOp: 'hue', name: 'hue' },
  { kind: 'advanced', mode: AdvancedBlendMode.Saturation, cssOp: 'saturation', name: 'saturation' },
  { kind: 'advanced', mode: AdvancedBlendMode.Color, cssOp: 'color', name: 'color' },
  { kind: 'advanced', mode: AdvancedBlendMode.Luminosity, cssOp: 'luminosity', name: 'luminosity' },
];

const { height, render, width } = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  blend: true,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const W = width;
const H = height;

const bg = createShape();
appendShapeBeginFill(bg, 0xffffff);
appendShapeRectangle(bg, 0, 0, W, H);
appendShapeEndFill(bg);
addNodeChild(root, bg);

const [squareImg, circleImg] = await Promise.all([
  loadImageResourceFromUrl('openfl/assets/BlendSquare.png'),
  loadImageResourceFromUrl('openfl/assets/BlendCircle.png'),
]);

function compositeAdvanced(
  square: Readonly<ImageResource>,
  circle: Readonly<ImageResource>,
  cssOp: GlobalCompositeOperation,
): ImageResource {
  const cdx = square.width / 2 - 10;
  const cdy = square.height / 2 - 10;
  const cw = Math.max(square.width, cdx + circle.width);
  const ch = Math.max(square.height, cdy + circle.height);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(square.source as CanvasImageSource, 0, 0);
  ctx.globalCompositeOperation = cssOp;
  ctx.drawImage(circle.source as CanvasImageSource, cdx, cdy);
  return createImageResourceFromCanvas(canvas);
}

const COLS = 5;
const rows = Math.ceil(BLEND_ENTRIES.length / COLS);
const cellW = W / COLS;
const cellH = H / rows;
const LABEL_SPACE = 24;
const PADDING = 6;
const dx = squareImg.width / 2 - 10;
const dy = squareImg.height / 2 - 10;
const naturalW = Math.max(squareImg.width, dx + circleImg.width);
const naturalH = Math.max(squareImg.height, dy + circleImg.height);
const imgScale = Math.min((cellW - PADDING * 2) / naturalW, (cellH - LABEL_SPACE - PADDING * 2) / naturalH);

const blendLayer = createDisplayContainer();
addNodeChild(root, blendLayer);

const labelLayer = createDisplayContainer();
addNodeChild(root, labelLayer);

for (let i = 0; i < BLEND_ENTRIES.length; i++) {
  const entry = BLEND_ENTRIES[i];
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cx = cellW * col + cellW / 2;
  const cy = cellH * row + (cellH - LABEL_SPACE) / 2;

  const group = createDisplayContainer();
  group.scaleX = imgScale;
  group.scaleY = imgScale;
  group.x = cx - (naturalW * imgScale) / 2;
  group.y = cy - (naturalH * imgScale) / 2;

  if (entry.kind === 'fixed') {
    const square = createBitmap();
    square.data.image = squareImg;
    square.data.smoothing = true;
    addNodeChild(group, square);

    const circle = createBitmap();
    circle.data.image = circleImg;
    circle.data.smoothing = true;
    circle.x = dx;
    circle.y = dy;
    circle.blendMode = entry.mode;
    addNodeChild(group, circle);
  } else {
    const composited = createBitmap();
    composited.data.image = compositeAdvanced(squareImg, circleImg, entry.cssOp);
    composited.data.smoothing = true;
    addNodeChild(group, composited);
  }

  addNodeChild(blendLayer, group);

  const squareRightX = group.x + squareImg.width * imgScale;
  const lblW = cellW - PADDING;
  const lbl = createRichText();
  lbl.data.defaultTextFormat = {
    font: 'sans-serif',
    size: 11,
    bold: true,
    color: 0x222222,
    align: 'right',
  };
  lbl.x = squareRightX - lblW;
  lbl.y = cy + (naturalH * imgScale) / 2 + 2;
  lbl.data.width = lblW;
  lbl.data.height = LABEL_SPACE;
  lbl.data.text = entry.name;
  addNodeChild(labelLayer, lbl);
}

render(root);
