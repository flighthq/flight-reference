import type {
  Adjustment,
  Camera3D,
  GlRenderEffectPipeline,
  GlRenderState,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
} from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createPlaneMeshGeometry,
  createScene3D,
  createScene3DLights,
  createToneMapEffect,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  invalidateNodeLocalTransform,
  registerGlBlinnPhongMaterial,
  registerBuiltInGlModifierSnippets,
  registerGlExtendedPbrMaterial,
  registerGlRenderEffect,
  registerGlShadedMaterial,
  registerGlSpecularPbrExtension,
  registerStandardGlTextureResolvers,
  registerGlStandardPbrMaterial,
  registerGlUnlitMaterial,
  renderGlBackground,
  setVector3,
  stepParticleEmitter3D,
} from '@flighthq/sdk';

import {
  awayDirection,
  bindOrbitDrag,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
import { createFireEmitters, startFiresSequentially } from './fire';
import { createFloorMaterial, loadFloorTextures } from './floor';
import { createScene3DContext } from './renderer';

const FIRE_START_INTERVAL = 1000;
const FIRE_LIGHT_REFERENCE_DISTANCE = 200;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, -1, 0),
  color: 0xeedddd,
  diffuse: 0.5,
  ambient: 0.5,
  ambientColor: 0x808090,
  shading: 'phong',
});

const planeMaterial = createFloorMaterial();
const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
plane.position.y = -20;
invalidateNodeLocalTransform(plane);
addNodeChild(scene.root, plane);

loadFloorTextures(planeMaterial);

const { fires, config } = await createFireEmitters(scene);
startFiresSequentially(fires, FIRE_START_INTERVAL);

// The reference's first fire provides the dominant red reflection seen across the foreground tiles.
// Use a real point light so the floor's normal and specular maps shape that reflection instead of
// painting a translucent quad over the texture. Flight attenuates point lights physically, so the
// reference distance preserves AwayJS's full-strength pool out to roughly its 200-unit radius.
const primaryFire = fires[0]!;
const fireLight = createPointLightFromAway({
  color: 0xff3301,
  diffuse: 1,
  range: 400,
  referenceDistance: FIRE_LIGHT_REFERENCE_DISTANCE,
  shading: 'phong',
});
const fireLightIntensity = fireLight.intensity;
fireLight.intensity = 0;
setVector3(
  fireLight.position,
  primaryFire.emitter.position.x,
  primaryFire.emitter.position.y,
  primaryFire.emitter.position.z,
);

const lights = createScene3DLights({ ambient, directional, point: [fireLight] });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
  maxTiltAngle: 90,
});

bindOrbitDrag(ctx.canvas, orbit);

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  for (const fire of fires) {
    if (!fire.active) continue;

    stepParticleEmitter3D(fire.emitter, fire.state, config, dt);

    if (fire.strength < 1) fire.strength += 0.1;
    if (fire === primaryFire) {
      fireLight.range = 380 + Math.random() * 20;
      fireLight.intensity = fireLightIntensity * (Math.min(1, fire.strength) + Math.random() * 0.2);
    }
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
