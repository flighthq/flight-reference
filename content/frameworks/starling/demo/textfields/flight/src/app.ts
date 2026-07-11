import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createInteractionManager,
  createInputManager,
  createRichText,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  RichTextKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const offset = 10;

const colorTF = createRichText();
colorTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x033399, align: 'center' };
colorTF.x = offset;
colorTF.y = offset;
colorTF.data.width = 300;
colorTF.data.height = 80;
colorTF.data.border = true;
colorTF.data.wordWrap = true;
colorTF.data.text = 'TextFields can have a border and a color. They can be aligned in different ways, ...';
addNodeChild(root, colorTF);

const leftTF = createRichText();
leftTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x996633, align: 'left' };
leftTF.x = offset;
leftTF.y = offset + 80 + offset;
leftTF.data.width = 145;
leftTF.data.height = 80;
leftTF.data.border = true;
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
rightTF.data.border = true;
rightTF.data.text = '... or\nbottom right ...';
addNodeChild(root, rightTF);

const fontTF = createRichText();
fontTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, align: 'center' };
fontTF.x = offset;
fontTF.y = offset + 80 + offset + 80 + offset;
fontTF.data.width = 300;
fontTF.data.height = 80;
fontTF.data.border = true;
fontTF.data.wordWrap = true;
fontTF.data.htmlText =
  '... or centered. Embedded fonts are detected automatically and ' +
  "<font color='#208080'>support</font> " +
  "<font color='#996633'>basic</font> " +
  "<font color='#333399'>HTML</font> " +
  "<font color='#208020'>formatting</font>.";
addNodeChild(root, fontTF);

const bmpFontTF = createRichText();
bmpFontTF.data.defaultTextFormat = { font: 'serif', size: 36, color: 0xffffff, align: 'center' };
bmpFontTF.x = offset;
bmpFontTF.y = offset + 80 + offset + 80 + offset + 80 + offset;
bmpFontTF.data.width = 300;
bmpFontTF.data.height = 150;
bmpFontTF.data.text = 'It is very easy to use Bitmap fonts,\nas well!';
addNodeChild(root, bmpFontTF);

registerDefaultHitTestPoints();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

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
