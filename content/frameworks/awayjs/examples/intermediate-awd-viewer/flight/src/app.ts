import type { AnimationClip, AnimationPlayer, Mesh, SceneLights, SceneNode } from '@flighthq/sdk';
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
  createStandardPbrMaterial,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  isMesh,
  packOpaqueColor,
  parseAwdSkeletonAnimation,
  updateMeshSkin,
} from '@flighthq/sdk';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x333338ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 70, near: 1, far: 5000 });

const directional = createDirectionalLight({
  direction: awayDirection(0, -1, -1),
  color: 0xffffffff,
  intensity: 3,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const awdBuffer = await fetch('awayjs/assets/shambler.awd').then((r) => r.arrayBuffer());
const awdBytes = new Uint8Array(awdBuffer);

const bodyMaterial = createStandardPbrMaterial({
  baseColor: packOpaqueColor(0x808080),
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});

function assignMaterial(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(bodyMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      if (!node.materials[i]) node.materials[i] = bodyMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignMaterial(child);
  }
}

const awdScene = createSceneFromAwd(awdBytes);
assignMaterial(awdScene);

const skinnedMeshes: Mesh[] = [];
function collectSkinnedMeshes(node: SceneNode): void {
  if (isMesh(node) && node.skin) skinnedMeshes.push(node);
  for (const child of getNodeChildren(node)) collectSkinnedMeshes(child);
}
collectSkinnedMeshes(awdScene);

for (const child of getNodeChildren(awdScene)) {
  addNodeChild(scene, child);
}

const joints = skinnedMeshes[0]?.skin?.skeleton.joints ?? [];
const clip: AnimationClip | null = parseAwdSkeletonAnimation(awdBytes, joints);
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
  applyAnimationClipToScene(clip, player.time);
  for (const mesh of skinnedMeshes) updateMeshSkin(mesh);

  orbit.update();
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
