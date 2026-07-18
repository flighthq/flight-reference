import type { GlRenderTarget, Mesh, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createSceneNode,
  createStandardPbrMaterial,
  createTexture,
  createTilingSampler,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  packOpaqueColor,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
  rotateMatrix4,
  scaleMatrix4,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: packOpaqueColor(0xcec8c6),
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ y: 20, z: -50, targetY: 20, fov: 60, near: 0.1 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0xc1582d,
  diffuse: 2.8,
  ambient: 0.4,
  ambientColor: 0x85b2cd,
});
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
const stoneTexture = createTexture({ image: stoneImage, sampler: createTilingSampler() });
setTextureUvScale(stoneTexture, 20, 20);
stoneMaterial.baseColorMap = stoneTexture;

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

  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
