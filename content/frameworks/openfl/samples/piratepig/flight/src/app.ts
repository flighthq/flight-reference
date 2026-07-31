import {
  addNodeChild,
  attachPointerInput,
  attachWindowResize,
  attachWindowVisibility,
  connectInputToInteraction,
  connectSignal,
  createApplication,
  createApplicationWindow,
  createDisplayObject,
  createInputManager,
  createInteractionManager,
  createSprite,
  createTexture,
  createTweenManager,
  DisplayObjectKind,
  hitTestGraphLocalBounds,
  invalidateNodeRender,
  loadAudioResourceFromUrls,
  loadFontFromUrl,
  loadImageResourceFromUrl,
  registerHitTest,
  startApplicationLoop,
  stopApplicationLoop,
  updateTweens,
} from '@flighthq/sdk';

import { PiratePigGame } from './game';
import { applyBackgroundBlur, container, render, scale, setSize } from './render';

// ── Assets ─────────────────────────────────────────────────────────────────

const audioContext = new AudioContext();

const [bgImage, footerImage, logoImage, font, theme, sound3, sound4, sound5, ...tileImages] = await Promise.all([
  loadImageResourceFromUrl('openfl/images/background_tile.png'),
  loadImageResourceFromUrl('openfl/images/center_bottom.png'),
  loadImageResourceFromUrl('openfl/images/logo.png'),
  loadFontFromUrl('openfl/fonts/FreebooterUpdated.ttf', 'FreebooterUpdated'),
  loadAudioResourceFromUrls(audioContext, [{ url: 'openfl/sounds/theme.ogg' }, { url: 'openfl/sounds/theme.mp3' }]),
  loadAudioResourceFromUrls(audioContext, [{ url: 'openfl/sounds/sound3.ogg' }, { url: 'openfl/sounds/sound3.mp3' }]),
  loadAudioResourceFromUrls(audioContext, [{ url: 'openfl/sounds/sound4.ogg' }, { url: 'openfl/sounds/sound4.mp3' }]),
  loadAudioResourceFromUrls(audioContext, [{ url: 'openfl/sounds/sound5.ogg' }, { url: 'openfl/sounds/sound5.mp3' }]),
  loadImageResourceFromUrl('openfl/images/game_bear.png'),
  loadImageResourceFromUrl('openfl/images/game_bunny_02.png'),
  loadImageResourceFromUrl('openfl/images/game_carrot.png'),
  loadImageResourceFromUrl('openfl/images/game_lemon.png'),
  loadImageResourceFromUrl('openfl/images/game_panda.png'),
  loadImageResourceFromUrl('openfl/images/game_piratePig.png'),
]);

const sounds = [theme, sound3, sound4, sound5];

// ── Scene3D ──────────────────────────────────────────────────────────────────

registerHitTest(DisplayObjectKind, hitTestGraphLocalBounds);

const manager = createTweenManager();
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const background = createSprite();
background.data.texture = createTexture({ source: bgImage });
addNodeChild(root, background);

const footer = createSprite();
footer.data.texture = createTexture({ source: footerImage });
addNodeChild(root, footer);

const interactionManager = createInteractionManager(root);
const game = new PiratePigGame(audioContext, manager, interactionManager, tileImages, logoImage, font.name, sounds, {
  coordScale: scale,
  cursorElement: container,
});

const logo = createSprite();
logo.data.texture = createTexture({ source: logoImage });
addNodeChild(game.obj, logo);

addNodeChild(root, game.obj);

// Blur the white score panel (OpenFL: Background.filters = [new BlurFilter(10, 10)]).
const refreshBackgroundBlur = applyBackgroundBlur(game.backgroundPanel);

// ── Layout ─────────────────────────────────────────────────────────────────

function resize(w: number, h: number): void {
  setSize(w, h);

  background.scaleX = w / bgImage.width;
  background.scaleY = h / bgImage.height;
  invalidateNodeRender(background);

  game.resize(w, h);

  footer.scaleX = game.currentScale;
  footer.scaleY = game.currentScale;
  footer.x = w / 2 - (footerImage.width * footer.scaleX) / 2;
  footer.y = h - footerImage.height * footer.scaleY;
  invalidateNodeRender(footer);

  // Re-bake the cached background blur for the new layout (a no-op on the CSS-filter backends).
  refreshBackgroundBlur();
}

const win = createApplicationWindow();
connectSignal(win.onResize, () => resize(win.width, win.height));
connectSignal(win.onDeactivate, () => stopApplicationLoop(app));
connectSignal(win.onActivate, () => startApplicationLoop(app));
attachWindowResize(win, container);
attachWindowVisibility(win);
resize(window.innerWidth, window.innerHeight);

// ── Game start ─────────────────────────────────────────────────────────────

game.newGame();

// ── Input ──────────────────────────────────────────────────────────────────

const inputManager = createInputManager();
attachPointerInput(inputManager, container);
connectInputToInteraction(inputManager, interactionManager, scale);

// ── Render loop ────────────────────────────────────────────────────────────

const app = createApplication();
connectSignal(app.onUpdate, (delta) => {
  updateTweens(manager, delta);
  game.onEnterFrame();
});
connectSignal(app.onRender, () => {
  render(root);
});
startApplicationLoop(app);
