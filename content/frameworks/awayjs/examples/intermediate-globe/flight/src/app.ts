import type {
  Adjustment,
  Billboard,
  Camera3D,
  Environment,
  GlRenderEffectPipeline,
  GlRenderState,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
  ShadedMaterial,
  Texture,
} from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  BlendMode,
  captureBitmapFromImageResource,
  copyBitmapChannel,
  copyQuaternion,
  createAmbientLight,
  createBillboard,
  createBitmap,
  createBitmapRegion,
  createCubeTexture,
  createCustomShaderMaterial,
  createDirectionalLight,
  createEmissiveModifier,
  createEnvironment,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createImageResourceFromCanvas,
  createMesh,
  createNode3D,
  createQuaternion,
  createQuadMeshGeometry,
  createRay3D,
  createSampler,
  createScene3D,
  createScene3DLights,
  createShadedMaterial,
  createSphereMeshGeometry,
  createTexture,
  createToneMapEffect,
  createUnlitMaterial,
  createVector3,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  flipBitmapHorizontal,
  flipBitmapVertical,
  getCamera3DForward,
  getCamera3DPosition,
  getCamera3DScreenToWorldRay,
  getCamera3DWorldToScreen,
  ImageChannel,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  orientScene3DBillboardsToCamera,
  packOpaqueColor,
  registerBuiltInGlModifierSnippets,
  registerGlRenderEffect,
  registerGlShadedMaterial,
  registerStandardGlTextureResolvers,
  registerGlUnlitMaterial,
  renderGlBackground,
  setCubeTextureFace,
  setNode3DAlpha,
  setQuaternionFromAxisAngle,
  setVector3,
} from '@flighthq/sdk';

import { bindOrbitDrag, createCameraFromAway, createOrbitControllerFromAway } from '../../../_shared/flight/src/camera';
import { awayIntensity } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createAtmosphere, loadCloudTexture } from './atmosphere';
import { registerEarthShader } from './earthShader';
import type { SkyboxRenderState } from './skybox';
import { renderSkyboxScene } from './skybox';

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
// Textured materials resolve their maps through the backing-kind registry; without this every
// texture resolves to null and the scene renders untextured.
registerStandardGlTextureResolvers(state);
registerGlShadedMaterial(state);
registerBuiltInGlModifierSnippets(state);
registerGlUnlitMaterial(state);
registerGlRenderEffect(state, 'FxaaEffect', defaultGlFxaaEffectRunner);
registerGlRenderEffect(state, 'ToneMapEffect', defaultGlToneMapEffectRunner);
registerEarthShader(state);

const verifyFrame = createGlFrameVerifier(state);

const skyboxRef: SkyboxRenderState = { pipeline: null };

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60, far: 100000 });

interface FlareSpec {
  index: number;
  url: string;
  size: number;
  position: number;
  opacity: number;
}

interface FlareObject {
  billboard: Billboard;
  index: number;
  position: number;
}

// flare11.jpg and flare12.jpg are absent from the example assets. AwayJS leaves those two array
// positions empty when their loads never complete, so retain the original indices for placement
// depth while constructing only the ten entries that can actually load.
const FLARE_SPECS: readonly FlareSpec[] = [
  { index: 0, url: 'awayjs/lensflare/flare10.jpg', size: 3.2, position: -0.01, opacity: 100 },
  { index: 2, url: 'awayjs/lensflare/flare7.jpg', size: 2, position: 0, opacity: 25.5 },
  { index: 3, url: 'awayjs/lensflare/flare7.jpg', size: 4, position: 0, opacity: 17.85 },
  { index: 5, url: 'awayjs/lensflare/flare6.jpg', size: 1, position: 0.68, opacity: 20.4 },
  { index: 6, url: 'awayjs/lensflare/flare2.jpg', size: 1.25, position: 1.1, opacity: 48.45 },
  { index: 7, url: 'awayjs/lensflare/flare3.jpg', size: 1.75, position: 1.37, opacity: 7.65 },
  { index: 8, url: 'awayjs/lensflare/flare4.jpg', size: 2.75, position: 1.85, opacity: 12.75 },
  { index: 9, url: 'awayjs/lensflare/flare8.jpg', size: 0.5, position: 2.21, opacity: 33.15 },
  { index: 10, url: 'awayjs/lensflare/flare6.jpg', size: 4, position: 2.5, opacity: 10.4 },
  { index: 11, url: 'awayjs/lensflare/flare7.jpg', size: 10, position: 2.66, opacity: 50 },
];

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

// The flare JPEGs are luminance masks rather than RGBA artwork. Match AwayJS by copying red into
// alpha on an otherwise-white bitmap, and use smooth filtering without mipmaps.
const flareTextures = new Map<string, Texture>();
const flareUrls = [...new Set(FLARE_SPECS.map((spec) => spec.url))];
await Promise.all(
  flareUrls.map(async (url) => {
    const sourceImage = await loadImageResourceFromUrl(url);
    const sourceBitmap = captureBitmapFromImageResource(sourceImage);
    const maskedBitmap = createBitmap(sourceBitmap.width, sourceBitmap.height, 0xffffffff);
    copyBitmapChannel(
      createBitmapRegion(maskedBitmap),
      ImageChannel.Alpha,
      createBitmapRegion(sourceBitmap),
      ImageChannel.Red,
    );
    flareTextures.set(
      url,
      createTexture({
        source: maskedBitmap,
        sampler: createSampler({ magFilter: 'linear', minFilter: 'linear', mipmaps: false }),
      }),
    );
  }),
);

