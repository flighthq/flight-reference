import type { SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createDirectionalLight,
  createPointLight,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  packOpaqueColor,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 1000 });

const lightDirection = (120 * Math.PI) / 180;
const lightElevation = (30 * Math.PI) / 180;

const directional = createDirectionalLight({
  direction: {
    x: Math.sin(lightElevation) * Math.cos(lightDirection),
    y: -Math.cos(lightElevation),
    z: -Math.sin(lightElevation) * Math.sin(lightDirection),
  },
  color: packOpaqueColor(0xffeedd),
  intensity: 6,
});

const ambient = createAmbientLight({
  color: packOpaqueColor(0x606080),
  intensity: 1.5,
});

const blueLight = createPointLight({
  color: packOpaqueColor(0x4080ff),
  intensity: 3,
  range: 5000,
});
blueLight.position.x = 3000;
blueLight.position.z = -700;
blueLight.position.y = 20;

const redLight = createPointLight({
  color: packOpaqueColor(0x802010),
  intensity: 3,
  range: 5000,
});
redLight.position.x = -2000;
redLight.position.z = -800;
redLight.position.y = -400;

const lights = createSceneLights({
  ambient,
  directional,
  point: [blueLight, redLight],
});

const headMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});

async function tryLoadImage(url: string): Promise<Awaited<ReturnType<typeof loadImageResourceFromUrl>> | null> {
  try {
    return await loadImageResourceFromUrl(url);
  } catch {
    return null;
  }
}

const [diffuseImage, specularImage, normalImage, awdBuffer] = await Promise.all([
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_diffuse.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_specular.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_normals.jpg'),
  fetch('awayjs/assets/monsterhead/MonsterHead.awd').then((r) => r.arrayBuffer()),
]);

if (diffuseImage) headMaterial.baseColorMap = createTexture({ image: diffuseImage });
if (specularImage) headMaterial.metallicRoughnessMap = createTexture({ image: specularImage });
if (normalImage) headMaterial.normalMap = createTexture({ image: normalImage });

const awdScene = createSceneFromAwd(new Uint8Array(awdBuffer));

function assignMaterialToMeshes(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(headMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i] = headMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignMaterialToMeshes(child);
  }
}

assignMaterialToMeshes(awdScene);

for (const child of getNodeChildren(awdScene)) {
  setMatrix4Identity(child.localMatrix);
  scaleMatrix4(child.localMatrix, child.localMatrix, 4, 4, 4);
  translateMatrix4(child.localMatrix, child.localMatrix, 0, -20, 0);
  invalidateNodeLocalTransform(child);
  addNodeChild(scene, child);
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 800,
  panAngle: 225,
  tiltAngle: 10,
  minTiltAngle: -90,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

function frame(): void {
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
