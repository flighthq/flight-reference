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
  copyQuaternion,
  createBoxMeshGeometry,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createHemisphereLight,
  createMesh,
  createPlaneMeshGeometry,
  createQuaternion,
  createScene3D,
  createScene3DLights,
  createSphereMeshGeometry,
  createTilingSampler,
  createToneMapEffect,
  createTorusMeshGeometry,
  createVector3,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  invalidateNodeLocalTransform,
  registerBlinnPhongGlMaterial,
  registerBuiltInGlModifierSnippets,
  registerExtendedPbrGlMaterial,
  registerGlRenderEffect,
  registerShadedGlMaterial,
  registerSpecularPbrGlExtension,
  registerStandardGlTextureResolvers,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
  scaleMeshGeometryUvs,
  setDirectionalLightDirection,
  setQuaternionFromAxisAngle,
  setVector3,
} from '@flighthq/sdk';

import {
  awayDirection,
  awayPosition,
  bindOrbitDrag,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { awayIntensity, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createSceneMaterials, loadSceneTextures } from './materials';
import { createScene3DContext } from './renderer';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
  effects: [createToneMapEffect({ exposure: 0.7 }), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60 });

// Repeating textures are viewed at grazing angles (the ground plane, the ring's tube), so retain
// high anisotropy on Flight's mipmapped tiling sampler to keep the detail smooth.
const tilingSampler = createTilingSampler();
tilingSampler.anisotropy = 16;

// AwayJS lights the scene with two directionals: a white primary (diffuse 0.7, ambient 0.1) whose
// direction sweeps the horizon each frame, and a static cyan secondary (0x00ffff, diffuse 0.7,
// ambient 0.1) pointing straight down. Flight's Scene3DLights carries one directional, so the animated
// white primary stays the directional — it's the moving light, grazing the surfaces so the shading
// and the specular highlights on the metal sweep as it turns (this is what keeps the scene lively).
// The downward cyan secondary becomes a hemisphere light: cyan from above tints the up-facing floor
// and the tops of the objects, standing in for the straight-down cyan directional.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, -1, 0),
  diffuse: 0.7,
  ambient: 0.1,
});
const cyanFill = createHemisphereLight({
  skyColor: 0x00ffffff,
  groundColor: 0x000000ff,
  intensity: awayIntensity(0.7),
});
const lights = createScene3DLights({ ambient, directional, hemisphere: [cyanFill] });

const { planeMaterial, sphereMaterial, cubeMaterial, torusMaterial } = createSceneMaterials();

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
plane.position.y = -20;
invalidateNodeLocalTransform(plane);
addNodeChild(scene.root, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setVector3(sphere.position, ...awayPosition(300, 160, 300));
invalidateNodeLocalTransform(sphere);
addNodeChild(scene.root, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setVector3(cube.position, ...awayPosition(300, 160, -250));
invalidateNodeLocalTransform(cube);
addNodeChild(scene.root, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
// Match AwayJS's scaleUV(10, 5) weave density. Baking the tiling into the vertex UVs (rather than a
// KHR_texture_transform uvScale on the texture) keeps the mip LOD derivative-correct, so the fine
// weave stays crisp instead of aliasing into speckle on the ring's minified far side.
scaleMeshGeometryUvs(torusGeometry, 10, 5);
const torus = createMesh(torusGeometry, [torusMaterial]);
setVector3(torus.position, ...awayPosition(-250, 160, -250));
const torusRotation = createQuaternion();
setQuaternionFromAxisAngle(torusRotation, createVector3(1, 0, 0), Math.PI / 2);
copyQuaternion(torus.rotation, torusRotation);
invalidateNodeLocalTransform(torus);
addNodeChild(scene.root, torus);

await loadSceneTextures({ planeMaterial, sphereMaterial, cubeMaterial, torusMaterial }, tilingSampler);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
  maxTiltAngle: 90,
});

bindOrbitDrag(ctx.canvas, orbit, { minDistance: 100, maxDistance: 2000 });

function frame(ts: number): void {
  // AwayJS sweeps the white light around the horizon (nearly horizontal, a slight downward tilt) so
  // the shading and the metal highlights rotate around the objects. Keep it grazing, not overhead —
  // that grazing angle is what lights the metal frame/ring and the floor's normal relief.
  const lightX = Math.sin(ts / 10000);
  const lightZ = -Math.cos(ts / 10000);
  setDirectionalLightDirection(directional, lightX, -0.01, lightZ);

  orbit.update();
  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
