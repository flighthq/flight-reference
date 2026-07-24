import type { Mesh, PerspectiveProjection, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  bakeGlEnvironmentIbl,
  createEnvironment,
  createFxaaEffect,
  createScene,
  createSceneFromAwd2,
  createSceneLights,
  createTexture,
  createToneMapEffect,
  getNodeChildren,
  loadImageResourceFromUrl,
  packOpaqueColor,
} from '@flighthq/sdk';

import {
  awayDirection,
  createCameraFromAway,
  createFirstPersonControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { createCubeTextureFromAwayFaces } from '../../../_shared/flight/src/cubemap';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createAwayMatteMaterial } from '../../../_shared/flight/src/materials';
import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';
import type { SkyboxRenderState } from '../../../_shared/flight/src/scene3d';
import { createScene3DContext, renderSkyboxScene } from '../../../_shared/flight/src/scene3d';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: packOpaqueColor(0x9090e7),
  effects: [createToneMapEffect(), createFxaaEffect()],
});

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
  Material__298: 'background.jpg',
  bricks: 'bricks_a_diff.jpg',
  ceiling: 'ceiling_a_diff.jpg',
  chain: 'chain_texture.png',
  column_a: 'column_a_diff.jpg',
  column_b: 'column_b_diff.jpg',
  column_c: 'column_c_diff.jpg',
  fabric_g: 'curtain_blue_diff.jpg',
  fabric_c: 'curtain_diff.jpg',
  fabric_f: 'curtain_green_diff.jpg',
  details: 'details_diff.jpg',
  fabric_d: 'fabric_blue_diff.jpg',
  fabric_a: 'fabric_diff.jpg',
  fabric_e: 'fabric_green_diff.jpg',
  flagpole: 'flagpole_diff.jpg',
  floor: 'floor_a_diff.jpg',
  '16___Default': 'gi_flag.jpg',
  Material__25: 'lion.jpg',
  roof: 'roof_diff.jpg',
  leaf: 'thorn_diff.png',
  vase: 'vase_dif.jpg',
  vase_hanging: 'vase_hanging.jpg',
  Material__57: 'vase_plant.png',
  vase_round: 'vase_round.jpg',
};

const materialNameToNormalFile: Record<string, string> = {
  arch: 'arch_ddn.jpg',
  Material__298: 'background_ddn.jpg',
  bricks: 'bricks_a_ddn.jpg',
  chain: 'chain_texture_ddn.jpg',
  column_a: 'column_a_ddn.jpg',
  column_b: 'column_b_ddn.jpg',
  column_c: 'column_c_ddn.jpg',
  Material__25: 'lion2_ddn.jpg',
  leaf: 'thorn_ddn.jpg',
  vase: 'vase_ddn.jpg',
  vase_round: 'vase_round_ddn.jpg',
};

const materialNameToSpecularFile: Record<string, string> = {
  arch: 'arch_spec.jpg',
  bricks: 'bricks_a_spec.jpg',
  ceiling: 'ceiling_a_spec.jpg',
  column_a: 'column_a_spec.jpg',
  column_b: 'column_b_spec.jpg',
  column_c: 'column_c_spec.jpg',
  fabric_g: 'curtain_spec.jpg',
  fabric_c: 'curtain_spec.jpg',
  fabric_f: 'curtain_spec.jpg',
  details: 'details_spec.jpg',
  fabric_d: 'fabric_spec.jpg',
  fabric_a: 'fabric_spec.jpg',
  fabric_e: 'fabric_spec.jpg',
  flagpole: 'flagpole_spec.jpg',
  floor: 'floor_a_spec.jpg',
  leaf: 'thorn_spec.jpg',
  Material__57: 'vase_plant_spec.jpg',
  vase_round: 'vase_round_spec.jpg',
};

const alphaCutoutMaterials = new Set(['chain', 'leaf', 'Material__57']);

const sponzaTextureFiles = [
  ...new Set([
    ...Object.values(materialNameToTextureFile),
    ...Object.values(materialNameToNormalFile),
    ...Object.values(materialNameToSpecularFile),
  ]),
];

