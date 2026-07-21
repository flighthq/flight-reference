import type { GlRenderEffectPipeline, Matrix4, Mesh, PerspectiveProjection, SceneLights, Vector3 } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceClock,
  beginGlRenderEffectPipeline,
  copyVector3,
  createBloomEffect,
  createClock,
  createGlRenderEffectPipeline,
  createMatrix4,
  createScene,
  createSceneLights,
  createSceneNode,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlScene,
  endGlRenderEffectPipeline,
  getQuaternionEuler,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  renderGlBackground,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  setNodeEnabled,
  setNodeLocalMatrix4,
  setQuaternionFromEuler,
  setVector3,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createAircraft } from './aircraft';
import { canvas, glState, height, verifyFrame, width } from './bootstrap';
import { createEngineGlow } from './engineGlow';
import { createSea } from './sea';
import { createSkyEnvironment } from './skyEnvironment';
import { createVaporRibbon } from './vaporRibbon';
import { createVaporTrail } from './vaporTrail';

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

// AwayJS applies scaleTo(20,20,20) and a resting rotationX=90 to the f14 (awayjs/src/app.ts:126-127).
// Y-up right-handed Flight negates the AwayJS left-handed X rotation, so the resting pitch is -90.
const F14_SCALE = 20;
const F14_RESTING_PITCH = -90 * DEG_TO_RAD;
const FLIGHT_SPEED = 220; // world units/s the jet advances (-Z); trail length ≈ FLIGHT_SPEED * lifetime

// Variable-sweep wings. In model space X is span, Y is length (+Y is the nose), Z the vertical hinge
// axis, so each wing sweeps about Z at its glove pivot. The left (-X) wing takes +WING_SWEEP to send
// its tip aft; the right wing mirrors with the negative angle. Pivots are the wing roots from the OBJ
// bounds; sweep angle/sign/pivot are the knobs if the sweep reads wrong once rendered.
const WING_SWEEP = 52 * DEG_TO_RAD;
const LEFT_WING_PIVOT = createVector3(-2.3, -2, 0);
const RIGHT_WING_PIVOT = createVector3(2.3, -2, 0);

// A click toggles the gear/wing configuration between open (landing) and closed (clean flight).

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

const environment = await createSkyEnvironment(glState);

const sea = await createSea();
addNodeChild(scene.root, sea.mesh);

const aircraft = await createAircraft();
setVector3(aircraft.container.scale, F14_SCALE, F14_SCALE, F14_SCALE);

const f14Mesh = createSceneNode();
addNodeChild(f14Mesh, aircraft.container);
f14Mesh.position.y = 200;

addNodeChild(scene.root, f14Mesh);

// Contrail implementation: the particle trail (vaporTrail.ts — many camera-facing billboards) or the
// ribbon-mesh trail (vaporRibbon.ts — one continuous strip per nozzle). Flip USE_RIBBON to compare.
const USE_RIBBON = true;
const vaporTrail = USE_RIBBON ? null : await createVaporTrail(scene);
const vaporRibbon = USE_RIBBON ? await createVaporRibbon(scene) : null;
// A hot glowing exit at each nozzle — the close-range engine read. The contrail is offset aft (see
// CONTRAIL_START_GAP) so it condenses in the wake, leaving a nozzle-to-trail gap the glow sits at the head
// of. Heat-haze distortion would fill that gap next.
const engineGlow = createEngineGlow(scene);
// Engine nozzles: one per engine, offset out to each side and back into the fuselage.
const nozzleOffsets: ReadonlyArray<readonly [number, number, number]> = [
  [1.35 * F14_SCALE, -8 * F14_SCALE, -0.2 * F14_SCALE],
  [-1.35 * F14_SCALE, -8 * F14_SCALE, -0.2 * F14_SCALE],
];
for (const [nx, ny, nz] of nozzleOffsets) {
  // vaporTrail?.attachToNozzle(f14Mesh, nx, ny, nz);
  // vaporRibbon?.attachToNozzle(f14Mesh, nx, ny, nz);
  // The engine glow now comes from the real nozzle-interior geometry (aircraft.ts, Part187/188 given a hot
  // emissive), not this fake emissive sphere. Re-enable to compare the two approaches.
  // engineGlow.attachToNozzle(f14Mesh, nx, ny, nz);
}

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

