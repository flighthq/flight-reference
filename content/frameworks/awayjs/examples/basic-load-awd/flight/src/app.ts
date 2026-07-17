import type { SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createStandardPbrMaterial,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  packOpaqueColor,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x1e2125ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: 1, y: -0.5, z: 0.5 },
  color: packOpaqueColor(0x683019),
  intensity: 4,
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x30353b), intensity: 2 });
const lights = createSceneLights({ ambient, directional });

const defaultMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});

const buffer = await fetch('awayjs/assets/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = createSceneFromAwd(new Uint8Array(buffer));

function assignDefaultMaterial(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(defaultMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      if (!node.materials[i]) node.materials[i] = defaultMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignDefaultMaterial(child);
  }
}

assignDefaultMaterial(modelScene);

const modelChildren: SceneNode[] = [];
for (const child of getNodeChildren(modelScene)) {
  setMatrix4Identity(child.localMatrix);
  translateMatrix4(child.localMatrix, child.localMatrix, 0, -300, 0);
  scaleMatrix4(child.localMatrix, child.localMatrix, 900, 900, 900);
  invalidateNodeLocalTransform(child);
  addNodeChild(scene, child);
  modelChildren.push(child);
}

let panAngle = 0;
let tiltAngle = 20 * DEG_TO_RAD;
const distance = 2000;
const minTiltAngle = -90 * DEG_TO_RAD;
const maxTiltAngle = 90 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = panAngle;
let lastTiltAngle = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const clampedTilt = Math.max(minTiltAngle, Math.min(maxTiltAngle, tiltAngle));
  tiltAngle = clampedTilt;

  eye.x = distance * Math.sin(panAngle) * Math.cos(clampedTilt);
  eye.y = distance * Math.sin(clampedTilt);
  eye.z = distance * Math.cos(panAngle) * Math.cos(clampedTilt);

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
}

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = panAngle;
  lastTiltAngle = tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (event.clientX - lastMouseX) + lastPanAngle;
  tiltAngle = 0.3 * DEG_TO_RAD * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

updateCamera();

const yAxis = createVector3(0, 1, 0);

function frame(): void {
  for (const child of modelChildren) {
    rotateMatrix4(child.localMatrix, child.localMatrix, yAxis, -1 * DEG_TO_RAD);
    invalidateNodeLocalTransform(child);
  }

  updateCamera();
  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
