import type { Mesh, PerspectiveProjection } from '@flighthq/sdk';
import {
  addNodeChild,
  createFxaaEffect,
  createMesh,
  createScene,
  createSceneHit,
  createSceneLights,
  createSphereMeshGeometry,
  createTexture,
  createToneMapEffect,
  createUnlitMaterial,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  pickScene,
  setVector3,
} from '@flighthq/sdk';

import { createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene();

const camera = createCameraFromAway({ y: 500, z: -600, fov: 60 });

const lights = createSceneLights();

const material = createUnlitMaterial({ baseColor: 0xffffffff });

const geometry = createSphereMeshGeometry(50);

const spheres: Mesh[] = [];

for (let i = 0; i < 100; i++) {
  const mesh = createMesh(geometry, [material]);

  const px = Math.random() * 1000 - 500;
  const py = Math.random() * 1000 - 500;
  const pz = Math.random() * 1000 - 500;

  setVector3(mesh.position, px, py, pz);
  invalidateNodeLocalTransform(mesh);

  spheres.push(mesh);
  addNodeChild(scene.root, mesh);
}

const hit = createSceneHit();

function pickSphere(event: MouseEvent): Mesh | null {
  const rect = ctx.canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  const result = pickScene(scene.root, camera, screenX, screenY, hit);
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
    setVector3(sphere.scale, 2, 2, 2);
    invalidateNodeLocalTransform(sphere);
  }
});

ctx.canvas.addEventListener('mouseup', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setVector3(sphere.scale, 1, 1, 1);
    invalidateNodeLocalTransform(sphere);
  }
});

const image = await loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg');
const texture = createTexture({ image });
material.baseColorMap = texture;

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

function frame(): void {
  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

frame();
