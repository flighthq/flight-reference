// Flight does not support billboard particles; fires are represented as emissive cones.
import { createScene } from '@flighthq/scene';

import type { EmissiveMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createConeMeshGeometry,
  createDirectionalLight,
  createEmissiveMaterial,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createSceneLights,
  createTexture,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerEmissiveGlMaterial,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const NUM_FIRES = 10;
const FIRE_RADIUS = 400;

const ctx = createScene3DContext({
  width: 800,
  height: 600,
  backgroundColor: 0xff000000,
});

registerEmissiveGlMaterial(ctx.state);

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: Math.PI / 4,
    aspect: ctx.width / ctx.height,
  }),
});

const cameraEye = createVector3(0, 0, 0);
const cameraTarget = createVector3(0, 0, 0);
const cameraUp = createVector3(0, 1, 0);

let panAngle = 45;
let tiltAngle = 20;
const cameraDistance = 1000;

function updateCamera(): void {
  const panRad = (panAngle * Math.PI) / 180;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  cameraEye.x = cameraDistance * Math.sin(panRad) * Math.cos(tiltRad);
  cameraEye.y = cameraDistance * Math.sin(tiltRad);
  cameraEye.z = cameraDistance * Math.cos(panRad) * Math.cos(tiltRad);
  setCameraViewMatrix4FromLookAt(camera, cameraEye, cameraTarget, cameraUp);
}

updateCamera();

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 0 },
  color: 0xeedddd,
  intensity: 0.5,
});

const ambient = createAmbientLight({
  color: 0x808090,
  intensity: 0.5,
});

const lights = createSceneLights({ ambient, directional });

const [floorDiffuseImage, floorNormalImage, floorSpecularImage] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/floor_normal.jpg'),
  loadImageResourceFromUrl('awayjs/assets/floor_specular.jpg'),
]);

const floorMaterial = createBlinnPhongMaterial({
  diffuse: 1,
  shininess: 10,
  specular: 1,
  diffuseMap: createTexture({ image: floorDiffuseImage }),
  normalMap: createTexture({ image: floorNormalImage }),
  specularMap: createTexture({ image: floorSpecularImage }),
});

const floorGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const floor = createMesh(floorGeometry, [floorMaterial]);
setMatrix4Identity(floor.localMatrix);
translateMatrix4(floor.localMatrix, floor.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(floor);
addNodeChild(scene, floor);

const fireGeometry = createConeMeshGeometry(10, 40, 12, true);
const fireMaterials: EmissiveMaterial[] = [];

for (let i = 0; i < NUM_FIRES; i++) {
  const mat = createEmissiveMaterial({ emissive: 0xff3301, emissiveStrength: 1 });
  fireMaterials.push(mat);

  const mesh = createMesh(fireGeometry, [mat]);
  const angle = (i / NUM_FIRES) * Math.PI * 2;

  setMatrix4Identity(mesh.localMatrix);
  translateMatrix4(mesh.localMatrix, mesh.localMatrix, Math.sin(angle) * FIRE_RADIUS, 5, Math.cos(angle) * FIRE_RADIUS);
  invalidateNodeLocalTransform(mesh);

  addNodeChild(scene, mesh);
}

let move = false;
let lastPanAngle = 0;
let lastTiltAngle = 0;
let lastMouseX = 0;
let lastMouseY = 0;

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  lastPanAngle = panAngle;
  lastTiltAngle = tiltAngle;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  move = true;
});

ctx.canvas.addEventListener('mouseup', () => {
  move = false;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (move) {
    panAngle = 0.3 * (event.clientX - lastMouseX) + lastPanAngle;
    tiltAngle = Math.max(0, Math.min(90, 0.3 * (event.clientY - lastMouseY) + lastTiltAngle));
    updateCamera();
  }
});

function frame(): void {
  for (let i = 0; i < NUM_FIRES; i++) {
    fireMaterials[i].emissiveStrength = 0.8 + Math.random() * 0.4;
  }

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
