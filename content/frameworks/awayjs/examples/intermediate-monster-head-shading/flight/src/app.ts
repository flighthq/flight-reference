import type { GlRenderEffectPipeline, PerspectiveProjection, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  configureDirectionalShadowCamera3D,
  createAabb,
  createCamera3D,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createOrthographicProjection,
  createScene,
  createSceneFromAwd2,
  createSceneLights,
  createShadedMaterial,
  createTexture,
  createToneMapEffect,
  drawGlScene,
  drawGlSceneShadowMap,
  endGlRenderEffectPipeline,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  registerDefaultGlRenderEffects,
  registerShadedGlMaterial,
  renderGlBackground,
  setVector3,
} from '@flighthq/sdk';

import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerShadedGlMaterial(state);
registerDefaultGlRenderEffects(state);
const verifyFrame = createGlFrameVerifier(state);

let pipeline: GlRenderEffectPipeline | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 1000 });

const lightDirection = (120 * Math.PI) / 180;
const lightElevation = (30 * Math.PI) / 180;

const lightDir = {
  x: Math.sin(lightElevation) * Math.cos(lightDirection),
  y: -Math.cos(lightElevation),
  z: -Math.sin(lightElevation) * Math.sin(lightDirection),
};

const { directional, ambient } = createDirectionalLightFromAway({
  direction: lightDir,
  color: 0xffeedd,
  ambient: 1,
  ambientColor: 0x101025,
  shading: 'phong',
});

directional.castsShadow = true;
directional.pcfRadius = 2;

const shadowCamera = createCamera3D({
  near: 1,
  far: 2000,
  projection: createOrthographicProjection({ halfWidth: 300, halfHeight: 300 }),
});
const shadowBounds = createAabb(-200, -200, -200, 200, 200, 200);

const blueLight = createPointLightFromAway({
  color: 0x4080ff,
  range: 100000,
  shading: 'phong',
  referenceDistance: 3000,
});
blueLight.position.x = 3000;
blueLight.position.z = -700;
blueLight.position.y = 20;

const redLight = createPointLightFromAway({
  color: 0x802010,
  range: 100000,
  shading: 'phong',
  referenceDistance: 2200,
});
redLight.position.x = -2000;
redLight.position.z = -800;
redLight.position.y = -400;

const lights = createSceneLights({
  ambient,
  directional,
  point: [blueLight, redLight],
});

// AwayJS applies SpecularFresnelMethod (fresnelPower=3, strength=3, gloss=10) which
// modulates specular reflections by Fresnel angle — NOT a rim glow. ShadedMaterial's
// specular + shininess carry the broad, strong highlight; no rim modifier is needed
// (the rim was adding a white edge glow to everything including the eyes, which the
// source never had).
const headMaterial = createShadedMaterial({
  diffuse: 0xffffffff,
  shininess: 10,
  specular: 0.8,
});

async function tryLoadImage(url: string): Promise<Awaited<ReturnType<typeof loadImageResourceFromUrl>> | null> {
  try {
    return await loadImageResourceFromUrl(url);
  } catch {
    return null;
  }
}

const [diffuseImage, specularImage, normalImage, awdBuffer] = await Promise.all([
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_diffuse.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_specular.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_normals.jpg'),
  fetch('awayjs/assets/monsterhead/MonsterHead.awd').then((r) => r.arrayBuffer()),
]);

if (diffuseImage) headMaterial.diffuseMap = createTexture({ image: diffuseImage });
if (specularImage) headMaterial.specularMap = createTexture({ image: specularImage, colorSpace: 'linear' });
if (normalImage) headMaterial.normalMap = createTexture({ image: normalImage, colorSpace: 'linear' });

const awdScene = createSceneFromAwd2(new Uint8Array(awdBuffer));

function assignMaterialToMeshes(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(headMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i] = headMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignMaterialToMeshes(child);
  }
}

assignMaterialToMeshes(awdScene.root);

for (const child of getNodeChildren(awdScene.root)) {
  child.position.y = -20;
  setVector3(child.scale, 4, 4, 4);
  invalidateNodeLocalTransform(child);
  addNodeChild(scene.root, child);
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 800,
  panAngle: 225,
  tiltAngle: 10,
  minTiltAngle: -90,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

function frame(): void {
  orbit.update();
  if (pipeline === null) {
    pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
  }

  configureDirectionalShadowCamera3D(shadowCamera, lightDir, shadowBounds);
  drawGlSceneShadowMap(state, scene.root, shadowCamera);

  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  state.gl.depthMask(true);
  state.gl.clearDepth(1);
  state.gl.clear(state.gl.DEPTH_BUFFER_BIT);
  drawGlScene(state, scene.root, camera, lights);
  endGlRenderEffectPipeline(state, pipeline, [createToneMapEffect(), createFxaaEffect()]);
  verifyFrame();
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
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
