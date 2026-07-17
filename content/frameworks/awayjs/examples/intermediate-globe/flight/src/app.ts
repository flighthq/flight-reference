import type { StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createAmbientLight,
  createDirectionalLight,
  createMesh,
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
  setMatrix4Identity,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { awayIntensity } from '../../../_shared/flight/src/lighting';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000005ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 100000 });

let sunAngle = 0;

const sunLight = createDirectionalLight({
  direction: { x: Math.sin(sunAngle), y: 0, z: Math.cos(sunAngle) },
  color: 0xffffffff,
  intensity: awayIntensity(2),
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x303040), intensity: awayIntensity(1) });

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

const orbit = createOrbitControllerFromAway(camera, {
  distance: 600,
  panAngle: 0,
  tiltAngle: 0,
  minTiltAngle: -90,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (event.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (event: WheelEvent) => {
  orbit.distance -= event.deltaY / 2;
  if (orbit.distance < 400) orbit.distance = 400;
  else if (orbit.distance > 10000) orbit.distance = 10000;
});

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

  orbit.update();
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
