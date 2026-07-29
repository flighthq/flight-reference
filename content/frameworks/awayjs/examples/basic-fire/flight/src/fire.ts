import type {
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  Scene3D,
  Texture,
  UnlitMaterial,
} from '@flighthq/sdk';
import {
  addNodeChild,
  createImageResource,
  createMesh,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createPlaneMeshGeometry,
  createTexture,
  createUnlitMaterial,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setVector3,
} from '@flighthq/sdk';

import { createSingleSpriteAtlas } from '../../../_shared/flight/src/particles';

const NUM_FIRES = 10;
const FIRE_RADIUS = 400;

// AwayJS floods the floor red by giving each of its 10 fires a point light. Flight's forward renderer
// caps point lights at MAX_FORWARD_LIGHTS (4) and drops the rest, so only 4 fires could ever glow.
// Instead we fake the pool under EVERY fire with an additive-looking floor decal: a soft radial glow
// quad laid flat on the floor. (Mesh materials only alpha-composite in the present path — the additive
// blend the emitters use isn't honored for meshes — so this warms the floor rather than truly adding,
// which reads the same over the bright checker.) DECAL_SIZE is the quad's world size (pool diameter);
// DECAL_MAX_OPACITY is the center alpha at full fire strength.
const DECAL_SIZE = 560;
export const DECAL_MAX_OPACITY = 0.75;
// The floor sits at y=-20 and adjacent pools overlap heavily (fires are ~247 apart, pools ~560 wide),
// so a single shared decal height would z-fight both the floor and the neighbouring decals. Each decal
// gets its own height just above the floor via the per-index step, keeping every quad on a distinct
// depth so overlaps resolve cleanly without shimmer.
const DECAL_Y_BASE = -19.0;
const DECAL_Y_STEP = 0.2;

export interface FireEntry {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  active: boolean;
  strength: number;
  decalMaterial: UnlitMaterial;
}

export interface FireEmittersResult {
  fires: FireEntry[];
  config: ParticleEmitterConfig;
}

// A soft radial glow sprite: white-hot center easing through orange to a transparent red rim, with a
// squared alpha falloff so the pool edge fades smoothly into the floor. Baked once and shared by every
// decal; per-fire brightness is driven by the decal material's baseColor alpha at draw time.
export function createGlowTexture(): Texture {
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
  return createTexture({ storage: { dimension: '2d', image: createImageResource(canvas) } });
}

export async function createFireEmitters(scene: Readonly<Scene3D>): Promise<FireEmittersResult> {
  const fireImage = await loadImageResourceFromUrl('awayjs/blue.png');
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

  const glowTexture = createGlowTexture();
  const decalGeometry = createPlaneMeshGeometry(DECAL_SIZE, DECAL_SIZE, 1, 1);

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

  return { fires, config };
}

export function startFiresSequentially(fires: readonly FireEntry[], interval: number): void {
  let started = 0;
  const timer = setInterval(() => {
    if (started >= fires.length) {
      clearInterval(timer);
      return;
    }
    fires[started]!.active = true;
    started++;
  }, interval);
}
