import type { AnimationPlayer, PerspectiveProjection, Scene3DLights } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  applyAnimationClipToScene3D,
  configureDirectionalShadowCamera3D,
  copyQuaternion,
  createAabb,
  createAnimationPlayer,
  createCamera3D,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createOrthographicProjection,
  createQuaternion,
  createScene3D,
  createScene3DLights,
  createToneMapEffect,
  createVector3,
  DEG_TO_RAD,
  drawGlScene3DShadowMap,
  invalidateNodeLocalTransform,
  registerDefaultGlRenderEffects,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  setCamera3DViewMatrix4FromLookAt,
  setQuaternionFromAxisAngle,
  setVector3,
  updateMeshSkin,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
import type { SkyboxRenderState } from '../../../_shared/flight/src/scene3d';
import { renderSkyboxScene } from '../../../_shared/flight/src/scene3d';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { ANIM_NAMES, IDLE_NAME, WALK_NAME, loadCharacter } from './character';
import { bindCharacterControls } from './controls';
import { loadEnvironment } from './environment';

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

const scene = createScene3D();

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
const lights: Scene3DLights = createScene3DLights({
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

const { environment, groundMesh, fogEffect } = await loadEnvironment();
addNodeChild(scene.root, groundMesh);
const effects = [fogEffect, createToneMapEffect(), createFxaaEffect()];

const { clips, skinnedMeshes, characterPositionNode, characterNode } = await loadCharacter();
const yAxisVec = createVector3(0, 1, 0);
const characterQuat = createQuaternion();
const identityQuat = createQuaternion();
addNodeChild(scene.root, characterPositionNode.root);

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

bindCharacterControls({
  startRunning: () => {
    isRunning = true;
    if (isMoving) updateMovement(movementDir);
  },
  stopRunning: () => {
    isRunning = false;
    if (isMoving) updateMovement(movementDir);
  },
  walkForward: () => updateMovement(1),
  walkBackward: () => updateMovement(-1),
  stopWalking: () => stop(),
  turnLeft: () => {
    rotationInc = -ROTATION_SPEED * DEG_TO_RAD;
  },
  turnRight: () => {
    rotationInc = ROTATION_SPEED * DEG_TO_RAD;
  },
  stopTurning: () => {
    rotationInc = 0;
  },
  attack: (index) => playAction(index),
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

  applyAnimationClipToScene3D(activePlayer.clip, activePlayer.time);

  // Flight's skinning reads joint WORLD matrices (getNodeWorldMatrix4), which include ancestor
  // transforms. The renderer then applies the mesh's own world transform on top of the already-
  // world-space skinned vertices — doubling any non-identity ancestor. Clear the character
  // transforms before skinning so joints resolve in model space, then restore for rendering.
  copyQuaternion(characterNode.root.rotation, identityQuat);
  invalidateNodeLocalTransform(characterNode.root);
  setVector3(characterPositionNode.root.position, 0, 0, 0);
  invalidateNodeLocalTransform(characterPositionNode.root);

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
  drawGlScene3DShadowMap(glState, scene.root, shadowCamera);

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
