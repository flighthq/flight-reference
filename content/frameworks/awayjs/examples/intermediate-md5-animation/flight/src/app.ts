import type { AnimationClip, AnimationPlayer, BlinnPhongMaterial, Camera, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  computeSkeleton3DJointMatrices,
  createAmbientLight,
  createAnimationPlayer,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createGlCanvasElement,
  createGlRenderState,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createPointLight,
  createScene,
  createSceneFromMd5Mesh,
  createSceneLights,
  createSkeleton3D,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  drawGlScene,
  getNodeChildByName,
  getNodeChildren,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  parseMd5Anim,
  registerBlinnPhongGlMaterial,
  renderGlBackground,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

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
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
  pixelRatio,
});
registerBlinnPhongGlMaterial(glState);

const scene = createScene();

const camera: Camera = createCamera({
  near: 1,
  far: 5000,
  projection: createPerspectiveProjection({ fovY: 45 * DEG_TO_RAD, aspect: width / height }),
});

const placeHolder = createVector3(0, 50, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 160, -200);

function updateCamera(spriteRotY: number): void {
  const cos = Math.cos(spriteRotY);
  const sin = Math.sin(spriteRotY);
  const dx = -200 * sin;
  const dz = -200 * cos;
  eye.x = placeHolder.x + dx;
  eye.y = placeHolder.y + 110;
  eye.z = placeHolder.z + dz;
  setCameraViewMatrix4FromLookAt(camera, eye, placeHolder, up);
}

const redLight = createPointLight({ color: 0xff1111, intensity: 1.5, falloff: 3000 });
const blueLight = createPointLight({ color: 0x1111ff, intensity: 1.5, falloff: 3000 });
const whiteLight = createDirectionalLight({ direction: { x: -50, y: -20, z: 10 }, color: 0xffffee, intensity: 1 });
const ambient = createAmbientLight({ color: 0x303040, intensity: 1 });
const lights: SceneLights = createSceneLights({
  ambient,
  directional: whiteLight,
  pointLights: [redLight, blueLight],
});

const bodyMaterial: BlinnPhongMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 20,
  specular: 0x808080ff,
});
const groundMaterial: BlinnPhongMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 10 });
groundMaterial.doubleSided = false;

const [rockDiffuse, rockNormal, rockSpecular, bodyDiffuse, bodyNormal, bodySpecular] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/rockbase_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/rockbase_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/rockbase_specular.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_specular.png'),
]);

groundMaterial.diffuseMap = createTexture({ image: rockDiffuse, uvScaleX: 200, uvScaleY: 200 });
groundMaterial.normalMap = createTexture({ image: rockNormal, uvScaleX: 200, uvScaleY: 200 });
groundMaterial.specularMap = createTexture({ image: rockSpecular, uvScaleX: 200, uvScaleY: 200 });

bodyMaterial.diffuseMap = createTexture({ image: bodyDiffuse });
bodyMaterial.normalMap = createTexture({ image: bodyNormal });
bodyMaterial.specularMap = createTexture({ image: bodySpecular });

const groundMesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);
setMatrix4Identity(groundMesh.localMatrix);
invalidateNodeLocalTransform(groundMesh);
addNodeChild(scene, groundMesh);

// Parse the MD5 mesh — returns a Scene with a "skeleton" group node and mesh children
const meshText = await fetch('awayjs/assets/hellknight/hellknight.md5mesh').then((r) => r.text());
const md5Scene = createSceneFromMd5Mesh(meshText);

// Extract skeleton joint nodes from the parsed scene
const skeletonNode = getNodeChildByName(md5Scene, 'skeleton');
const jointNodes: SceneNode[] = skeletonNode ? (getNodeChildren(skeletonNode) as SceneNode[]) : [];

// Build a Skeleton3D for joint matrix computation
const skeleton = createSkeleton3D(jointNodes);

// Add all mesh children from the parsed scene to our render scene
const md5Children = getNodeChildren(md5Scene);
const characterNode = createScene();
for (const child of md5Children) {
  addNodeChild(characterNode, child);
}
setMatrix4Identity(characterNode.localMatrix);
invalidateNodeLocalTransform(characterNode);
addNodeChild(scene, characterNode);

// Parse all animation clips
const animTexts = await Promise.all(
  ANIM_NAMES.map((name) => fetch(`awayjs/assets/hellknight/${name}.md5anim`).then((r) => r.text())),
);

const clips: Map<string, AnimationClip> = new Map();
for (let i = 0; i < ANIM_NAMES.length; i++) {
  const clip = parseMd5Anim(animTexts[i]!, jointNodes);
  if (clip) clips.set(ANIM_NAMES[i]!, clip);
}

const idleClip = clips.get(IDLE_NAME)!;
let activePlayer: AnimationPlayer = createAnimationPlayer(idleClip, { loop: true, speed: 1 });
let currentAnim = IDLE_NAME;
let onceAnim: string | null = null;
let isMoving = false;
let isRunning = false;
let movementDir = 1;
let spriteRotY = Math.PI;
let rotationInc = 0;
let count = 0;

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
      rotationInc = -ROTATION_SPEED * DEG_TO_RAD;
      break;
    case 'ArrowRight':
    case 'KeyD':
      rotationInc = ROTATION_SPEED * DEG_TO_RAD;
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

  // Check if one-shot animation finished
  if (onceAnim && !activePlayer.playing) {
    onceAnim = null;
    play(isMoving ? WALK_NAME : IDLE_NAME);
  }

  applyAnimationClipToScene(activePlayer.clip, activePlayer.time);
  computeSkeleton3DJointMatrices(skeleton);

  spriteRotY += rotationInc;
  setMatrix4Identity(characterNode.localMatrix);
  const yAxis = createVector3(0, 1, 0);
  rotateMatrix4(characterNode.localMatrix, characterNode.localMatrix, yAxis, spriteRotY);
  invalidateNodeLocalTransform(characterNode);

  if (isMoving) {
    placeHolder.x += Math.sin(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
    placeHolder.z += Math.cos(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
  }

  redLight.x = Math.sin(count) * 1500;
  redLight.y = 250 + Math.sin(count * 0.54) * 200;
  redLight.z = Math.cos(count * 0.7) * 1500;
  blueLight.x = -Math.sin(count * 0.8) * 1500;
  blueLight.y = 250 - Math.sin(count * 0.65) * 200;
  blueLight.z = -Math.cos(count * 0.9) * 1500;

  updateCamera(spriteRotY);

  renderGlBackground(glState);
  const gl = glState.gl;
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlScene(glState, scene, camera, lights);

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
