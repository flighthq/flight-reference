import type { AnimationClip, AnimationPlayer, Camera, Mesh, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  applyLightExposure,
  createAmbientLight,
  createAnimationPlayer,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createScene,
  createSceneLights,
  createSceneFromAwd,
  createStandardPbrMaterial,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPhongToPbrLightExposure,
  getPbrRoughnessFromPhongShininess,
  isMesh,
  parseAwdSkeletonAnimation,
  setCameraViewMatrix4FromLookAt,
  updateMeshSkin,
} from '@flighthq/sdk';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import { packOpaqueColor } from '../../../_shared/flight/src/lighting';

const pbrExposure = getPhongToPbrLightExposure();

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x333338ff,
});

const scene = createScene();

const camera: Camera = createCamera({
  near: 1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 70 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 1 },
  color: 0xffffffff,
  intensity: applyLightExposure(5, pbrExposure),
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: applyLightExposure(1.5, pbrExposure) });
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
  eye.z = lookAt.z - distance * Math.cos(panAngle) * Math.cos(tilt);
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

updateCamera();

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  advanceAnimationPlayer(player, dt);
  applyAnimationClipToScene(clip, player.time);
  for (const mesh of skinnedMeshes) updateMeshSkin(mesh);

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
