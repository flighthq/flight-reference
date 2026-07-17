import type { Camera, CubeTexture, GlRenderTarget, Mesh, SceneLights, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  bakeEnvironmentIbl,
  beginGlRenderTarget,
  computeMeshGeometryNormals,
  createCubeTexture,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMatrix,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlLinearToSrgbPass,
  drawGlScene,
  endGlRenderTarget,
  getNodeChildren,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerBlinnPhongGlMaterial,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  resolveGlRenderTarget,
  resizeGlRenderTarget,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
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
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});
registerBlinnPhongGlMaterial(glState);
registerStandardPbrGlMaterial(glState);

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
bakeEnvironmentIbl(glState, environment);

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

// F14 aircraft — loaded from OBJ model with PBR material for env-map reflection
const f14Material: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xccccccff,
  metallic: 0.7,
  roughness: 0.2,
});

const f14ObjText = await fetch('awayjs/assets/f14/f14d.obj').then((r) => r.text());
const f14FuselageImage = await loadImageResourceFromUrl('awayjs/assets/f14/f14fuselage.jpg');
f14Material.baseColorMap = createTexture({ image: f14FuselageImage });

const f14Scene = createSceneFromObj(f14ObjText);

for (const child of getNodeChildren(f14Scene)) {
  const mesh = child as Mesh;
  if (mesh.geometry) {
    computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
    if (mesh.materials) {
      if (mesh.materials.length === 0) {
        mesh.materials.push(f14Material);
      } else {
        for (let i = 0; i < mesh.materials.length; i++) {
          mesh.materials[i] = f14Material;
        }
      }
    }
  }
}

const f14Container = createScene();
setMatrix4Identity(f14Container.localMatrix);
translateMatrix4(f14Container.localMatrix, f14Container.localMatrix, 0, 200, 0);
invalidateNodeLocalTransform(f14Container);

for (const child of getNodeChildren(f14Scene)) {
  addNodeChild(f14Container, child);
}
addNodeChild(scene, f14Container);
const f14Mesh = f14Container;

// Camera orbits the aircraft continuously
const eye = createVector3(0, 250, 500);
const cameraTarget = createVector3(0, 200, 0);
const up = createVector3(0, 1, 0);

let cameraIncrement = 0;
let rollIncrement = 0;
let loopIncrement = 0;
let flightState = 0;

const zAxis = createVector3(0, 0, 1);
const xAxis = createVector3(1, 0, 0);

// AwayJS applies scaleTo(20,20,20) and a resting rotationX=90 to the f14 (awayjs/src/app.ts:126-127).
// Y-up right-handed Flight negates the AwayJS left-handed X rotation, so the resting pitch is -90.
const F14_SCALE = 20;
const F14_RESTING_PITCH = -90 * DEG_TO_RAD;

let renderTarget: GlRenderTarget | null = null;
const identityMatrix = createMatrix();

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
  } else {
    loopIncrement += 0.05;
    const lz = -Math.cos(loopIncrement) * 20;
    const ly = 200 + Math.sin(loopIncrement) * 20;
    translateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, 0, ly, lz);
    if (loopIncrement > Math.PI * 2) {
      loopIncrement = 0;
      flightState = 0;
    }
  }

  // TRS after the position translate: roll (Z), resting pitch (X), then the 20x scale —
  // mirrors the AwayJS f14 transform (scaleTo(20,20,20) + rotationX=90) the port had dropped.
  rotateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, zAxis, Math.sin(rollIncrement) * 25 * DEG_TO_RAD);
  rotateMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, xAxis, F14_RESTING_PITCH);
  scaleMatrix4(f14Mesh.localMatrix, f14Mesh.localMatrix, F14_SCALE, F14_SCALE, F14_SCALE);

  invalidateNodeLocalTransform(f14Mesh);

  setAwayPosition(eye, Math.cos(cameraIncrement) * 400, 250, Math.sin(cameraIncrement) * 400);
  updateCameraLookAt();

  // Scroll the water normal map to simulate surface flow
  seaNormalTex.uvOffset.y -= 0.04;

  const gl = glState.gl;
  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(glState, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(glState, renderTarget, w, h);
  }

  beginGlRenderTarget(glState, renderTarget, identityMatrix);
  renderGlBackground(glState);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(glState, environment, camera, width / height);
  drawGlScene(glState, scene, camera, lights);
  endGlRenderTarget(glState);
  resolveGlRenderTarget(glState, renderTarget);
  drawGlLinearToSrgbPass(glState, renderTarget, null);

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
