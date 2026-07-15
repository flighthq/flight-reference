import { createScene } from '@flighthq/scene';

import type { SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createTexture,
  createUnlitMaterial,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const { render } = createScene3DContext({ width: 800, height: 600, backgroundColor: 0xff000000 });

const scene = createScene();

const material = createUnlitMaterial({ baseColor: 0xffffffff });
const geometry = createPlaneMeshGeometry(700, 700);
const mesh = createMesh(geometry, [material]);
addNodeChild(scene, mesh);

const camera = createCamera({
  near: 1,
  far: 10000,
  projection: createPerspectiveProjection({ fovY: 45 * DEG_TO_RAD, aspect: 800 / 600 }),
});

const eye = createVector3(0, 500, -600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, eye, target, up);

const lights: SceneLights = { ambient: null, directional: null };
const yAxis = createVector3(0, 1, 0);

const image = await loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg');
const texture = createTexture({ image });
material.baseColorMap = texture;

let angle = 0;

function frame(): void {
  angle += DEG_TO_RAD;

  setMatrix4Identity(mesh.localMatrix);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, yAxis, angle);
  invalidateNodeLocalTransform(mesh);

  render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
