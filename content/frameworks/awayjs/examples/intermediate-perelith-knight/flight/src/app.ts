import type { BlinnPhongMaterial, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createScene,
  createSceneFromMd2,
  createSceneLights,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: -0.5, y: -1, z: -1 },
  color: 0xffffffff,
  intensity: 0.7,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.4 });
const lights = createSceneLights({ ambient, directional });

const floorMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 0 });
floorMaterial.doubleSided = true;

const knightMaterials: BlinnPhongMaterial[] = [];
for (let i = 0; i < 4; i++) {
  knightMaterials.push(createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 30, specular: 0x808080ff }));
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
floorMaterial.diffuseMap = floorTex;

for (let i = 0; i < 4; i++) {
  knightMaterials[i]!.diffuseMap = createTexture({ image: knightImages[i]! });
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

let panAngle = 45 * DEG_TO_RAD;
let tiltAngle = 20 * DEG_TO_RAD;
let distance = 2000;
const minTilt = 2 * DEG_TO_RAD;
const maxTilt = 85 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const lookAt = createVector3(0, 0, 0);
const eye = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

let keyUp = false;
let keyDown = false;
let keyLeft = false;
let keyRight = false;

function updateCamera(): void {
  const tilt = Math.max(minTilt, Math.min(maxTilt, tiltAngle));
  tiltAngle = tilt;
  eye.x = lookAt.x + distance * Math.sin(panAngle) * Math.cos(tilt);
  eye.y = lookAt.y + distance * Math.sin(tilt);
  eye.z = lookAt.z + distance * Math.cos(panAngle) * Math.cos(tilt);
  setCameraViewMatrix4FromLookAt(camera, eye, lookAt, up);
}

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = panAngle;
  savedTilt = tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (e.clientX - lastMouseX) + savedPan;
  tiltAngle = 0.3 * DEG_TO_RAD * (e.clientY - lastMouseY) + savedTilt;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (e: WheelEvent) => {
  distance -= e.deltaY / 2;
  if (distance < 100) distance = 100;
  else if (distance > 5000) distance = 5000;
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

updateCamera();

function frame(): void {
  if (keyUp) lookAt.x -= 10;
  if (keyDown) lookAt.x += 10;
  if (keyLeft) lookAt.z -= 10;
  if (keyRight) lookAt.z += 10;

  updateCamera();
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
