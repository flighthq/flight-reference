import type {
  AnimationClip,
  AnimationPlayer,
  GlRenderTarget,
  Mesh,
  SceneLights,
  SceneNode,
  StandardPbrMaterial,
} from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  createAnimationPlayer,
  computeMeshGeometryNormals,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneFromMd5Mesh,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getPbrRoughnessFromPhongShininess,
  getNodeChildByName,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  parseMd5Anim,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  updateMeshSkin,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
const ANIM_NAMES = [
  'idle2',
  'walk7',
  'attack3',
  'turret_attack',
  'attack2',
  'chest',
  'roar1',
  'leftslash',
  'headpain',
  'pain1',
  'pain_luparm',
  'range_attack2',
];
const IDLE_NAME = 'idle2';
const WALK_NAME = 'walk7';
const ROTATION_SPEED = 3;
const WALK_SPEED = 1;
const RUN_SPEED = 2;

const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(width, height, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const glState = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});
registerStandardPbrGlMaterial(glState);

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 5000 });

const placeHolder = createVector3(0, 50, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 160, -200);

function updateCamera(spriteRotY: number): void {
  setAwayPosition(eye, -200 * Math.sin(spriteRotY), 110, 200 * Math.cos(spriteRotY));
  eye.x += placeHolder.x;
  eye.y += placeHolder.y;
  eye.z += placeHolder.z;
  setCameraViewMatrix4FromLookAt(camera, eye, placeHolder, up);
}

const redLight = createPointLightFromAway({ color: 0xff1111, range: 3000 });
const blueLight = createPointLightFromAway({ color: 0x1111ff, range: 3000 });
const { directional: whiteLight, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(-50, -20, 10),
  color: 0xffffee,
  ambient: 1,
  ambientColor: 0x303040,
});
const lights: SceneLights = createSceneLights({
  ambient,
  directional: whiteLight,
  point: [redLight, blueLight],
});

const bodyMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const groundMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});
groundMaterial.doubleSided = false;

const [rockDiffuse, rockNormal, rockSpecular, bodyDiffuse, bodyNormal, bodySpecular] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/rockbase_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/rockbase_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/rockbase_specular.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_specular.png'),
]);

groundMaterial.baseColorMap = createTexture({ image: rockDiffuse, uvScaleX: 200, uvScaleY: 200 });
groundMaterial.normalMap = createTexture({ image: rockNormal, uvScaleX: 200, uvScaleY: 200, colorSpace: 'linear' });
groundMaterial.metallicRoughnessMap = createTexture({
  image: rockSpecular,
  uvScaleX: 200,
  uvScaleY: 200,
  colorSpace: 'linear',
});

bodyMaterial.baseColorMap = createTexture({ image: bodyDiffuse });
bodyMaterial.normalMap = createTexture({ image: bodyNormal, colorSpace: 'linear' });
bodyMaterial.metallicRoughnessMap = createTexture({ image: bodySpecular, colorSpace: 'linear' });

const groundMesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);
setMatrix4Identity(groundMesh.localMatrix);
invalidateNodeLocalTransform(groundMesh);
addNodeChild(scene, groundMesh);

const meshText = await fetch('awayjs/assets/hellknight/hellknight.md5mesh').then((r) => r.text());
const md5Scene = createSceneFromMd5Mesh(meshText);

// Extract skeleton joint nodes from the parsed scene for animation clip binding.
const skeletonNode = getNodeChildByName(md5Scene, 'skeleton');
const jointNodes: SceneNode[] = [];
if (skeletonNode) {
  const collectDescendants = (parent: SceneNode): void => {
    for (const child of getNodeChildren(parent)) {
      jointNodes.push(child as SceneNode);
      collectDescendants(child as SceneNode);
    }
  };
  collectDescendants(skeletonNode);
}

// Add all mesh children from the parsed scene to our render scene and assign materials.
// The MD5 parser sets mesh.skin on each mesh — updateMeshSkin drives skinning per frame.
const md5Children = getNodeChildren(md5Scene);
const characterNode = createScene();
const skinnedMeshes: Mesh[] = [];
for (const child of md5Children) {
  if (isMesh(child)) {
    child.materials[0] = bodyMaterial;
    computeMeshGeometryNormals(child.geometry, child.geometry);
    skinnedMeshes.push(child);
  }
  addNodeChild(characterNode, child);
}
setMatrix4Identity(characterNode.localMatrix);
invalidateNodeLocalTransform(characterNode);
addNodeChild(scene, characterNode);

const animTexts = await Promise.all(
  ANIM_NAMES.map((name) => fetch(`awayjs/assets/hellknight/${name}.md5anim`).then((r) => r.text())),
);

