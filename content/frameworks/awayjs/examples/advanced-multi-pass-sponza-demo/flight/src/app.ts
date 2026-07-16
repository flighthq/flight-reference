import type { BlinnPhongMaterial, Mesh, SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createPerspectiveProjection,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createTexture,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  loadImageResourceFromUrl,
  setCameraViewMatrix4FromLookAt,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x9090e7ff,
});

const scene = createScene();

const camera = createCamera({
  near: 1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 75 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: -1, y: -15, z: -1 },
  color: 0xeeddddff,
  intensity: 0.7,
});

const ambient = createAmbientLight({ color: 0x808090ff, intensity: 0.35 });
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

const materialCache = new Map<string, BlinnPhongMaterial>();

function getOrCreateMaterial(name: string): BlinnPhongMaterial {
  let mat = materialCache.get(name);
  if (mat) return mat;

  mat = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20, specular: 0x404040ff });

  const textureFile = materialNameToTextureFile[name];
  if (textureFile) {
    const tex = textureMap.get(textureFile);
    if (tex) mat.diffuseMap = tex;
  }

  materialCache.set(name, mat);
  return mat;
}

const defaultMaterial = createBlinnPhongMaterial({
  diffuse: 0xccccccff,
  shininess: 10,
  specular: 0x202020ff,
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

    if (!resolved && mesh.materials.length > 0) {
      const existingMat = mesh.materials[0] as BlinnPhongMaterial;
      if (!existingMat.diffuseMap) {
        mesh.materials[0] = defaultMaterial;
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

let yaw = 90 * DEG_TO_RAD;
let pitch = 0;
const posX = 0;
const posY = 150;
const posZ = 0;
const pos = createVector3(posX, posY, posZ);
const eye = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

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
let savedYaw = yaw;
let savedPitch = pitch;

function updateCamera(): void {
  pitch = Math.max(-80 * DEG_TO_RAD, Math.min(80 * DEG_TO_RAD, pitch));

  eye.x = pos.x + Math.sin(yaw) * Math.cos(pitch);
  eye.y = pos.y - Math.sin(pitch);
  eye.z = pos.z - Math.cos(yaw) * Math.cos(pitch);

  setCameraViewMatrix4FromLookAt(camera, pos, eye, up);
}

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedYaw = yaw;
  savedPitch = pitch;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  yaw = 0.3 * DEG_TO_RAD * (e.clientX - lastMouseX) + savedYaw;
  pitch = 0.3 * DEG_TO_RAD * (e.clientY - lastMouseY) + savedPitch;
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

updateCamera();

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

  const forwardX = Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);

  pos.x += forwardX * walkSpeed + rightX * strafeSpeed;
  pos.z += forwardZ * walkSpeed + rightZ * strafeSpeed;

  updateCamera();
  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pr;
  ctx.canvas.height = h * pr;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
