import type {
  ImageResource,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  PerspectiveProjection,
  StandardPbrMaterial,
  Texture,
  UnlitMaterial,
} from '@flighthq/sdk';
import {
  addNodeChild,
  createFxaaEffect,
  createImageResource,
  createMesh,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createTilingSampler,
  createToneMapEffect,
  createUnlitMaterial,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setTextureUvScale,
  setVector3,
  stepParticleEmitter3D,
} from '@flighthq/sdk';

import {
  awayDirection,
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createSingleSpriteAtlas } from '../../../_shared/flight/src/particles';
import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const NUM_FIRES = 10;
const FIRE_RADIUS = 400;
const FIRE_START_INTERVAL = 1000;

// AwayJS floods the floor red by giving each of its 10 fires a point light. Flight's forward renderer
// caps point lights at MAX_FORWARD_LIGHTS (4) and drops the rest, so only 4 fires could ever glow.
// Instead we fake the pool under EVERY fire with an additive-looking floor decal: a soft radial glow
// quad laid flat on the floor. (Mesh materials only alpha-composite in the present path — the additive
// blend the emitters use isn't honored for meshes — so this warms the floor rather than truly adding,
// which reads the same over the bright checker.) DECAL_SIZE is the quad's world size (pool diameter);
// DECAL_MAX_OPACITY is the center alpha at full fire strength.
const DECAL_SIZE = 560;
const DECAL_MAX_OPACITY = 0.75;
// The floor sits at y=-20 and adjacent pools overlap heavily (fires are ~247 apart, pools ~560 wide),
// so a single shared decal height would z-fight both the floor and the neighbouring decals. Each decal
// gets its own height just above the floor via the per-index step, keeping every quad on a distinct
// depth so overlaps resolve cleanly without shimmer.
const DECAL_Y_BASE = -19.4;
const DECAL_Y_STEP = 0.1;

// AwayJS gives the floor its wet-tile sheen with a specular map plus `specularMethod.strength = 10`;
// Flight's metallic-roughness PBR has no specular map, so we bake `floor_specular.jpg` into a
// roughness map instead. AwayJS's specular map is a gloss mask (bright = shiny), which is the inverse
// of PBR roughness, so bright texels map to the glossy end and dark texels to the matte end.
const FLOOR_ROUGHNESS_GLOSSY = 0.3;
const FLOOR_ROUGHNESS_MATTE = 0.85;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, -1, 0),
  color: 0xeedddd,
  diffuse: 0.5,
  ambient: 0.5,
  ambientColor: 0x808090,
});

const lights = createSceneLights({ ambient, directional });

const planeMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: 1,
});
planeMaterial.doubleSided = true;

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
plane.position.y = -20;
invalidateNodeLocalTransform(plane);
addNodeChild(scene.root, plane);

function specularToRoughnessTexture(specular: ImageResource): Texture {
  const spread = FLOOR_ROUGHNESS_MATTE - FLOOR_ROUGHNESS_GLOSSY;
  const mrImage = createMetallicRoughnessImage(specular, (r) => ({
    roughness: FLOOR_ROUGHNESS_MATTE - spread * r,
    metallic: 0,
  }));
  const tex = createTexture({
    image: mrImage,
    sampler: createTilingSampler(),
    colorSpace: 'linear',
  });
  setTextureUvScale(tex, 2, 2);
  return tex;
}

// A soft radial glow sprite: white-hot center easing through orange to a transparent red rim, with a
// squared alpha falloff so the pool edge fades smoothly into the floor. Baked once and shared by every
// decal; per-fire brightness is driven by the decal material's baseColor alpha at draw time.
function createGlowTexture(): Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const canvasCtx = canvas.getContext('2d')!;
  const image = canvasCtx.createImageData(size, size);
  const px = image.data;
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.min(1, Math.hypot((x - c) / c, (y - c) / c));
      const t = 1 - r;
      const i = (y * size + x) * 4;
      px[i] = 255;
      px[i + 1] = Math.round(210 * t ** 1.8);
      px[i + 2] = Math.round(110 * t ** 3);
      px[i + 3] = Math.round(255 * t ** 2);
    }
  }
  canvasCtx.putImageData(image, 0, 0);
  return createTexture({ image: createImageResource(canvas) });
}

