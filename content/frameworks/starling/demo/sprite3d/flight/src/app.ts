import type { Node3D, RenderProxy2D } from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderPass,
  BitmapKind,
  copyQuaternion,
  createBitmap,
  createCamera3D,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createImageResourceFromCanvas,
  createMatrix,
  createMesh,
  createNode2D,
  createNode3D,
  createPerspectiveProjection,
  createQuadMeshGeometry,
  createQuaternion,
  createScene3D,
  createScene3DLights,
  createTexture,
  createUnlitMaterial,
  createVector3,
  defaultGlBitmapRenderer,
  defaultGlTextLabelRenderer,
  drawGlRenderTargetResult,
  drawGlScene3D,
  enableGlBlendModeSupport,
  endGlRenderPass,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  multiplyQuaternion,
  prepareScene2DRender,
  registerDefaultGlMaterial,
  registerRenderer,
  registerUnlitGlMaterial,
  renderGlBackground,
  renderGlScene2D,
  setCamera3DViewMatrix4FromLookAt,
  setQuaternionFromAxisAngle,
  setVector3,
  TextLabelKind,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;

const LogoX = 322;
const LogoY = 144;
const LogoSize = 192;
const HalfSize = LogoSize / 2;

const FaceColors: [number, number, number][] = [
  [0xff, 0x00, 0x00],
  [0x00, 0xff, 0x00],
  [0x00, 0x00, 0xff],
  [0xff, 0xff, 0x00],
  [0xff, 0x00, 0xff],
  [0x00, 0xff, 0xff],
];

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(GameWidth, GameHeight, pixelRatio);
document.body.appendChild(canvas);

const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  sceneGraphSyncPolicy: 'refreshDerivedState',
});

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
registerDefaultGlMaterial(state);
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
enableGlBlendModeSupport(state);
registerUnlitGlMaterial(state);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const atlasImg = await new Promise<HTMLImageElement>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.src = 'starling/textures/1x/atlas.png';
});

const faceTextures = FaceColors.map(([r, g, b]) => {
  const c = document.createElement('canvas');
  c.width = LogoSize;
  c.height = LogoSize;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(atlasImg, LogoX, LogoY, LogoSize, LogoSize, 0, 0, LogoSize, LogoSize);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, LogoSize, LogoSize);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(atlasImg, LogoX, LogoY, LogoSize, LogoSize, 0, 0, LogoSize, LogoSize);
  const image = createImageResourceFromCanvas(c);
  return createTexture({ image });
});

const rtWidth = Math.round(GameWidth * pixelRatio);
const rtHeight = Math.round(GameHeight * pixelRatio);
const cubeRT = createGlRenderTarget(state, {
  width: rtWidth,
  height: rtHeight,
  format: 'rgba8',
  depth: 'depth-stencil',
  clearColors: [0],
  clearDepth: 1,
});

const Cube3DKind = 'Cube3D';
const cubeTransform = createMatrix(1 / pixelRatio, 0, 0, 1 / pixelRatio, 0, 0);

registerRenderer(state, Cube3DKind, {
  createData() {
    return null;
  },
  submit(_rs, proxy) {
    drawGlRenderTargetResult(state, proxy as RenderProxy2D, cubeRT, cubeTransform);
  },
});

const cubeLayer = createNode2D(Cube3DKind);
addNodeChild(root, cubeLayer);

const scene3d = createScene3D();
const cubeParent: Node3D = createNode3D();
addNodeChild(scene3d.root, cubeParent);

const quadGeometry = createQuadMeshGeometry(LogoSize, LogoSize);

const faceAxis = createVector3(0, 0, 0);
const faceQuat = createQuaternion();

interface FaceDef {
  px: number;
  py: number;
  pz: number;
  ax: number;
  ay: number;
  az: number;
  angle: number;
}

const faceDefs: FaceDef[] = [
  { px: 0, py: 0, pz: HalfSize, ax: 0, ay: 0, az: 0, angle: 0 },
  { px: 0, py: 0, pz: -HalfSize, ax: 0, ay: 1, az: 0, angle: Math.PI },
  { px: 0, py: HalfSize, pz: 0, ax: 1, ay: 0, az: 0, angle: -Math.PI / 2 },
  { px: 0, py: -HalfSize, pz: 0, ax: 1, ay: 0, az: 0, angle: Math.PI / 2 },
  { px: -HalfSize, py: 0, pz: 0, ax: 0, ay: 1, az: 0, angle: -Math.PI / 2 },
  { px: HalfSize, py: 0, pz: 0, ax: 0, ay: 1, az: 0, angle: Math.PI / 2 },
];

for (let i = 0; i < 6; i++) {
  const def = faceDefs[i]!;
  const material = createUnlitMaterial({ baseColor: 0xffffffff });
  material.baseColorMap = faceTextures[i]!;

  const mesh = createMesh(quadGeometry, [material]);
  setVector3(mesh.position, def.px, def.py, def.pz);

  if (def.angle !== 0) {
    setVector3(faceAxis, def.ax, def.ay, def.az);
    setQuaternionFromAxisAngle(faceQuat, faceAxis, def.angle);
    copyQuaternion(mesh.rotation, faceQuat);
  }

  invalidateNodeLocalTransform(mesh);
  addNodeChild(cubeParent, mesh);
}

const cubeDistance = 400;
setVector3(cubeParent.position, 0, 0, -cubeDistance);
invalidateNodeLocalTransform(cubeParent);

const fovY = 2 * Math.atan(GameHeight / 2 / cubeDistance);
const camera = createCamera3D({
  near: 1,
  far: 2000,
  projection: createPerspectiveProjection({
    fovY,
    aspect: GameWidth / GameHeight,
  }),
});

const eye = createVector3(0, 0, 0);
const lookTarget = createVector3(0, 0, -1);
const up = createVector3(0, 1, 0);
setCamera3DViewMatrix4FromLookAt(camera, eye, lookTarget, up);

const lights = createScene3DLights();

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 50,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 50 + 4;
addNodeChild(root, backBtn.root);

const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);
const zAxis = createVector3(0, 0, 1);
const quatX = createQuaternion();
const quatY = createQuaternion();
const quatZ = createQuaternion();
const quatTemp = createQuaternion();

const startTime = performance.now();

function renderCube(now: number): void {
  const elapsed = (now - startTime) / 1000;
  const rx = ((elapsed / 6) * Math.PI * 2) % (Math.PI * 2);
  const ry = ((elapsed / 7) * Math.PI * 2) % (Math.PI * 2);
  const rz = ((elapsed / 8) * Math.PI * 2) % (Math.PI * 2);

  setQuaternionFromAxisAngle(quatX, xAxis, rx);
  setQuaternionFromAxisAngle(quatY, yAxis, ry);
  setQuaternionFromAxisAngle(quatZ, zAxis, rz);
  multiplyQuaternion(quatTemp, quatX, quatY);
  multiplyQuaternion(quatTemp, quatTemp, quatZ);
  copyQuaternion(cubeParent.rotation, quatTemp);
  invalidateNodeLocalTransform(cubeParent);

  beginGlRenderPass(state, cubeRT);
  drawGlScene3D(state, scene3d.root, camera, lights);
  endGlRenderPass(state);

  const gl = state.gl;
  gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
}

renderCube(performance.now());
prepareScene2DRender(state, root);
renderGlBackground(state);
renderGlScene2D(state, root);

function frame(now: number): void {
  renderCube(now);
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
