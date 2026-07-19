import type { GlRenderTarget, ShadedMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createAmbientLight,
  createDirectionalLight,
  createEmissiveModifier,
  createGlCanvasElement,
  createImageResourceFromCanvas,
  createGlRenderState,
  createGlRenderTarget,
  createBillboard,
  createCustomShaderMaterial,
  createMesh,
  createPlaneMeshGeometry,
  createUnlitMaterial,
  orientSceneBillboardsToCamera,
  registerCustomShaderGlMaterial,
  registerGlCustomMaterialShader,
  registerUnlitGlMaterial,
  createScene,
  createSceneLights,
  createSceneNode,
  createShadedMaterial,
  createSphereMeshGeometry,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  createQuaternion,
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
  setCubeTextureFace,
  setQuaternionFromAxisAngle,
} from '@flighthq/sdk';
import { setSceneNodePosition, setSceneNodeRotationQuaternion } from '../../../_shared/flight/src/position';

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

// The earth/clouds use the composable shaded lit base (@flighthq/shading, mirroring the original
// AwayJS MethodMaterial), the sun is a self-lit disc via an EmissiveModifier, and the atmosphere is
// an unlit halo billboard. The modifier-snippet registration MUST run before the first draw: the
// shaded program cache keys a plain Emissive identically whether or not its snippet is registered, so
// a program compiled before registration would cache modifier-less and never recompile.
registerShadedGlMaterial(state);
registerBuiltInGlModifierSnippets(state);
registerUnlitGlMaterial(state);

// Earth day/night: an opaque custom shader that lights the day texture by the sun and cross-fades to
// the city-lights texture on the night side (AwayJS composited the night lights as the ambient term).
// It is one OPAQUE material because custom-shader materials only draw in drawGlScene's opaque pass,
// not its transparent pass. Specular is the ocean mask; sRGB textures are decoded to linear here so
// the linear->sRGB present pass encodes once.
registerCustomShaderGlMaterial(state);
registerGlCustomMaterialShader(state, 'globeEarth', {
  vertex: `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv0;
uniform mat4 u_viewProjection;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;
out vec3 v_normal;
out vec3 v_worldPos;
out vec2 v_uv;
void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = normalize(u_normalMatrix * a_normal);
  v_uv = a_uv0;
  gl_Position = u_viewProjection * worldPos;
}`,
  fragment: `#version 300 es
precision highp float;
in vec3 v_normal;
in vec3 v_worldPos;
in vec2 v_uv;
uniform sampler2D u_dayTex;
uniform sampler2D u_nightTex;
uniform sampler2D u_specTex;
uniform vec3 u_sunDir;
uniform vec3 u_cameraPosition;
out vec4 o_color;
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec3 N = normalize(v_normal);
  vec3 L = -normalize(u_sunDir);
  float ndl = dot(N, L);
  float dayAmount = smoothstep(-0.05, 0.2, ndl);
  vec3 day = toLinear(texture(u_dayTex, v_uv).rgb);
  vec3 night = toLinear(texture(u_nightTex, v_uv).rgb);
  vec3 ambient = vec3(0.04, 0.05, 0.08);
  vec3 dayColor = day * (max(ndl, 0.0) * 1.25 + ambient);
  vec3 V = normalize(u_cameraPosition - v_worldPos);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 40.0) * texture(u_specTex, v_uv).r * step(0.0, ndl);
  dayColor += vec3(0.3, 0.36, 0.5) * spec;
  vec3 cities = max(night - vec3(0.03, 0.05, 0.12), 0.0) * 6.0;
  vec3 nightColor = night * 0.5 + cities;
  o_color = vec4(mix(nightColor, dayColor, dayAmount), 1.0);
}`,
});

const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 100000 });

let sunAngle = 1.35;

const sunLight = createDirectionalLight({
  direction: { x: Math.sin(sunAngle), y: 0, z: Math.cos(sunAngle) },
  color: 0xffffffff,
  intensity: awayIntensity(2.6),
});

const ambient = createAmbientLight({ color: packOpaqueColor(0x0c1424), intensity: awayIntensity(0.5) });

const lights = createSceneLights({
  ambient,
  directional: sunLight,
});

const tiltContainer = createSceneNode();
const axisX = createVector3(1, 0, 0);
const tiltQuat = createQuaternion();
setQuaternionFromAxisAngle(tiltQuat, axisX, -23 * DEG_TO_RAD);
setSceneNodeRotationQuaternion(tiltContainer, tiltQuat);
addNodeChild(scene, tiltContainer);