const glowTexture = createGlowTexture();
const decalGeometry = createPlaneMeshGeometry(DECAL_SIZE, DECAL_SIZE, 1, 1);

async function loadPlaneTextures(): Promise<void> {
  const [diffuseImg, normalImg, specularImg] = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_normal.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_specular.jpg'),
  ]);
  const diffuseTex = createTexture({ image: diffuseImg, sampler: createTilingSampler() });
  setTextureUvScale(diffuseTex, 2, 2);
  planeMaterial.baseColorMap = diffuseTex;

  const normalTex = createTexture({ image: normalImg, sampler: createTilingSampler() });
  setTextureUvScale(normalTex, 2, 2);
  planeMaterial.normalMap = normalTex;

  planeMaterial.metallicRoughnessMap = specularToRoughnessTexture(specularImg);
}

const fireImage = await loadImageResourceFromUrl('awayjs/assets/blue.png');
const fireAtlas = createSingleSpriteAtlas(fireImage);

const config: ParticleEmitterConfig = createParticleEmitterConfig({
  maxParticles: 500,
  spawnRate: 120,
  duration: -1,
  loop: true,
  lifetimeMin: 0.1,
  lifetimeMax: 4.1,
  emitterShape: 'cone3d',
  emitterConeAngle: 0.37,
  emitterRadius: 0,
  directionX: 0,
  directionY: 1,
  directionZ: 0,
  speedMin: 70,
  speedMax: 90,
  scaleMin: 20,
  scaleMax: 25,
  scaleEnd: 0.2,
  colorStartR: 1,
  colorStartG: 0.2,
  colorStartB: 0.004,
  colorEndR: 0.6,
  colorEndG: 0,
  colorEndB: 0,
  alphaStart: 1,
  alphaEnd: 1,
  blendMode: 'add',
});

interface FireEntry {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  active: boolean;
  strength: number;
  decalMaterial: UnlitMaterial;
}

const fires: FireEntry[] = [];

for (let i = 0; i < NUM_FIRES; i++) {
  const emitter = createParticleEmitter3D();
  emitter.blendMode = 'add';
  emitter.data.atlas = fireAtlas;
  const state = createParticleEmitterState();

  const angle = (i / NUM_FIRES) * Math.PI * 2;
  const x = Math.sin(angle) * FIRE_RADIUS;
  const z = -Math.cos(angle) * FIRE_RADIUS;
  const y = 5;

  setVector3(emitter.position, x, y, z);
  invalidateNodeLocalTransform(emitter);

  const decalMaterial = createUnlitMaterial({ baseColor: 0xffffff00, baseColorMap: glowTexture });
  decalMaterial.alphaMode = 'blend';
  decalMaterial.doubleSided = true;
  const decal = createMesh(decalGeometry, [decalMaterial]);
  setVector3(decal.position, x, DECAL_Y_BASE + i * DECAL_Y_STEP, z);
  invalidateNodeLocalTransform(decal);

  addNodeChild(scene.root, emitter);
  addNodeChild(scene.root, decal);
  fires.push({ emitter, state, active: false, strength: 0, decalMaterial });
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

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = orbit.panAngle;
let savedTilt = orbit.tiltAngle;

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

loadPlaneTextures();

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  for (const fire of fires) {
    if (!fire.active) continue;

    stepParticleEmitter3D(fire.emitter, fire.state, config, dt);

    if (fire.strength < 1) fire.strength += 0.1;
    const opacity = Math.min(1, fire.strength) * DECAL_MAX_OPACITY * (0.85 + Math.random() * 0.3);
    const alpha = Math.max(0, Math.min(255, Math.round(opacity * 255)));
    fire.decalMaterial.baseColor = (0xffffff00 | alpha) >>> 0;
  }

  orbit.update();

  ctx.render(scene.root, camera, lights);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pr;
  ctx.canvas.height = h * pr;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
