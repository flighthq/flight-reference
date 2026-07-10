import {
  addNodeChild,
  BitmapKind,
  BlendMode,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  appendShapeBeginFill,
  appendShapeRectangle,
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
  blend: true,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const blendModes: [BlendMode, string][] = [
  [BlendMode.Normal, 'normal'],
  [BlendMode.Multiply, 'multiply'],
  [BlendMode.Screen, 'screen'],
  [BlendMode.Add, 'add'],
  [BlendMode.Erase, 'erase'],
];

let modeIndex = 0;

const rocket = createBitmap();
rocket.data.image = atlas;
rocket.data.sourceRectangle = createRectangle(322, 1, 256, 142);
rocket.x = CenterX - 128;
rocket.y = 170;
addNodeChild(root, rocket);

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, color: 0xffffff };
infoText.x = 10;
infoText.y = 330;
infoText.data.width = 300;
infoText.data.height = 32;
infoText.data.text = blendModes[0][1];
addNodeChild(root, infoText);

const btnBg = createShape();
appendShapeBeginFill(btnBg, 0x444488);
appendShapeRectangle(btnBg, CenterX - 64, 15, 128, 32);
addNodeChild(root, btnBg);

const btnLabel = createRichText();
btnLabel.data.defaultTextFormat = {
  font: 'DejaVu Sans, sans-serif',
  size: 14,
  color: 0xffffff,
  align: 'center',
};
btnLabel.x = CenterX - 64;
btnLabel.y = 19;
btnLabel.data.width = 128;
btnLabel.data.height = 32;
btnLabel.data.text = 'Switch Mode';
addNodeChild(root, btnLabel);

render(root);

document.addEventListener('click', () => {
  modeIndex = (modeIndex + 1) % blendModes.length;
  const [mode, name] = blendModes[modeIndex];
  rocket.blendMode = mode;
  infoText.data.text = name;
  invalidateNodeAppearance(rocket);
  invalidateNodeAppearance(infoText);
  render(root);
});
