import type { RenderProxy2D } from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderPass,
  BitmapKind,
  copyQuaternion,
  createBitmap,
  createBoxMeshGeometry,
  createCamera3D,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createImageResourceFromCanvas,
  createMatrix,
  createMesh,
  createNode2D,
  createPerspectiveProjection,
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
  flushGlSpriteBatch,
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
  setMeshGeometrySubsets,
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

// createBoxMeshGeometry emits faces in +X, -X, +Y, -Y, +Z, -Z order.
const FaceColors: [number, number, number][] = [
  [0x00, 0xff, 0xff],
  [0xff, 0x00, 0xff],
  [0x00, 0x00, 0xff],
  [0xff, 0xff, 0x00],
  [0xff, 0x00, 0x00],
  [0x00, 0xff, 0x00],
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
  return createTexture({ image, flipY: true });
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
    flushGlSpriteBatch(state);
    drawGlRenderTargetResult(state, proxy as RenderProxy2D, cubeRT, cubeTransform);
  },
});

const cubeLayer = createNode2D(Cube3DKind);
addNodeChild(root, cubeLayer);

const scene3d = createScene3D();
const faceMaterials = faceTextures.map((texture) => {
  const material = createUnlitMaterial({ baseColor: 0xffffffff });
  material.baseColorMap = texture;
  return material;
});

const cubeGeometry = createBoxMeshGeometry(LogoSize, LogoSize, LogoSize);
setMeshGeometrySubsets(
  cubeGeometry,
  faceMaterials.map((_, index) => ({ indexOffset: index * 6, indexCount: 6 })),
);
const cube = createMesh(cubeGeometry, faceMaterials);
addNodeChild(scene3d.root, cube);

const cubeDistance = 400;
setVector3(cube.position, 0, 0, -cubeDistance);
invalidateNodeLocalTransform(cube);

const fovY = 2 * Math.atan(GameHeight / 2 / cubeDistance);
const camera = createCamera3D({
  near: 1,
  far: 2000,
  projection: createPerspectiveProjection({
    fovY,
    aspect: GameWidth / GameHeight,
  }),
});

const eye = createVector3(0, 0, 100);
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
  setQuaternionFromAxisAngle(quatY, yAxis, -ry);
  setQuaternionFromAxisAngle(quatZ, zAxis, -rz);
  multiplyQuaternion(quatTemp, quatX, quatY);
  multiplyQuaternion(quatTemp, quatTemp, quatZ);
  copyQuaternion(cube.rotation, quatTemp);
  invalidateNodeLocalTransform(cube);

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
