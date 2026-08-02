import type { ParticleEmitter3D, ParticleEmitterConfig, ParticleEmitterState, Scene3D } from '@flighthq/sdk';
import {
  addNodeChild,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setVector3,
} from '@flighthq/sdk';

import { createSingleSpriteAtlas } from '../../../_shared/flight/src/particles';

const NUM_FIRES = 10;
const FIRE_RADIUS = 400;

export interface FireEntry {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  active: boolean;
  strength: number;
}

export interface FireEmittersResult {
  fires: FireEntry[];
  config: ParticleEmitterConfig;
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

    addNodeChild(scene.root, emitter);
    fires.push({ emitter, state, active: false, strength: 0 });
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
