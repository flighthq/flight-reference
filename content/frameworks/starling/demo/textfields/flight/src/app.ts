import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createBitmapText,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createGlyphSourceFromBitmapFont,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRichText,
  createTextureAtlasFromImageResource,
  defaultGlBitmapRenderer,
  defaultGlQuadBatchRenderer,
  defaultGlRichTextRenderer,
  defaultGlTextLabelRenderer,
  invalidateNodeLocalContent,
  loadImageResourceFromUrl,
  parseBitmapFontXml,
  parseTextMarkup,
  prepareScene2DRender,
  QuadBatchKind,
  registerDefaultGlMaterial,
  registerDefaultHitTests,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  RichTextKind,
  setRichTextContent,
  TextLabelKind,
  updateBitmapText,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(GameWidth, GameHeight, pixelRatio);
document.body.appendChild(canvas);

const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  sceneGraphSyncPolicy: 'refreshDerivedState',
});

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
registerDefaultGlMaterial(state);
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, QuadBatchKind, defaultGlQuadBatchRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const offset = 10;

const colorTF = createRichText();
colorTF.data.defaultTextFormat = { font: 'Ubuntu, sans-serif', size: 19, color: 0x033399, align: 'center' };
colorTF.x = offset;
colorTF.y = offset;
colorTF.data.width = 300;
colorTF.data.height = 80;
colorTF.data.border = true;
colorTF.data.borderColor = 0x033399;
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
leftTF.data.borderColor = 0x996633;
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
rightTF.data.borderColor = 0x208020;
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
setRichTextContent(
  fontTF,
  parseTextMarkup(
    '... or centered. Embedded fonts are detected automatically and ' +
      "<font color='#208080'>support</font> " +
      "<font color='#996633'>basic</font> " +
      "<font color='#333399'>HTML</font> " +
      "<font color='#208020'>formatting</font>.",
  ),
);
addNodeChild(root, fontTF);

const desyrelFntText = await (await fetch('starling/fonts/1x/desyrel.fnt')).text();
const desyrelImage = await loadImageResourceFromUrl('starling/fonts/1x/desyrel.png');
const desyrelAtlas = createTextureAtlasFromImageResource(desyrelImage);
const desyrelFont = parseBitmapFontXml(desyrelFntText, { resolvePage: () => desyrelAtlas });

const bmpFontTF = createBitmapText(desyrelFont ? createGlyphSourceFromBitmapFont(desyrelFont) : null, {
  text: 'It is very easy to use Bitmap fonts,\nas well!',
  align: 'center',
  color: 0xffffffff,
  wrapWidth: 300,
});
bmpFontTF.x = offset;
bmpFontTF.y = offset + 80 + offset + 80 + offset + 80 + offset;
addNodeChild(root, bmpFontTF);
updateBitmapText(bmpFontTF);
invalidateNodeLocalContent(bmpFontTF);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, canvas);

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
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
