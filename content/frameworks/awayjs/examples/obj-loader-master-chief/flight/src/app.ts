import type { ImageResource, Mesh, PerspectiveProjection, SceneNode, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  bakeGlEnvironmentIbl,
  buildSurfaceGradientRamp,
  computeMeshGeometryNormals,
  createCubeTexture,
  createEmissiveMaterial,
  createEnvironment,
  createFxaaEffect,
  createImageResourceFromSurface,
  createMesh,
  createScene,
  createSceneFromObj,
  createSceneLights,
  createSceneNode,
  createSphereMeshGeometry,
  createStandardPbrMaterial,
  createSurface,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  createTexture,
  createTilingSampler,
  createToneMapEffect,
  createVector3,
  DEG_TO_RAD,
  fillSurfaceLinearGradient,
  createQuaternion,
  getNodeChildren,
  loadImageResourceFromUrl,
  packOpaqueColor,
  setCubeTextureFace,
  setQuaternionFromAxisAngle,
  copyQuaternion,
  invalidateNodeLocalTransform,
  setVector3,
  setTextureUvScale,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: packOpaqueColor(0xcec8c6),
  effects: [createToneMapEffect({ operator: 'aces' }), createFxaaEffect()],
});

const scene = createScene();

// Far plane raised to enclose the sky dome below.
const camera = createCameraFromAway({ y: 20, z: -50, targetY: 20, fov: 60, near: 0.1, far: 9000 });

// Sky: AwayJS just clears to flat 0xcec8c6. Instead, build a vertical-gradient dome — a large emissive
// (self-lit, unaffected by scene lights) sphere seen from the inside (doubleSided). A tall 1-px-wide
// Surface is filled with a linear gradient ramp (warm hazy horizon -> cooler zenith) and mapped up the
// sphere's latitude, so the horizon sits at the equator and the zenith at the top pole. Emissive values
// stay < 1 so the ACES pass keeps them in range.
const SKY_STOPS = { colors: [0x3f74c4, 0xa9c6e6, 0xead9b8], alphas: [255, 255, 255], ratios: [0, 132, 255] };
const skyRamp = new Uint8ClampedArray(256 * 4);
buildSurfaceGradientRamp(skyRamp, SKY_STOPS.colors, SKY_STOPS.alphas, SKY_STOPS.ratios);
const skySurface = createSurface(1, 256);
fillSurfaceLinearGradient(createSurfaceRegion(skySurface), skyRamp, 0, 0, 0, 256);
const skyMaterial = createEmissiveMaterial({
  emissive: 0xffffffff,
  emissiveMap: createTexture({ image: createImageResourceFromSurface(skySurface) }),
  emissiveStrength: 1.35,
});
skyMaterial.doubleSided = true;
const skyDome = createMesh(createSphereMeshGeometry(6000, 32, 16), [skyMaterial]);
addNodeChild(scene.root, skyDome);

// Metallic surfaces need an environment to reflect. There's no HDR map here, so bake a cheap IBL from a
// solid-color cube — sky blue overhead (+Y), warm dirt below (-Y), horizon on the sides. The bake blurs
// it, so flat faces are plenty; this is what lets the metallic armor read as metal instead of going gray.
// Kept at a modest intensity so it mainly feeds the metal reflection, not a strong blue diffuse fill.
const SKY_REFLECT = 0x8fb3dcff;
const HORIZON_REFLECT = 0xc3c9c8ff;
const GROUND_REFLECT = 0x9a6a42ff;
const envFaces = [HORIZON_REFLECT, HORIZON_REFLECT, SKY_REFLECT, GROUND_REFLECT, HORIZON_REFLECT, HORIZON_REFLECT];
const envCube = createCubeTexture();
for (let i = 0; i < 6; i++) {
  setCubeTextureFace(envCube, i, createImageResourceFromSurface(createSurface(8, 8, envFaces[i])));
}
const environment = createEnvironment({ environment: envCube, intensity: 0.55 });
bakeGlEnvironmentIbl(ctx.state, environment);

// Now that the colorized albedo carries the palette, the light just shades it: a warm-white key (a
// saturated orange key would muddy the olive/orange albedo) with a cool ambient fill for contrast.
// Exposure is moderated so the key lands in the colorful range and the ACES pass (below) compresses the
// highlights instead of clipping the lit surfaces to flat white.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0xffe8d0,
  diffuse: 2.8,
  ambient: 0.4,
  ambientColor: 0x85b2cd,
  tuning: { diffuse: 0.45, ambient: 0.5 },
});
const lights = createSceneLights({ ambient, directional });

