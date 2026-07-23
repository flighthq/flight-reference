import type { CubeTexture, ImageResource } from '@flighthq/sdk';
import {
  createCubeTexture,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  flipSurfaceHorizontal,
  flipSurfaceVertical,
  setCubeTextureFace,
} from '@flighthq/sdk';

/**
 * Build a Flight cube texture from six AwayJS-convention face images.
 *
 * AwayJS is left-handed (+Z into screen); Flight is right-handed (+Z out).
 * The Z-negate requires:
 *  - X faces (+X, -X): stay in slot, horizontally flipped
 *  - Y faces (+Y, -Y): stay in slot, vertically flipped
 *  - Z faces (+Z, -Z): swap slots AND horizontally flip
 *
 * @param faces Six ImageResource values in AwayJS convention:
 *              [posX, negX, posY, negY, posZ, negZ]
 */
export function createCubeTextureFromAwayFaces(faces: readonly ImageResource[]): CubeTexture {
  const cube = createCubeTexture();

  for (let i = 0; i < 6; i++) {
    const isY = i === 2 || i === 3;
    const surface = createSurfaceFromImageResource(faces[i]!);
    const region = createSurfaceRegion(surface);

    if (isY) {
      flipSurfaceVertical(region, region);
    } else {
      flipSurfaceHorizontal(region, region);
    }

    const faceIndex = i === 4 ? 5 : i === 5 ? 4 : i;
    setCubeTextureFace(cube, faceIndex, surface);
  }

  return cube;
}