// Earth: the day/night custom shader (day texture + specular on the lit side, city lights on the
// dark side). u_sunDir is refreshed each frame so the terminator tracks the orbiting sun.
const earthSunDir: number[] = [Math.sin(sunAngle), 0, Math.cos(sunAngle)];
const earthMaterial = createCustomShaderMaterial({ shaderKey: 'globeEarth', uniforms: { u_sunDir: earthSunDir } });

// Clouds: a lit shell just above the surface (AwayJS cloudMaterial). The source cloud map is an
// opaque JPG, so an alpha channel is derived from its luminance below (transparent where there is no
// cloud); a plain 'blend' material over the opaque earth then composites correctly in the renderer's
// sorted transparent pass. The cloud node spins slightly faster than the earth for independent drift.
const cloudMaterial: ShadedMaterial = createShadedMaterial({
  diffuse: 0xffffffff,
  specular: 0x000000ff,
  shininess: 5,
});
cloudMaterial.alphaMode = 'blend';
cloudMaterial.doubleSided = false;

// Atmosphere: a soft blue glow fading outward into space. A shaded rim shell can only add COLOR
// (not alpha), so it reads as a hard opaque ring; instead this is a camera-facing billboard textured
// with a radial-gradient alpha halo. The opaque earth masks its bright centre, leaving a soft limb glow.
const haloCanvas = document.createElement('canvas');
haloCanvas.width = 256;
haloCanvas.height = 256;
const haloCtx = haloCanvas.getContext('2d');
if (haloCtx) {
  const haloGradient = haloCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  haloGradient.addColorStop(0.0, 'rgba(70,140,220,0.85)');
  haloGradient.addColorStop(0.5, 'rgba(70,140,220,0.32)');
  haloGradient.addColorStop(1.0, 'rgba(70,140,220,0.0)');
  haloCtx.fillStyle = haloGradient;
  haloCtx.fillRect(0, 0, 256, 256);
}
const atmosphereMaterial = createUnlitMaterial({ baseColor: 0xffffffff });
atmosphereMaterial.baseColorMap = createTexture({ image: createImageResourceFromCanvas(haloCanvas) });
atmosphereMaterial.alphaMode = 'blend';

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

const clouds = createMesh(createSphereMeshGeometry(204, 200, 100), [cloudMaterial]);
addNodeChild(tiltContainer, clouds);

const atmosphere = createBillboard(createPlaneMeshGeometry(900, 900, 1, 1), [atmosphereMaterial], 'screenAligned');
addNodeChild(scene, atmosphere);

const SUN_DISTANCE = 10000;
const sun = createMesh(createSphereMeshGeometry(700, 32, 16), [sunMaterial]);
addNodeChild(scene, sun);

const [dayImage, specImage] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/globe/land_ocean_ice_2048_match.jpg'),
  loadImageResourceFromUrl('awayjs/assets/globe/earth_specular_2048.jpg'),
]);

// Build the cloud texture with a luminance-derived alpha: the grayscale cloud map is rasterized to a
// canvas, each pixel's alpha set to its brightness (opaque cloud → white/opaque, clear sky → 0) and
// the RGB flattened to white, then wrapped back into an image resource.
const cloudSource = await loadImageResourceFromUrl('awayjs/assets/globe/cloud_combined_2048.jpg');
const cloudCanvas = document.createElement('canvas');
cloudCanvas.width = cloudSource.width;
cloudCanvas.height = cloudSource.height;
const cloudCtx = cloudCanvas.getContext('2d');
if (cloudCtx && cloudSource.source) {
  cloudCtx.drawImage(cloudSource.source, 0, 0);
  const cloudData = cloudCtx.getImageData(0, 0, cloudCanvas.width, cloudCanvas.height);
  const px = cloudData.data;
  for (let i = 0; i < px.length; i += 4) {
    const luminance = (px[i]! + px[i + 1]! + px[i + 2]!) / 3;
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = luminance;
  }
  cloudCtx.putImageData(cloudData, 0, 0);
  cloudMaterial.diffuseMap = createTexture({ image: createImageResourceFromCanvas(cloudCanvas) });
}

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
  setSceneNodeRotationQuaternion(earth, scratchQuat);

  cloudAngle += cloudSpeed;
  setQuaternionFromAxisAngle(scratchQuat, axisY, cloudAngle);
  setSceneNodeRotationQuaternion(clouds, scratchQuat);

  sunAngle += orbitSpeed;
  sunLight.direction.x = Math.sin(sunAngle);
  sunLight.direction.z = Math.cos(sunAngle);
  earthSunDir[0] = Math.sin(sunAngle);
  earthSunDir[2] = Math.cos(sunAngle);

  setSceneNodePosition(sun, -Math.sin(sunAngle) * SUN_DISTANCE, 0, -Math.cos(sunAngle) * SUN_DISTANCE);

  orbit.update();
  orientSceneBillboardsToCamera(scene, camera);
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
