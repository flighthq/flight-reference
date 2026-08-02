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
  BlendMode,
  copyQuaternion,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createQuaternion,
  createSampler,
  createScene3D,
  createScene3DLights,
  createTexture,
  createToneMapEffect,
  createTorusMeshGeometry,
  createVector3,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  multiplyQuaternion,
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
  setCamera3DViewMatrix4FromLookAt,
  setQuaternionFromAxisAngle,
  setVector3,
} from '@flighthq/sdk';

import { awayDirection, awayPosition, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { applyAwayGloss, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createScene3DContext } from './renderer';

const DEG = Math.PI / 180;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 120, near: 0.1 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0xffffff,
  diffuse: 2.8,
  ambient: 0.4,
  ambientColor: 0x85b2cd,
  shading: 'phong',
});
const lights = createScene3DLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/spacy_texture.png');
// The texture contains hard, binary-alpha window cutouts. Mipmap averaging turns those cutouts into
// bright partial-coverage texels, which show up as pale borders under additive blending. Match the
// source ImageSampler's smooth base-level sampling without generating alpha-bleeding mip levels.
const texture = createTexture({
  source: image,
  sampler: createSampler({ magFilter: 'linear', minFilter: 'linear', mipmaps: false }),
});

// AwayJS MethodMaterial uses a classic Phong response. Keeping this demo on Flight's classic path
// avoids the dielectric Fresnel rim that the PBR material turned into white outlines under additive
// blending, while preserving the original transparent, double-sided space-texture treatment.
const material = createBlinnPhongMaterial({
  // A cool diffuse tint keeps the source texture's white texels luminous without clipping the
  // silhouette to neutral white under the demo's intentionally strong 2.8× directional light.
  diffuse: 0x80a8c0ff,
  diffuseMap: texture,
  alphaMode: 'blend',
  blendMode: BlendMode.Add,
  doubleSided: true,
});
// The additive space texture already supplies its own luminous detail. A second white specular lobe
// accumulates at silhouettes and reintroduces the very edge halo the classic material avoids.
applyAwayGloss(material, { gloss: 50, specular: 0 });

const torusGeometry = createTorusMeshGeometry(150, 80, 32, 16);
const torus = createMesh(torusGeometry, [material]);
addNodeChild(scene.root, torus);

const cubeGeometry = createBoxMeshGeometry(20, 20, 20);
const cube = createMesh(cubeGeometry, [material]);
setVector3(cube.position, ...awayPosition(130, 0, 40));
invalidateNodeLocalTransform(cube);
addNodeChild(scene.root, cube);

const eye = createVector3(130, 0, 0);
const lookTarget = createVector3(...awayPosition(130, 0, 40));
const up = createVector3(0, 1, 0);
const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);
const scratchQuatA = createQuaternion();
const scratchQuatB = createQuaternion();

let cameraAngle = 0;
let torusAngleY = 0;
let cubeAngleX = 0;
let cubeAngleY = 0;

setCamera3DViewMatrix4FromLookAt(camera, eye, lookTarget, up);

function frame(): void {
  cameraAngle += DEG;
  torusAngleY -= DEG;
  cubeAngleX -= 0.4 * DEG;
  cubeAngleY -= 0.4 * DEG;

  up.x = -Math.sin(cameraAngle);
  up.y = Math.cos(cameraAngle);
  up.z = 0;

  setCamera3DViewMatrix4FromLookAt(camera, eye, lookTarget, up);

  setQuaternionFromAxisAngle(scratchQuatA, yAxis, torusAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, Math.PI / 2);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  copyQuaternion(torus.rotation, scratchQuatA);
  invalidateNodeLocalTransform(torus);

  setQuaternionFromAxisAngle(scratchQuatA, yAxis, cubeAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, cubeAngleX);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  copyQuaternion(cube.rotation, scratchQuatA);
  invalidateNodeLocalTransform(cube);

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

frame();
