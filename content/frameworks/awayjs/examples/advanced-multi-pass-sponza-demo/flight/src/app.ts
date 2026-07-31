import type {
  Adjustment,
  Camera3D,
  Environment,
  GlRenderEffectPipeline,
  GlRenderState,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
  StandardPbrMaterial,
} from '@flighthq/sdk';
import {
  addNodeChild,
  bakeGlEnvironmentIbl,
  beginGlRenderEffectPipeline,
  createEnvironment,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createScene3D,
  createScene3DFromAwd2,
  createScene3DLights,
  createToneMapEffect,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlEnvironmentSkybox,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  getNodeChildren,
  loadImageResourceFromUrl,
  packOpaqueColor,
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
} from '@flighthq/sdk';

import {
  awayDirection,
  createCameraFromAway,
  createFirstPersonControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createCubeTextureFromAwayFaces } from '../../../_shared/flight/src/cubemap';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { bindFirstPersonControls } from './controls';
import { createScene3DContext } from './renderer';
import type { SkyboxRenderState } from './skybox';
import { renderSkyboxScene } from './skybox';
import {
  createTextureMap,
  getOrCreateMaterial,
  loadSponzaTextures,
  materialNameToNormalFile,
  materialNameToSpecularFile,
  materialNameToTextureFile,
  walkAndAssignMaterials,
} from './materials';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: packOpaqueColor(0x9090e7),
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60 });

const lightElevation = Math.PI / 18;
const lightAzimuth = Math.PI / 2;
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(
    Math.sin(lightElevation) * Math.cos(lightAzimuth),
    -Math.cos(lightElevation),
    Math.sin(lightElevation) * Math.sin(lightAzimuth),
  ),
  color: 0xeedddd,
  ambient: 0.35,
  ambientColor: 0x808090,
});
const lights = createScene3DLights({ ambient, directional });

const sponzaTextureFiles = [
  ...new Set([
    ...Object.values(materialNameToTextureFile),
    ...Object.values(materialNameToNormalFile),
    ...Object.values(materialNameToSpecularFile),
  ]),
];

const skyboxFaceFiles = [
  'hourglass_posX.jpg',
  'hourglass_negX.jpg',
  'hourglass_posY.jpg',
  'hourglass_negY.jpg',
  'hourglass_posZ.jpg',
  'hourglass_negZ.jpg',
];

const [awdBuffer, sponzaTextureImages, skyboxFaceImages] = await Promise.all([
  fetch('awayjs/sponza/sponza.awd').then((r) => r.arrayBuffer()),
  loadSponzaTextures(sponzaTextureFiles),
  Promise.all(skyboxFaceFiles.map((file) => loadImageResourceFromUrl(`awayjs/skybox/${file}`))),
]);

const textureMap = createTextureMap(sponzaTextureFiles, sponzaTextureImages);
const materialCache = new Map<string, StandardPbrMaterial>();

const awdScene = createScene3DFromAwd2(new Uint8Array(awdBuffer));

walkAndAssignMaterials(awdScene.root, materialCache, textureMap);

for (const child of getNodeChildren(awdScene.root)) {
  addNodeChild(scene.root, child);
}

const cubeTexture = createCubeTextureFromAwayFaces(skyboxFaceImages);
const environment = createEnvironment({
  environment: cubeTexture,
  intensity: 1,
});
bakeGlEnvironmentIbl(ctx.state, environment);
const skyboxRef: SkyboxRenderState = { pipeline: null };
const verifyFrame = createGlFrameVerifier(ctx.state);

const fps = createFirstPersonControllerFromAway(camera, {
  y: 150,
  yaw: 90,
  minPitch: -80,
  maxPitch: 80,
});

const step = bindFirstPersonControls(ctx.canvas, fps);

function frame(): void {
  step();
  renderSkyboxScene(ctx.state, ctx.canvas, skyboxRef, environment, scene.root, camera, lights);
  verifyFrame();
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