const spartanContainer = createSceneNode();
setVector3(spartanContainer.scale, 0.25, 0.25, 0.25);
invalidateNodeLocalTransform(spartanContainer);
addNodeChild(scene.root, spartanContainer);

const [spartanObjText, terrainObjText, masterchiefImage, stoneImage] = await Promise.all([
  fetch('awayjs/assets/Halo_3_SPARTAN4.obj').then((r) => r.text()),
  fetch('awayjs/assets/terrain.obj').then((r) => r.text()),
  loadImageResourceFromUrl('awayjs/assets/masterchief_base.png'),
  loadImageResourceFromUrl('awayjs/assets/stone_tx.jpg'),
]);

// The source textures are grayscale (masterchief_base.png averages ~(95,95,94)) — AwayJS gets its color
// purely from the warm light acting on those values. To force the Halo palette, colorize each texture
// with a luminance gradient map: build a 256-entry ramp from color stops and, per pixel, replace it with
// the ramp color at that pixel's luminance. The one exception is the visor: it's the only region with any
// chroma in the source (a gold shield in the atlas), so use that chroma as a free mask and send those
// pixels through a separate orange ramp. createSurfaceFromImageResource gives the editable pixels;
// createImageResourceFromSurface rasterizes back to a source-backed image the material can upload.
interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
}

function buildRampChannel(stops: ReadonlyArray<ColorStop>, channel: 'r' | 'g' | 'b'): number[] {
  const lut = new Array<number>(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].t && t <= stops[s + 1].t) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi.t - lo.t || 1;
    const f = Math.min(1, Math.max(0, (t - lo.t) / span));
    lut[i] = Math.round(lo[channel] + (hi[channel] - lo[channel]) * f);
  }
  return lut;
}

// Colorize a grayscale texture through `baseStops` by luminance. Pixels whose source chroma exceeds
// CHROMA_MASK (only the visor, in this atlas) go through `chromaStops` instead.
const CHROMA_MASK = 24;
function colorizeByLuminance(
  image: ImageResource,
  baseStops: ReadonlyArray<ColorStop>,
  chromaStops?: ReadonlyArray<ColorStop>,
): ImageResource {
  const surface = createSurfaceFromImageResource(image);
  const data = surface.data;
  if (data === null) return image;
  const br = buildRampChannel(baseStops, 'r');
  const bg = buildRampChannel(baseStops, 'g');
  const bb = buildRampChannel(baseStops, 'b');
  const xr = chromaStops ? buildRampChannel(chromaStops, 'r') : null;
  const xg = chromaStops ? buildRampChannel(chromaStops, 'g') : null;
  const xb = chromaStops ? buildRampChannel(chromaStops, 'b') : null;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b));
    if (xr !== null && Math.max(r, g, b) - Math.min(r, g, b) > CHROMA_MASK) {
      data[i] = xr[luma];
      data[i + 1] = xg![luma];
      data[i + 2] = xb![luma];
    } else {
      data[i] = br[luma];
      data[i + 1] = bg[luma];
      data[i + 2] = bb[luma];
    }
  }
  return createImageResourceFromSurface(surface);
}

const ARMOR_RAMP: ColorStop[] = [
  { t: 0.0, r: 16, g: 14, b: 10 }, // deep shadow / crevices
  { t: 0.3, r: 34, g: 38, b: 24 }, // dark olive (bodysuit / shadowed armor)
  { t: 0.55, r: 90, g: 104, b: 54 }, // olive-green armor panels
  { t: 0.78, r: 150, g: 150, b: 100 }, // lit khaki armor
  { t: 1.0, r: 220, g: 214, b: 175 }, // worn-metal highlights (kept desaturated, not orange)
];

const VISOR_RAMP: ColorStop[] = [
  { t: 0.0, r: 70, g: 26, b: 6 }, // shadowed visor edge
  { t: 0.4, r: 224, g: 104, b: 22 }, // oakley orange
  { t: 0.75, r: 255, g: 156, b: 44 },
  { t: 1.0, r: 255, g: 206, b: 120 }, // bright amber glint
];

// Warm reddish dirt — a complementary contrast to the olive/oregano armor.
const STONE_RAMP: ColorStop[] = [
  { t: 0.0, r: 46, g: 24, b: 12 }, // dark umber
  { t: 0.5, r: 158, g: 92, b: 50 }, // warm reddish-brown
  { t: 1.0, r: 226, g: 168, b: 110 }, // sunlit sand
];

