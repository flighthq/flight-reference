import type {
  AnimationClip,
  AnimationPlayer,
  CubeTexture,
  Mesh,
  PerspectiveProjection,
  SceneLights,
  SceneNode,
} from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene,
  computeMeshGeometryNormals,
  configureDirectionalShadowCamera3D,
  copyQuaternion,
  createAabb,
  createAnimationPlayer,
  createCamera3D,
  createCubeTexture,
  createEnvironment,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createOrthographicProjection,
  createPlaneMeshGeometry,
  createQuaternion,
  createScene,
  createSceneFromMd5Mesh,
  createSceneLights,
  createScreenSpaceFogEffect,
  createTexture,
  createTilingSampler,
  createToneMapEffect,
  createVector3,
  DEG_TO_RAD,
  drawGlSceneShadowMap,
  getNodeChildByName,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  parseMd5Anim,
  registerDefaultGlRenderEffects,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  setCamera3DViewMatrix4FromLookAt,
  setCubeTextureFace,
  setQuaternionFromAxisAngle,
  setTextureUvScale,
  setVector3,
  updateMeshSkin,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
import { createAwayMatteMaterial } from '../../../_shared/flight/src/materials';
import type { SkyboxRenderState } from '../../../_shared/flight/src/scene3d';
import { renderSkyboxScene } from '../../../_shared/flight/src/scene3d';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
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
// The MD5 asset's forward axis is perpendicular to Flight's camera-facing axis. Keep movement and
// chase-camera maths unchanged, and rotate only the rendered model so its front is visible.
const CHARACTER_YAW_OFFSET = 90 * DEG_TO_RAD;

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
registerUnlitGlMaterial(glState);
registerDefaultGlRenderEffects(glState);

const verifyFrame = createGlFrameVerifier(glState);

const scene = createScene();

const skyFaceNames = ['posX', 'negX', 'posY', 'negY', 'posZ', 'negZ'];
const skyImages = await Promise.all(
  skyFaceNames.map((face) => loadImageResourceFromUrl(`awayjs/assets/skybox/grimnight_${face}.png`)),
);
const skyTexture: CubeTexture = createCubeTexture();
for (let i = 0; i < skyImages.length; i++) setCubeTextureFace(skyTexture, i, skyImages[i]);
const environment = createEnvironment({ environment: skyTexture, intensity: 1 });

const camera = createCameraFromAway({ fov: 60, far: 5000 });

const cameraTarget = createVector3(0, 50, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 160, -200);

function updateCamera(): void {
  // AwayJS uses a fixed camera at (0, 160, -200), looking at a y=50 placeholder parented to the
  // character. The MD5 walk cycle moves in place; turning the character does not orbit the camera.
  setCamera3DViewMatrix4FromLookAt(camera, eye, cameraTarget, up);
}

const redLight = createPointLightFromAway({ color: 0xff1111, range: 3000, referenceDistance: 1225 });
const blueLight = createPointLightFromAway({ color: 0x1111ff, range: 3000, referenceDistance: 1225 });
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

whiteLight.castsShadow = true;
whiteLight.pcfRadius = 2;
const shadowCamera = createCamera3D({
  near: 1,
  far: 10,
  projection: createOrthographicProjection({ halfWidth: 1, halfHeight: 1 }),
});
// Keep the shadow map concentrated around the playable area instead of spending its resolution on
// the full 50,000-unit decorative ground plane.
const shadowBounds = createAabb(-500, -20, -500, 500, 500, 500);

const bodyMaterial = createAwayMatteMaterial(0xffffffff);
const groundMaterial = createAwayMatteMaterial(0xffffffff, 10);
groundMaterial.doubleSided = false;

const [rockDiffuse, rockNormal, bodyDiffuse, bodyNormal, bodySpecular] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/rockbase_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/rockbase_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_normals.png'),
  loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_specular.png'),
]);

const groundDiffuseTexture = createTexture({ image: rockDiffuse });
const groundNormalTexture = createTexture({ image: rockNormal, colorSpace: 'linear' });
const groundSampler = createTilingSampler();
groundDiffuseTexture.sampler = groundSampler;
groundNormalTexture.sampler = groundSampler;
setTextureUvScale(groundDiffuseTexture, 200, 200);
setTextureUvScale(groundNormalTexture, 200, 200);
groundMaterial.baseColorMap = groundDiffuseTexture;
groundMaterial.normalMap = groundNormalTexture;
groundMaterial.normalScale = 0.75;

bodyMaterial.baseColorMap = createTexture({ image: bodyDiffuse });
bodyMaterial.normalMap = createTexture({ image: bodyNormal, colorSpace: 'linear' });
bodyMaterial.metallicRoughnessMap = createTexture({ image: bodySpecular, colorSpace: 'linear' });

const groundMesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);
addNodeChild(scene.root, groundMesh);

// WebGL stores perspective depth nonlinearly. These window-depth values correspond to the AwayJS
// fog interval of 2,500–5,000 world units for this camera's near/far planes.
const fogEffect = createScreenSpaceFogEffect({
  color: 0x000000ff,
  near: 0.995984,
  far: 1,
  density: 8,
});
const effects = [fogEffect, createToneMapEffect(), createFxaaEffect()];

