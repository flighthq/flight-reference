import type { Camera, CubeTexture, Mesh, SceneLights, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createCamera,
  createCubeTexture,
  createDirectionalLight,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlScene,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerBlinnPhongGlMaterial,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import type { GammaTarget } from '../../../_shared/flight/src/gamma';
import { beginGammaPass, createGammaTarget, endGammaPass, resizeGammaTarget } from '../../../_shared/flight/src/gamma';

// The original AwayJS demo uses NormalSimpleWaterMethod + EffectEnvMapMethod + SpecularFresnelMethod
// on the sea surface. In Flight we approximate this with:
//   - A StandardPbrMaterial with metallic=1, roughness=0 (mirror-like env-map reflection) for the
//     aircraft (EnvMapMaterial equivalent, per upstream agent guidance).
//   - A water StandardPbrMaterial (metallic=0.05, roughness=0.25) with a scrolling normal map as
//     an in-sample implementation of the WaterMaterial effect, keeping the behaviour self-contained
//     until a dedicated WaterMaterial type is added to the SDK.

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
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
  pixelRatio,
});
registerBlinnPhongGlMaterial(glState);
registerStandardPbrGlMaterial(glState);

const scene = createScene();

const camera: Camera = createCamera({
  near: 0.5,
  far: 14000,
  projection: createPerspectiveProjection({
    fovY: 60 * DEG_TO_RAD,
    aspect: width / height,
  }),
});

const directional = createDirectionalLight({
  direction: { x: -300, y: -300, z: 5000 },
  color: 0x974523ff,
  intensity: 1.2,
});
const ambient = createAmbientLight({ color: 0x7196acff, intensity: 1 });
const lights: SceneLights = createSceneLights({ ambient, directional });

// Environment cube map — individual face images derived from the CubeTextureTest.cube asset
const cubeFaceUrls = [
  'awayjs/assets/skybox/sky_posX.jpg',
  'awayjs/assets/skybox/sky_negX.jpg',
  'awayjs/assets/skybox/sky_posY.jpg',
  'awayjs/assets/skybox/sky_negY.jpg',
  'awayjs/assets/skybox/sky_posZ.jpg',
  'awayjs/assets/skybox/sky_negZ.jpg',
];
const cubeImages = await Promise.all(cubeFaceUrls.map((url) => loadImageResourceFromUrl(url)));
const cubeTexture: CubeTexture = createCubeTexture();
for (let i = 0; i < 6; i++) setCubeTextureFace(cubeTexture, i, cubeImages[i]);
const environment = createEnvironment({ environment: cubeTexture, intensity: 1 });

// Sea normal map — shared between water surface material and the aircraft's MethodMaterial
// in the original. Here used only for the water, matching the original intent.
const seaNormalImage = await loadImageResourceFromUrl('awayjs/assets/sea_normals.jpg');
const seaNormalTex = createTexture({ image: seaNormalImage });
seaNormalTex.uvScale = { x: 100, y: 100 };

// Water surface — in-sample WaterMaterial implementation using StandardPbrMaterial:
// low metallic, low roughness gives Fresnel-like specular + some env reflection.
// The scrolling normalMap simulates the animated water surface normal flow.
const seaMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0x4488aaff,
  metallic: 0.05,
  roughness: 0.25,
  normalMap: seaNormalTex,
  normalScale: 1.5,
});
seaMaterial.doubleSided = true;

const seaGeometry = createPlaneMeshGeometry(50000, 50000, 1, 1);
const seaMesh: Mesh = createMesh(seaGeometry, [seaMaterial]);
setMatrix4Identity(seaMesh.localMatrix);
invalidateNodeLocalTransform(seaMesh);
addNodeChild(scene, seaMesh);

// F14 aircraft — EnvMapMaterial equivalent: StandardPbrMaterial with metallic=1, roughness=0
// gives a perfect mirror env-map reflection. Placeholder box geometry until OBJ parsing lands
// in scene-formats; replace createBoxMeshGeometry with parseObjMesh(buffer) when available.
const f14Material: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 1,
  roughness: 0,
});

const f14Geometry = createBoxMeshGeometry(6, 2, 12);
const f14Mesh: Mesh = createMesh(f14Geometry, [f14Material]);
setMatrix4Identity(f14Mesh.localMatrix);
translateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, 0, 200, 0);
invalidateNodeLocalTransform(f14Mesh);
addNodeChild(scene, f14Mesh);

// Fallback blinn-phong material for objects that don't need env-map
const _fallbackMat = createBlinnPhongMaterial({ diffuse: 0x888888ff, shininess: 20 });

// Camera orbits the aircraft continuously
const eye = createVector3(0, 250, 500);
const cameraTarget = createVector3(0, 200, 0);
const up = createVector3(0, 1, 0);

let cameraIncrement = 0;
let rollIncrement = 0;
let loopIncrement = 0;
let flightState = 0;

const zAxis = createVector3(0, 0, 1);

let gammaTarget: GammaTarget | null = null;

function updateCameraLookAt(): void {
  cameraTarget.x = f14Mesh.localMatrix.m[12];
  cameraTarget.y = f14Mesh.localMatrix.m[13];
  cameraTarget.z = f14Mesh.localMatrix.m[14];
  setCameraViewMatrix4FromLookAt(camera, eye, cameraTarget, up);
}

canvas.addEventListener('mousedown', () => {
  flightState = (flightState + 1) % 2;
  loopIncrement = 0;
});

function frame(): void {
  rollIncrement += 0.02;
  cameraIncrement += 0.01;

  setMatrix4Identity(f14Mesh.localMatrix);

  if (flightState === 0) {
    translateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, 0, 200, 0);
    rotateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, zAxis, Math.sin(rollIncrement) * 25 * DEG_TO_RAD);
  } else {
    loopIncrement += 0.05;
    const lz = -Math.cos(loopIncrement) * 20;
    const ly = 200 + Math.sin(loopIncrement) * 20;
    translateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, 0, ly, lz);
    rotateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, zAxis, Math.sin(rollIncrement) * 25 * DEG_TO_RAD);
    if (loopIncrement > Math.PI * 2) {
      loopIncrement = 0;
      flightState = 0;
    }
  }

  invalidateNodeLocalTransform(f14Mesh);

  eye.x = Math.cos(cameraIncrement) * 400;
  eye.y = 250;
  eye.z = -Math.sin(cameraIncrement) * 400;
  updateCameraLookAt();

  // Scroll the water normal map to simulate surface flow
  seaNormalTex.uvOffset.y -= 0.04;

  const gl = glState.gl;
  const w = canvas.width;
  const h = canvas.height;

  if (gammaTarget === null) {
    gammaTarget = createGammaTarget(gl, w, h);
  } else {
    resizeGammaTarget(gl, gammaTarget, w, h);
  }

  beginGammaPass(gl, gammaTarget);
  renderGlBackground(glState);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(glState, environment, camera, width / height);
  drawGlScene(glState, scene, camera, lights);
  endGammaPass(gl, gammaTarget);

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
