import type { GlRenderTarget, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
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
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';
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
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 1000 });

const lightDirection = (120 * Math.PI) / 180;
const lightElevation = (30 * Math.PI) / 180;

const { directional, ambient } = createDirectionalLightFromAway({
  direction: {
    x: Math.sin(lightElevation) * Math.cos(lightDirection),
    y: -Math.cos(lightElevation),
    z: -Math.sin(lightElevation) * Math.sin(lightDirection),
  },
  color: 0xffeedd,
  ambient: 1,
  ambientColor: 0x101025,
});

// AwayJS PointLight defaults to fallOff = 100000; map that outer radius to Flight's range so the
// point lights match the original rather than a hand-picked cutoff. Note Flight's punctual lights
// use inverse-square attenuation while AwayJS keeps full intensity out to its radius, so these
// lights (positioned ~2000-3000 units away) read far dimmer here than in the original regardless
// of range — the head is lit almost entirely by the directional + ambient terms.
const blueLight = createPointLightFromAway({ color: 0x4080ff, range: 100000 });
blueLight.position.x = 3000;
blueLight.position.z = -700;
blueLight.position.y = 20;

const redLight = createPointLightFromAway({ color: 0x802010, range: 100000 });
redLight.position.x = -2000;
redLight.position.z = -800;
redLight.position.y = -400;

const lights = createSceneLights({
  ambient,
  directional,
  point: [blueLight, redLight],
});

const headMaterial: StandardPbrMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});

async function tryLoadImage(url: string): Promise<Awaited<ReturnType<typeof loadImageResourceFromUrl>> | null> {
  try {
    return await loadImageResourceFromUrl(url);
  } catch {
    return null;
  }
}

const [diffuseImage, specularImage, normalImage, awdBuffer] = await Promise.all([
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_diffuse.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_specular.jpg'),
  tryLoadImage('awayjs/assets/monsterhead/monsterhead_normals.jpg'),
  fetch('awayjs/assets/monsterhead/MonsterHead.awd').then((r) => r.arrayBuffer()),
]);

if (diffuseImage) headMaterial.baseColorMap = createTexture({ image: diffuseImage });
if (specularImage) headMaterial.metallicRoughnessMap = createTexture({ image: specularImage, colorSpace: 'linear' });
if (normalImage) headMaterial.normalMap = createTexture({ image: normalImage, colorSpace: 'linear' });

const awdScene = createSceneFromAwd(new Uint8Array(awdBuffer));

function assignMaterialToMeshes(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(headMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i] = headMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignMaterialToMeshes(child);
  }
}

assignMaterialToMeshes(awdScene);

for (const child of getNodeChildren(awdScene)) {
  setMatrix4Identity(child.localMatrix);
  // Translate before scale so the -20 world offset matches AwayJS (node y=-20 with a
  // geometry-only scale of 4); scaling first would multiply the offset to -80.
  translateMatrix4(child.localMatrix, child.localMatrix, 0, -20, 0);
  scaleMatrix4(child.localMatrix, child.localMatrix, 4, 4, 4);
  invalidateNodeLocalTransform(child);
  addNodeChild(scene, child);
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 800,
  panAngle: 225,
  tiltAngle: 10,
  minTiltAngle: -90,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

function frame(): void {
  orbit.update();
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
