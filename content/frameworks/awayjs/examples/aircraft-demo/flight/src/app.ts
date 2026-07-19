import type {
  BlinnPhongMaterial,
  Camera,
  CubeTexture,
  GlRenderTarget,
  Matrix4,
  Mesh,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  SceneLights,
  StandardPbrMaterial,
  Vector3,
} from '@flighthq/sdk';
import {
  addNodeChild,
  addTextureAtlasRegion,
  advanceClock,
  bakeEnvironmentIbl,
  beginGlRenderPass,
  computeMeshGeometryNormals,
  createClock,
  createCubeTexture,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMatrix4,
  createMesh,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createPlaneMeshGeometry,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createStandardPbrMaterial,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  createTexture,
  createTextureAtlas,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlLinearToSrgbPass,
  drawGlScene,
  endGlRenderPass,
  flipSurfaceHorizontal,
  flipSurfaceVertical,
  getNodeChildren,
  getNodeLocalMatrix4,
  loadImageResourceFromUrl,
  parseObjMaterialLibrary,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  resolveGlRenderTarget,
  resizeGlRenderTarget,
  rotateMatrix4,
  scaleMatrix4,
  SceneResourceRefKind,
  setCameraViewMatrix4FromLookAt,
  setNodeEnabled,
  setNodeLocalMatrix4,
  setCubeTextureFace,
  setMatrix4Identity,
  setSceneNodePosition,
  translateMatrix4,
  updateParticleEmitter3D,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
// The original AwayJS demo uses NormalSimpleWaterMethod + EffectEnvMapMethod + SpecularFresnelMethod
// on the sea surface. In Flight we approximate this with:
//   - The aircraft textured per-part from its MTL library: each part gets a metallic StandardPbrMaterial
//     (metallic=0.7, roughness=0.2) carrying its own map_Kd, plus a translucent glass canopy.
//   - A water StandardPbrMaterial (metallic=0.05, roughness=0.25) with a scrolling normal map as
//     an in-sample implementation of the WaterMaterial effect, keeping the behaviour self-contained
//     until a dedicated WaterMaterial type is added to the SDK.
// A click toggles the gear/wing configuration between open (landing) and closed (clean flight).

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
  backgroundColor: 0x2c2c32ff,
  contextAttributes: {
    alpha: false,
    depth: true,
    preserveDrawingBuffer: false,
  },
  pixelRatio,
});
registerStandardPbrGlMaterial(glState);

const verifyFrame = createGlFrameVerifier(glState);

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, near: 0.5, far: 14000 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(-300, -300, -5000),
  color: 0x974523,
  diffuse: 1.2,
  ambient: 1,
  ambientColor: 0x7196ac,
});
const lights: SceneLights = createSceneLights({ ambient, directional });

// Environment cube map — individual face images derived from the CubeTextureTest.cube asset.
// AwayJS is left-handed (+Z into screen); Flight is right-handed (+Z out). The Z-negate between the two
// coordinate systems requires: X faces stay in their slot but are h-flipped, Z faces swap AND h-flip,
// Y faces stay but v-flip. See agents/conventions/camera.md for the coordinate convention.
const cubeFaceUrls = [
  'awayjs/assets/skybox/sky_posX.jpg',
  'awayjs/assets/skybox/sky_negX.jpg',
  'awayjs/assets/skybox/sky_posY.jpg',
  'awayjs/assets/skybox/sky_negY.jpg',
  'awayjs/assets/skybox/sky_negZ.jpg',
  'awayjs/assets/skybox/sky_posZ.jpg',
];
const cubeImages = await Promise.all(cubeFaceUrls.map((url) => loadImageResourceFromUrl(url)));
const cubeTexture: CubeTexture = createCubeTexture();
for (let i = 0; i < 6; i++) {
  const image = cubeImages[i];
  const surface = createSurfaceFromImageResource(image);
  const region = createSurfaceRegion(surface);
  if (i === 2 || i === 3) {
    flipSurfaceVertical(region, region);
  } else {
    flipSurfaceHorizontal(region, region);
  }
  setCubeTextureFace(cubeTexture, i, surface);
}
const environment = createEnvironment({
  environment: cubeTexture,
  intensity: 1,
});
bakeEnvironmentIbl(glState, environment);

