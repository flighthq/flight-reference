import type { AnimationClip, AnimationPlayer, PerspectiveProjection, SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  createAmbientLight,
  createAnimationPlayer,
  createDirectionalLight,
  createScene,
  createSceneLights,
  createSceneFromAwd,
} from '@flighthq/sdk';
import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  // AwayJS used the sRGB display color 0x333338. Flight clears into the linear-HDR scene target and the
  // present pass applies the linear->sRGB encode, so a raw 0x333338 clear would display much lighter
  // (~0x7c7c81). Pre-linearize to the value that presents back as 0x333338.
  backgroundColor: 0x08080aff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 70, near: 1, far: 5000 });

// The AWD ships a fully textured diffuse skin, so keep the lights modest — Flight's linear pipeline
// blows the texture out to white at the AwayJS-era intensities (dir 3 / amb 1.5).
const directional = createDirectionalLight({
  direction: awayDirection(0, -1, -1),
  color: 0xffffffff,
  intensity: 1.1,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.35 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const awdBuffer = await fetch('awayjs/assets/shambler.awd').then((r) => r.arrayBuffer());
const awdBytes = new Uint8Array(awdBuffer);
const awdScene = createSceneFromAwd(awdBytes);
addNodeChild(scene.root, awdScene.root);

// const joints = skinnedMeshes[0]?.skin?.skeleton.joints ?? [];
// The shambler AWD ships several clips (idle, walk, attack01–05); the reference plays the idle loop.
const clip: AnimationClip | null = awdScene.animations['idle'];
if (!clip) throw new Error('Failed to parse AWD skeleton animation');

const player: AnimationPlayer = createAnimationPlayer(clip, { loop: true, speed: 1 });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 150,
  panAngle: 0,
  tiltAngle: 0,
  minTiltAngle: 5,
  maxTiltAngle: 60,
  targetY: 60,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = orbit.panAngle;
let savedTilt = orbit.tiltAngle;

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});
ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
});
window.addEventListener('mouseup', () => {
  dragging = false;
});
ctx.canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance = Math.max(100, Math.min(2000, orbit.distance - e.deltaY / 2));
});

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  advanceAnimationPlayer(player, dt);
  if (clip) applyAnimationClipToScene(clip, player.time);

  orbit.update();
  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pr;
  ctx.canvas.height = h * pr;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
