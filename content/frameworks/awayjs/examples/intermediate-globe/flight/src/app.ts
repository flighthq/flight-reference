import type { GlRenderTarget, ShadedMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createAmbientLight,
  createDirectionalLight,
  createEmissiveModifier,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createRimModifier,
  createScene,
  createSceneLights,
  createSceneNode,
  createShadedMaterial,
  createSphereMeshGeometry,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  packOpaqueColor,
  beginGlRenderPass,
  createCubeTexture,
  createEnvironment,
  drawGlEnvironmentSkybox,
  drawGlLinearToSrgbPass,
  drawGlScene,
  endGlRenderPass,
  registerBuiltInGlModifierSnippets,
  registerShadedGlMaterial,
  renderGlBackground,
  resizeGlRenderTarget,
  resolveGlRenderTarget,
  rotateMatrix4,
  setCubeTextureFace,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { awayIntensity } from '../../../_shared/flight/src/lighting';
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
  backgroundColor: 0x000005ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

// Earth/cloud surfaces and the atmosphere halo use the composable shaded lit base
// (@flighthq/shading), mirroring the original AwayJS MethodMaterial (diffuse + half-vector
// specular) and letting the atmosphere bake a custom fresnel-rim glow (AwayJS DiffuseGlobeMethod)
// via a RimModifier and the sun a self-lit disc via an EmissiveModifier.
// These two registrations MUST run before the first presentGlScene: the shaded program cache keys
// Rim/plain-Emissive identically whether or not their snippet is registered, so a program compiled
// before registration would cache modifier-less and never recompile.
registerShadedGlMaterial(state);
registerBuiltInGlModifierSnippets(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 100000 });

let sunAngle = 0.9;

const sunLight = createDirectionalLight({
  direction: { x: Math.sin(sunAngle), y: 0, z: Math.cos(sunAngle) },
  color: 0xffffffff,
  intensity: awayIntensity(2),
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x555f78), intensity: awayIntensity(1.5) });

const lights = createSceneLights({
  ambient,
  directional: sunLight,
});

const tiltContainer = createSceneNode();
const axisX = createVector3(1, 0, 0);
setMatrix4Identity(tiltContainer.localMatrix);
rotateMatrix4(tiltContainer.localMatrix, tiltContainer.localMatrix, axisX, -23 * DEG_TO_RAD);
invalidateNodeLocalTransform(tiltContainer);
addNodeChild(scene, tiltContainer);

// Earth: lit shaded surface with a tight specular highlight (AwayJS SpecularFresnelMethod, gloss 5).
const earthMaterial: ShadedMaterial = createShadedMaterial({
  diffuse: 0xffffffff,
  specular: 0xffffffff,
  shininess: 5,
});

// Clouds: additive diffuse shell just above the surface, no specular (AwayJS cloudMaterial).
const cloudMaterial: ShadedMaterial = createShadedMaterial({
  diffuse: packOpaqueColor(0x8090b0),
  specular: 0x000000ff,
  shininess: 5,
});
cloudMaterial.alphaMode = 'blend';
cloudMaterial.blendMode = BlendMode.Add;
cloudMaterial.doubleSided = true;

// Atmosphere: a slightly larger shell whose only visible contribution is a blue fresnel rim
// (AwayJS DiffuseGlobeMethod, diffuse 0x1671cc, additive). A black base + additive blend means the
// facing interior stays invisible and only the grazing limb glows, giving the halo around the disc.
const atmosphereMaterial: ShadedMaterial = createShadedMaterial({
  diffuse: 0x000000ff,
  specular: 0x000000ff,
  modifiers: [createRimModifier({ color: packOpaqueColor(0x1671cc), power: 3, intensity: 1.1 })],
});
atmosphereMaterial.alphaMode = 'blend';
atmosphereMaterial.blendMode = BlendMode.Add;
atmosphereMaterial.doubleSided = false;

// Sun: a self-lit additive disc far along the light direction (AwayJS 3000-unit camera-plane
// billboard). A sphere reads the same from every orbit angle, so no per-frame billboarding is needed.
const sunMaterial: ShadedMaterial = createShadedMaterial({
  diffuse: 0x000000ff,
  modifiers: [createEmissiveModifier({ color: packOpaqueColor(0xfff2cc), strength: 4 })],
});
sunMaterial.alphaMode = 'blend';
sunMaterial.blendMode = BlendMode.Add;

const earth = createMesh(createSphereMeshGeometry(200, 200, 100), [earthMaterial]);
addNodeChild(tiltContainer, earth);

const clouds = createMesh(createSphereMeshGeometry(202, 200, 100), [cloudMaterial]);
addNodeChild(tiltContainer, clouds);