// Sea normal map — shared between water surface material and the aircraft's MethodMaterial
// in the original. Here used only for the water, matching the original intent.
const seaNormalImage = await loadImageResourceFromUrl('awayjs/assets/sea_normals.jpg');
const seaNormalTex = createTexture({ image: seaNormalImage });
// Tile the ripples finely so they read as small, distant waves seen from altitude rather than large
// close-up swells (the AwayJS look, which is wrong for a jet's height).
seaNormalTex.uvScale = { x: 300, y: 300 };

// Water surface — a distant sea read via StandardPbrMaterial: low roughness makes it reflect the sky
// environment (a Fresnel sheen strongest toward the horizon), with only a faint, slow normal-map
// shimmer for a hint of ripple. The point is reflection over surface detail, since the water is far off.
const seaMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0x3a6285ff,
  metallic: 0.05,
  roughness: 0.12,
  normalMap: seaNormalTex,
  normalScale: 0.35,
});
seaMaterial.doubleSided = true;

const seaGeometry = createPlaneMeshGeometry(50000, 50000, 1, 1);
const seaMesh: Mesh = createMesh(seaGeometry, [seaMaterial]);
addNodeChild(scene, seaMesh);

// F14 aircraft — OBJ geometry textured per-part from its MTL library. The upstream AwayJS demo lets
// the OBJ loader assign a material per part from f14d.mtl; its `MethodMaterial(seaNormal)` local is
// dead code, never bound to the geometry, so each part actually wears its own map_Kd texture. We
// reproduce that per-part texturing while keeping the metallic-PBR jet: parse the MTL and build the
// scene against it so every `usemtl` subset keeps its own material slot, then swap each slot for a
// StandardPbrMaterial carrying that part's map_Kd as baseColorMap (one shared material per texture).
// Parts with no map_Kd fall back to a plain metallic material.
const f14AssetBase = 'awayjs/assets/f14';
const f14ObjText = await fetch(`${f14AssetBase}/f14d.obj`).then((r) => r.text());
const f14MtlText = await fetch(`${f14AssetBase}/f14d.mtl`).then((r) => r.text());
const f14Library = parseObjMaterialLibrary(f14MtlText);

const f14Scene = createSceneFromObj(f14ObjText, f14Library);
const f14Meshes = getNodeChildren(f14Scene).map((child) => child as Mesh);

const f14PlainMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xccccccff,
  metallic: 0.7,
  roughness: 0.2,
});

// createSceneFromObj emits each MTL map_Kd as an Unresolved external texture ref keyed by bare
// filename (f14fuselage.jpg). Read those filenames back off the parser's BlinnPhong slots, load each
// image once from the f14 asset directory, and build one PBR material per texture.
function f14DiffuseUri(material: BlinnPhongMaterial | null): string | null {
  const ref = material?.diffuseMap?.resource;
  return ref != null && ref.kind === SceneResourceRefKind.External ? ref.uri : null;
}

const f14DiffuseUris = new Set<string>();
for (const mesh of f14Meshes) {
  for (const material of mesh.materials ?? []) {
    const uri = f14DiffuseUri(material as BlinnPhongMaterial | null);
    if (uri !== null) f14DiffuseUris.add(uri);
  }
}

const f14MaterialByUri = new Map<string, StandardPbrMaterial>();
await Promise.all(
  Array.from(f14DiffuseUris, async (uri) => {
    const image = await loadImageResourceFromUrl(`${f14AssetBase}/${uri}`);
    f14MaterialByUri.set(
      uri,
      createStandardPbrMaterial({
        baseColor: 0xffffffff,
        baseColorMap: createTexture({ image }),
        metallic: 0.7,
        roughness: 0.2,
      }),
    );
  }),
);

// Canopy glass — MTL Material__33 (dissolve 0.38) is the only translucent part, which the parser
// surfaces as an alpha-blended BlinnPhong. Replace it with a see-through tinted glass: near-mirror
// smoothness, a faint blue tint, and a low baseColor alpha so the cockpit shows through. Tint,
// opacity (the low byte of baseColor), and roughness are the knobs to dial the look.
const f14CanopyGlass: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0x0c1622aa,
  metallic: 0.1,
  roughness: 0.05,
});
f14CanopyGlass.alphaMode = 'blend';
f14CanopyGlass.doubleSided = true;

