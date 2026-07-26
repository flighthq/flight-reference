import type { PerspectiveProjection, ShadedMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  copyQuaternion,
  createAmbientLight,
  createCubeTexture,
  createCustomShaderMaterial,
  createDirectionalLight,
  createEmissiveModifier,
  createEnvironment,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderState,
  createImageResourceFromCanvas,
  createMesh,
  createNode3D,
  createQuaternion,
  createScene3D,
  createScene3DLights,
  createShadedMaterial,
  createSphereMeshGeometry,
  createTexture,
  createToneMapEffect,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  orientScene3DBillboardsToCamera,
  packOpaqueColor,
  registerBuiltInGlModifierSnippets,
  registerDefaultGlRenderEffects,
  registerShadedGlMaterial,
  registerUnlitGlMaterial,
  setCubeTextureFace,
  setQuaternionFromAxisAngle,
  setVector3,
} from '@flighthq/sdk';

import { bindOrbitDrag, createCameraFromAway, createOrbitControllerFromAway } from '../../../_shared/flight/src/camera';
import { awayIntensity } from '../../../_shared/flight/src/lighting';
import type { SkyboxRenderState } from '../../../_shared/flight/src/scene3d';
import { renderSkyboxScene } from '../../../_shared/flight/src/scene3d';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createAtmosphere, loadCloudTexture } from './atmosphere';
import { registerEarthShader } from './earthShader';

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

// The earth/clouds use the composable shaded lit base (@flighthq/shading, mirroring the original
// AwayJS MethodMaterial), the sun is a self-lit disc via an EmissiveModifier, and the atmosphere is
// an unlit halo billboard. The modifier-snippet registration MUST run before the first draw: the
// shaded program cache keys a plain Emissive identically whether or not its snippet is registered, so
// a program compiled before registration would cache modifier-less and never recompile.
registerShadedGlMaterial(state);
registerBuiltInGlModifierSnippets(state);
registerUnlitGlMaterial(state);
registerDefaultGlRenderEffects(state);
registerEarthShader(state);

const verifyFrame = createGlFrameVerifier(state);

const skyboxRef: SkyboxRenderState = { pipeline: null };

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60, far: 100000 });

let sunAngle = 1.35;

const sunLight = createDirectionalLight({
  direction: { x: Math.sin(sunAngle), y: 0, z: Math.cos(sunAngle) },
  color: 0xffffffff,
  intensity: awayIntensity(2.6),
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x0c1424), intensity: awayIntensity(0.5) });

const lights = createScene3DLights({
  ambient,
  directional: sunLight,
});

const tiltContainer = createNode3D();
const axisX = createVector3(1, 0, 0);
const tiltQuat = createQuaternion();
setQuaternionFromAxisAngle(tiltQuat, axisX, -23 * DEG_TO_RAD);
copyQuaternion(tiltContainer.rotation, tiltQuat);
invalidateNodeLocalTransform(tiltContainer);
addNodeChild(scene.root, tiltContainer);

// Earth: the day/night custom shader (day texture + specular on the lit side, city lights on the
// dark side). u_sunDir is refreshed each frame so the terminator tracks the orbiting sun.
const earthSunDir: number[] = [Math.sin(sunAngle), 0, Math.cos(sunAngle)];
const earthMaterial = createCustomShaderMaterial({ shaderKey: 'globeEarth', uniforms: { u_sunDir: earthSunDir } });

const cloudMaterial = await loadCloudTexture();

const { mesh: atmosphere } = createAtmosphere();

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

addNodeChild(scene.root, atmosphere);

const SUN_DISTANCE = 10000;
const sun = createMesh(createSphereMeshGeometry(700, 32, 16), [sunMaterial]);
addNodeChild(scene.root, sun);

const [dayImage, specImage] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/globe/land_ocean_ice_2048_match.jpg'),
  loadImageResourceFromUrl('awayjs/assets/globe/earth_specular_2048.jpg'),
]);

// Night-lights texture: the source is a 16384-wide JPG, so downscale it into a 2048x1024 canvas to
// keep GPU memory sane, then bind day/night/specular to the earth shader's samplers.
const nightSource = await loadImageResourceFromUrl('awayjs/assets/globe/land_lights_16384.jpg');
const nightCanvas = document.createElement('canvas');
nightCanvas.width = 2048;
nightCanvas.height = 1024;
const nightCtx = nightCanvas.getContext('2d');
let nightImage = nightSource;
if (nightCtx && nightSource.source) {
  nightCtx.drawImage(nightSource.source, 0, 0, 2048, 1024);
  nightImage = createImageResourceFromCanvas(nightCanvas);
}
earthMaterial.textures = {
  u_dayTex: createTexture({ image: dayImage }),
  u_nightTex: createTexture({ image: nightImage }),
  u_specTex: createTexture({ image: specImage }),
};

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

bindOrbitDrag(canvas, orbit, { minDistance: 400, maxDistance: 10000 });

const axisY = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();
let earthAngle = 0;
let cloudAngle = 0;
let lastTime = 0;

function frame(ts: number): void {
  const dt = lastTime === 0 ? 16 : ts - lastTime;
  lastTime = ts;

  const earthSpeed = 0.2 * DEG_TO_RAD * (dt / 16);
  const cloudSpeed = 0.21 * DEG_TO_RAD * (dt / 16);
  const orbitSpeed = 0.02 * DEG_TO_RAD * (dt / 16);

  earthAngle += earthSpeed;
  setQuaternionFromAxisAngle(scratchQuat, axisY, earthAngle);
  copyQuaternion(earth.rotation, scratchQuat);
  invalidateNodeLocalTransform(earth);

  cloudAngle += cloudSpeed;
  setQuaternionFromAxisAngle(scratchQuat, axisY, cloudAngle);
  copyQuaternion(clouds.rotation, scratchQuat);
  invalidateNodeLocalTransform(clouds);

  sunAngle += orbitSpeed;
  sunLight.direction.x = Math.sin(sunAngle);
  sunLight.direction.z = Math.cos(sunAngle);
  earthSunDir[0] = Math.sin(sunAngle);
  earthSunDir[2] = Math.cos(sunAngle);

  setVector3(sun.position, -Math.sin(sunAngle) * SUN_DISTANCE, 0, -Math.cos(sunAngle) * SUN_DISTANCE);
  invalidateNodeLocalTransform(sun);

  orbit.update();
  orientScene3DBillboardsToCamera(scene.root, camera);
  renderSkyboxScene(state, canvas, skyboxRef, environment, scene.root, camera, lights, [
    createToneMapEffect(),
    createFxaaEffect(),
  ]);
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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