// Roughness varies by region, driven off the same grayscale values: the black cloth undersuit (dark) is
// matte, the green metal armor (mid/bright) is more reflective, and the visor (the chroma mask) is the
// glossiest. Written into a metallicRoughnessMap's G channel (glTF: G = roughness, B = metallic); the
// material's roughness scalar stays 1 so the map fully drives it, metallic stays 0 (no env to reflect).
interface ScalarStop {
  t: number;
  v: number;
}
const ROUGH_STOPS: ScalarStop[] = [
  { t: 0.0, v: 0.9 }, // black cloth undersuit -> matte
  { t: 0.28, v: 0.55 }, // green metal armor -> semi-reflective
  { t: 1.0, v: 0.34 }, // bright metal edges -> reflective
];
const ROUGH_VISOR = 0.12; // glass visor -> glossy

// Metallic (map B channel): the armor is real metal, the cloth and visor barely so.
const METAL_STOPS: ScalarStop[] = [
  { t: 0.0, v: 0.05 }, // black cloth -> dielectric
  { t: 0.28, v: 0.45 }, // green metal armor -> metallic
  { t: 1.0, v: 0.55 },
];
const METAL_VISOR = 0.1; // glass visor -> slight

function sampleScalarStops(stops: ReadonlyArray<ScalarStop>, t: number): number {
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let s = 0; s < stops.length - 1; s++) {
    if (t >= stops[s].t && t <= stops[s + 1].t) {
      lo = stops[s];
      hi = stops[s + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  return lo.v + (hi.v - lo.v) * Math.min(1, Math.max(0, (t - lo.t) / span));
}

function buildMetallicRoughnessMap(image: ImageResource): ImageResource {
  return createMetallicRoughnessImage(image, (r, g, b) => {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const isVisor = Math.max(r, g, b) - Math.min(r, g, b) > CHROMA_MASK / 255;
    return {
      roughness: isVisor ? ROUGH_VISOR : sampleScalarStops(ROUGH_STOPS, luma),
      metallic: isVisor ? METAL_VISOR : sampleScalarStops(METAL_STOPS, luma),
    };
  });
}

// Scalars stay 1 so the metallicRoughnessMap fully drives both channels per region.
const masterchiefMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 1,
  roughness: 1,
});
masterchiefMaterial.baseColorMap = createTexture({
  image: colorizeByLuminance(masterchiefImage, ARMOR_RAMP, VISOR_RAMP),
});
masterchiefMaterial.metallicRoughnessMap = createTexture({ image: buildMetallicRoughnessMap(masterchiefImage) });

const stoneMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: 0.85,
});
const stoneTexture = createTexture({
  image: colorizeByLuminance(stoneImage, STONE_RAMP),
  sampler: createTilingSampler(),
});
setTextureUvScale(stoneTexture, 20, 20);
stoneMaterial.baseColorMap = stoneTexture;

function applyMaterialToObjScene(objScene: SceneNode, material: StandardPbrMaterial): void {
  for (const child of getNodeChildren(objScene)) {
    const mesh = child as Mesh;
    if (mesh.geometry) {
      computeMeshGeometryNormals(mesh.geometry, mesh.geometry);
      if (mesh.materials) {
        if (mesh.materials.length === 0) {
          mesh.materials.push(material);
        } else {
          for (let i = 0; i < mesh.materials.length; i++) {
            mesh.materials[i] = material;
          }
        }
      }
    }
  }
}

const spartanScene = createSceneFromObj(spartanObjText);
applyMaterialToObjScene(spartanScene.root, masterchiefMaterial);
for (const child of getNodeChildren(spartanScene.root)) {
  addNodeChild(spartanContainer, child);
}

const terrainScene = createSceneFromObj(terrainObjText);
applyMaterialToObjScene(terrainScene.root, stoneMaterial);
let terrainNode: SceneNode | undefined;
for (const child of getNodeChildren(terrainScene.root)) {
  addNodeChild(scene.root, child);
  if (!terrainNode) terrainNode = child;
}

if (terrainNode) {
  terrainNode.position.y = 98;
  invalidateNodeLocalTransform(terrainNode);
}

const yAxis = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();
let spartanRotationY = 0;
let terrainRotationY = 0;

function frame(): void {
  spartanRotationY -= 0.4 * DEG_TO_RAD;
  terrainRotationY -= 0.4 * DEG_TO_RAD;

  setVector3(spartanContainer.scale, 0.25, 0.25, 0.25);
  setQuaternionFromAxisAngle(scratchQuat, yAxis, spartanRotationY);
  copyQuaternion(spartanContainer.rotation, scratchQuat);
  invalidateNodeLocalTransform(spartanContainer);

  if (terrainNode) {
    terrainNode.position.y = 98;
    setQuaternionFromAxisAngle(scratchQuat, yAxis, terrainRotationY);
    copyQuaternion(terrainNode.rotation, scratchQuat);
    invalidateNodeLocalTransform(terrainNode);
  }

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
