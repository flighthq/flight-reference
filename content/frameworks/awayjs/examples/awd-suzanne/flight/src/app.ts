import type { Mesh, SceneHit, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  applyLightExposure,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createScene,
  createSceneFromAwd,
  createSceneHit,
  createSceneLights,
  createStandardPbrMaterial,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPhongToPbrLightExposure,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  pickScene,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setDirectionalLightDirection,
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
  near: 0.1,
  far: 6000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: 1, y: -0.5, z: 0.5 },
  color: packOpaqueColor(0x683019),
  intensity: applyLightExposure(8, pbrExposure),
});
const ambient = createAmbientLight({ color: packOpaqueColor(0x85b2cd), intensity: applyLightExposure(2, pbrExposure) });
const lights = createSceneLights({ ambient, directional });

const defaultMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const hoverMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xff0000ff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});

const buffer = await fetch('awayjs/assets/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = createSceneFromAwd(new Uint8Array(buffer));

function findFirstMesh(root: SceneNode): Mesh | null {
  for (const child of getNodeChildren(root)) {
    if (isMesh(child)) return child;
    const found = findFirstMesh(child);
    if (found) return found;
  }
  return null;
}

const templateMesh = findFirstMesh(modelScene);
const templateGeometry = templateMesh?.geometry ?? null;

if (!templateGeometry) throw new Error('No mesh found in suzanne.awd');

const allMeshes: Mesh[] = [];

const mainMesh = createMesh(templateGeometry, [defaultMaterial]);
setMatrix4Identity(mainMesh.localMatrix);
scaleMatrix4(mainMesh.localMatrix, mainMesh.localMatrix, 500, 500, 500);
translateMatrix4(mainMesh.localMatrix, mainMesh.localMatrix, 0, -100 / 500, 0);
invalidateNodeLocalTransform(mainMesh);
addNodeChild(scene, mainMesh);
allMeshes.push(mainMesh);

const yAxis = createVector3(0, 1, 0);

for (let i = 0; i < 80; i++) {
  const clone = createMesh(templateGeometry, [defaultMaterial]);
  const scale = 50 + Math.random() * 150;
  setMatrix4Identity(clone.localMatrix);
  scaleMatrix4(clone.localMatrix, clone.localMatrix, scale, scale, scale);
  translateMatrix4(
    clone.localMatrix,
    clone.localMatrix,
    ((Math.random() - 0.5) * 4000) / scale,
    ((Math.random() - 0.5) * 4000) / scale,
    ((Math.random() - 0.5) * 4000) / scale,
  );
  rotateMatrix4(clone.localMatrix, clone.localMatrix, yAxis, Math.random() * 360 * DEG_TO_RAD);
  invalidateNodeLocalTransform(clone);
  addNodeChild(scene, clone);
  allMeshes.push(clone);
}

let cameraAngle = 0;
const distance = 1400;
const lookAt = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 0, 0);

function updateCamera(): void {
  eye.x = Math.cos(cameraAngle) * distance;
  eye.y = 0;
  eye.z = -Math.sin(cameraAngle) * distance;
  setCameraViewMatrix4FromLookAt(camera, eye, lookAt, up);
}

let lastHovered: Mesh | null = null;
const hit: SceneHit = createSceneHit();

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = ctx.canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const result = pickScene(scene, camera, sx, sy, hit);

  if (lastHovered && lastHovered !== result?.node) {
    lastHovered.materials[0] = defaultMaterial;
    lastHovered = null;
  }

  if (result) {
    const mesh = result.node;
    mesh.materials[0] = hoverMaterial;
    lastHovered = mesh;
  }
});

updateCamera();

function frame(): void {
  cameraAngle += 0.01;
  updateCamera();

  setDirectionalLightDirection(directional, -Math.cos(-cameraAngle) * 1400, 0, Math.sin(cameraAngle) * 1400);

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
