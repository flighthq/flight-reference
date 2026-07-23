import {
  addNodeChild,
  attachKeyboardInput,
  connectSignal,
  createApplication,
  createBitmap,
  createDisplayObject,
  createInputManager,
  createRichText,
  invalidateNodeRender,
  loadFontFromUrl,
  loadImageResourceFromUrl,
  startApplicationLoop,
} from '@flighthq/sdk';

import { render, scale } from './render';

const MAX_DEMO = 5;
const TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const embeddedFonts = {
  liberation: await loadFontFromUrl('openfl/assets/LiberationSerif-Regular.ttf', 'Liberation Serif Regular'),
  nokia: await loadFontFromUrl('openfl/assets/nokiafc22.ttf', 'Nokia Cellphone FC Small'),
};

const comparisonImages = new Map<string, Awaited<ReturnType<typeof loadImageResourceFromUrl>>>();
for (const renderer of ['flash', 'legacy', 'html5']) {
  for (let i = 0; i <= MAX_DEMO; i++) {
    const key = `${renderer}${i}`;
    comparisonImages.set(key, await loadImageResourceFromUrl(`openfl/assets/img/${key}.png`));
  }
}

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const comparison = createBitmap();
comparison.alpha = 0;
addNodeChild(root, comparison);

const label = createRichText();
label.data.defaultTextFormat = { font: 'serif' };
label.data.text = 'HTML5';
label.data.width = 220;
addNodeChild(root, label);

const textFields = [50, 175, 300, 425].map((y) => {
  const field = createRichText();
  field.x = 50;
  field.y = y;
  field.data.border = true;
  field.data.borderColor = 0x000000;
  field.data.height = 100;
  field.data.multiline = true;
  field.data.selectable = false;
  field.data.text = TEXT;
  field.data.width = 700;
  field.data.wordWrap = true;
  addNodeChild(root, field);
  return field;
});

const instructions = createRichText();
instructions.y = 20;
instructions.data.defaultTextFormat = { font: 'serif' };
instructions.data.text =
  'Showing demo (0). Left/Right: Change demo; 1/2: Compare to Flash/Legacy; Up/Down: Change comparison alphas';
instructions.data.width = 800;
addNodeChild(root, instructions);

const aligns = ['center', 'left', 'right', 'justify'] as const;
let comparisonAlpha = 1;
let comparisonRenderer: 'flash' | 'legacy' | 'html5' | null = null;
let demo = 0;

function getFont(demoIndex: number): string {
  if (demoIndex === 1 || demoIndex === 3) {
    return embeddedFonts.liberation.name;
  }

  if (demoIndex === 4 || demoIndex === 5) {
    return embeddedFonts.nokia.name;
  }

  return 'serif';
}

function getSize(demoIndex: number): number {
  switch (demoIndex) {
    case 0:
    case 1:
      return 24;
    case 2:
    case 3:
      return 12;
    case 4:
      return 8;
    case 5:
      return 16;
    default:
      return 24;
  }
}

function updateComparison(): void {
  if (comparisonRenderer === null) {
    comparison.alpha = 0;
    invalidateNodeRender(comparison);
    return;
  }

  const key = `${comparisonRenderer}${demo}`;
  comparison.data.image = comparisonImages.get(key) ?? null;
  comparison.alpha = comparisonAlpha;
  invalidateNodeRender(comparison);
}

function showDemo(nextDemo: number): void {
  demo = nextDemo;
  label.data.text = comparisonRenderer === null ? 'HTML5' : `HTML5 vs ${comparisonRenderer}`;

  const font = getFont(demo);
  const size = getSize(demo);
  for (let i = 0; i < textFields.length; i++) {
    textFields[i].data.defaultTextFormat = {
      align: aligns[i],
      color: 0x000000,
      font,
      leading: 20,
      size,
    };
    invalidateNodeRender(textFields[i]);
  }

  instructions.data.text = `Showing demo (${demo}). Left/Right: Change demo; 1/2: Compare to Flash/Legacy; Up/Down: Change comparison alphas`;
  invalidateNodeRender(label);
  invalidateNodeRender(instructions);
  updateComparison();
}

function cycleAlpha(direction: number): void {
  if (comparisonRenderer === null) {
    return;
  }

  let nextAlpha = comparisonAlpha + 0.25 * direction;
  if (nextAlpha > 1) {
    nextAlpha = 0;
  } else if (nextAlpha < 0) {
    nextAlpha = 1;
  }

  comparisonAlpha = nextAlpha;
  updateComparison();
}

const input = createInputManager();
attachKeyboardInput(input, window);
connectSignal(input.onKeyDown, (data) => {
  switch (data.key) {
    case 'ArrowRight':
      showDemo(demo >= MAX_DEMO ? 0 : demo + 1);
      break;
    case 'ArrowLeft':
      showDemo(demo <= 0 ? MAX_DEMO : demo - 1);
      break;
    case '1':
      comparisonRenderer = 'flash';
      showDemo(demo);
      break;
    case '2':
      comparisonRenderer = 'legacy';
      showDemo(demo);
      break;
    case '3':
      comparisonRenderer = 'html5';
      showDemo(demo);
      break;
    case 'ArrowUp':
      cycleAlpha(-1);
      break;
    case 'ArrowDown':
      cycleAlpha(1);
      break;
  }
});

showDemo(0);

const app = createApplication();
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
