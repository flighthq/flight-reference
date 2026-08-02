import type { BlinnPhongMaterial, Image, Texture } from '@flighthq/sdk';
import {
  createBlinnPhongMaterial,
  createTexture,
  createTilingSampler,
  loadImageResourceFromUrl,
  setTextureUvScale,
} from '@flighthq/sdk';

import { applyAwayGloss } from '../../../_shared/flight/src/lighting';

// AwayJS's MethodMaterial is a classic specular material, and Flight's Blinn-Phong lane can consume
// the same three maps directly. Keeping the normal and specular images as data textures is important:
// an sRGB decode distorts packed normals and turns the specular mask into a rough color approximation.
export function createFloorMaterial(): BlinnPhongMaterial {
  const material = createBlinnPhongMaterial({
    diffuse: 0xffffffff,
    normalScale: 1,
  });
  applyAwayGloss(material, { gloss: 50, specular: 1 });
  material.doubleSided = true;
  return material;
}

function createFloorTexture(image: Image, colorSpace: 'linear' | 'srgb' = 'srgb'): Texture {
  const tex = createTexture({ source: image, sampler: createTilingSampler(), colorSpace });
  setTextureUvScale(tex, 2, 2);
  return tex;
}

export async function loadFloorTextures(material: BlinnPhongMaterial): Promise<void> {
  const [diffuseImg, normalImg, specularImg] = await Promise.all([
    loadImageResourceFromUrl('awayjs/floor_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/floor_normal.jpg'),
    loadImageResourceFromUrl('awayjs/floor_specular.jpg'),
  ]);
  material.diffuseMap = createFloorTexture(diffuseImg);
  material.normalMap = createFloorTexture(normalImg, 'linear');
  material.specularMap = createFloorTexture(specularImg, 'linear');
}
