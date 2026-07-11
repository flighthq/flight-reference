import {
  addNodeChild,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  invalidateImageResource,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

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

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  blend: true,
  kinds: [BitmapKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const atlasImg = await new Promise<HTMLImageElement>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.src = 'starling/assets/textures/1x/atlas.png';
});

const tintedFaces: HTMLCanvasElement[] = FaceColors.map(([r, g, b]) => {
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
  return c;
});

const cubeCanvas = document.createElement('canvas');
cubeCanvas.width = GameWidth;
cubeCanvas.height = GameHeight;
const cubeCtx = cubeCanvas.getContext('2d')!;

const cubeImage = createImageResourceFromCanvas(cubeCanvas);
const cubeBmp = createBitmap();
cubeBmp.data.image = cubeImage;
addNodeChild(root, cubeBmp);

type Vec3 = [number, number, number];

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function rotateZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

function project(v: Vec3): [number, number] {
  const fov = 600;
  const z = v[2] + 500;
  const scale = fov / z;
  return [CenterX + v[0] * scale, CenterY + v[1] * scale];
}

interface Face {
  verts: Vec3[];
  textureIndex: number;
}

const baseFaces: Face[] = [
  {
    verts: [
      [-HalfSize, -HalfSize, -HalfSize],
      [HalfSize, -HalfSize, -HalfSize],
      [HalfSize, HalfSize, -HalfSize],
      [-HalfSize, HalfSize, -HalfSize],
    ],
    textureIndex: 0,
  },
  {
    verts: [
      [HalfSize, -HalfSize, HalfSize],
      [-HalfSize, -HalfSize, HalfSize],
      [-HalfSize, HalfSize, HalfSize],
      [HalfSize, HalfSize, HalfSize],
    ],
    textureIndex: 1,
  },
  {
    verts: [
      [-HalfSize, -HalfSize, HalfSize],
      [HalfSize, -HalfSize, HalfSize],
      [HalfSize, -HalfSize, -HalfSize],
      [-HalfSize, -HalfSize, -HalfSize],
    ],
    textureIndex: 2,
  },
  {
    verts: [
      [-HalfSize, HalfSize, -HalfSize],
      [HalfSize, HalfSize, -HalfSize],
      [HalfSize, HalfSize, HalfSize],
      [-HalfSize, HalfSize, HalfSize],
    ],
    textureIndex: 3,
  },
  {
    verts: [
      [-HalfSize, -HalfSize, HalfSize],
      [-HalfSize, -HalfSize, -HalfSize],
      [-HalfSize, HalfSize, -HalfSize],
      [-HalfSize, HalfSize, HalfSize],
    ],
    textureIndex: 4,
  },
  {
    verts: [
      [HalfSize, -HalfSize, -HalfSize],
      [HalfSize, -HalfSize, HalfSize],
      [HalfSize, HalfSize, HalfSize],
      [HalfSize, HalfSize, -HalfSize],
    ],
    textureIndex: 5,
  },
];

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function drawTexturedQuad(
  ctx: CanvasRenderingContext2D,
  tex: HTMLCanvasElement,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  ctx.clip();

  const w = tex.width;
  const h = tex.height;

  const dx1 = p1[0] - p0[0];
  const dy1 = p1[1] - p0[1];
  const dx2 = p3[0] - p0[0];
  const dy2 = p3[1] - p0[1];

  ctx.setTransform(dx1 / w, dy1 / w, dx2 / h, dy2 / h, p0[0], p0[1]);
  ctx.drawImage(tex, 0, 0);
  ctx.restore();
}

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

const startTime = performance.now();

function renderCube(now: number): void {
  const elapsed = (now - startTime) / 1000;
  const rx = ((elapsed / 6) * Math.PI * 2) % (Math.PI * 2);
  const ry = ((elapsed / 7) * Math.PI * 2) % (Math.PI * 2);
  const rz = ((elapsed / 8) * Math.PI * 2) % (Math.PI * 2);

  cubeCtx.clearRect(0, 0, GameWidth, GameHeight);

  const transformed: { verts: Vec3[]; projected: [number, number][]; depth: number; textureIndex: number }[] = [];

  for (const face of baseFaces) {
    const verts = face.verts.map((v) => {
      let r: Vec3 = [...v];
      r = rotateX(r, rx);
      r = rotateY(r, ry);
      r = rotateZ(r, rz);
      return r;
    });

    const edge1 = sub(verts[1], verts[0]);
    const edge2 = sub(verts[3], verts[0]);
    const normal = cross(edge1, edge2);
    if (normal[2] <= 0) continue;

    const projected = verts.map(project) as [number, number][];
    const depth = (verts[0][2] + verts[1][2] + verts[2][2] + verts[3][2]) / 4;
    transformed.push({ verts, projected, depth, textureIndex: face.textureIndex });
  }

  transformed.sort((a, b) => b.depth - a.depth);

  for (const face of transformed) {
    drawTexturedQuad(
      cubeCtx,
      tintedFaces[face.textureIndex],
      face.projected[0],
      face.projected[1],
      face.projected[2],
      face.projected[3],
    );
  }

  invalidateImageResource(cubeImage);
  invalidateNodeAppearance(cubeBmp);
}

renderCube(performance.now());
prepareDisplayObjectRender(target.state, root);
target.render(root);

function frame(now: number): void {
  renderCube(now);
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
