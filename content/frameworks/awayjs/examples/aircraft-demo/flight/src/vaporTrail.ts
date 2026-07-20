import type {
  Matrix4,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  Scene,
  Vector3,
} from '@flighthq/sdk';
import {
  addNodeChild,
  addTextureAtlasRegion,
  createMatrix4,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createTextureAtlas,
  createVector3,
  getNodeLocalMatrix4,
  loadImageResourceFromUrl,
  setMatrix4Identity,
  translateMatrix4,
  updateParticleEmitter3D,
} from '@flighthq/sdk';

// Engine exhaust vapor. drawGlScene draws emitter nodes on its own; each emitter is a scene child stepped
// in step(); its world position is refreshed each step so the two trails ride the nozzles. The bundled
// white.png is a hard-edged square, so generate a soft round sprite at runtime: a radial gradient, opaque
// white core fading to transparent, as a data URL. Gives true-white soft puffs.
function createSoftVaporSpriteUrl(): string {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx !== null) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return c.toDataURL('image/png');
}

// Alpha look-up table over 0→1 lifetime (uniform samples, linearly interpolated): fades in fast just aft
// of the nozzle, plateaus, then slowly diffuses out. The faint start also keeps the youngest puffs from
// hazing the jet when the camera looks down the trail. No scale curve — young puffs need to be big enough
// to overlap into a line (a thin start reads as discrete dots at the spawn spacing).
const CONTRAIL_ALPHA_CURVE = [0, 0.3, 0.3, 0.25, 0.19, 0.11, 0.05, 0];

// White 'normal'-blend vapor. worldSpace: true bakes each puff into world coordinates at spawn, so puffs
// hang in the air while the jet flies away from them — a genuine contrail rather than a fake. They barely
// drift (near-zero speed), live long, and expand a lot as they age, like ice crystals spreading.
const exhaustConfig: ParticleEmitterConfig = createParticleEmitterConfig({
  worldSpace: true,
  maxParticles: 560,
  spawnRate: 60,
  loop: true,
  duration: -1,
  lifetimeMin: 7,
  lifetimeMax: 9,
  emitterShape: 'point',
  speedMin: 0,
  speedMax: 3,
  gravityY: 2,
  scaleMin: 5,
  scaleMax: 7,
  scaleEnd: 7,
  colorStartR: 1,
  colorStartG: 0.98,
  colorStartB: 0.96,
  colorEndR: 1,
  colorEndG: 0.98,
  colorEndB: 0.96,
  alphaCurve: CONTRAIL_ALPHA_CURVE,
  alphaStart: 0.4,
});

interface VaporEmitter {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  config: ParticleEmitterConfig;
  // A pure-translation world matrix, refreshed each step to the nozzle's world position; passed to
  // updateParticleEmitter3D so puffs are baked into world space there (no scale/rotation, so their sizes
  // and drift stay in world units regardless of the jet's 20x scale).
  worldMatrix: Matrix4;
  locate: (out: Vector3) => void;
}

// Applies a Matrix4 (column-major `.m`) to a model-space point, writing the world point into `out`.
function transformModelPoint(
  out: Vector3,
  matrix: { readonly m: ArrayLike<number> },
  x: number,
  y: number,
  z: number,
): void {
  const e = matrix.m;
  out.x = e[0] * x + e[4] * y + e[8] * z + e[12];
  out.y = e[1] * x + e[5] * y + e[9] * z + e[13];
  out.z = e[2] * x + e[6] * y + e[10] * z + e[14];
}

export interface VaporTrail {
  // Attach an exhaust emitter to a model-space nozzle offset on `mesh`. The offset is transformed by the
  // mesh's world matrix each step so the emit origin tracks the flying jet's roll.
  attachToNozzle(mesh: Scene, x: number, y: number, z: number): void;
  // Advance every attached emitter by one fixed timestep, refreshing each nozzle's world position first.
  step(dt: number): void;
}

export async function createVaporTrail(scene: Scene): Promise<VaporTrail> {
  const vaporImage = await loadImageResourceFromUrl(createSoftVaporSpriteUrl());
  const vaporAtlas = createTextureAtlas({ image: vaporImage });
  addTextureAtlasRegion(vaporAtlas, 0, 0, vaporImage.width, vaporImage.height);

  const emitters: VaporEmitter[] = [];
  const scratch = createVector3(0, 0, 0);

  function attachToNozzle(mesh: Scene, x: number, y: number, z: number): void {
    // Offset out to the engine and back a bit forward of the nozzle exit (deeper in the model, so the
    // trail emerges from within the fuselage).
    const locate = (out: Vector3) => transformModelPoint(out, getNodeLocalMatrix4(mesh.root), x, y, z);
    const emitter = createParticleEmitter3D();
    emitter.data.atlas = vaporAtlas;
    const state = createParticleEmitterState();
    addNodeChild(scene.root, emitter);
    emitters.push({ emitter, state, config: exhaustConfig, worldMatrix: createMatrix4(), locate });
  }

  function step(dt: number): void {
    for (const vapor of emitters) {
      vapor.locate(scratch);
      setMatrix4Identity(vapor.worldMatrix);
      translateMatrix4(vapor.worldMatrix, vapor.worldMatrix, scratch.x, scratch.y, scratch.z);
      updateParticleEmitter3D(vapor.emitter, vapor.state, vapor.config, dt);
    }
  }

  return { attachToNozzle, step };
}
