import type { GlRenderEffectPipeline, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  computeMeshGeometryNormals,
  configureDirectionalShadowCamera,
  createAabb,
  createCamera,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createOrthographicProjection,
  createPlaneMeshGeometry,
  createScene,
  createSceneFrom3ds,
  createSceneNode,
  createSceneLights,
  createSpecularPbrMaterial,
  createStandardPbrMaterial,
  createTexture,
  createToneMapEffect,
  drawGlScene,
  drawGlSceneShadowMap,
  endGlRenderEffectPipeline,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  loadImageResourceFromUrl,
  registerDefaultGlRenderEffects,
  registerSpecularPbrGlMaterial,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  setDirectionalLightDirection,
} from '@flighthq/sdk';
import { setSceneNodePosition, setSceneNodeScale } from '../../../_shared/flight/src/position';

import {
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
  createCameraFromAway,
  createOrbitControllerFromAway,
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
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);
registerSpecularPbrGlMaterial(state);
registerDefaultGlRenderEffects(state);

const verifyFrame = createGlFrameVerifier(state);

// The ground is HDR-lit and clips to flat white when it fills the view; ACES tone mapping
// compresses the highlights back into range, matching the LDR AwayJS original.
const effects = [createToneMapEffect({ operator: 'aces' })];
let pipeline: GlRenderEffectPipeline | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 2100 });

// AwayJS's DirectionalLight defaults to ambient 0 and this sample adds no ambient light, so the
// ground is lit by the directional alone. A flat ambient here washes out the plane (its edges glow
// against the black background), so let the helper supply the matching ~zero ambient.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(-1, -1, 1),
});

// AwayJS casts the ant's soft shadow onto the ground (ShadowSoftMethod + castsShadows). Enable the
// directional shadow map and reconfigure its orthographic light camera each frame to the animated
// direction. Bounds cover the 1000x1000 ground plane and the ant standing on it.
directional.castsShadow = true;
const shadowCamera = createCamera({
  near: 1,
  far: 10,
  projection: createOrthographicProjection({ halfWidth: 1, halfHeight: 1 }),
});
const shadowBounds = createAabb(-500, -20, -500, 500, 250, 500);

const lights = createSceneLights({ ambient, directional });

// AwayJS sets the ground's specularMethod.strength = 0 (fully matte). Plain metallic-roughness keeps a
// fixed 0.04 dielectric spec that can't be zeroed (glossy highlight when panning, or a broad grey wash
// at max roughness), so use KHR_materials_specular with specular = 0 to remove the specular lobe while
// keeping the correct PBR diffuse energy.
const groundMaterial = createSpecularPbrMaterial({ specular: 0 });
groundMaterial.standard.baseColor = 0xffffffff;
groundMaterial.standard.metallic = 0;
groundMaterial.standard.roughness = 1;
groundMaterial.doubleSided = true;

const groundGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const ground = createMesh(groundGeometry, [groundMaterial]);
addNodeChild(scene, ground);

const [modelBuffer, antImage, sandImage] = await Promise.all([
  fetch('awayjs/assets/soldier_ant.3ds').then((r) => r.arrayBuffer()),
  loadImageResourceFromUrl('awayjs/assets/soldier_ant.jpg'),
  loadImageResourceFromUrl('awayjs/assets/CoarseRedSand.jpg'),
]);

groundMaterial.standard.baseColorMap = createTexture({ image: sandImage });

const modelScene = createSceneFrom3ds(new Uint8Array(modelBuffer));
const antTexture = createTexture({ image: antImage });

const antMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
antMaterial.baseColorMap = antTexture;

for (const child of getNodeChildren(modelScene)) {
  const mesh = child as Mesh;
  if (mesh.geometry) {
    computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
    if (mesh.materials) {
      if (mesh.materials.length === 0) {
        mesh.materials.push(antMaterial);
      } else {
        for (let i = 0; i < mesh.materials.length; i++) {
          mesh.materials[i] = antMaterial;
        }
      }
    }
  }
}

const modelContainer = createSceneNode();
for (const child of getNodeChildren(modelScene)) {
  addNodeChild(modelContainer, child);
}

setSceneNodePosition(modelContainer, 0, 0, 200);
setSceneNodeScale(modelContainer, 300, 300, 300);
addNodeChild(scene, modelContainer);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 10,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (event.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

let startTime = 0;

function frame(ts: number): void {
  if (startTime === 0) startTime = ts;
  const elapsed = ts - startTime;

  const dir = awayDirection(-Math.sin(elapsed / 4000), -1, -Math.cos(elapsed / 4000));
  setDirectionalLightDirection(directional, dir.x, dir.y, dir.z);

  orbit.update();

  // Shadow depth pass from the light's view, before the lit scene draw samples it.
  configureDirectionalShadowCamera(shadowCamera, dir, shadowBounds);
  drawGlSceneShadowMap(state, scene, shadowCamera);

  // Effect-pipeline present: draw the scene into the pipeline's HDR target (clearing background and
  // depth as a direct present would), then run the post-process stack (ACES tone map) to the canvas.
  if (pipeline === null) {
    pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
  }
  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  const gl = state.gl;
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlScene(state, scene, camera, lights);
  endGlRenderEffectPipeline(state, pipeline, effects);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
