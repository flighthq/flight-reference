import type { AnimationPlayer, AnimationTrack, BlinnPhongMaterial, GlRenderTarget, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  cloneMeshGeometry,
  createAnimationPlayer,
  createBlinnPhongMaterial,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createTexture,
  createTilingSampler,
  getNodeChildren,
  importMd2,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  resizeGlRenderTarget,
  sampleAnimationTrack,
  scaleMatrix4,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
  updateMeshMorph,
} from '@flighthq/sdk';

import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerBlinnPhongGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 5000 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(-0.5, -1, -1),
  ambient: 0.4,
});
const lights = createSceneLights({ ambient, directional });

const floorMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  specular: 0x000000ff,
  shininess: 1,
});
floorMaterial.doubleSided = true;

const knightMaterials: BlinnPhongMaterial[] = [];
for (let i = 0; i < 4; i++) {
  knightMaterials.push(createBlinnPhongMaterial({ diffuse: 0xffffffff, specular: 0xffffffff, shininess: 30 }));
}

const [floorImage, ...knightImages] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/pknight1.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight2.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight3.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight4.png'),
]);

const floorTex = createTexture({ image: floorImage, sampler: createTilingSampler() });
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
const md2Result = importMd2(new Uint8Array(md2Buffer));
const md2Scene = md2Result.scene;
const md2Clip = md2Result.animations[0] ?? null;
const md2Track: AnimationTrack | null = md2Clip?.channels[0]?.track ?? null;

let templateMesh: Mesh | null = null;
for (const child of getNodeChildren(md2Scene)) {
  if (isMesh(child)) {
    templateMesh = child as Mesh;
    break;
  }
}

if (!templateMesh?.geometry) {
  throw new Error('No mesh found in MD2 file');
}

const templateGeometry = templateMesh.geometry;
const templateMorph = templateMesh.morph;

interface KnightInstance {
  mesh: Mesh;
  player: AnimationPlayer | null;
  track: AnimationTrack | null;
}

const knights: KnightInstance[] = [];
const numWide = 20;
const numDeep = 20;

for (let i = 0; i < numWide; i++) {
  for (let j = 0; j < numDeep; j++) {
    const material = knightMaterials[Math.floor(Math.random() * knightMaterials.length)]!;
    const geometry = cloneMeshGeometry(templateGeometry);
    const knight = createMesh(geometry, [material]);

    let player: AnimationPlayer | null = null;
    if (templateMorph != null && md2Clip != null) {
      knight.morph = { targets: templateMorph.targets, weights: new Float32Array(templateMorph.weights.length) };
      player = createAnimationPlayer(md2Clip, { loop: true, time: Math.random() * md2Clip.duration });
    }

    const x = ((i - (numWide - 1) / 2) * 5000) / numWide;
    const z = ((j - (numDeep - 1) / 2) * 5000) / numDeep;
    setMatrix4Identity(knight.localMatrix);
    translateMatrix4(knight.localMatrix, knight.localMatrix, x, 120, z);
    scaleMatrix4(knight.localMatrix, knight.localMatrix, 5, 5, 5);
    invalidateNodeLocalTransform(knight);
    addNodeChild(scene, knight);
    knights.push({ mesh: knight, player, track: md2Track });
  }
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 2000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 5,
  maxTiltAngle: 90,
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

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance -= e.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;
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

let lastTime = 0;

function frame(now: number): void {
  const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (keyUp) orbit.target.x -= 10;
  if (keyDown) orbit.target.x += 10;
  if (keyLeft) orbit.target.z += 10;
  if (keyRight) orbit.target.z -= 10;

  for (const { mesh, player, track } of knights) {
    if (player !== null && track !== null && mesh.morph != null) {
      advanceAnimationPlayer(player, dt);
      sampleAnimationTrack(mesh.morph.weights, track, player.time);
      updateMeshMorph(mesh);
    }
  }

  orbit.update();
  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
