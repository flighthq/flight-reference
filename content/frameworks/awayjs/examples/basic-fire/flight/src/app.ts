import type {
  Camera,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  SceneLights,
  StandardPbrMaterial,
} from '@flighthq/sdk';
import {
  addNodeChild,
  addTextureAtlasRegion,
  createAmbientLight,
  createCamera,
  createDirectionalLight,
  createGlCanvasElement,
  createGlRenderState,
  createMesh,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createPointLight,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createTextureAtlas,
  createVector3,
  DEG_TO_RAD,
  drawGlScene,
  getPhongToPbrLightExposure,
  getPbrRoughnessFromPhongShininess,
  applyLightExposure,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  setTextureUvScale,
  stepParticleEmitter3D,
  translateMatrix4,
} from '@flighthq/sdk';

import type { GammaTarget } from '../../../_shared/flight/src/gamma';
import { beginGammaPass, createGammaTarget, endGammaPass, resizeGammaTarget } from '../../../_shared/flight/src/gamma';

const pbrExposure = getPhongToPbrLightExposure();

const NUM_FIRES = 10;
const FIRE_RADIUS = 400;
const FIRE_START_INTERVAL = 1000;

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
registerStandardPbrGlMaterial(glState);

const scene = createScene();

const camera: Camera = createCamera({
  near: 1,
  far: 5000,
  projection: createPerspectiveProjection({ fovY: 60 * DEG_TO_RAD, aspect: width / height }),
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 0 },
  color: 0xeeddddff,
  intensity: applyLightExposure(0.5, pbrExposure),
});

const ambient = createAmbientLight({ color: 0x808090ff, intensity: applyLightExposure(0.5, pbrExposure) });

const firePointLights = Array.from({ length: NUM_FIRES }, () =>
  createPointLight({ color: 0xff3301ff, intensity: 0, range: 400 }),
);

const lights: SceneLights = createSceneLights({
  ambient,
  directional,
  point: firePointLights,
});

const planeMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});
planeMaterial.doubleSided = true;

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
setMatrix4Identity(plane.localMatrix);
translateMatrix4(plane.localMatrix, plane.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(plane);
addNodeChild(scene, plane);

async function loadPlaneTextures(): Promise<void> {
  const [diffuseImg, normalImg, specularImg] = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_normal.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_specular.jpg'),
  ]);
  const diffuseTex = createTexture({ image: diffuseImg });
  setTextureUvScale(diffuseTex, 2, 2);
  planeMaterial.baseColorMap = diffuseTex;

  const normalTex = createTexture({ image: normalImg });
  setTextureUvScale(normalTex, 2, 2);
  planeMaterial.normalMap = normalTex;

  const specularTex = createTexture({ image: specularImg });
  setTextureUvScale(specularTex, 2, 2);
  planeMaterial.metallicRoughnessMap = specularTex;
}

const fireImage = await loadImageResourceFromUrl('awayjs/assets/blue.png');
const fireAtlas = createTextureAtlas({ image: fireImage });
addTextureAtlasRegion(fireAtlas, 0, 0, fireImage.width, fireImage.height);

const config: ParticleEmitterConfig = createParticleEmitterConfig({
  maxParticles: 500,
  spawnRate: 100,
  duration: -1,
  loop: true,
  lifetimeMin: 0.1,
  lifetimeMax: 4.1,
  emitterShape: 'sphere',
  emitterRadius: 15,
  directionX: 0,
  directionY: 1,
  directionZ: 0,
  speedMin: 50,
  speedMax: 80,
  scaleMin: 8,
  scaleMax: 25,
  scaleEnd: 5,
  colorStartR: 1,
  colorStartG: 0.2,
  colorStartB: 0.004,
  colorEndR: 0.6,
  colorEndG: 0,
  colorEndB: 0,
  alphaStart: 1,
  alphaEnd: 0,
  blendMode: 'add',
});

interface FireEntry {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  active: boolean;
  strength: number;
  lightIndex: number;
}

const fires: FireEntry[] = [];

for (let i = 0; i < NUM_FIRES; i++) {
  const emitter = createParticleEmitter3D();
  emitter.data.atlas = fireAtlas;
  const state = createParticleEmitterState();

  const angle = (i / NUM_FIRES) * Math.PI * 2;
  const x = Math.sin(angle) * FIRE_RADIUS;
  const z = Math.cos(angle) * FIRE_RADIUS;
  const y = 5;

  setMatrix4Identity(emitter.localMatrix);
  translateMatrix4(emitter.localMatrix, emitter.localMatrix, x, y, z);
  invalidateNodeLocalTransform(emitter);

  firePointLights[i].position.x = x;
  firePointLights[i].position.y = y;
  firePointLights[i].position.z = z;

  addNodeChild(scene, emitter);
  fires.push({ emitter, state, active: false, strength: 0, lightIndex: i });
}

let firesStarted = 0;
const startTimer = setInterval(() => {
  if (firesStarted >= NUM_FIRES) {
    clearInterval(startTimer);
    return;
  }
  fires[firesStarted]!.active = true;
  firesStarted++;
}, FIRE_START_INTERVAL);

let panAngle = 45 * DEG_TO_RAD;
let tiltAngle = 20 * DEG_TO_RAD;
const distance = 1000;
const minTiltAngle = 0;
const maxTiltAngle = 90 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const eye = createVector3(0, 0, 0);
const lookAt = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const tilt = Math.max(minTiltAngle, Math.min(maxTiltAngle, tiltAngle));
  tiltAngle = tilt;
  eye.x = distance * Math.sin(panAngle) * Math.cos(tilt);
  eye.y = distance * Math.sin(tilt);
  eye.z = -distance * Math.cos(panAngle) * Math.cos(tilt);
  setCameraViewMatrix4FromLookAt(camera, eye, lookAt, up);
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = panAngle;
  savedTilt = tiltAngle;
});
canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (e.clientX - lastMouseX) + savedPan;
  tiltAngle = 0.3 * DEG_TO_RAD * (e.clientY - lastMouseY) + savedTilt;
});
window.addEventListener('mouseup', () => {
  dragging = false;
});

updateCamera();

loadPlaneTextures();

let gammaTarget: GammaTarget | null = null;
let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  for (const fire of fires) {
    if (!fire.active) continue;

    stepParticleEmitter3D(fire.emitter, fire.state, config, dt);

    if (fire.strength < 1) fire.strength += 0.1;
    const light = firePointLights[fire.lightIndex];
    light.intensity = applyLightExposure(fire.strength + Math.random() * 0.2, pbrExposure);
    light.range = 380 + Math.random() * 20;
  }

  updateCamera();

  const gl = glState.gl;
  const w = canvas.width;
  const h = canvas.height;

  if (gammaTarget === null) {
    gammaTarget = createGammaTarget(gl, w, h);
  } else {
    resizeGammaTarget(gl, gammaTarget, w, h);
  }

  beginGammaPass(gl, gammaTarget);
  renderGlBackground(glState);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlScene(glState, scene, camera, lights);
  endGammaPass(gl, gammaTarget);

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

requestAnimationFrame(frame);