const atmosphere = createMesh(createSphereMeshGeometry(210, 200, 100), [atmosphereMaterial]);
setMatrix4Identity(atmosphere.localMatrix);
scaleMatrix4(atmosphere.localMatrix, atmosphere.localMatrix, -1, 1, 1);
invalidateNodeLocalTransform(atmosphere);
addNodeChild(scene, atmosphere);

const SUN_DISTANCE = 10000;
const sun = createMesh(createSphereMeshGeometry(700, 32, 16), [sunMaterial]);
addNodeChild(scene, sun);

async function applyTexture(
  material: ShadedMaterial,
  slot: 'diffuseMap' | 'normalMap' | 'specularMap',
  url: string,
  colorSpace: 'srgb' | 'linear',
): Promise<void> {
  const image = await loadImageResourceFromUrl(url);
  material[slot] = createTexture({ image, colorSpace });
}

await Promise.all([
  applyTexture(earthMaterial, 'diffuseMap', 'awayjs/assets/globe/land_ocean_ice_2048_match.jpg', 'srgb'),
  applyTexture(earthMaterial, 'normalMap', 'awayjs/assets/globe/EarthNormal.png', 'linear'),
  applyTexture(earthMaterial, 'specularMap', 'awayjs/assets/globe/earth_specular_2048.jpg', 'linear'),
  applyTexture(cloudMaterial, 'diffuseMap', 'awayjs/assets/globe/cloud_combined_2048.jpg', 'srgb'),
]);

// Space starfield skybox — the AwayJS space_texture.cube manifest's six faces into a cube map.
// (Face slots: +X, -X, +Y, -Y, +Z, -Z.)
const skyboxFaceUrls = [
  'awayjs/assets/skybox/space_posX.jpg',
  'awayjs/assets/skybox/space_negX.jpg',
  'awayjs/assets/skybox/space_posY.jpg',
  'awayjs/assets/skybox/space_negY.jpg',
  'awayjs/assets/skybox/space_posZ.jpg',
  'awayjs/assets/skybox/space_negZ.jpg',
];
const skyboxFaces = await Promise.all(skyboxFaceUrls.map((url) => loadImageResourceFromUrl(url)));
const skyboxTexture = createCubeTexture();
for (let i = 0; i < 6; i++) setCubeTextureFace(skyboxTexture, i, skyboxFaces[i]);
const environment = createEnvironment({ environment: skyboxTexture, intensity: 1 });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 600,
  panAngle: 0,
  tiltAngle: 0,
  minTiltAngle: -90,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (event.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

canvas.addEventListener('wheel', (event: WheelEvent) => {
  orbit.distance -= event.deltaY / 2;
  if (orbit.distance < 400) orbit.distance = 400;
  else if (orbit.distance > 10000) orbit.distance = 10000;
});

const axisY = createVector3(0, 1, 0);
let lastTime = 0;

function frame(ts: number): void {
  const dt = lastTime === 0 ? 16 : ts - lastTime;
  lastTime = ts;

  const earthSpeed = 0.2 * DEG_TO_RAD * (dt / 16);
  const cloudSpeed = 0.21 * DEG_TO_RAD * (dt / 16);
  const orbitSpeed = 0.02 * DEG_TO_RAD * (dt / 16);

  rotateMatrix4(earth.localMatrix, earth.localMatrix, axisY, earthSpeed);
  invalidateNodeLocalTransform(earth);

  rotateMatrix4(clouds.localMatrix, clouds.localMatrix, axisY, cloudSpeed);
  invalidateNodeLocalTransform(clouds);

  sunAngle += orbitSpeed;
  sunLight.direction.x = Math.sin(sunAngle);
  sunLight.direction.z = Math.cos(sunAngle);

  // Keep the sun disc opposite the light direction (light travels from the sun toward the globe).
  setMatrix4Identity(sun.localMatrix);
  translateMatrix4(
    sun.localMatrix,
    sun.localMatrix,
    -Math.sin(sunAngle) * SUN_DISTANCE,
    0,
    -Math.cos(sunAngle) * SUN_DISTANCE,
  );
  invalidateNodeLocalTransform(sun);

  orbit.update();
  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  beginGlRenderPass(state, renderTarget, { preserveColor: true });
  renderGlBackground(state);
  drawGlEnvironmentSkybox(state, environment, camera, w / h);
  drawGlScene(state, scene, camera, lights);
  endGlRenderPass(state);
  resolveGlRenderTarget(state, renderTarget);
  drawGlLinearToSrgbPass(state, renderTarget, null);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
