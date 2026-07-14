import { createScene } from '@flighthq/scene';

import type { Mesh, SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createMesh,
  createPerspectiveProjection,
  createSceneHit,
  createSphereMeshGeometry,
  createTexture,
  createUnlitMaterial,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  pickScene,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const SPHERE_COUNT = 100;
const POSITION_RANGE = 400;
const MIN_SCALE = 0.5;
const SCALE_RANGE = 2.5;
const CLICKED_SCALE = 5;

const ctx = createScene3DContext({
  width: 500,
  height: 500,
  backgroundColor: 0xff000000,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 2000,
  projection: createPerspectiveProjection({
    fovY: Math.PI / 4,
    aspect: ctx.width / ctx.height,
  }),
});

const cameraEye = createVector3(0, 500, 600);
const cameraTarget = createVector3(0, 0, 0);
const cameraUp = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, cameraEye, cameraTarget, cameraUp);

const lights: SceneLights = { ambient: null, directional: null };

const image = await loadImageResourceFromUrl('awayjs/assets/beachball_diffuse.jpg');
const texture = createTexture({ image });
const material = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });

const geometry = createSphereMeshGeometry();

const spheres: Mesh[] = [];
const positionsX: number[] = [];
const positionsY: number[] = [];
const positionsZ: number[] = [];
const scales: number[] = [];

for (let i = 0; i < SPHERE_COUNT; i++) {
  const mesh = createMesh(geometry, [material]);

  const px = Math.random() * POSITION_RANGE * 2 - POSITION_RANGE;
  const py = Math.random() * POSITION_RANGE * 2 - POSITION_RANGE;
  const pz = Math.random() * POSITION_RANGE * 2 - POSITION_RANGE;
  const s = MIN_SCALE + Math.random() * SCALE_RANGE;

  positionsX.push(px);
  positionsY.push(py);
  positionsZ.push(pz);
  scales.push(s);
  spheres.push(mesh);

  setMatrix4Identity(mesh.localMatrix);
  translateMatrix4(mesh.localMatrix, mesh.localMatrix, px, py, pz);
  scaleMatrix4(mesh.localMatrix, mesh.localMatrix, s, s, s);
  invalidateNodeLocalTransform(mesh);

  addNodeChild(scene, mesh);
}

const hit = createSceneHit();
const yAxis = createVector3(0, 1, 0);

ctx.canvas.addEventListener('click', (event: MouseEvent) => {
  const rect = ctx.canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  const result = pickScene(scene, camera, screenX, screenY, hit);
  if (result) {
    const picked = result.node;
    const index = spheres.indexOf(picked);
    if (index !== -1) {
      scales[index] = CLICKED_SCALE;
    }
  }
});

let rotationY = 0;

function frame(): void {
  rotationY += (1 * Math.PI) / 180;

  for (let i = 0; i < SPHERE_COUNT; i++) {
    const mesh = spheres[i];
    const s = scales[i];

    setMatrix4Identity(mesh.localMatrix);
    translateMatrix4(mesh.localMatrix, mesh.localMatrix, positionsX[i], positionsY[i], positionsZ[i]);
    rotateMatrix4(mesh.localMatrix, mesh.localMatrix, yAxis, rotationY);
    scaleMatrix4(mesh.localMatrix, mesh.localMatrix, s, s, s);
    invalidateNodeLocalTransform(mesh);
  }

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