const flares: FlareObject[] = FLARE_SPECS.map((spec) => {
  const material = createUnlitMaterial({
    baseColor: 0xffffffff,
    baseColorMap: flareTextures.get(spec.url) ?? null,
  });
  material.alphaMode = 'blend';

  const dimension = spec.size * 14.4;
  const billboard = createBillboard(createQuadMeshGeometry(dimension, dimension), [material], 'screenAligned');
  billboard.visible = false;
  setNode3DAlpha(billboard, spec.opacity / 100);
  addNodeChild(scene.root, billboard);
  return { billboard, index: spec.index, position: spec.position };
});

const [dayImage, specImage] = await Promise.all([
  loadImageResourceFromUrl('awayjs/globe/land_ocean_ice_2048_match.jpg'),
  loadImageResourceFromUrl('awayjs/globe/earth_specular_2048.jpg'),
]);

// Night-lights texture: the source is a 16384-wide JPG, so downscale it into a 2048x1024 canvas to
// keep GPU memory sane, then bind day/night/specular to the earth shader's samplers.
const nightSource = await loadImageResourceFromUrl('awayjs/globe/land_lights_16384.jpg');
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
  u_dayTex: createTexture({ source: dayImage }),
  u_nightTex: createTexture({ source: nightImage }),
  u_specTex: createTexture({ source: specImage }),
};

// Space starfield skybox — convert the AwayJS left-handed cube into Flight's right-handed space.
// X/Z faces mirror horizontally, Y faces mirror vertically, and the handedness flip swaps ±Z.
const skyboxFaceUrls = [
  'awayjs/skybox/space_posX.jpg',
  'awayjs/skybox/space_negX.jpg',
  'awayjs/skybox/space_posY.jpg',
  'awayjs/skybox/space_negY.jpg',
  'awayjs/skybox/space_posZ.jpg',
  'awayjs/skybox/space_negZ.jpg',
];
const skyboxFaces = await Promise.all(skyboxFaceUrls.map((url) => loadImageResourceFromUrl(url)));
const skyboxTexture = createCubeTexture();
for (let i = 0; i < 6; i++) {
  const face = captureBitmapFromImageResource(skyboxFaces[i]!);
  const region = createBitmapRegion(face);
  if (i === 2 || i === 3) flipBitmapVertical(region, region);
  else flipBitmapHorizontal(region, region);
  const faceIndex = i === 4 ? 5 : i === 5 ? 4 : i;
  setCubeTextureFace(skyboxTexture, faceIndex, face);
}
const environment = createEnvironment({ environment: skyboxTexture, intensity: 1 });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 600,
  panAngle: 0,
  tiltAngle: 0,
  minTiltAngle: -90,
  maxTiltAngle: 90,
  yFactor: 1,
});

bindOrbitDrag(canvas, orbit, { minDistance: 400, maxDistance: 10000 });

const axisY = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();
const sunScreenPosition = createVector3();
const cameraPosition = createVector3();
const cameraForward = createVector3();
const flareRay = createRay3D();
let earthAngle = 0;
let cloudAngle = 0;
let lastTime = 0;

function updateFlares(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  getCamera3DPosition(cameraPosition, camera);
  getCamera3DForward(cameraForward, camera);

  const sunProjected = getCamera3DWorldToScreen(sunScreenPosition, camera, sun.position, aspect);
  const sunDepth =
    (sun.position.x - cameraPosition.x) * cameraForward.x +
    (sun.position.y - cameraPosition.y) * cameraForward.y +
    (sun.position.z - cameraPosition.z) * cameraForward.z;
  const screenX = (sunScreenPosition.x + 1) * 0.5 * width;
  const screenY = (1 - sunScreenPosition.y) * 0.5 * height;
  const xOffset = screenX - width * 0.5;
  const yOffset = screenY - height * 0.5;

  // Earth is centred at the scene origin. AwayJS's projected z is the positive camera depth, so
  // derive that value explicitly instead of using Flight's NDC z coordinate.
  const earthDepth =
    -cameraPosition.x * cameraForward.x - cameraPosition.y * cameraForward.y - cameraPosition.z * cameraForward.z;
  const earthRadius = (190 * height) / earthDepth;
  const visible =
    sunProjected &&
    screenX > 0 &&
    screenX < width &&
    screenY > 0 &&
    screenY < height &&
    sunDepth > 0 &&
    Math.hypot(xOffset, yOffset) > earthRadius;

  for (const flare of flares) flare.billboard.visible = visible;
  if (!visible) return;

  for (const flare of flares) {
    const flareScreenX = screenX - xOffset * flare.position;
    const flareScreenY = screenY - yOffset * flare.position;
    const ndcX = (flareScreenX / width) * 2 - 1;
    const ndcY = 1 - (flareScreenY / height) * 2;
    if (!getCamera3DScreenToWorldRay(flareRay, camera, ndcX, ndcY, aspect)) continue;

    // AwayJS unproject's third argument is positive camera depth. Place the point on Flight's
    // screen ray where its forward-axis depth is exactly 100 - the sparse reference array index.
    const forwardRate =
      flareRay.direction.x * cameraForward.x +
      flareRay.direction.y * cameraForward.y +
      flareRay.direction.z * cameraForward.z;
    if (forwardRate <= 0) continue;
    const rayDistance = (100 - flare.index) / forwardRate;
    setVector3(
      flare.billboard.position,
      cameraPosition.x + flareRay.direction.x * rayDistance,
      cameraPosition.y + flareRay.direction.y * rayDistance,
      cameraPosition.z + flareRay.direction.z * rayDistance,
    );
    invalidateNodeLocalTransform(flare.billboard);
  }
}

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
  updateFlares();
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
