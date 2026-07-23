import {
  addNodeChild,
  addTextureAtlasRegion,
  connectSignal,
  createApplication,
  createDisplayObject,
  createMovieClip,
  createSpritesheet,
  createSpritesheetAnimation,
  createSpritesheetFrame,
  createSpritesheetTimelineSource,
  createTextureAtlas,
  loadImageResourceFromUrl,
  playMovieClip,
  setMovieClipSource,
  startApplicationLoop,
  updateMovieClip,
} from '@flighthq/sdk';

import { render, scale } from './render';

const FRAME_W = 220;
const FRAME_H = 220;
const STAGE_W = 400;
const STAGE_H = 400;
const MARGIN = 2;
const GAP = 4;
const COLS_PER_ROW = [5, 4];
const FPS = 10;

const source = await loadImageResourceFromUrl('openfl/assets/nyancat.png');
const atlas = createTextureAtlas({ image: source });

const frames = [];
for (let row = 0; row < COLS_PER_ROW.length; row++) {
  for (let col = 0; col < COLS_PER_ROW[row]; col++) {
    const id = atlas.regions.length;
    addTextureAtlasRegion(atlas, MARGIN + col * (FRAME_W + GAP), MARGIN + row * (FRAME_H + GAP), FRAME_W, FRAME_H);
    frames.push(createSpritesheetFrame({ id }));
  }
}

const animation = createSpritesheetAnimation({
  frames: frames.map((_, i) => i),
  frameDuration: 1000 / FPS,
  loop: true,
});

const spritesheet = createSpritesheet({
  atlas,
  frames,
  animations: { nyancat: animation },
});

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const clip = createMovieClip();
setMovieClipSource(clip, createSpritesheetTimelineSource(spritesheet, animation));
playMovieClip(clip);
clip.x = (STAGE_W - FRAME_W) / 2;
clip.y = (STAGE_H - FRAME_H) / 2;
addNodeChild(root, clip);

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateMovieClip(clip, delta));
connectSignal(app.onRender, () => {
  render(root);
});
startApplicationLoop(app);
