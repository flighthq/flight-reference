import type { StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createScene,
  createSceneLights,
  createSceneNode,
  createSphereMeshGeometry,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  packOpaqueColor,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000005ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 100000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

let sunAngle = 0;

const sunLight = createDirectionalLight({
  direction: { x: Math.sin(sunAngle), y: 0, z: Math.cos(sunAngle) },
  color: 0xffffffff,
  intensity: 5,
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x303040), intensity: 2 });

const lights = createSceneLights({
  ambient,
  directional: sunLight,
});

const tiltContainer = createSceneNode();
const axisX = createVector3(1, 0, 0);
setMatrix4Identity(tiltContainer.localMatrix);
rotateMatrix4(tiltContainer.localMatrix, tiltContainer.localMatrix, axisX, -23 * DEG_TO_RAD);
invalidateNodeLocalTransform(tiltContainer);
addNodeChild(scene, tiltContainer);

const earthMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(5),
});

const cloudMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(0),
});
cloudMaterial.alphaMode = 'blend';
cloudMaterial.blendMode = BlendMode.Add;
cloudMaterial.doubleSided = true;

const earthGeometry = createSphereMeshGeometry(200, 200, 100);
const earth = createMesh(earthGeometry, [earthMaterial]);
addNodeChild(tiltContainer, earth);

const cloudGeometry = createSphereMeshGeometry(202, 200, 100);
const clouds = createMesh(cloudGeometry, [cloudMaterial]);
addNodeChild(tiltContainer, clouds);

async function applyTexture(
  material: StandardPbrMaterial,
  slot: 'baseColorMap' | 'normalMap' | 'metallicRoughnessMap',
  url: string,
): Promise<void> {
  const image = await loadImageResourceFromUrl(url);
  material[slot] = createTexture({ image });
}

await Promise.all([
  applyTexture(earthMaterial, 'baseColorMap', 'awayjs/assets/globe/land_ocean_ice_2048_match.jpg'),
  applyTexture(earthMaterial, 'normalMap', 'awayjs/assets/globe/EarthNormal.png'),
  applyTexture(earthMaterial, 'metallicRoughnessMap', 'awayjs/assets/globe/earth_specular_2048.jpg'),
  applyTexture(cloudMaterial, 'baseColorMap', 'awayjs/assets/globe/cloud_combined_2048.jpg'),
]);

let panAngle = 0;
let tiltAngle = 0;
let distance = 600;
const minTilt = -90 * DEG_TO_RAD;
const maxTilt = 90 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const clamped = Math.max(minTilt, Math.min(maxTilt, tiltAngle));
  tiltAngle = clamped;

  eye.x = target.x + distance * Math.sin(panAngle) * Math.cos(clamped);
  eye.y = target.y + distance * Math.sin(clamped);
  eye.z = target.z - distance * Math.cos(panAngle) * Math.cos(clamped);

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
}

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  savedPan = panAngle;
  savedTilt = tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (event.clientX - lastMouseX) + savedPan;
  tiltAngle = 0.3 * DEG_TO_RAD * (event.clientY - lastMouseY) + savedTilt;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (event: WheelEvent) => {
  distance -= event.deltaY / 2;
  if (distance < 400) distance = 400;
  else if (distance > 10000) distance = 10000;
});

updateCamera();

const axisY = createVector3(0, 1, 0);
let lastTime = 0;

function frame(ts: number): void {
  const dt = lastTime === 0 ? 16 : ts - lastTime;
  lastTime = ts;

  const earthSpeed = 0.2 * DEG_TO_RAD * (dt / 16);
  const cloudSpeed = 0.21 * DEG_TO_RAD * (dt / 16);
  const orbitSpeed = 0.02 * DEG_TO_RAD * (dt / 16);

  rotateMatrix4(earth.localMatrix, earth.localMatrix, axisY, earthSpeed);
  invalidateNodeLocalTransform(earth);

  rotateMatrix4(clouds.localMatrix, clouds.localMatrix, axisY, cloudSpeed);
  invalidateNodeLocalTransform(clouds);

  sunAngle += orbitSpeed;
  sunLight.direction.x = Math.sin(sunAngle);
  sunLight.direction.z = Math.cos(sunAngle);

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
