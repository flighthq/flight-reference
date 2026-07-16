import type { BlinnPhongMaterial, Camera, Mesh, SceneLights, Skeleton, SkeletonClip } from '@flighthq/sdk';
import {
  addNodeChild,
  applySkeletonClip,
  computeSkeletonJointMatrices,
  createAmbientLight,
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
  createSceneLights,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  drawGlScene,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  parseMd5Anim,
  parseMd5Mesh,
  registerBlinnPhongGlMaterial,
  registerSkinnedMeshGlRenderer,
  renderGlBackground,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

// parseMd5Mesh and parseMd5Anim are new in SDK 0.3.0 (scene-formats package).
//   parseMd5Mesh(text) → { skeleton: Skeleton; surfaces: Md5Surface[] } where each surface
//     carries a MeshGeometry, joint weight data, and a material slot index.
//   parseMd5Anim(text) → SkeletonClip  (duration, fps, keyframes for each joint)
//
// applySkeletonClip / computeSkeletonJointMatrices are from @flighthq/skeleton3d (was skeleton).
// registerSkinnedMeshGlRenderer registers the GPU skinning pass for BlinnPhongMaterial meshes
// that carry a Skeleton.

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
const IDLE_SPEED = 1;
const ACTION_SPEED = 1;
const CROSSFADE = 0.5;

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
registerSkinnedMeshGlRenderer(glState);

const scene = createScene();

const camera: Camera = createCamera({
  near: 1,
  far: 5000,
  projection: createPerspectiveProjection({ fovY: 45 * DEG_TO_RAD, aspect: width / height }),
});

// LookAt camera: camera stays behind the character and follows a placeholder offset Y=50
const placeHolder = createVector3(0, 50, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 160, -200);

function updateCamera(spriteRotY: number): void {
  // rotate the camera offset around the character using current rotationY
  const cos = Math.cos(spriteRotY);
  const sin = Math.sin(spriteRotY);
  const dx = -200 * sin;
  const dz = -200 * cos;
  eye.x = placeHolder.x + dx;
  eye.y = placeHolder.y + 110;
  eye.z = placeHolder.z + dz;
  setCameraViewMatrix4FromLookAt(camera, eye, placeHolder, up);
}

// Lights
const redLight = createPointLight({ color: 0xff1111, intensity: 1.5, falloff: 3000 });
const blueLight = createPointLight({ color: 0x1111ff, intensity: 1.5, falloff: 3000 });
const whiteLight = createDirectionalLight({ direction: { x: -50, y: -20, z: 10 }, color: 0xffffee, intensity: 1 });
const ambient = createAmbientLight({ color: 0x303040, intensity: 1 });
const lights: SceneLights = createSceneLights({
  ambient,
  directional: whiteLight,
  pointLights: [redLight, blueLight],
});

// Materials
const bodyMaterial: BlinnPhongMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 20,
  specular: 0x808080ff,
});
const groundMaterial: BlinnPhongMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 10 });
groundMaterial.doubleSided = false;

// Load textures in parallel
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

// Ground plane
const groundMesh: Mesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);
setMatrix4Identity(groundMesh.localMatrix);
invalidateNodeLocalTransform(groundMesh);
addNodeChild(scene, groundMesh);

// Parse MD5 mesh (skeleton + surfaces) and all animation clips
const [meshText, ...animTexts] = await Promise.all([
  fetch('awayjs/assets/hellknight/hellknight.md5mesh').then((r) => r.text()),
  ...ANIM_NAMES.map((name) => fetch(`awayjs/assets/hellknight/${name}.md5anim`).then((r) => r.text())),
]);

const md5 = parseMd5Mesh(meshText);
const skeleton: Skeleton = md5.skeleton;

const clips: Map<string, SkeletonClip> = new Map();
for (let i = 0; i < ANIM_NAMES.length; i++) {
  const clip = parseMd5Anim(animTexts[i]!);
  clip.name = ANIM_NAMES[i]!;
  clip.looping = clip.name === IDLE_NAME || clip.name === WALK_NAME;
  clips.set(clip.name, clip);
}

// Build skinned mesh from MD5 surfaces
const characterMesh: Mesh = createMesh(md5.surfaces[0]!.geometry, [bodyMaterial]);
characterMesh.skeleton = skeleton;
setMatrix4Identity(characterMesh.localMatrix);
translateMatrix4(characterMesh.localMatrix, characterMesh.localMatrix, 0, 0, 0);
invalidateNodeLocalTransform(characterMesh);
addNodeChild(scene, characterMesh);

// Animation state machine
let currentAnim = IDLE_NAME;
let onceAnim: string | null = null;
let isMoving = false;
let isRunning = false;
let movementDir = 1;
let clipTime = 0;
let spriteRotY = Math.PI; // face the camera (rotY=180°)
let rotationInc = 0;
let playbackSpeed = IDLE_SPEED;
let count = 0;

function activeClip(): SkeletonClip {
  return clips.get(currentAnim) ?? clips.get(IDLE_NAME)!;
}

function play(name: string, resetTime = false): void {
  if (currentAnim === name && !resetTime) return;
  currentAnim = name;
  if (resetTime) clipTime = 0;
}

function updateMovement(dir: number): void {
  movementDir = dir;
  isMoving = true;
  playbackSpeed = dir * (isRunning ? RUN_SPEED : WALK_SPEED);
  if (currentAnim !== WALK_NAME && !onceAnim) play(WALK_NAME);
}

function stop(): void {
  isMoving = false;
  playbackSpeed = IDLE_SPEED;
  if (currentAnim !== IDLE_NAME && !onceAnim) play(IDLE_NAME);
}

function playAction(index: number): void {
  const name = ANIM_NAMES[index + 2];
  if (!name) return;
  onceAnim = name;
  playbackSpeed = ACTION_SPEED;
  play(name, true);
}

const keysDown = new Set<string>();

document.addEventListener('keydown', (e: KeyboardEvent) => {
  keysDown.add(e.code);
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
  keysDown.delete(e.code);
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

  // Advance clip time
  const clip = activeClip();
  clipTime += dt * playbackSpeed;

  if (clip.looping) {
    clipTime = ((clipTime % clip.duration) + clip.duration) % clip.duration;
  } else if (clipTime >= clip.duration) {
    // One-shot complete — return to current looping anim
    onceAnim = null;
    playbackSpeed = isMoving ? movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) : IDLE_SPEED;
    play(isMoving ? WALK_NAME : IDLE_NAME);
    clipTime = 0;
  }

  applySkeletonClip(skeleton, activeClip(), clipTime);
  computeSkeletonJointMatrices(skeleton);

  // Rotate character
  spriteRotY += rotationInc;

  setMatrix4Identity(characterMesh.localMatrix);
  const yAxis = createVector3(0, 1, 0);
  rotateMatrix4(characterMesh.localMatrix, characterMesh.localMatrix, yAxis, spriteRotY);
  invalidateNodeLocalTransform(characterMesh);

  // Move character forward (walk)
  if (isMoving) {
    placeHolder.x += Math.sin(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
    placeHolder.z += Math.cos(spriteRotY) * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * 50 * dt;
  }

  // Orbit the coloured lights
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
