import type {
  Matrix4,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  Scene,
  SceneNode,
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
  setVector3,
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

// Alpha over the 0→1 lifetime (uniform samples, linearly interpolated), which maps directly to distance
// down the trail: 0 = just aft of the nozzle, 1 = the far tail. A real contrail ramps up within a short
// run behind the engines, then holds a dense white for most of its length and only diffuses away
// gradually at the very end — it does not fade out soon after the jet passes. So: a quick ramp-in (which
// also keeps the youngest puffs from hazing the jet when the camera looks down the trail), a long high
// plateau that sells a high, fast jet's persistent trail, then a gentle taper over the final third. The
// trail runs on few, large, sparsely-overlapping puffs (see exhaustConfig), so per-puff alpha carries the
// opacity directly rather than accumulating from many overlapping layers — hence the higher values here.
// No scale curve — young puffs still need to be big enough to overlap into a line (a thin start reads as
// discrete dots at the spawn spacing).
const CONTRAIL_ALPHA_CURVE = [0, 0.38, 0.48, 0.52, 0.52, 0.52, 0.5, 0.47, 0.43, 0.37, 0.26, 0.14, 0];

// White 'normal'-blend vapor. worldSpace: true bakes each puff into world coordinates at spawn, so puffs
// hang in the air while the jet flies away from them — a genuine contrail rather than a fake. They barely
// drift (near-zero speed), live long, and expand a lot as they age, like ice crystals spreading.
//
// Sparse, large puffs stream into one continuous ribbon far more cheaply than many small ones. The trail
// stays unbroken as long as each puff is at least as wide as the spawn spacing (FLIGHT_SPEED / spawnRate =
// 220 / 20 ≈ 11 world units), so a low spawnRate paired with a spawn scale above that spacing merges into
// a line at ~160 live particles instead of ~500 — a large CPU saving per frame. The billboards are
// camera-facing, so this is round-puff overlap, not a true velocity streak: the renderer can't stretch a
// puff along the world trail axis, so continuity comes from size, not elongation.
const exhaustConfig: ParticleEmitterConfig = createParticleEmitterConfig({
  worldSpace: true,
  maxParticles: 200,
  spawnRate: 20,
  loop: true,
  duration: -1,
  lifetimeMin: 7,
  lifetimeMax: 9,
  emitterShape: 'point',
  speedMin: 0,
  speedMax: 3,
  gravityY: 2,
  scaleMin: 12,
  scaleMax: 15,
  scaleEnd: 3.5,
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
}

export interface VaporTrail {
  // Attach an exhaust emitter to a model-space nozzle offset on `mesh`. The offset is transformed by the
  // mesh's world matrix each step so the emit origin tracks the flying jet's roll.
  attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void;
  // Advance every attached emitter by one fixed timestep, refreshing each nozzle's world position first.
  step(dt: number): void;
}

export async function createVaporTrail(scene: Scene): Promise<VaporTrail> {
  const vaporImage = await loadImageResourceFromUrl(createSoftVaporSpriteUrl());
  const vaporAtlas = createTextureAtlas({ image: vaporImage });
  addTextureAtlasRegion(vaporAtlas, 0, 0, vaporImage.width, vaporImage.height);

  const emitters: VaporEmitter[] = [];

  function attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void {
    // Offset out to the engine and back a bit forward of the nozzle exit (deeper in the model, so the
    // trail emerges from within the fuselage).
    const emitter = createParticleEmitter3D();
    emitter.data.atlas = vaporAtlas;
    const state = createParticleEmitterState();
    setVector3(emitter.position, x, y, z);
    addNodeChild(mesh, emitter);
    emitters.push({ emitter, state, config: exhaustConfig });
  }

  function step(dt: number): void {
    for (const vapor of emitters) {
      updateParticleEmitter3D(vapor.emitter, vapor.state, vapor.config, dt);
    }
  }

  return { attachToNozzle, step };
}
