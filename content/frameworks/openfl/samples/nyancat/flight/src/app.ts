import type { MovieClip } from '@flighthq/sdk';
import {
  connectSignal,
  createApplication,
  createScene2DFromSwf,
  getNodeChildren,
  getNodeHeight,
  getNodeWidth,
  invalidateNodeLocalTransform,
  MovieClipKind,
  playMovieClip,
  registerDeflateDecompressor,
  startApplicationLoop,
  updateMovieClip,
} from '@flighthq/sdk';

import { render, scale } from './render';

const STAGE_W = 600;
const STAGE_H = 600;

registerDeflateDecompressor();

const response = await fetch('openfl/swf/library.swf');
if (!response.ok) throw new Error(`Unable to load Nyan Cat SWF: ${response.status}`);

const document = createScene2DFromSwf(new Uint8Array(await response.arrayBuffer()));
if (document === null) throw new Error('Unable to decode Nyan Cat SWF');

const root = document.root;
const clipNode = getNodeChildren(root)[0];
if (clipNode?.kind !== MovieClipKind) throw new Error('Nyan Cat SWF is missing its animated clip');

const clip = clipNode as MovieClip;
root.x = (STAGE_W - getNodeWidth(root)) / 2;
root.y = (STAGE_H - getNodeHeight(root)) / 2;
root.scaleX = scale;
root.scaleY = scale;
invalidateNodeLocalTransform(root);
playMovieClip(clip);

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateMovieClip(clip, delta));
connectSignal(app.onRender, () => {
  render(root);
});
startApplicationLoop(app);
