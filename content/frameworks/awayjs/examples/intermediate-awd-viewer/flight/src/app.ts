import type { Camera, Mesh, SceneLights, Skeleton, SkeletonAnimator, SkeletonClip } from '@flighthq/sdk';
import {
  addNodeChild,
  applySkeletonClip,
  computeSkeletonJointMatrices,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createScene,
  createSceneLights,
  createSkeletonAnimator,
  createVector3,
  DEG_TO_RAD,
  parseAwdSkeletonAnimation,
  setCameraViewMatrix4FromLookAt,
} from '@flighthq/sdk';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

// parseAwdSkeletonAnimation parses an AWD binary file that embeds a skinned mesh, skeleton, and
// named animation clips. Returns { mesh, skeleton, clips } where clips carry their name and
// duration. Added in @flighthq/skeleton3d (merged into SDK 0.3.0).

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x333338ff,
});

const scene = createScene();

const camera: Camera = createCamera({
  near: 1,
  far: 5000,
  projection: { fovY: 70 * DEG_TO_RAD, aspect: window.innerWidth / window.innerHeight },
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 1 },
  color: 0xffffff,
  intensity: 0.7,
});
const ambient = createAmbientLight({ color: 0xffffff, intensity: 0.3 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const awdBuffer = await fetch('awayjs/assets/shambler.awd').then((r) => r.arrayBuffer());
const awdScene = parseAwdSkeletonAnimation(awdBuffer);

const model: Mesh = awdScene.mesh;
const skeleton: Skeleton = awdScene.skeleton;
const clips: SkeletonClip[] = awdScene.clips;
addNodeChild(scene, model);

const IDLE_NAME = 'idle';
for (const clip of clips) {
  clip.looping = clip.name === IDLE_NAME;
}

const animator: SkeletonAnimator = createSkeletonAnimator(skeleton, clips);
animator.play(IDLE_NAME);

// Hover camera — pan and tilt with drag, zoom with wheel. LookAt the character's centre of mass.
let panAngle = 0;
let tiltAngle = 0;
let distance = 150;
let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const lookAt = createVector3(0, 60, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 0, 0);

function updateCamera(): void {
  const tilt = Math.max(5 * DEG_TO_RAD, Math.min(60 * DEG_TO_RAD, tiltAngle));
  tiltAngle = tilt;
  eye.x = lookAt.x + distance * Math.sin(panAngle) * Math.cos(tilt);
  eye.y = lookAt.y + distance * Math.sin(tilt);
  eye.z = lookAt.z + distance * Math.cos(panAngle) * Math.cos(tilt);
  setCameraViewMatrix4FromLookAt(camera, eye, lookAt, up);
}

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = panAngle;
  savedTilt = tiltAngle;
});
ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (e.clientX - lastMouseX) + savedPan;
  tiltAngle = 0.3 * DEG_TO_RAD * (e.clientY - lastMouseY) + savedTilt;
});
window.addEventListener('mouseup', () => {
  dragging = false;
});
ctx.canvas.addEventListener('wheel', (e: WheelEvent) => {
  distance = Math.max(100, Math.min(2000, distance - e.deltaY / 2));
});

const attackNames: Record<string, string> = {
  '1': 'attack01',
  '2': 'attack02',
  '3': 'attack03',
  '4': 'attack04',
  '5': 'attack05',
};

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const attack = attackNames[e.key];
  if (attack) animator.play(attack, 0, () => animator.play(IDLE_NAME));
});

updateCamera();

const CROSSFADE_DURATION = 0.5;
let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  const { clip, time } = animator.step(dt, CROSSFADE_DURATION);
  applySkeletonClip(skeleton, clip, time);
  computeSkeletonJointMatrices(skeleton);

  updateCamera();
  ctx.render(scene, camera, lights);
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
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
