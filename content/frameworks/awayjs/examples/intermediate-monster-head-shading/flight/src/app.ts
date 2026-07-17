import type { SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  applyLightExposure,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createPointLight,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPhongToPbrLightExposure,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import { packOpaqueColor } from '../../../_shared/flight/src/lighting';

const pbrExposure = getPhongToPbrLightExposure();

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCamera({
  near: 20,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const lightDirection = (120 * Math.PI) / 180;
const lightElevation = (30 * Math.PI) / 180;

const directional = createDirectionalLight({
  direction: {
    x: Math.sin(lightElevation) * Math.cos(lightDirection),
    y: -Math.cos(lightElevation),
    z: -Math.sin(lightElevation) * Math.sin(lightDirection),
  },
  color: packOpaqueColor(0xffeedd),
  intensity: applyLightExposure(12, pbrExposure),
});

const ambient = createAmbientLight({
  color: packOpaqueColor(0x606080),
  intensity: applyLightExposure(1.5, pbrExposure),
});

const blueLight = createPointLight({
  color: packOpaqueColor(0x4080ff),
  intensity: applyLightExposure(5, pbrExposure),
  range: 5000,
});
blueLight.position.x = 3000;
blueLight.position.z = -700;
blueLight.position.y = 20;

const redLight = createPointLight({
  color: packOpaqueColor(0x802010),
  intensity: applyLightExposure(5, pbrExposure),
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

let panAngle = 225 * DEG_TO_RAD;
let tiltAngle = 10 * DEG_TO_RAD;
let distance = 800;
const minTiltAngle = -60 * DEG_TO_RAD;
const maxTiltAngle = 60 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const tilt = Math.max(minTiltAngle, Math.min(maxTiltAngle, tiltAngle));
  tiltAngle = tilt;
  eye.x = target.x + distance * Math.sin(panAngle) * Math.cos(tilt);
  eye.y = target.y + distance * Math.sin(tilt);
  eye.z = target.z - distance * Math.cos(panAngle) * Math.cos(tilt);
  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
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

updateCamera();

function frame(): void {
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
