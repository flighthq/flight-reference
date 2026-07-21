import type { EmissiveMaterial, Mesh, MeshGeometry, Scene, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createEmissiveMaterial,
  createMesh,
  createSphereMeshGeometry,
  registerEmissiveGlMaterial,
  setVector3,
} from '@flighthq/sdk';

// Hot engine-exit glow: a small emissive sphere at each nozzle, riding the airframe (a child of the jet
// mesh, so it banks and flies with it — no per-frame update). This is the close-range "engine" read — the
// glowing tailpipe you actually see up close — as opposed to the contrail, which condenses in the wake
// much further aft (vaporRibbon.ts / vaporTrail.ts). emissiveStrength > 1 pushes linear radiance the demo's
// HDR tone-map pass renders as a bright hot core (there is no bloom pass here, so the read is a saturated
// core rather than a soft halo — add a BloomEffect later for the halo).
const GLOW_RADIUS = 12;

export interface EngineGlow {
  // Place a glow at a model-space nozzle offset on `mesh` — the same offsets the trail emitters use.
  attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void;
}

export function createEngineGlow(_scene: Scene): EngineGlow {
  // One shared dull orange-red material and one shared sphere across both nozzles: static, so a single GPU
  // upload is drawn once per engine at its own transform. Tune `emissive`/`emissiveStrength` for hotter
  // (whiter, stronger) or cooler (deeper red, weaker) exhaust.
  const material: EmissiveMaterial = createEmissiveMaterial({ emissive: 0xff4a1eff, emissiveStrength: 3 });
  const geometry: MeshGeometry = createSphereMeshGeometry(GLOW_RADIUS, 14, 8);

  function attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void {
    const glow: Mesh = createMesh(geometry, [material]);
    setVector3(glow.position, x, y, z);
    addNodeChild(mesh, glow);
  }

  return { attachToNozzle };
}
