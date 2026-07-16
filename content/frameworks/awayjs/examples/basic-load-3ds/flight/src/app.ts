import type { BlinnPhongMaterial, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createScene,
  createSceneFrom3ds,
  createSceneNode,
  createSceneLights,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setDirectionalLightDirection,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 2100,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: -1, y: -1, z: 1 },
  color: 0xffffff,
  intensity: 0.7,
});

const ambient = createAmbientLight({ color: 0xffffff, intensity: 0.2 });
const lights = createSceneLights({ ambient, directional });

const groundMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 10,
  specular: 0x000000ff,
});
groundMaterial.doubleSided = true;

const groundGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const ground = createMesh(groundGeometry, [groundMaterial]);
addNodeChild(scene, ground);

const [modelBuffer, antImage, sandImage] = await Promise.all([
  fetch('awayjs/assets/soldier_ant.3ds').then((r) => r.arrayBuffer()),
  loadImageResourceFromUrl('awayjs/assets/soldier_ant.jpg'),
  loadImageResourceFromUrl('awayjs/assets/CoarseRedSand.jpg'),
]);

groundMaterial.diffuseMap = createTexture({ image: sandImage });

const modelScene = createSceneFrom3ds(new Uint8Array(modelBuffer));
const antTexture = createTexture({ image: antImage });

const modelContainer = createSceneNode();
for (const child of getNodeChildren(modelScene)) {
  const mesh = child as Mesh;
  if (mesh.materials) {
    for (const mat of mesh.materials) {
      (mat as BlinnPhongMaterial).diffuseMap = antTexture;
    }
  }
  addNodeChild(modelContainer, mesh);
}

setMatrix4Identity(modelContainer.localMatrix);
translateMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 0, 0, -200);
scaleMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 300, 300, 300);
invalidateNodeLocalTransform(modelContainer);
addNodeChild(scene, modelContainer);

let panAngle = 45 * DEG_TO_RAD;
let tiltAngle = 20 * DEG_TO_RAD;
let distance = 1000;
const minTiltAngle = 0;
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

let startTime = 0;

function frame(ts: number): void {
  if (startTime === 0) startTime = ts;
  const elapsed = ts - startTime;

  const dirX = -Math.sin(elapsed / 4000);
  const dirZ = -Math.cos(elapsed / 4000);
  setDirectionalLightDirection(directional, dirX, -1, dirZ);

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