const meshText = await fetch('awayjs/assets/hellknight/hellknight.md5mesh').then((r) => r.text());
const md5Scene = createSceneFromMd5Mesh(meshText);

// Extract skeleton joint nodes from the parsed scene for animation clip binding.
const skeletonNode = getNodeChildByName(md5Scene.root, 'skeleton');
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
const md5Children = getNodeChildren(md5Scene.root);
const characterPositionNode = createScene();
const characterNode = createScene();
const yAxisVec = createVector3(0, 1, 0);
const characterQuat = createQuaternion();
const skinnedMeshes: Mesh[] = [];
for (const child of md5Children) {
  if (isMesh(child)) {
    child.materials[0] = bodyMaterial;
    computeMeshGeometryNormals(child.geometry, child.geometry);
    skinnedMeshes.push(child);
  }
  addNodeChild(characterNode.root, child);
}
addNodeChild(characterPositionNode.root, characterNode.root);
addNodeChild(scene.root, characterPositionNode.root);

const animTexts = await Promise.all(
  ANIM_NAMES.map((name) => fetch(`awayjs/assets/hellknight/${name}.md5anim`).then((r) => r.text())),
);

const clips: Map<string, AnimationClip> = new Map();
for (let i = 0; i < ANIM_NAMES.length; i++) {
  const clip = parseMd5Anim(animTexts[i]!, jointNodes);
  const name = ANIM_NAMES[i]!;
  if (clip && name === WALK_NAME) {
    // AwayJS consumes joint zero's translation as owner root motion and omits it from the rendered
    // skeleton. Flight normally applies every channel to the skeleton, which is what causes walk7 to
    // jump from its final 130-unit origin translation back to zero on every loop.
    for (const channel of clip.channels) {
      const target = channel.targetRef as { node?: SceneNode; path?: string } | null;
      if (target?.node === jointNodes[0] && target.path === 'Translation') {
        channel.track.values = new Float32Array(channel.track.values.length);
      }
    }
  }
  if (clip) clips.set(name, clip);
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
let characterX = 0;
let characterZ = 0;
const skyboxRef: SkyboxRenderState = {
  pipeline: createGlRenderEffectPipeline(glState, { format: 'rgba16f', depth: 'depth-stencil-sampled' }),
};

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
  activePlayer.speed = dir * (isRunning ? RUN_SPEED : WALK_SPEED);
  if (currentAnim !== WALK_NAME && !onceAnim) play(WALK_NAME);
  activePlayer.speed = dir * (isRunning ? RUN_SPEED : WALK_SPEED);
}

function stop(): void {
  isMoving = false;
  if (currentAnim !== IDLE_NAME && !onceAnim) play(IDLE_NAME);
  activePlayer.speed = 1;
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

  if (onceAnim && !activePlayer.playing) {
    onceAnim = null;
    play(isMoving ? WALK_NAME : IDLE_NAME);
    activePlayer.speed = isMoving ? movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) : 1;
  }

  applyAnimationClipToScene(activePlayer.clip, activePlayer.time);
  for (const mesh of skinnedMeshes) updateMeshSkin(mesh);

  spriteRotY += rotationInc;

  // AwayJS extracts the walk clip's animated origin translation and applies it as root motion to the
  // sprite owner. Its walk7 origin advances 130.27 units over 37 frames at 24 fps (~84.5 units/s).
  // Applying the equivalent continuous displacement to the container avoids the clip-loop snap while
  // retaining the original forward/reverse and walk/run playback-speed behavior.
  if (isMoving && currentAnim === WALK_NAME) {
    const rootSpeed = 130.2688 / (37 / 24);
    const distance = rootSpeed * movementDir * (isRunning ? RUN_SPEED : WALK_SPEED) * dt;
    characterX += Math.sin(spriteRotY) * distance;
    characterZ += Math.cos(spriteRotY) * distance;
  }

  // Keep root-motion translation and visual yaw on separate nodes. This makes the yaw pivot the
  // character's local origin and prevents turning from rotating its accumulated world displacement.
  setVector3(characterPositionNode.root.position, characterX, 0, characterZ);
  invalidateNodeLocalTransform(characterPositionNode.root);
  setQuaternionFromAxisAngle(characterQuat, yAxisVec, spriteRotY + CHARACTER_YAW_OFFSET);
  copyQuaternion(characterNode.root.rotation, characterQuat);
  invalidateNodeLocalTransform(characterNode.root);

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

  cameraTarget.x = characterX;
  cameraTarget.z = characterZ;
  updateCamera();

  configureDirectionalShadowCamera3D(shadowCamera, whiteLight.direction, shadowBounds);
  drawGlSceneShadowMap(glState, scene.root, shadowCamera);

  renderSkyboxScene(glState, canvas, skyboxRef, environment, scene.root, camera, lights, effects);

  verifyFrame();

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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

updateCamera();
requestAnimationFrame(frame);
