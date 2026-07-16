import type { BlinnPhongMaterial, Mesh, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createSceneNode,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
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
  backgroundColor: 0xcec8c6ff,
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

const eye = createVector3(0, 20, -50);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, eye, target, up);

const directional = createDirectionalLight({
  direction: { x: 1, y: 0, z: 0 },
  color: 0xc1582d,
  intensity: 1.0,
});

const ambient = createAmbientLight({ color: 0x85b2cd, intensity: 0.4 });
const lights = createSceneLights({ ambient, directional });

const spartanContainer = createSceneNode();
setMatrix4Identity(spartanContainer.localMatrix);
scaleMatrix4(spartanContainer.localMatrix, spartanContainer.localMatrix, 0.25, 0.25, 0.25);
invalidateNodeLocalTransform(spartanContainer);
addNodeChild(scene, spartanContainer);

const [spartanObjText, terrainObjText, masterchiefImage, stoneImage] = await Promise.all([
  fetch('awayjs/assets/Halo_3_SPARTAN4.obj').then((r) => r.text()),
  fetch('awayjs/assets/terrain.obj').then((r) => r.text()),
  loadImageResourceFromUrl('awayjs/assets/masterchief_base.png'),
  loadImageResourceFromUrl('awayjs/assets/stone_tx.jpg'),
]);

const masterchiefMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 20,
  specular: 0x808080ff,
});
masterchiefMaterial.diffuseMap = createTexture({ image: masterchiefImage });

const stoneMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 20,
  specular: 0x808080ff,
});
stoneMaterial.diffuseMap = createTexture({ image: stoneImage });

const spartanScene = createSceneFromObj(spartanObjText);
for (const child of getNodeChildren(spartanScene)) {
  const mesh = child as Mesh;
  if (mesh.materials) {
    for (let i = 0; i < mesh.materials.length; i++) {
      mesh.materials[i] = masterchiefMaterial;
    }
  }
  addNodeChild(spartanContainer, mesh);
}

const terrainScene = createSceneFromObj(terrainObjText);
let terrainNode: SceneNode | undefined;
for (const child of getNodeChildren(terrainScene)) {
  const mesh = child as Mesh;
  if (mesh.materials) {
    for (let i = 0; i < mesh.materials.length; i++) {
      mesh.materials[i] = stoneMaterial;
    }
  }
  addNodeChild(scene, mesh);
  if (!terrainNode) terrainNode = mesh;
}

if (terrainNode) {
  setMatrix4Identity(terrainNode.localMatrix);
  translateMatrix4(terrainNode.localMatrix, terrainNode.localMatrix, 0, 98, 0);
  invalidateNodeLocalTransform(terrainNode);
}

const yAxis = createVector3(0, 1, 0);
let spartanRotationY = 0;
let terrainRotationY = 0;

function frame(): void {
  spartanRotationY += 0.4 * DEG_TO_RAD;
  terrainRotationY += 0.4 * DEG_TO_RAD;

  setMatrix4Identity(spartanContainer.localMatrix);
  scaleMatrix4(spartanContainer.localMatrix, spartanContainer.localMatrix, 0.25, 0.25, 0.25);
  rotateMatrix4(spartanContainer.localMatrix, spartanContainer.localMatrix, yAxis, spartanRotationY);
  invalidateNodeLocalTransform(spartanContainer);

  if (terrainNode) {
    setMatrix4Identity(terrainNode.localMatrix);
    translateMatrix4(terrainNode.localMatrix, terrainNode.localMatrix, 0, 98, 0);
    rotateMatrix4(terrainNode.localMatrix, terrainNode.localMatrix, yAxis, terrainRotationY);
    invalidateNodeLocalTransform(terrainNode);
  }

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
