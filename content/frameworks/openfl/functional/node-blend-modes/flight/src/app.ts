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

const FIXED_MODES: FixedEntry[] = [
  { kind: 'fixed', mode: BlendMode.Normal, name: 'normal' },
  { kind: 'fixed', mode: BlendMode.Layer, name: 'layer' },
  { kind: 'fixed', mode: BlendMode.Multiply, name: 'multiply' },
  { kind: 'fixed', mode: BlendMode.Screen, name: 'screen' },
  { kind: 'fixed', mode: BlendMode.Lighten, name: 'lighten' },
  { kind: 'fixed', mode: BlendMode.Darken, name: 'darken' },
  { kind: 'fixed', mode: BlendMode.Add, name: 'add' },
  { kind: 'fixed', mode: BlendMode.Subtract, name: 'subtract' },
  { kind: 'fixed', mode: BlendMode.Invert, name: 'invert' },
  { kind: 'fixed', mode: BlendMode.Alpha, name: 'alpha' },
  { kind: 'fixed', mode: BlendMode.Erase, name: 'erase' },
];

const ADVANCED_MODES: AdvancedEntry[] = [
  { kind: 'advanced', mode: AdvancedBlendMode.Overlay, cssOp: 'overlay', name: 'overlay' },
  { kind: 'advanced', mode: AdvancedBlendMode.HardLight, cssOp: 'hard-light', name: 'hardlight' },
  { kind: 'advanced', mode: AdvancedBlendMode.SoftLight, cssOp: 'soft-light', name: 'softlight' },
  { kind: 'advanced', mode: AdvancedBlendMode.Difference, cssOp: 'difference', name: 'difference' },
  { kind: 'advanced', mode: AdvancedBlendMode.Exclusion, cssOp: 'exclusion', name: 'exclusion' },
  { kind: 'advanced', mode: AdvancedBlendMode.ColorDodge, cssOp: 'color-dodge', name: 'color-dodge' },
  { kind: 'advanced', mode: AdvancedBlendMode.ColorBurn, cssOp: 'color-burn', name: 'color-burn' },
  { kind: 'advanced', mode: AdvancedBlendMode.Hue, cssOp: 'hue', name: 'hue' },
  { kind: 'advanced', mode: AdvancedBlendMode.Saturation, cssOp: 'saturation', name: 'saturation' },
  { kind: 'advanced', mode: AdvancedBlendMode.Color, cssOp: 'color', name: 'color' },
  { kind: 'advanced', mode: AdvancedBlendMode.Luminosity, cssOp: 'luminosity', name: 'luminosity' },
];

const BLEND_ENTRIES: BlendEntry[] = [...FIXED_MODES, ...ADVANCED_MODES];

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
  const dx = square.width / 2 - 10;
  const dy = square.height / 2 - 10;
  const cw = Math.max(square.width, dx + circle.width);
  const ch = Math.max(square.height, dy + circle.height);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(square.source as CanvasImageSource, 0, 0);
  ctx.globalCompositeOperation = cssOp;
  ctx.drawImage(circle.source as CanvasImageSource, dx, dy);
  return createImageResourceFromCanvas(canvas);
}

let rows = 1;
while (rows * Math.floor((rows * 16) / 9) < BLEND_ENTRIES.length) rows++;
const cols = Math.floor((rows * 16) / 9);

const cellW = W / cols;
const cellH = H / rows;
const LABEL_SPACE = 24;
const PADDING = 8;
const dx = squareImg.width / 2 - 10;
const dy = squareImg.height / 2 - 10;
const naturalW = Math.max(squareImg.width, dx + circleImg.width);
const naturalH = Math.max(squareImg.height, dy + circleImg.height);
const imgScale = Math.min((cellW - PADDING * 2) / naturalW, (cellH - LABEL_SPACE - PADDING * 2) / naturalH);

for (let i = 0; i < BLEND_ENTRIES.length; i++) {
  const entry = BLEND_ENTRIES[i];
  const col = i % cols;
  const row = Math.floor(i / cols);
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

  addNodeChild(root, group);

  const lbl = createRichText();
  lbl.data.defaultTextFormat = {
    font: 'sans-serif',
    size: 11,
    bold: true,
    color: 0x222222,
    align: 'center',
  };
  lbl.x = cx - cellW / 2 + PADDING;
  lbl.y = cy + (naturalH * imgScale) / 2 + 2;
  lbl.data.width = cellW - PADDING * 2;
  lbl.data.height = LABEL_SPACE;
  lbl.data.text = entry.name;
  addNodeChild(root, lbl);
}

render(root);
