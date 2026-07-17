import type { Mesh, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  createAmbientLight,
  createDirectionalLight,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createSceneNode,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  packOpaqueColor,
  rotateMatrix4,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: packOpaqueColor(0xcec8c6),
});

const scene = createScene();

const camera = createCameraFromAway({ y: 20, z: -50, targetY: 20, fov: 60, near: 0.1 });

const directional = createDirectionalLight({
  direction: awayDirection(1, 0, 0),
  color: packOpaqueColor(0xc1582d),
  intensity: 3,
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x85b2cd), intensity: 2 });
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

const masterchiefMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
masterchiefMaterial.baseColorMap = createTexture({ image: masterchiefImage });

const stoneMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
stoneMaterial.baseColorMap = createTexture({ image: stoneImage });

function applyMaterialToObjScene(objScene: SceneNode, material: StandardPbrMaterial): void {
  for (const child of getNodeChildren(objScene)) {
    const mesh = child as Mesh;
    if (mesh.geometry) {
      computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
      if (mesh.materials) {
        if (mesh.materials.length === 0) {
          mesh.materials.push(material);
        } else {
          for (let i = 0; i < mesh.materials.length; i++) {
            mesh.materials[i] = material;
          }
        }
      }
    }
  }
}

const spartanScene = createSceneFromObj(spartanObjText);
applyMaterialToObjScene(spartanScene, masterchiefMaterial);
for (const child of getNodeChildren(spartanScene)) {
  addNodeChild(spartanContainer, child);
}

const terrainScene = createSceneFromObj(terrainObjText);
applyMaterialToObjScene(terrainScene, stoneMaterial);
let terrainNode: SceneNode | undefined;
for (const child of getNodeChildren(terrainScene)) {
  addNodeChild(scene, child);
  if (!terrainNode) terrainNode = child;
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
  spartanRotationY -= 0.4 * DEG_TO_RAD;
  terrainRotationY -= 0.4 * DEG_TO_RAD;

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
