import type { BlinnPhongMaterial, GlRenderTarget, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  appendMatrix4,
  copyMatrix4,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMatrix4,
  createScene,
  createSceneLights,
  createVector3,
  DEG_TO_RAD,
  findNode,
  invalidateNodeLocalTransform,
  isMesh,
  loadSceneFromAwd,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  resizeGlRenderTarget,
  rotateMatrix4,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { applyAwayGloss, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
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
  backgroundColor: 0x030404ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerBlinnPhongGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ z: -2000, fov: 60 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0x683019,
  diffuse: 2.8,
  ambient: 0.5,
  ambientColor: 0x30353b,
  tuning: {
    diffuse: 0.7,
    ambient: 0.2,
  },
});
const lights = createSceneLights({ ambient, directional });

const buffer = await fetch('awayjs/assets/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = await loadSceneFromAwd(new Uint8Array(buffer));

const templateMesh = findNode(modelScene, isMesh) as Mesh | null;
if (!templateMesh?.geometry) throw new Error('No mesh found in suzanne.awd');
const defaultMaterial = templateMesh.materials[0] as BlinnPhongMaterial;
applyAwayGloss(defaultMaterial, { gloss: 50, specular: 1.8 });

const orient = createMatrix4();
copyMatrix4(orient, templateMesh.localMatrix);

addNodeChild(scene, templateMesh);

const yAxis = createVector3(0, 1, 0);
let rotationAngle = 0;

function frame(): void {
  rotationAngle += -1 * DEG_TO_RAD;
  setMatrix4Identity(templateMesh!.localMatrix);
  translateMatrix4(templateMesh!.localMatrix, templateMesh!.localMatrix, 0, -300, 0);
  rotateMatrix4(templateMesh!.localMatrix, templateMesh!.localMatrix, yAxis, rotationAngle);
  scaleMatrix4(templateMesh!.localMatrix, templateMesh!.localMatrix, 900, 900, 900);
  appendMatrix4(templateMesh!.localMatrix, templateMesh!.localMatrix, orient);
  invalidateNodeLocalTransform(templateMesh!);

  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
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
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
