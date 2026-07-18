import type { VideoChannel } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachPointerInput,
  clearShapeCommands,
  connectSignal,
  createApplication,
  createDisplayObject,
  createInputManager,
  createShape,
  createTween,
  createTweenManager,
  createVideo,
  easeOutQuadratic,
  invalidateNodeRender,
  loadVideoResourceFromUrl,
  playVideoResource,
  startApplicationLoop,
  stopVideoChannel,
  updateTweens,
} from '@flighthq/sdk';

import { container, render, scale, setSize } from './render';

const WIDTH = 550;
const HEIGHT = 400;
const tweenManager = createTweenManager({ defaultEase: easeOutQuadratic });
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const videoSource = await loadVideoResourceFromUrl('openfl/assets/example.mp4');

const videoNode = createVideo();
videoNode.data.source = videoSource;
addNodeChild(root, videoNode);

const overlay = createShape();
addNodeChild(root, overlay);

let channel: VideoChannel | null = null;

function play(): void {
  if (channel !== null) stopVideoChannel(channel);
  channel = playVideoResource(videoSource);
  if (channel === null) return;
  overlay.alpha = 1;
  overlay.visible = true;
  invalidateNodeRender(overlay);
  const fade = createTween(tweenManager, overlay, 2000, { alpha: 0 });
  connectSignal(fade.onUpdate, () => invalidateNodeRender(overlay));
  connectSignal(fade.onComplete, () => {
    overlay.visible = false;
    invalidateNodeRender(overlay);
  });
  connectSignal(channel.onComplete, () => {
    channel = null;
    overlay.visible = true;
    const fadeIn = createTween(tweenManager, overlay, 1000, { alpha: 1 });
    connectSignal(fadeIn.onUpdate, () => invalidateNodeRender(overlay));
  });
}

function resize(w: number, h: number): void {
  setSize(w, h);
  videoNode.x = 0;
  videoNode.y = 0;
  videoNode.scaleX = 1;
  videoNode.scaleY = 1;
  clearShapeCommands(overlay);
  appendShapeBeginFill(overlay, 0x000000, 0.5);
  appendShapeRectangle(overlay, 0, 0, 560, 320);
  invalidateNodeRender(videoNode);
  invalidateNodeRender(overlay);
}

resize(WIDTH, HEIGHT);

const input = createInputManager();
attachPointerInput(input, container);
connectSignal(input.onPointerDown, () => play());

const app = createApplication();
connectSignal(app.onUpdate, (delta) => {
  if (channel !== null && channel.state === 'playing') invalidateNodeRender(videoNode);
  updateTweens(tweenManager, delta);
});
connectSignal(app.onRender, () => {
  render(root);
});
startApplicationLoop(app);
