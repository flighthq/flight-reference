import {
  addNodeChild,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRichText,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;

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

const offset = 10;

const colorTF = createRichText();
colorTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x333399 };
colorTF.x = offset;
colorTF.y = offset;
colorTF.data.width = 300;
colorTF.data.height = 80;
colorTF.data.text = 'TextFields can have a border and a color. They can be aligned in different ways, ...';
addNodeChild(root, colorTF);

const leftTF = createRichText();
leftTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x996633 };
leftTF.x = offset;
leftTF.y = offset + 80 + offset;
leftTF.data.width = 145;
leftTF.data.height = 80;
leftTF.data.text = '... e.g.\ntop-left ...';
addNodeChild(root, leftTF);

const rightTF = createRichText();
rightTF.data.defaultTextFormat = {
  font: 'Ubuntu, sans-serif',
  size: 19,
  color: 0x208020,
  align: 'right',
};
rightTF.x = 2 * offset + 145;
rightTF.y = offset + 80 + offset;
rightTF.data.width = 145;
rightTF.data.height = 80;
rightTF.data.text = '... or\nbottom right ...';
addNodeChild(root, rightTF);

const fontTF = createRichText();
fontTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x000000 };
fontTF.x = offset;
fontTF.y = offset + 80 + offset + 80 + offset;
fontTF.data.width = 300;
fontTF.data.height = 80;
fontTF.data.text = '... or centered. Embedded fonts are detected automatically and support basic HTML formatting.';
addNodeChild(root, fontTF);

const bmpFontTF = createRichText();
bmpFontTF.data.defaultTextFormat = { font: 'serif', size: 36, color: 0xffffff };
bmpFontTF.x = offset;
bmpFontTF.y = offset + 80 + offset + 80 + offset + 80 + offset;
bmpFontTF.data.width = 300;
bmpFontTF.data.height = 150;
bmpFontTF.data.text = 'It is very easy to use Bitmap fonts,\nas well!';
addNodeChild(root, bmpFontTF);

render(root);
