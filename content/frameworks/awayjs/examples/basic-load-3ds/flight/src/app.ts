import type { Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  configureDirectionalShadowCamera,
  createAabb,
  createCamera,
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
  drawGlSceneShadowMap,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  scaleMatrix4,
  setDirectionalLightDirection,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import {
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
  // The ground is HDR-lit and clips to flat white when it fills the view; ACES tone mapping
  // compresses the highlights back into range, matching the LDR AwayJS original.
  effects: [createToneMapEffect({ operator: 'aces' })],
});

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

setMatrix4Identity(modelContainer.localMatrix);
// AwayJS places the loader at z = -200; flipped to +200 for Flight's right-handed z. The 3DS
// Z-up->Y-up rotation lands the ant at ~-195 in world z after scaling, so +200 centers it.
translateMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 0, 0, 200);
scaleMatrix4(modelContainer.localMatrix, modelContainer.localMatrix, 300, 300, 300);
invalidateNodeLocalTransform(modelContainer);
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

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
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
  drawGlSceneShadowMap(ctx.state, scene, shadowCamera);

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
