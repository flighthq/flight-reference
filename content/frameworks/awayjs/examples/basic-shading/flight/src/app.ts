import { createScene } from '@flighthq/scene';

import type { BlinnPhongMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createSceneLights,
  createSphereMeshGeometry,
  createTexture,
  createTorusMeshGeometry,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setCameraViewMatrix4FromLookAt,
  setDirectionalLightDirection,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const DEG = Math.PI / 180;

const { canvas, render } = createScene3DContext({
  width: 800,
  height: 600,
  backgroundColor: 0xff000000,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({ fovY: (45 * Math.PI) / 180, aspect: 800 / 600 }),
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 0 },
  color: 0xffffff,
  intensity: 0.7,
});

const ambient = createAmbientLight({ color: 0xffffff, intensity: 0.15 });
const lights = createSceneLights({ ambient, directional });

const planeMaterial = createBlinnPhongMaterial({ diffuse: 1, shininess: 20, specular: 0.5 });
planeMaterial.doubleSided = true;

const sphereMaterial = createBlinnPhongMaterial({ diffuse: 1, shininess: 20, specular: 0.5 });
const cubeMaterial = createBlinnPhongMaterial({ diffuse: 1, shininess: 20, specular: 0.5 });
const torusMaterial = createBlinnPhongMaterial({ diffuse: 1, shininess: 20, specular: 0.5 });

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
setMatrix4Identity(plane.localMatrix);
translateMatrix4(plane.localMatrix, plane.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(plane);
addNodeChild(scene, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setMatrix4Identity(sphere.localMatrix);
translateMatrix4(sphere.localMatrix, sphere.localMatrix, 300, 160, 300);
invalidateNodeLocalTransform(sphere);
addNodeChild(scene, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setMatrix4Identity(cube.localMatrix);
translateMatrix4(cube.localMatrix, cube.localMatrix, 300, 160, -250);
invalidateNodeLocalTransform(cube);
addNodeChild(scene, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(torusGeometry, [torusMaterial]);
setMatrix4Identity(torus.localMatrix);
translateMatrix4(torus.localMatrix, torus.localMatrix, -250, 160, -250);
invalidateNodeLocalTransform(torus);
addNodeChild(scene, torus);

function applyTextures(
  material: BlinnPhongMaterial,
  maps: { normal?: string; specular?: string; diffuse?: string },
): Promise<void[]> {
  const jobs: Promise<void>[] = [];
  if (maps.normal) {
    const url = maps.normal;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        material.normalMap = createTexture({ image });
      }),
    );
  }
  if (maps.specular) {
    const url = maps.specular;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        material.specularMap = createTexture({ image });
      }),
    );
  }
  if (maps.diffuse) {
    const url = maps.diffuse;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        material.diffuseMap = createTexture({ image });
      }),
    );
  }
  return Promise.all(jobs);
}

await Promise.all([
  applyTextures(planeMaterial, {
    diffuse: 'awayjs/assets/floor_diffuse.jpg',
    normal: 'awayjs/assets/floor_normal.jpg',
    specular: 'awayjs/assets/floor_specular.jpg',
  }),
  applyTextures(sphereMaterial, {
    diffuse: 'awayjs/assets/beachball_diffuse.jpg',
    specular: 'awayjs/assets/beachball_specular.jpg',
  }),
  applyTextures(cubeMaterial, {
    diffuse: 'awayjs/assets/trinket_diffuse.jpg',
    normal: 'awayjs/assets/trinket_normal.jpg',
    specular: 'awayjs/assets/trinket_specular.jpg',
  }),
  applyTextures(torusMaterial, {
    diffuse: 'awayjs/assets/weave_diffuse.jpg',
    normal: 'awayjs/assets/weave_normal.jpg',
  }),
]);

let panAngle = 45 * DEG;
let tiltAngle = 20 * DEG;
const distance = 1000;
const minTiltAngle = 0;
const maxTiltAngle = 90 * DEG;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = panAngle;
let lastTiltAngle = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const clampedTilt = Math.max(minTiltAngle, Math.min(maxTiltAngle, tiltAngle));
  tiltAngle = clampedTilt;

  eye.x = distance * Math.sin(panAngle) * Math.cos(clampedTilt);
  eye.y = distance * Math.sin(clampedTilt);
  eye.z = distance * Math.cos(panAngle) * Math.cos(clampedTilt);

  target.x = 0;
  target.y = 0;
  target.z = 0;

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
}

canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = panAngle;
  lastTiltAngle = tiltAngle;
});

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG * (event.clientX - lastMouseX) + lastPanAngle;
  tiltAngle = 0.3 * DEG * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

updateCamera();

let time = 0;

function frame(dt: number): void {
  time += dt;

  const lightX = Math.sin(time / 10000) * 150000;
  const lightZ = Math.cos(time / 10000) * 150000;
  setDirectionalLightDirection(directional, lightX, -1000, lightZ);

  updateCamera();
  render(scene, camera, lights);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