const skyboxFaceFiles = [
  'hourglass_posX.jpg',
  'hourglass_negX.jpg',
  'hourglass_posY.jpg',
  'hourglass_negY.jpg',
  'hourglass_posZ.jpg',
  'hourglass_negZ.jpg',
];

const [awdBuffer, sponzaTextureImages, skyboxFaceImages] = await Promise.all([
  fetch('awayjs/assets/sponza/sponza.awd').then((r) => r.arrayBuffer()),
  Promise.all(sponzaTextureFiles.map((file) => loadImageResourceFromUrl(`awayjs/assets/sponza/${file}`))),
  Promise.all(skyboxFaceFiles.map((file) => loadImageResourceFromUrl(`awayjs/assets/skybox/${file}`))),
]);

const textureMap = new Map<string, ReturnType<typeof createTexture>>();
for (const file of new Set(Object.values(materialNameToTextureFile))) {
  const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
  if (image) textureMap.set(file, createTexture({ image }));
}
for (const file of new Set(Object.values(materialNameToNormalFile))) {
  const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
  if (image) textureMap.set(file, createTexture({ image, colorSpace: 'linear' }));
}
for (const file of new Set(Object.values(materialNameToSpecularFile))) {
  const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
  if (!image) continue;

  const metallicRoughnessImage = createMetallicRoughnessImage(image, (r, g, b) => {
    const specular = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return {
      roughness: Math.max(0.12, 1 - specular * 1.7),
      metallic: 0,
    };
  });
  textureMap.set(file, createTexture({ image: metallicRoughnessImage, colorSpace: 'linear' }));
}

const materialCache = new Map<string, StandardPbrMaterial>();

function getOrCreateMaterial(name: string): StandardPbrMaterial {
  let mat = materialCache.get(name);
  if (mat) return mat;

  mat = createAwayMatteMaterial(0xffffffff);

  const textureFile = materialNameToTextureFile[name];
  if (textureFile) {
    const tex = textureMap.get(textureFile);
    if (tex) mat.baseColorMap = tex;
  }

  const normalFile = materialNameToNormalFile[name];
  if (normalFile) {
    const tex = textureMap.get(normalFile);
    if (tex) mat.normalMap = tex;
  }

  const specularFile = materialNameToSpecularFile[name];
  if (specularFile) {
    const tex = textureMap.get(specularFile);
    if (tex) mat.metallicRoughnessMap = tex;
  }

  if (alphaCutoutMaterials.has(name)) {
    mat.alphaMode = 'mask';
    mat.alphaCutoff = 0.5;
    mat.doubleSided = true;
  }

  materialCache.set(name, mat);
  return mat;
}

const defaultMaterial = createAwayMatteMaterial(packOpaqueColor(0xcccccc), 10);
const materialNamesBySpecificity = Object.keys(materialNameToTextureFile).sort((a, b) => b.length - a.length);

function walkAndAssignMaterials(node: SceneNode): void {
  const mesh = node as Mesh;
  if (mesh.materials) {
    const materialName = mesh.name ?? '';
    const nameParts = materialName.split('_');
    const matchedName = materialNamesBySpecificity.find(
      (name) => materialName.includes(name) || nameParts.some((part) => part === name),
    );

    if (matchedName) {
      mesh.materials[0] = getOrCreateMaterial(matchedName);
    } else {
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

const awdScene = createSceneFromAwd2(new Uint8Array(awdBuffer));

walkAndAssignMaterials(awdScene.root);

for (const child of getNodeChildren(awdScene.root)) {
  addNodeChild(scene.root, child);
}

const cubeTexture = createCubeTextureFromAwayFaces(skyboxFaceImages);
const environment = createEnvironment({
  environment: cubeTexture,
  intensity: 1,
});
bakeGlEnvironmentIbl(ctx.state, environment);
const skyboxRef: SkyboxRenderState = { pipeline: null };
const verifyFrame = createGlFrameVerifier(ctx.state);

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

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedYaw = fps.yaw;
  savedPitch = fps.pitch;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
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
  renderSkyboxScene(ctx.state, ctx.canvas, skyboxRef, environment, scene.root, camera, lights);
  verifyFrame();
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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
