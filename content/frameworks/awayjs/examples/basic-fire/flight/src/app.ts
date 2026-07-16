import type { ParticleEmitter } from '@flighthq/sdk';
import type { ParticleEmitterConfig } from '@flighthq/sdk';
import type { ParticleEmitterState } from '@flighthq/sdk';
import {
  addNodeChild,
  addTextureAtlasRegion,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  createDisplayContainer,
  createParticleEmitter,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createShape,
  createTextureAtlas,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  ParticleEmitterKind,
  prewarmParticleEmitter,
  ShapeKind,
  stepParticleEmitter,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const width = window.innerWidth;
const height = window.innerHeight;

const target = await createFunctionalTarget({
  width,
  height,
  background: 0x000000ff,
  kinds: [ShapeKind, ParticleEmitterKind],
  blend: true,
});

const fireImage = await loadImageResourceFromUrl('awayjs/assets/blue.png');
const fireAtlas = createTextureAtlas({ image: fireImage });
addTextureAtlasRegion(fireAtlas, 0, 0, fireImage.width, fireImage.height);

const root = createDisplayContainer();

const floor = createShape();
appendShapeBeginFill(floor, 0x333333, 1);
appendShapeRectangle(floor, 0, height - 40, width, 40);
appendShapeEndFill(floor);
addNodeChild(root, floor);

const NUM_FIRES = 10;

interface FireEntry {
  emitter: ParticleEmitter;
  state: ParticleEmitterState;
  config: ParticleEmitterConfig;
}

const fires: FireEntry[] = [];
const spacing = width / (NUM_FIRES + 1);

for (let i = 0; i < NUM_FIRES; i++) {
  const config = createParticleEmitterConfig({
    maxParticles: 500,
    spawnRate: 120,
    duration: -1,
    loop: true,
    lifetimeMin: 0.1,
    lifetimeMax: 4.1,
    emitterShape: 'circle',
    emitterRadius: 8,
    directionX: 0,
    directionY: -1,
    spread: 0.4,
    speedMin: 50,
    speedMax: 100,
    scaleMin: 0.16,
    scaleMax: 0.2,
    scaleEnd: 0.04,
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

  const emitter = createParticleEmitter();
  emitter.data.atlas = fireAtlas;
  const state = createParticleEmitterState();

  emitter.x = spacing * (i + 1);
  emitter.y = height - 40;
  invalidateNodeLocalTransform(emitter);
  invalidateNodeAppearance(emitter);

  prewarmParticleEmitter(emitter, state, config, 5, 1 / 60);

  addNodeChild(root, emitter);
  fires.push({ emitter, state, config });
}

let lastTime = performance.now();

function frame(): void {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  for (const fire of fires) {
    stepParticleEmitter(fire.emitter, fire.state, fire.config, dt);
  }

  target.render(root);
  requestAnimationFrame(frame);
}

frame();
