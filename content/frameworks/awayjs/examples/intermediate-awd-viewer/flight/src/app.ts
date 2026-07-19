import type { AnimationClip, AnimationPlayer, GlRenderTarget, Mesh, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  createAmbientLight,
  createAnimationPlayer,
  createDirectionalLight,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createScene,
  createSceneLights,
  createBlinnPhongMaterial,
  getNodeChildren,
  isMesh,
  loadSceneFromAwd,
  packOpaqueColor,
  parseAwdSkeletonAnimation,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  resizeGlRenderTarget,
} from '@flighthq/sdk';
import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x333338ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerBlinnPhongGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

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

// Fallback for any sub-mesh the AWD leaves without a material. The shambler's own meshes carry
// textured BlinnPhong materials from the file (resolved by loadSceneFromAwd), so this is rarely used.
const bodyMaterial = createBlinnPhongMaterial({
  diffuse: packOpaqueColor(0x808080),
  specular: 0x000000ff,
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

const awdScene = await loadSceneFromAwd(awdBytes);
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

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});
canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
});
window.addEventListener('mouseup', () => {
  dragging = false;
});
canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance = Math.max(100, Math.min(2000, orbit.distance - e.deltaY / 2));
});

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  advanceAnimationPlayer(player, dt);
  applyAnimationClipToScene(clip, player.time);

  orbit.update();
  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  canvas.width = w * pr;
  canvas.height = h * pr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