// Articulated parts, selected by OBJ group name (createSceneFromObj keeps the group name on the Mesh
// even though it drops the material name). The landing gear is two meshes (Part135 + Part52, textured
// f14landinggear.jpg). The variable-sweep wings are every outboard panel per side. Rather than list
// group names (the wing skin is split across many groups and several materials, so a name list misses
// panels), classify by geometry: a mesh whose position-bounds midpoint sits in the outboard wing
// envelope is a wing, assigned left/right by the sign of its X midpoint. This is the same envelope
// used to survey the OBJ, and it cleanly separates the wings from the fuselage, gloves, and tailerons.
function meshCenter(mesh: Mesh): Vector3 | null {
  const geometry = mesh.geometry;
  if (!geometry) return null;
  const v = geometry.vertices;
  const stride = geometry.layout.stride / 4; // floats per vertex; position is the first three
  if (stride === 0 || v.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i + 2 < v.length; i += stride) {
    const x = v[i];
    const y = v[i + 1];
    const z = v[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return createVector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
}

const f14GearMeshes: Mesh[] = [];
const f14LeftWing: Mesh[] = [];
const f14RightWing: Mesh[] = [];

for (const mesh of f14Meshes) {
  if (mesh.geometry) computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
  const materials = mesh.materials;
  if (!materials) continue;
  let isGear = false;
  for (let i = 0; i < materials.length; i++) {
    const source = materials[i] as BlinnPhongMaterial | null;
    if (source?.alphaMode === 'blend') {
      materials[i] = f14CanopyGlass;
      continue;
    }
    const uri = f14DiffuseUri(source);
    if (uri === 'f14landinggear.jpg') isGear = true;
    materials[i] = (uri !== null ? f14MaterialByUri.get(uri) : undefined) ?? f14PlainMaterial;
  }
  const center = meshCenter(mesh);
  // Landing gear: the gear-textured struts, plus the full main-gear clusters (hanging low, outboard of
  // centerline, forward of the tail) and the two nose-gear struts by name. The nose gear is otherwise
  // interlocked with the lower-nose fuselage, so an envelope alone can't separate it cleanly.
  const inMainGear = center !== null && Math.abs(center.x) > 1.5 && center.y > -3.3 && center.y < -2 && center.z < -0.3;
  if (isGear || inMainGear || mesh.name === 'Part48' || mesh.name === 'Part120') {
    f14GearMeshes.push(mesh);
    continue;
  }
  const inWingBand = center !== null && center.y > -5.5 && center.y < -1 && center.z > 0.2 && center.z < 0.9;
  if (inWingBand && center.x > 2) f14RightWing.push(mesh);
  else if (inWingBand && center.x < -2) f14LeftWing.push(mesh);
}

const f14Container = createScene();
setSceneNodePosition(f14Container, 0, 200, 0);

for (const child of getNodeChildren(f14Scene)) {
  addNodeChild(f14Container, child);
}
addNodeChild(scene, f14Container);
const f14Mesh = f14Container;

// --- Engine exhaust vapor. The SDK's particle texture bind is fixed upstream, so sprites render now.
// drawGlScene draws emitter nodes on its own; each emitter is a scene child stepped in stepSimulation,
// and its world position is refreshed each frame in renderScene so the two trails ride the nozzles.
// The bundled white.png is a hard-edged square, so generate a soft round sprite at runtime: a radial
// gradient, opaque white core fading to transparent, as a data URL. Gives true-white soft puffs.
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

// White 'normal'-blend vapor. worldSpace: true bakes each puff into world coordinates at spawn (needs
// the upstream updateParticleEmitter3D world-space support), so puffs hang in the air while the jet
// flies away from them — a genuine contrail rather than a fake. They barely drift (near-zero speed),
// live long, and expand a lot as they age, like ice crystals spreading. Tunable here.
const vaporImage = await loadImageResourceFromUrl(createSoftVaporSpriteUrl());
const vaporAtlas = createTextureAtlas({ image: vaporImage });
addTextureAtlasRegion(vaporAtlas, 0, 0, vaporImage.width, vaporImage.height);

// Alpha look-up table over 0→1 lifetime (uniform samples, linearly interpolated): fades in fast just
// aft of the nozzle, plateaus, then slowly diffuses out. The faint start also keeps the youngest puffs
// from hazing the jet when the camera looks down the trail. No scale curve — young puffs need to be big
// enough to overlap into a line (a thin start reads as discrete dots at the spawn spacing).
const CONTRAIL_ALPHA_CURVE = [0, 0.3, 0.3, 0.25, 0.19, 0.11, 0.05, 0];

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
  // updateParticleEmitter3D so puffs are baked into world space there (no scale/rotation, so their
  // sizes and drift stay in world units regardless of the jet's 20x scale).
  worldMatrix: Matrix4;
  locate: (out: Vector3) => void;
}
const vaporEmitters: VaporEmitter[] = [];
const vaporScratch = createVector3(0, 0, 0);

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

function addVaporEmitter(config: ParticleEmitterConfig, locate: (out: Vector3) => void): void {
  const emitter = createParticleEmitter3D();
  emitter.data.atlas = vaporAtlas;
  const state = createParticleEmitterState();
  addNodeChild(scene, emitter);
  vaporEmitters.push({ emitter, state, config, worldMatrix: createMatrix4(), locate });
}

// Engine nozzles: offset out to each engine and back a bit forward of the nozzle exit (deeper in the
// model, so the trail emerges from within the fuselage), transformed each step by the jet's world
// matrix so the emit origin tracks the flying jet's roll.
addVaporEmitter(exhaustConfig, (out) => transformModelPoint(out, getNodeLocalMatrix4(f14Mesh), 1.35, -8, -0.1));
addVaporEmitter(exhaustConfig, (out) => transformModelPoint(out, getNodeLocalMatrix4(f14Mesh), -1.35, -8, -0.1));

// Camera orbits the aircraft continuously
const eye = createVector3(0, 250, 500);
const cameraTarget = createVector3(0, 200, 0);
const up = createVector3(0, 1, 0);

let cameraIncrement = 0;
let rollIncrement = 0;
let cameraBobPhase = 0;
// A click fires a one-shot elevation "pulse": the camera swings well beyond its usual bob to give the
// wing sweep and gear change a fresh vantage, then eases back. pulsePhase runs 0→π per pulse (π = idle).
// pulseDirection is captured at the click from the bob's current vertical velocity, so the pulse
// continues the way the camera is already moving — up when rising, below the jet when descending.
let pulsePhase = Math.PI;
let pulseDirection = 1;

// Open (landing) vs closed (clean/flight) configuration. Open = gear down + wings forward; closed =
// gear up + wings swept. A click toggles the target; configProgress ramps toward it and flightConfig
// smoothsteps it for feel, so a full open↔closed takes CONFIG_RATE's 6.4s. Starts already closed (clean:
// gear up, wings swept) — a jet cruises clean, not in the landing configuration; a click opens it.
let configClosed = true;
let configProgress = 1;
let flightConfig = 1;

// Gear opacity in [0..1]. The gear is faded, not hard-cut. It transitions only near the open (landing)
// end of the sweep (see stepSimulation) — retracting at the start of closing and dropping at the end of
// opening. Starts hidden, matching the clean initial configuration.
let gearFade = 0;

// The jet flies forward (nose is -Z in world) so a real world-space contrail is left behind. The jet,
// the following camera, and the sea all translate by flightZ together, so the framing stays put — only
// the contrail (particles left at past world positions) reveals the motion.
let flightZ = 0;
const FLIGHT_SPEED = 220; // world units/s the jet advances (-Z); trail length ≈ FLIGHT_SPEED * lifetime

// Motion rates in units per second. The sim advances at a locked fixed timestep (see the frame loop),
// so these stay wall-clock stable regardless of display refresh.
const CAMERA_RATE = 0.18; // orbit rad/s
const CAMERA_BOB_RATE = 0.32; // vertical drift rad/s — the camera rises/dips so the plane need not bob
const CAMERA_BOB_AMPLITUDE = 90; // vertical camera travel in world units
const CAMERA_PULSE_AMPLITUDE = 170; // extra elevation on a click, beyond the normal bob — a fresh angle
const PULSE_RATE = Math.PI / 5; // one 0→peak→0 elevation pulse over ~5s (roughly the reconfig duration)
const ROLL_RATE = 0.09; // roll-phase rad/s
const ROLL_AMPLITUDE = 6 * DEG_TO_RAD; // a subtle bank now that the camera carries the vertical motion
const WATER_RATE = 0.5; // sea normal-map scroll units/s — a slow, distant shimmer
const CONFIG_RATE = 1 / 6.4; // full open↔closed in 6.4s
const GEAR_FADE_RATE = 1 / 1.2; // gear fade over 1.2s

// Loop-maneuver state (kept for the disabled maneuver below).
// let loopIncrement = 0;
// let flightState = 0;
// let f14Y = 200;
// let f14Z = 0;
// let loopPitch = 0;

const zAxis = createVector3(0, 0, 1);
const xAxis = createVector3(1, 0, 0);

// AwayJS applies scaleTo(20,20,20) and a resting rotationX=90 to the f14 (awayjs/src/app.ts:126-127).
// Y-up right-handed Flight negates the AwayJS left-handed X rotation, so the resting pitch is -90.
const F14_SCALE = 20;
const F14_RESTING_PITCH = -90 * DEG_TO_RAD;

// Variable-sweep wings. In model space X is span, Y is length (+Y is the nose), Z the vertical hinge
// axis, so each wing sweeps about Z at its glove pivot. The left (-X) wing takes +WING_SWEEP to send
// its tip aft; the right wing mirrors with the negative angle. Pivots are the wing roots from the OBJ
// bounds; sweep angle/sign/pivot are the knobs if the sweep reads wrong once rendered.
const WING_SWEEP = 52 * DEG_TO_RAD;
const LEFT_WING_PIVOT = createVector3(-2.3, -2, 0);
const RIGHT_WING_PIVOT = createVector3(2.3, -2, 0);

const wingMatrix = createMatrix4();

function sweepWing(meshes: readonly Mesh[], pivot: Vector3, angle: number): void {
  for (const mesh of meshes) {
    setMatrix4Identity(wingMatrix);
    translateMatrix4(wingMatrix, wingMatrix, pivot.x, pivot.y, pivot.z);
    rotateMatrix4(wingMatrix, wingMatrix, zAxis, angle);
    translateMatrix4(wingMatrix, wingMatrix, -pivot.x, -pivot.y, -pivot.z);
    setNodeLocalMatrix4(mesh, wingMatrix);
  }
}

let renderTarget: GlRenderTarget | null = null;

function updateCameraLookAt(): void {
  const lm = getNodeLocalMatrix4(f14Mesh);
  cameraTarget.x = lm.m[12];
  cameraTarget.y = lm.m[13];
  cameraTarget.z = lm.m[14];
  setCameraViewMatrix4FromLookAt(camera, eye, cameraTarget, up);
}

// Builds the jet's world transform from the current flight/roll state. Called in stepSimulation before
// the emitters spawn (so the exhaust origins track the flying jet); renderScene then just reads it.
// The disabled maneuver loop that once lived here is gone — the jet now flies straight forward via
// flightZ instead of cycling a vertical loop.
const jetMatrix = createMatrix4();

function updateJetTransform(): void {
  setMatrix4Identity(jetMatrix);
  translateMatrix4(jetMatrix, jetMatrix, 0, 200, flightZ);
  rotateMatrix4(jetMatrix, jetMatrix, zAxis, Math.sin(rollIncrement) * ROLL_AMPLITUDE);
  rotateMatrix4(jetMatrix, jetMatrix, xAxis, F14_RESTING_PITCH);
  scaleMatrix4(jetMatrix, jetMatrix, F14_SCALE, F14_SCALE, F14_SCALE);
  setNodeLocalMatrix4(f14Mesh, jetMatrix);
}

// A click toggles between the open (landing) and closed (clean/flight) configurations.
canvas.addEventListener('mousedown', () => {
  configClosed = !configClosed;
  pulsePhase = 0;
  // Kick the camera the way its vertical bob is already heading: cos is the bob's velocity, so rising
  // (cos >= 0) pulses up, descending pulses down (below the jet).
  pulseDirection = Math.cos(cameraBobPhase) >= 0 ? 1 : -1;
});

// Advances all animation state by one fixed timestep of `dt` seconds.
function stepSimulation(dt: number): void {
  rollIncrement += ROLL_RATE * dt;
  cameraIncrement += CAMERA_RATE * dt;
  cameraBobPhase += CAMERA_BOB_RATE * dt;
  pulsePhase = Math.min(Math.PI, pulsePhase + PULSE_RATE * dt);

  // Ramp linearly toward the current configuration, then smoothstep for an eased feel (the linear ramp
  // fixes the duration; the smoothstep only shapes it). Wings sweep continuously with flightConfig.
  const configTarget = configClosed ? 1 : 0;
  const configStep = CONFIG_RATE * dt;
  if (configProgress < configTarget) configProgress = Math.min(configTarget, configProgress + configStep);
  else if (configProgress > configTarget) configProgress = Math.max(configTarget, configProgress - configStep);
  flightConfig = configProgress * configProgress * (3 - 2 * configProgress);

  // Gear fade, gated to the near-open (landing) end of the sweep: it transitions only while
  // flightConfig < 0.2, so the gear retracts at the START of closing (before the wings sweep back) and
  // extends at the END of opening (once the wings are forward) — how a jet cleans up after takeoff and
  // reconfigures for landing.
  const gearTarget = configClosed ? 0 : 1;
  if (flightConfig < 0.2) {
    const fadeStep = GEAR_FADE_RATE * dt;
    if (gearFade < gearTarget) gearFade = Math.min(gearTarget, gearFade + fadeStep);
    else if (gearFade > gearTarget) gearFade = Math.max(gearTarget, gearFade - fadeStep);
  }

  // Scroll the water normal map to simulate surface flow.
  seaNormalTex.uvOffset.y -= WATER_RATE * dt;

  // Fly the jet forward, rebuild its transform, then spawn/advance the world-space contrail from each
  // nozzle. The nozzle world matrix (pure translation) is handed to updateParticleEmitter3D, which bakes
  // new puffs into world space there so they hang in place as the jet flies on.
  flightZ -= FLIGHT_SPEED * dt;
  updateJetTransform();
  for (const vapor of vaporEmitters) {
    vapor.locate(vaporScratch);
    setMatrix4Identity(vapor.worldMatrix);
    translateMatrix4(vapor.worldMatrix, vapor.worldMatrix, vaporScratch.x, vaporScratch.y, vaporScratch.z);
    updateParticleEmitter3D(vapor.emitter, vapor.state, vapor.config, dt, vapor.worldMatrix);
  }
}

// Applies the current animation state to the scene and draws one frame. The jet transform is built in
// stepSimulation (updateJetTransform); here we set the wings, gear, sea, and camera, then draw.
function renderScene(): void {
  sweepWing(f14LeftWing, LEFT_WING_PIVOT, WING_SWEEP * flightConfig);
  sweepWing(f14RightWing, RIGHT_WING_PIVOT, -WING_SWEEP * flightConfig);

  // Gear fade: an alpha below 1 routes a mesh through the blended pass (u_objectAlpha scales its output
  // alpha), so the opaque gear genuinely fades. Skip drawing entirely once fully faded out.
  const gearVisible = gearFade > 0.004;
  for (const gear of f14GearMeshes) {
    gear.alpha = gearFade;
    if (gear.enabled !== gearVisible) setNodeEnabled(gear, gearVisible);
  }

  // The sea follows the jet's flight (translate by flightZ) so it stays underneath — jet, camera, and
  // sea move together, leaving only the world-space contrail to reveal the motion.
  setSceneNodePosition(seaMesh, 0, 0, flightZ);

  // Orbit with a slow vertical drift + click pulse; add flightZ so the whole orbit follows the flying
  // jet (keeps eye.z - target.z constant, so the framing stays put). Clamp the height so a downward bob
  // or pulse can't dip the camera through the sea (y = 0).
  const cameraY = Math.max(
    40,
    250 +
      Math.sin(cameraBobPhase) * CAMERA_BOB_AMPLITUDE +
      Math.sin(pulsePhase) * CAMERA_PULSE_AMPLITUDE * pulseDirection,
  );
  setAwayPosition(eye, Math.cos(cameraIncrement) * 400, cameraY, Math.sin(cameraIncrement) * 400);
  eye.z += flightZ;
  updateCameraLookAt();

  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(glState, {
      width: w,
      height: h,
      format: 'rgba16f',
      depth: 'depth-stencil',
    });
  } else {
    resizeGlRenderTarget(glState, renderTarget, w, h);
  }

  // The pass clears depth (to renderTarget.clearDepth = 1); renderGlBackground clears color, so
  // color is preserved on begin. No display-object 2D transform is involved in this 3D pass.
  beginGlRenderPass(glState, renderTarget, { preserveColor: true });
  renderGlBackground(glState);
  drawGlEnvironmentSkybox(glState, environment, camera, width / height);
  drawGlScene(glState, scene, camera, lights);
  endGlRenderPass(glState);
  resolveGlRenderTarget(glState, renderTarget);
  drawGlLinearToSrgbPass(glState, renderTarget, null);

  verifyFrame();
}

// Fixed-timestep loop. A clock is advanced by the real frame delta, then the simulation is stepped in
// locked FIXED_STEP increments (catching up when the display ran slow) and rendered once. This locks
// animation speed to wall-clock time, so the 6.4s config and the per-second rates hold at any refresh.
const clock = createClock();
const FIXED_STEP = 1 / 60;
let simAccumulator = 0;
let lastTime = 0;

function frame(now: number): void {
  const realDt = lastTime === 0 ? FIXED_STEP : Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  advanceClock(clock, realDt);
  simAccumulator += clock.deltaTime;
  while (simAccumulator >= FIXED_STEP) {
    stepSimulation(FIXED_STEP);
    simAccumulator -= FIXED_STEP;
  }
  renderScene();
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
