import type { Mesh, SceneLights } from '@flighthq/sdk';
import {
  createScene,
  addNodeChild,
  createCamera,
  createMesh,
  createPerspectiveProjection,
  createSceneHit,
  createSphereMeshGeometry,
  createTexture,
  createUnlitMaterial,
  createVector3,
  loadImageResourceFromUrl,
  pickScene,
  setCameraViewMatrix4FromLookAt,
  setSceneNodePosition,
  setSceneNodeScale,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xff000000,
});

const scene = createScene();

const camera = createCamera({
  near: 1,
  far: 10000,
  projection: createPerspectiveProjection({
    fovY: (60 * Math.PI) / 180,
    aspect: ctx.width / ctx.height,
  }),
});

const eye = createVector3(0, 500, -600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, eye, target, up);

const lights: SceneLights = { ambient: null, directional: null };

const material = createUnlitMaterial({ baseColor: 0xffffffff });

const geometry = createSphereMeshGeometry(50);

const spheres: Mesh[] = [];

for (let i = 0; i < 100; i++) {
  const mesh = createMesh(geometry, [material]);

  const px = Math.random() * 1000 - 500;
  const py = Math.random() * 1000 - 500;
  const pz = Math.random() * 1000 - 500;

  setSceneNodePosition(mesh, px, py, pz);

  spheres.push(mesh);
  addNodeChild(scene, mesh);
}

const hit = createSceneHit();

function pickSphere(event: MouseEvent): Mesh | null {
  const rect = ctx.canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  const result = pickScene(scene, camera, screenX, screenY, hit);
  if (result) {
    const index = spheres.indexOf(result.node as Mesh);
    if (index !== -1) {
      return spheres[index];
    }
  }
  return null;
}

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setSceneNodeScale(sphere, 2, 2, 2);
  }
});

ctx.canvas.addEventListener('mouseup', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setSceneNodeScale(sphere, 1, 1, 1);
  }
});

const image = await loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg');
const texture = createTexture({ image });
material.baseColorMap = texture;

function frame(): void {
  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