const zAxis = createVector3(0, 0, 1);
const xAxis = createVector3(1, 0, 0);
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

// Post-process pipeline: the scene renders into an HDR (rgba16f) target so bloom can pick up the hot
// emissive nozzles (emissiveStrength 3, well above the bright-pass threshold) and bright highlights, then
// the pipeline presents with a single linear→sRGB encode.
const effectPipeline: GlRenderEffectPipeline = createGlRenderEffectPipeline(glState, {
  format: 'rgba16f',
  depth: 'depth-stencil',
  // 4× MSAA on the scene target (multisample renderbuffer, resolved before bloom runs) — smooths the jet
  // silhouette and the thin ribbon/wing edges that alias badly against the sky.
  sampleCount: 4,
});
// Bloom knobs: `threshold` is the linear-light bright-pass cutoff, `intensity` the additive strength,
// `radius`/`passes` the spread and quality of the halo.
const bloom = createBloomEffect({ threshold: 1, intensity: 1.1, radius: 12, passes: 2 });

function updateCameraLookAt(): void {
  copyVector3(cameraTarget, f14Mesh.position);
  setCameraViewMatrix4FromLookAt(camera, eye, cameraTarget, up);
}

// Builds the jet's world transform from the current flight/roll state. Called in stepSimulation before
// the emitters spawn (so the exhaust origins track the flying jet); renderScene then just reads it.
function updateJetTransform(): void {
  f14Mesh.position.z = flightZ;
  // Bank goes in the Euler-Y (model nose/longitudinal) slot, not Z. At the -90° resting pitch the Euler-Z
  // axis is gimbal-locked onto world up, so a Z roll would yaw the nose off the flight path — and off its
  // own world-space contrail — instead of banking. Rolling about +Y (the nose axis) is a true bank that
  // keeps the nose on -Z, so the trail still flows straight out the back.
  setQuaternionFromEuler(f14Mesh.rotation, F14_RESTING_PITCH, Math.sin(rollIncrement) * ROLL_AMPLITUDE, 0);
  invalidateNodeLocalTransform(f14Mesh);
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
  sea.normalTex.uvOffset.y -= WATER_RATE * dt;

  // Fly the jet forward, rebuild its transform, then spawn/advance the world-space contrail from each
  // nozzle (which reads the jet's freshly-built world matrix).
  flightZ -= FLIGHT_SPEED * dt;
  updateJetTransform();
  vaporTrail?.step(dt);
}

// Applies the current animation state to the scene and draws one frame. The jet transform is built in
// stepSimulation (updateJetTransform); here we set the wings, gear, sea, and camera, then draw.
function renderScene(): void {
  sweepWing(aircraft.leftWing, LEFT_WING_PIVOT, WING_SWEEP * flightConfig);
  sweepWing(aircraft.rightWing, RIGHT_WING_PIVOT, -WING_SWEEP * flightConfig);

  // Gear fade: an alpha below 1 routes a mesh through the blended pass (u_objectAlpha scales its output
  // alpha), so the opaque gear genuinely fades. Skip drawing entirely once fully faded out.
  const gearVisible = gearFade > 0.004;
  for (const gear of aircraft.gearMeshes) {
    gear.alpha = gearFade;
    gear.visible = gearVisible;
    invalidateNodeAppearance(gear);
  }

  // The sea follows the jet's flight (translate by flightZ) so it stays underneath — jet, camera, and
  // sea move together, leaving only the world-space contrail to reveal the motion.
  sea.mesh.position.z = flightZ;
  invalidateNodeLocalTransform(sea.mesh);

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

  // Rebuild the ribbon contrail against the finished camera eye (billboarding needs it). Runs here, not in
  // the fixed-step sim, since it depends on the camera and its spine sampling is distance-based.
  vaporRibbon?.update(eye);

  // Render the scene into the pipeline's HDR target, then run bloom and present (the pipeline owns sizing
  // and the single linear→sRGB encode at present). renderGlBackground clears color; depth is cleared
  // explicitly because the pipeline preserves it between frames (mirrors the shared scene3d helper).
  beginGlRenderEffectPipeline(glState, effectPipeline);
  renderGlBackground(glState);
  const gl = glState.gl;
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(glState, environment, camera, width / height);
  drawGlScene(glState, scene.root, camera, lights);
  endGlRenderEffectPipeline(glState, effectPipeline, [bloom]);

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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
