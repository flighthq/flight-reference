import type { BlinnPhongMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createBlinnPhongMaterial,
  createCamera,
  createMesh,
  createPerspectiveProjection,
  createPointLight,
  createScene,
  createSceneLights,
  createSceneNode,
  createSphereMeshGeometry,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
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

const sunLight = createPointLight({
  color: 0xffffffff,
  intensity: 2,
  radius: 100000,
  falloff: 0,
});

const lights = createSceneLights({
  ambient: undefined,
  directional: undefined,
  pointLights: [sunLight],
});

setMatrix4Identity(sunLight.localMatrix);
translateMatrix4(sunLight.localMatrix, sunLight.localMatrix, 10000, 0, 0);
invalidateNodeLocalTransform(sunLight);
addNodeChild(scene, sunLight);

const tiltContainer = createSceneNode();
const axisX = createVector3(1, 0, 0);
setMatrix4Identity(tiltContainer.localMatrix);
rotateMatrix4(tiltContainer.localMatrix, tiltContainer.localMatrix, axisX, -23 * DEG_TO_RAD);
invalidateNodeLocalTransform(tiltContainer);
addNodeChild(scene, tiltContainer);

const earthMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 5,
  specular: 0x808080ff,
});

const cloudMaterial = createBlinnPhongMaterial({
  diffuse: 0x1b2048ff,
  shininess: 0,
  specular: 0x000000ff,
});

const earthGeometry = createSphereMeshGeometry(200, 200, 100);
const earth = createMesh(earthGeometry, [earthMaterial]);
addNodeChild(tiltContainer, earth);

const cloudGeometry = createSphereMeshGeometry(202, 200, 100);
const clouds = createMesh(cloudGeometry, [cloudMaterial]);
addNodeChild(tiltContainer, clouds);

const orbitContainer = createSceneNode();
addNodeChild(scene, orbitContainer);

async function applyTexture(
  material: BlinnPhongMaterial,
  slot: 'diffuseMap' | 'normalMap' | 'specularMap',
  url: string,
): Promise<void> {
  const image = await loadImageResourceFromUrl(url);
  material[slot] = createTexture({ image });
}

await Promise.all([
  applyTexture(earthMaterial, 'diffuseMap', 'awayjs/assets/globe/land_ocean_ice_2048_match.jpg'),
  applyTexture(earthMaterial, 'normalMap', 'awayjs/assets/globe/EarthNormal.png'),
  applyTexture(earthMaterial, 'specularMap', 'awayjs/assets/globe/earth_specular_2048.jpg'),
  loadImageResourceFromUrl('awayjs/assets/globe/land_lights_16384.jpg').then((image) => {
    earthMaterial.diffuseMap = earthMaterial.diffuseMap ?? createTexture({ image });
  }),
  applyTexture(cloudMaterial, 'diffuseMap', 'awayjs/assets/globe/cloud_combined_2048.jpg'),
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

  rotateMatrix4(orbitContainer.localMatrix, orbitContainer.localMatrix, axisY, orbitSpeed);
  invalidateNodeLocalTransform(orbitContainer);

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
