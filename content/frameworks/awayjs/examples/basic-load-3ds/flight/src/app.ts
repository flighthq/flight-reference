import type { Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  createAmbientLight,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneFrom3ds,
  createSceneNode,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setDirectionalLightDirection,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 2100 });

const { directional } = createDirectionalLightFromAway({
  direction: awayDirection(-1, -1, 1),
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights = createSceneLights({ ambient, directional });

const groundMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});
groundMaterial.doubleSided = true;

const groundGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const ground = createMesh(groundGeometry, [groundMaterial]);
addNodeChild(scene, ground);

const [modelBuffer, antImage, sandImage] = await Promise.all([
  fetch('awayjs/assets/soldier_ant.3ds').then((r) => r.arrayBuffer()),
  loadImageResourceFromUrl('awayjs/assets/soldier_ant.jpg'),
  loadImageResourceFromUrl('awayjs/assets/CoarseRedSand.jpg'),
]);

groundMaterial.baseColorMap = createTexture({ image: sandImage });

const modelScene = createSceneFrom3ds(new Uint8Array(modelBuffer));
const antTexture = createTexture({ image: antImage });

const antMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
antMaterial.baseColorMap = antTexture;

for (const child of getNodeChildren(modelScene)) {
  const mesh = child as Mesh;
  if (mesh.geometry) {
    computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
    if (mesh.materials) {
      if (mesh.materials.length === 0) {
        mesh.materials.push(antMaterial);
      } else {
        for (let i = 0; i < mesh.materials.length; i++) {
          mesh.materials[i] = antMaterial;
        }
      }
    }
  }
}

const modelContainer = createSceneNode();
for (const child of getNodeChildren(modelScene)) {
  addNodeChild(modelContainer, child);
}

setMatrix4Identity(modelContainer.localMatrix);
translateMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 0, 0, 200);
scaleMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 300, 300, 300);
invalidateNodeLocalTransform(modelContainer);
addNodeChild(scene, modelContainer);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 10,
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

let startTime = 0;

function frame(ts: number): void {
  if (startTime === 0) startTime = ts;
  const elapsed = ts - startTime;

  const dir = awayDirection(-Math.sin(elapsed / 4000), -1, -Math.cos(elapsed / 4000));
  setDirectionalLightDirection(directional, dir.x, dir.y, dir.z);

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
