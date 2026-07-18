import type { StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createBoxMeshGeometry,
  createHemisphereLight,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createSphereMeshGeometry,
  createSampler,
  createStandardPbrMaterial,
  createTexture,
  createTorusMeshGeometry,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  rotateMatrix4,
  scaleMeshGeometryUvs,
  setDirectionalLightDirection,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import {
  awayDirection,
  awayPosition,
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { awayIntensity, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

// Repeating textures are viewed at grazing angles (the ground plane, the ring's tube), so use an
// anisotropic + mipmapped repeat sampler to keep the tiled detail smooth like the AwayJS original.
const tilingSampler = () => createSampler({ wrapU: 'repeat', wrapV: 'repeat', anisotropy: 16 });

// AwayJS lights the scene with two directionals: a white primary (diffuse 0.7, ambient 0.1) whose
// direction sweeps the horizon each frame, and a static cyan secondary (0x00ffff, diffuse 0.7,
// ambient 0.1) pointing straight down. Flight's SceneLights carries only one directional, so the
// animated white primary stays the directional (it drives the per-face shading that gives the
// objects their form; both ambients fold into it: 0.1 + 0.1 = 0.2). The downward cyan secondary
// becomes a low-intensity hemisphere light — a full-strength hemisphere lights side-facing surfaces
// too and washes the directional contrast flat, so keep it dim: enough for the cyan tint, not enough
// to erase the form.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, -1, 0),
  color: 0x00ffff,
  diffuse: 0.7,
  ambient: 0.2,
});
const lights = createSceneLights({ ambient, directional });

// PBR material intent (per the sample's assets): floor = stone (rough dielectric), beach ball =
// vinyl (smooth dielectric), trinket = mixed metal + wood (part-metallic), ring = polished metal.
const planeMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: 0.85,
});
planeMaterial.doubleSided = true;

const sphereMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: 0.3,
});
const cubeMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0.4,
  roughness: 0.5,
});
// The ring reads as polished metal, but this scene has no environment map, so a true metallic
// surface has nothing to reflect and renders black. A dielectric with moderate roughness instead
// catches a soft specular sheen from the sweeping light (with the weave normal for surface detail)
// for a brushed-metal look while staying visible — matching the AwayJS reference.
const torusMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: 0.5,
});

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
setMatrix4Identity(plane.localMatrix);
translateMatrix4(plane.localMatrix, plane.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(plane);
addNodeChild(scene, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setMatrix4Identity(sphere.localMatrix);
translateMatrix4(sphere.localMatrix, sphere.localMatrix, ...awayPosition(300, 160, 300));
invalidateNodeLocalTransform(sphere);
addNodeChild(scene, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setMatrix4Identity(cube.localMatrix);
translateMatrix4(cube.localMatrix, cube.localMatrix, ...awayPosition(300, 160, -250));
invalidateNodeLocalTransform(cube);
addNodeChild(scene, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
// Match AwayJS's scaleUV(10, 5) weave density. Baking the tiling into the vertex UVs (rather than a
// KHR_texture_transform uvScale on the texture) keeps the mip LOD derivative-correct, so the fine
// weave stays crisp instead of aliasing into speckle on the ring's minified far side.
scaleMeshGeometryUvs(torusGeometry, 10, 5);
const torus = createMesh(torusGeometry, [torusMaterial]);
setMatrix4Identity(torus.localMatrix);
translateMatrix4(torus.localMatrix, torus.localMatrix, ...awayPosition(-250, 160, -250));
// AwayJS builds this torus with the default yUp=true (ring in the XZ plane, lying flat); Flight's
// torus ring is in the XY plane, so tilt it 90° about X to lay it flat like the original.
rotateMatrix4(torus.localMatrix, torus.localMatrix, createVector3(1, 0, 0), Math.PI / 2);
invalidateNodeLocalTransform(torus);
addNodeChild(scene, torus);

function applyTextures(
  material: StandardPbrMaterial,
  maps: { diffuse?: string; normal?: string; specular?: string },
  uvScale?: { x: number; y: number },
): Promise<void[]> {
  const jobs: Promise<void>[] = [];
  if (maps.diffuse) {
    const url = maps.diffuse;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image, sampler: uvScale ? tilingSampler() : undefined });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.baseColorMap = tex;
      }),
    );
  }
  if (maps.normal) {
    const url = maps.normal;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image, sampler: uvScale ? tilingSampler() : undefined });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.normalMap = tex;
      }),
    );
  }
  if (maps.specular) {
    const url = maps.specular;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image, sampler: uvScale ? tilingSampler() : undefined });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.metallicRoughnessMap = tex;
      }),
    );
  }
  return Promise.all(jobs);
}

// The 10x5 weave tiling is baked into the torus UVs above, so the weave textures use a plain
// repeat sampler with no uvScale.
const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/assets/weave_normal.jpg');
const torusNormalTex = createTexture({ image: torusWeaveNormalImage, sampler: tilingSampler() });
torusMaterial.normalMap = torusNormalTex;

// AwayJS specular jpgs don't map cleanly onto a glTF metallic-roughness texture (which is
// G = roughness, B = metalness), so drive metalness/roughness from the per-material constants
// above and keep only the diffuse + normal maps.
await Promise.all([
  applyTextures(
    planeMaterial,
    {
      diffuse: 'awayjs/assets/floor_diffuse.jpg',
      normal: 'awayjs/assets/floor_normal.jpg',
    },
    { x: 2, y: 2 },
  ),
  applyTextures(sphereMaterial, {
    diffuse: 'awayjs/assets/beachball_diffuse.jpg',
  }),
  applyTextures(cubeMaterial, {
    diffuse: 'awayjs/assets/trinket_diffuse.jpg',
    normal: 'awayjs/assets/trinket_normal.jpg',
  }),
  loadImageResourceFromUrl('awayjs/assets/weave_diffuse.jpg').then((image) => {
    const tex = createTexture({ image, sampler: tilingSampler() });
    torusMaterial.baseColorMap = tex;
  }),
]);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
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

ctx.canvas.addEventListener('wheel', (event: WheelEvent) => {
  orbit.distance -= event.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;
});

function frame(ts: number): void {
  // Keep the light downward-dominant so surfaces facing up stay bright and side faces stay dark
  // (the per-face contrast that gives the objects their form), with a slow horizontal precession
  // for a moving highlight — a single-directional stand-in for AwayJS's static down + swept pair.
  const lightX = Math.sin(ts / 4000) * 0.4;
  const lightZ = -Math.cos(ts / 4000) * 0.4;
  setDirectionalLightDirection(directional, lightX, -1, lightZ);

  orbit.update();
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
