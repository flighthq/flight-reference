import type { Mesh, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createDirectionalLight,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneFromMd2,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 45, near: 0.1, far: 5000 });

const directional = createDirectionalLight({
  direction: awayDirection(-0.5, -1, -1),
  color: 0xffffffff,
  intensity: 3,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights = createSceneLights({ ambient, directional });

const floorMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(0),
});
floorMaterial.doubleSided = true;

const knightMaterials: StandardPbrMaterial[] = [];
for (let i = 0; i < 4; i++) {
  knightMaterials.push(
    createStandardPbrMaterial({ baseColor: 0xffffffff, metallic: 0, roughness: getPbrRoughnessFromPhongShininess(30) }),
  );
}

const [floorImage, ...knightImages] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/pknight1.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight2.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight3.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight4.png'),
]);

const floorTex = createTexture({ image: floorImage });
setTextureUvScale(floorTex, 5, 5);
floorMaterial.baseColorMap = floorTex;

for (let i = 0; i < 4; i++) {
  knightMaterials[i]!.baseColorMap = createTexture({ image: knightImages[i]! });
}

const floorGeometry = createPlaneMeshGeometry(5000, 5000, 1, 1);
const floor = createMesh(floorGeometry, [floorMaterial]);
setMatrix4Identity(floor.localMatrix);
invalidateNodeLocalTransform(floor);
addNodeChild(scene, floor);

const md2Buffer = await fetch('awayjs/assets/pknight.md2').then((r) => r.arrayBuffer());
const md2Scene = createSceneFromMd2(new Uint8Array(md2Buffer));

let knightGeometry = null;
for (const child of getNodeChildren(md2Scene)) {
  if (isMesh(child)) {
    knightGeometry = (child as Mesh).geometry;
    break;
  }
}

if (!knightGeometry) {
  throw new Error('No mesh found in MD2 file');
}

const numWide = 20;
const numDeep = 20;

for (let i = 0; i < numWide; i++) {
  for (let j = 0; j < numDeep; j++) {
    const material = knightMaterials[Math.floor(Math.random() * knightMaterials.length)]!;
    const knight = createMesh(knightGeometry, [material]);
    const x = ((i - (numWide - 1) / 2) * 5000) / numWide;
    const z = ((j - (numDeep - 1) / 2) * 5000) / numDeep;
    setMatrix4Identity(knight.localMatrix);
    translateMatrix4(knight.localMatrix, knight.localMatrix, x, 120, z);
    scaleMatrix4(knight.localMatrix, knight.localMatrix, 5, 5, 5);
    invalidateNodeLocalTransform(knight);
    addNodeChild(scene, knight);
  }
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 2000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 2,
  maxTiltAngle: 85,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = orbit.panAngle;
let savedTilt = orbit.tiltAngle;

let keyUp = false;
let keyDown = false;
let keyLeft = false;
let keyRight = false;

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance -= e.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 5000) orbit.distance = 5000;
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      keyUp = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyDown = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      keyLeft = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyRight = true;
      break;
  }
});

document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      keyUp = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyDown = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      keyLeft = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyRight = false;
      break;
  }
});

function frame(): void {
  if (keyUp) orbit.target.x -= 10;
  if (keyDown) orbit.target.x += 10;
  if (keyLeft) orbit.target.z += 10;
  if (keyRight) orbit.target.z -= 10;

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
