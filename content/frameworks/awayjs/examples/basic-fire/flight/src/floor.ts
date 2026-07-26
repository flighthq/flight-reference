import type { ImageResource, StandardPbrMaterial, Texture } from '@flighthq/sdk';
import {
  createStandardPbrMaterial,
  createTexture,
  createTilingSampler,
  loadImageResourceFromUrl,
  setTextureUvScale,
} from '@flighthq/sdk';

import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';

// AwayJS gives the floor its wet-tile sheen with a specular map plus `specularMethod.strength = 10`;
// Flight's metallic-roughness PBR has no specular map, so we bake `floor_specular.jpg` into a
// roughness map instead. AwayJS's specular map is a gloss mask (bright = shiny), which is the inverse
// of PBR roughness, so bright texels map to the glossy end and dark texels to the matte end.
const FLOOR_ROUGHNESS_GLOSSY = 0.15;
const FLOOR_ROUGHNESS_MATTE = 0.85;

export function createFloorMaterial(): StandardPbrMaterial {
  const material = createStandardPbrMaterial({
    baseColor: 0xffffffff,
    metallic: 0,
    roughness: 1,
  });
  material.doubleSided = true;
  return material;
}

function specularToRoughnessTexture(specular: ImageResource): Texture {
  const spread = FLOOR_ROUGHNESS_MATTE - FLOOR_ROUGHNESS_GLOSSY;
  const mrImage = createMetallicRoughnessImage(specular, (r) => ({
    roughness: FLOOR_ROUGHNESS_MATTE - spread * r,
    metallic: 0,
  }));
  const tex = createTexture({
    image: mrImage,
    sampler: createTilingSampler(),
    colorSpace: 'linear',
  });
  setTextureUvScale(tex, 2, 2);
  return tex;
}

export async function loadFloorTextures(material: StandardPbrMaterial): Promise<void> {
  const [diffuseImg, normalImg, specularImg] = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_normal.jpg'),
    loadImageResourceFromUrl('awayjs/assets/floor_specular.jpg'),
  ]);
  const diffuseTex = createTexture({ image: diffuseImg, sampler: createTilingSampler() });
  setTextureUvScale(diffuseTex, 2, 2);
  material.baseColorMap = diffuseTex;

  const normalTex = createTexture({ image: normalImg, sampler: createTilingSampler() });
  setTextureUvScale(normalTex, 2, 2);
  material.normalMap = normalTex;

  material.metallicRoughnessMap = specularToRoughnessTexture(specularImg);
}
