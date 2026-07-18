import type { GlRenderTarget, Mesh, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  loadImageResourceFromUrl,
  packOpaqueColor,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
} from '@flighthq/sdk';

import {
  awayDirection,
  createCameraFromAway,
  createFirstPersonControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
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
  backgroundColor: packOpaqueColor(0x9090e7),
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

const lightElevation = Math.PI / 18;
const lightAzimuth = Math.PI / 2;
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(
    Math.sin(lightElevation) * Math.cos(lightAzimuth),
    -Math.cos(lightElevation),
    Math.sin(lightElevation) * Math.sin(lightAzimuth),
  ),
  color: 0xeedddd,
  ambient: 0.35,
  ambientColor: 0x808090,
});
const lights = createSceneLights({ ambient, directional });

const materialNameToTextureFile: Record<string, string> = {
  arch: 'arch_diff.jpg',
  bricks: 'bricks_a_diff.jpg',
  ceiling: 'ceiling_a_diff.jpg',
  column_a: 'column_a_diff.jpg',
  column_b: 'column_b_diff.jpg',
  column_c: 'column_c_diff.jpg',
  floor: 'floor_a_diff.jpg',
  roof: 'roof_diff.jpg',
};

const textureFiles = [...new Set(Object.values(materialNameToTextureFile))];

const [awdBuffer, ...textureImages] = await Promise.all([
  fetch('awayjs/assets/sponza/sponza.awd').then((r) => r.arrayBuffer()),
  ...textureFiles.map((file) => loadImageResourceFromUrl(`awayjs/assets/sponza/${file}`)),
]);

const textureMap = new Map<string, ReturnType<typeof createTexture>>();
for (let i = 0; i < textureFiles.length; i++) {
  textureMap.set(textureFiles[i], createTexture({ image: textureImages[i] }));
}

const materialCache = new Map<string, StandardPbrMaterial>();

function getOrCreateMaterial(name: string): StandardPbrMaterial {
  let mat = materialCache.get(name);
  if (mat) return mat;

  mat = createStandardPbrMaterial({
    baseColor: 0xffffffff,
    metallic: 0,
    roughness: getPbrRoughnessFromPhongShininess(20),
  });

  const textureFile = materialNameToTextureFile[name];
  if (textureFile) {
    const tex = textureMap.get(textureFile);
    if (tex) mat.baseColorMap = tex;
  }

  materialCache.set(name, mat);
  return mat;
}

const defaultMaterial = createStandardPbrMaterial({
  baseColor: packOpaqueColor(0xcccccc),
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});

function walkAndAssignMaterials(node: SceneNode): void {
  const mesh = node as Mesh;
  if (mesh.materials) {
    const materialName = mesh.name ?? '';
    const nameParts = materialName.split('_');
    let resolved = false;

    for (const [key] of Object.entries(materialNameToTextureFile)) {
      if (materialName.includes(key) || nameParts.some((p) => p === key)) {
        mesh.materials[0] = getOrCreateMaterial(key);
        resolved = true;
        break;
      }
    }

    if (!resolved) {
      if (mesh.materials.length === 0) {
        mesh.materials.push(defaultMaterial);
      } else {
        const existingMat = mesh.materials[0] as StandardPbrMaterial;
        if (!existingMat.baseColorMap) {
          mesh.materials[0] = defaultMaterial;
        }
      }
    }
  }

  for (const child of getNodeChildren(node)) {
    walkAndAssignMaterials(child as SceneNode);
  }
}

const awdScene = createSceneFromAwd(new Uint8Array(awdBuffer));

walkAndAssignMaterials(awdScene);

for (const child of getNodeChildren(awdScene)) {
  addNodeChild(scene, child);
}

const fps = createFirstPersonControllerFromAway(camera, {
  y: 150,
  yaw: 90,
  minPitch: -80,
  maxPitch: 80,
});

const walkIncrement = 10;
const strafeIncrement = 10;
const drag = 0.5;

let walkSpeed = 0;
let strafeSpeed = 0;
let walkAccel = 0;
let strafeAccel = 0;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedYaw = fps.yaw;
let savedPitch = fps.pitch;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedYaw = fps.yaw;
  savedPitch = fps.pitch;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  fps.yaw = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedYaw;
  fps.pitch = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedPitch;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

const keysDown = new Set<string>();

window.addEventListener('keydown', (e: KeyboardEvent) => {
  keysDown.add(e.key.toLowerCase());
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  keysDown.delete(e.key.toLowerCase());
});

const fwd = { x: 0, y: 0, z: 0 };
const rgt = { x: 0, y: 0, z: 0 };

function frame(): void {
  walkAccel = 0;
  strafeAccel = 0;

  if (keysDown.has('w') || keysDown.has('arrowup')) walkAccel = walkIncrement;
  if (keysDown.has('s') || keysDown.has('arrowdown')) walkAccel = -walkIncrement;
  if (keysDown.has('a') || keysDown.has('arrowleft')) strafeAccel = -strafeIncrement;
  if (keysDown.has('d') || keysDown.has('arrowright')) strafeAccel = strafeIncrement;

  walkSpeed = (walkSpeed + walkAccel) * drag;
  if (Math.abs(walkSpeed) < 0.01) walkSpeed = 0;

  strafeSpeed = (strafeSpeed + strafeAccel) * drag;
  if (Math.abs(strafeSpeed) < 0.01) strafeSpeed = 0;

  fps.forward(fwd);
  fps.right(rgt);

  fps.position.x += fwd.x * walkSpeed + rgt.x * strafeSpeed;
  fps.position.z += fwd.z * walkSpeed + rgt.z * strafeSpeed;

  fps.update();
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
