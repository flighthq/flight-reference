import {
  addNodeChild,
  copyQuaternion,
  createBoxMeshGeometry,
  createCamera3D,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createImageResourceFromCanvas,
  createMatrix,
  createMesh,
  createPerspectiveProjection,
  createQuaternion,
  createRenderTexture,
  createScene3D,
  createScene3DLights,
  createSprite,
  createTexture,
  createUnlitMaterial,
  createVector3,
  defaultGlSpriteRenderer,
  defaultGlTextLabelRenderer,
  drawGlScene3D,
  enableGlBlendModeSupport,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  multiplyQuaternion,
  prepareScene2DRender,
  registerRenderer,
  registerGlImageTextureResolver,
  registerGlRenderTextureResolver,
  registerStandardGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
  renderGlScene2D,
  renderIntoGlRenderTexture,
  setCamera3DViewMatrix4FromLookAt,
  setMeshGeometrySubsets,
  setQuaternionFromAxisAngle,
  setSpriteTexture,
  setVector3,
  SpriteKind,
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
registerStandardGlMaterial(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
// Sprites resolve their texture through the backing-kind registry; without these the background
// sprite and the cube's render texture both resolve to null and draw nothing.
registerGlImageTextureResolver(state);
registerGlRenderTextureResolver(state);
enableGlBlendModeSupport(state);
registerUnlitGlMaterial(state);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
setSpriteTexture(bgSprite, createTexture({ source: bgImage }));
addNodeChild(root, bgSprite);

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
  return createTexture({ source: image, flipY: true });
});

// The 3D cube renders into an offscreen texture sized in device pixels; the sprite carrying it is
// scaled back down so the 2D walk's pixelRatio transform does not apply the ratio a second time.
const cubeTexture = createRenderTexture({
  width: Math.round(GameWidth * pixelRatio),
  height: Math.round(GameHeight * pixelRatio),
  depth: 'depth-stencil',
});
const cubeLayer = createSprite();
setSpriteTexture(cubeLayer, cubeTexture);
cubeLayer.scaleX = 1 / pixelRatio;
cubeLayer.scaleY = 1 / pixelRatio;
invalidateNodeLocalTransform(cubeLayer);
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

  renderIntoGlRenderTexture(state, cubeTexture, (target) => {
    drawGlScene3D(target, scene3d.root, camera, lights);
  });
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
