import type { PerspectiveProjection, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createBoxMeshGeometry,
  createFxaaEffect,
  createHemisphereLight,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createSphereMeshGeometry,
  createSampler,
  createStandardPbrMaterial,
  createTexture,
  createTilingSampler,
  createToneMapEffect,
  createTorusMeshGeometry,
  createQuaternion,
  createVector3,
  loadImageResourceFromUrl,
  scaleMeshGeometryUvs,
  setDirectionalLightDirection,
  setQuaternionFromAxisAngle,
  copyQuaternion,
  invalidateNodeLocalTransform,
  setVector3,
  setTextureUvScale,
} from '@flighthq/sdk';

import {
  awayDirection,
  awayPosition,
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { awayIntensity, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
  effects: [createToneMapEffect({ exposure: 1.8 }), createFxaaEffect()],
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

// Repeating textures are viewed at grazing angles (the ground plane, the ring's tube), so retain
// high anisotropy on Flight's mipmapped tiling sampler to keep the detail smooth.
const tilingSampler = createTilingSampler();
tilingSampler.anisotropy = 16;

// AwayJS lights the scene with two directionals: a white primary (diffuse 0.7, ambient 0.1) whose
// direction sweeps the horizon each frame, and a static cyan secondary (0x00ffff, diffuse 0.7,
// ambient 0.1) pointing straight down. Flight's SceneLights carries one directional, so the animated
// white primary stays the directional — it's the moving light, grazing the surfaces so the shading
// and the specular highlights on the metal sweep as it turns (this is what keeps the scene lively).
// The downward cyan secondary becomes a hemisphere light: cyan from above tints the up-facing floor
// and the tops of the objects, standing in for the straight-down cyan directional.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, -1, 0),
  diffuse: 0.7,
  ambient: 0.2,
});
const cyanFill = createHemisphereLight({
  skyColor: 0x00ffffff,
  groundColor: 0x000000ff,
  intensity: awayIntensity(0.5),
});
const lights = createSceneLights({ ambient, directional, hemisphere: [cyanFill] });

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
// The trinket is a metal frame around a wood panel. trinket_specular marks where it's shiny (bright
// = metal frame) vs matte (dark = wood), so it's converted into a metallic-roughness map below. The
// factors here scale that map: metallic reaches ~0.6 on the frame (0 on the wood), roughness is
// taken straight from the map (frame smooth/reflective so the sweeping light glints off it, wood
// rough/matte).
const cubeMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0.6,
  roughness: 1,
});
// Polished metal ring. With no environment map a fully metallic surface would render black (nothing
// to reflect), so keep it part-metallic with low roughness: it stays visible (the weave shows) but
// the low roughness makes the sweeping light throw a bright specular highlight across it that tracks
// the light — the "shiny metal" read from the AwayJS original.
const torusMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0.4,
  roughness: 0.22,
});

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
plane.position.y = -20;
invalidateNodeLocalTransform(plane);
addNodeChild(scene.root, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setVector3(sphere.position, ...awayPosition(300, 160, 300));
invalidateNodeLocalTransform(sphere);
addNodeChild(scene.root, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setVector3(cube.position, ...awayPosition(300, 160, -250));
invalidateNodeLocalTransform(cube);
addNodeChild(scene.root, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
// Match AwayJS's scaleUV(10, 5) weave density. Baking the tiling into the vertex UVs (rather than a
// KHR_texture_transform uvScale on the texture) keeps the mip LOD derivative-correct, so the fine
// weave stays crisp instead of aliasing into speckle on the ring's minified far side.
scaleMeshGeometryUvs(torusGeometry, 10, 5);
const torus = createMesh(torusGeometry, [torusMaterial]);
setVector3(torus.position, ...awayPosition(-250, 160, -250));
const torusRotation = createQuaternion();
setQuaternionFromAxisAngle(torusRotation, createVector3(1, 0, 0), Math.PI / 2);
copyQuaternion(torus.rotation, torusRotation);
invalidateNodeLocalTransform(torus);
addNodeChild(scene.root, torus);

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
        const tex = createTexture({ image, sampler: uvScale ? tilingSampler : createSampler() });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.baseColorMap = tex;
      }),
    );
  }
  if (maps.normal) {
    const url = maps.normal;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        // Normal maps are data, not color — they must stay linear (an sRGB decode would bend the
        // packed normals and flatten/skew the surface relief).
        const tex = createTexture({
          image,
          colorSpace: 'linear',
          sampler: uvScale ? tilingSampler : createSampler(),
        });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.normalMap = tex;
      }),
    );
  }
  return Promise.all(jobs);
}

async function createMetalRoughnessFromSpecular(url: string): Promise<ReturnType<typeof createTexture>> {
  const image = await loadImageResourceFromUrl(url);
  const mrImage = createMetallicRoughnessImage(image, (r) => ({
    roughness: Math.max(0.12, 1 - r * 1.7),
    metallic: r,
  }));
  return createTexture({ image: mrImage, colorSpace: 'linear' });
}

// The 10x5 weave tiling is baked into the torus UVs above, so the weave textures use a plain
// repeat sampler with no uvScale.
const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/assets/weave_normal.jpg');
const torusNormalTex = createTexture({
  image: torusWeaveNormalImage,
  colorSpace: 'linear',
  sampler: tilingSampler,
});
torusMaterial.normalMap = torusNormalTex;

await Promise.all([
  applyTextures(
    planeMaterial,
    {
      diffuse: 'awayjs/assets/floor_diffuse.jpg',
      normal: 'awayjs/assets/floor_normal.jpg',
    },
    { x: 2, y: 2 },
  ),
  createMetalRoughnessFromSpecular('awayjs/assets/floor_specular.jpg').then((tex) => {
    tex.sampler = tilingSampler;
    setTextureUvScale(tex, 2, 2);
    planeMaterial.metallicRoughnessMap = tex;
  }),
  applyTextures(sphereMaterial, {
    diffuse: 'awayjs/assets/beachball_diffuse.jpg',
  }),
  createMetalRoughnessFromSpecular('awayjs/assets/beachball_specular.jpg').then((tex) => {
    sphereMaterial.metallicRoughnessMap = tex;
  }),
  applyTextures(cubeMaterial, {
    diffuse: 'awayjs/assets/trinket_diffuse.jpg',
    normal: 'awayjs/assets/trinket_normal.jpg',
  }),
  createMetalRoughnessFromSpecular('awayjs/assets/trinket_specular.jpg').then((tex) => {
    cubeMaterial.metallicRoughnessMap = tex;
  }),
  loadImageResourceFromUrl('awayjs/assets/weave_diffuse.jpg').then((image) => {
    const tex = createTexture({ image, sampler: tilingSampler });
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
  // AwayJS sweeps the white light around the horizon (nearly horizontal, a slight downward tilt) so
  // the shading and the metal highlights rotate around the objects. Keep it grazing, not overhead —
  // that grazing angle is what lights the metal frame/ring and the floor's normal relief.
  const lightX = Math.sin(ts / 2500);
  const lightZ = -Math.cos(ts / 2500);
  setDirectionalLightDirection(directional, lightX, -0.01, lightZ);

  orbit.update();
  ctx.render(scene.root, camera, lights);
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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
