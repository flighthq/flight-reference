import type { CubeTexture, Environment, GlRenderState } from '@flighthq/sdk';
import {
  bakeGlEnvironmentIbl,
  createCubeTexture,
  createEnvironment,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  flipSurfaceHorizontal,
  flipSurfaceVertical,
  loadImageResourceFromUrl,
  setCubeTextureFace,
} from '@flighthq/sdk';

// Environment cube map — individual face images derived from the CubeTextureTest.cube asset.
// AwayJS is left-handed (+Z into screen); Flight is right-handed (+Z out). The Z-negate between the two
// coordinate systems requires: X faces stay in their slot but are h-flipped, Z faces swap AND h-flip,
// Y faces stay but v-flip. See agents/conventions/camera.md for the coordinate convention.
const cubeFaceUrls = [
  'awayjs/assets/skybox/sky_posX.jpg',
  'awayjs/assets/skybox/sky_negX.jpg',
  'awayjs/assets/skybox/sky_posY.jpg',
  'awayjs/assets/skybox/sky_negY.jpg',
  'awayjs/assets/skybox/sky_negZ.jpg',
  'awayjs/assets/skybox/sky_posZ.jpg',
];

export async function createSkyEnvironment(glState: GlRenderState): Promise<Environment> {
  const cubeImages = await Promise.all(cubeFaceUrls.map((url) => loadImageResourceFromUrl(url)));
  const cubeTexture: CubeTexture = createCubeTexture();
  for (let i = 0; i < 6; i++) {
    const image = cubeImages[i];
    const surface = createSurfaceFromImageResource(image);
    const region = createSurfaceRegion(surface);
    if (i === 2 || i === 3) {
      flipSurfaceVertical(region, region);
    } else {
      flipSurfaceHorizontal(region, region);
    }
    setCubeTextureFace(cubeTexture, i, surface);
  }
  const environment = createEnvironment({
    environment: cubeTexture,
    intensity: 1,
  });
  bakeGlEnvironmentIbl(glState, environment);
  return environment;
}