const clips: Map<string, AnimationClip> = new Map();
for (let i = 0; i < ANIM_NAMES.length; i++) {
  const clip = parseMd5Anim(animTexts[i]!, jointNodes);
  if (clip) clips.set(ANIM_NAMES[i]!, clip);
}

const idleClip = clips.get(IDLE_NAME);
if (!idleClip) {
  console.warn(`idle animation "${IDLE_NAME}" failed to parse or was not found`);
}
let activePlayer: AnimationPlayer = idleClip
  ? createAnimationPlayer(idleClip, { loop: true, speed: 1 })
  : (null as unknown as AnimationPlayer);
let currentAnim = IDLE_NAME;
let onceAnim: string | null = null;
let isMoving = false;
let isRunning = false;
let movementDir = 1;
let spriteRotY = Math.PI;
let rotationInc = 0;
let count = 0;
let renderTarget: GlRenderTarget | null = null;

function play(name: string): void {
  if (currentAnim === name) return;
  const clip = clips.get(name);
  if (!clip) return;
  currentAnim = name;
  const looping = name === IDLE_NAME || name === WALK_NAME;
  activePlayer = createAnimationPlayer(clip, { loop: looping, speed: 1 });
}

function updateMovement(dir: number): void {
  movementDir = dir;
  isMoving = true;
  if (currentAnim !== WALK_NAME && !onceAnim) play(WALK_NAME);
}

function stop(): void {
  isMoving = false;
  if (currentAnim !== IDLE_NAME && !onceAnim) play(IDLE_NAME);
}

function playAction(index: number): void {
  const name = ANIM_NAMES[index + 2];
  if (!name) return;
  onceAnim = name;
  play(name);
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ShiftLeft':
    case 'ShiftRight':
      isRunning = true;
      if (isMoving) updateMovement(movementDir);
      break;
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      updateMovement(1);
      break;
    case 'ArrowDown':
    case 'KeyS':
      updateMovement(-1);
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      rotationInc = ROTATION_SPEED * DEG_TO_RAD;
      break;
    case 'ArrowRight':
    case 'KeyD':
      rotationInc = -ROTATION_SPEED * DEG_TO_RAD;
      break;
    case 'Digit1':
      playAction(1);
      break;
    case 'Digit2':
      playAction(2);
      break;
    case 'Digit3':
      playAction(3);
      break;
    case 'Digit4':
      playAction(4);
      break;
    case 'Digit5':
      playAction(5);
      break;
    case 'Digit6':
      playAction(6);
      break;
    case 'Digit7':
      playAction(7);
      break;
    case 'Digit8':
      playAction(8);
      break;
    case 'Digit9':
      playAction(9);
      break;
  }
});

document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ShiftLeft':
    case 'ShiftRight':
      isRunning = false;
      if (isMoving) updateMovement(movementDir);
      break;
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
    case 'ArrowDown':
    case 'KeyS':
      stop();
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
    case 'ArrowRight':
    case 'KeyD':
      rotationInc = 0;
      break;
  }
});

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;
  count += dt;

  advanceAnimationPlayer(activePlayer, dt);

  if (onceAnim && !activePlayer.playing) {
    onceAnim = null;
    play(isMoving ? WALK_NAME : IDLE_NAME);
  }

  applyAnimationClipToScene(activePlayer.clip, activePlayer.time);
  for (const mesh of skinnedMeshes) updateMeshSkin(mesh);

  spriteRotY += rotationInc;
  setMatrix4Identity(characterNode.localMatrix);
  const yAxis = createVector3(0, 1, 0);
  rotateMatrix4(characterNode.localMatrix, characterNode.localMatrix, yAxis, spriteRotY);
  invalidateNodeLocalTransform(characterNode);

  if (isMoving) {
    placeHolder.x += Math.sin(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
    placeHolder.z += Math.cos(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
  }

  setAwayPosition(
    redLight.position,
    Math.sin(count) * 1500,
    250 + Math.sin(count * 0.54) * 200,
    Math.cos(count * 0.7) * 1500,
  );
  setAwayPosition(
    blueLight.position,
    -Math.sin(count * 0.8) * 1500,
    250 - Math.sin(count * 0.65) * 200,
    -Math.cos(count * 0.9) * 1500,
  );

  updateCamera(spriteRotY);

  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(glState, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(glState, renderTarget, w, h);
  }

  presentGlScene(glState, renderTarget, scene, camera, lights);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  canvas.width = w * pr;
  canvas.height = h * pr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  glState.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

updateCamera(spriteRotY);
requestAnimationFrame(frame);
