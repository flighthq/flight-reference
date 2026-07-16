import type { BlinnPhongMaterial, Mesh, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createPointLight,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
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
  near: 20,
  far: 1000,
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
    z: Math.sin(lightElevation) * Math.sin(lightDirection),
  },
  color: 0xffeedd,
  intensity: 1,
});

const ambient = createAmbientLight({ color: 0x101025, intensity: 1 });

const blueLight = createPointLight({ color: 0x4080ff, intensity: 1, falloff: 5000 });
blueLight.x = 3000;
blueLight.z = 700;
blueLight.y = 20;

const redLight = createPointLight({ color: 0x802010, intensity: 1, falloff: 5000 });
redLight.x = -2000;
redLight.z = 800;
redLight.y = -400;

const lights = createSceneLights({
  ambient,
  directional,
  pointLights: [blueLight, redLight],
});

const headMaterial: BlinnPhongMaterial = createBlinnPhongMaterial({
  diffuse: 0x303040ff,
  shininess: 10,
  specular: 0xffffffff,
});

const [diffuseImage, specularImage, normalImage, awdBuffer] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/monsterhead/monsterhead_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/monsterhead/monsterhead_specular.jpg'),
  loadImageResourceFromUrl('awayjs/assets/monsterhead/monsterhead_normals.jpg'),
  fetch('awayjs/assets/monsterhead/MonsterHead.awd').then((r) => r.arrayBuffer()),
]);

headMaterial.diffuseMap = createTexture({ image: diffuseImage });
headMaterial.specularMap = createTexture({ image: specularImage });
headMaterial.normalMap = createTexture({ image: normalImage });

const awdScene = createSceneFromAwd(new Uint8Array(awdBuffer));

function assignMaterialToMeshes(node: SceneNode): void {
  if (isMesh(node)) {
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
  eye.z = target.z + distance * Math.cos(panAngle) * Math.cos(tilt);
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
