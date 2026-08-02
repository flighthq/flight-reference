import type { BlinnPhongMaterial, Image, Texture } from '@flighthq/sdk';
import {
  createBlinnPhongMaterial,
  createSampler,
  createTexture,
  loadImageResourceFromUrl,
  setTextureUvScale,
} from '@flighthq/sdk';

// AwayJS's MethodMaterial is a classic specular material, and Flight's Blinn-Phong lane can consume
// the same three maps directly. Keeping the normal and specular images as data textures is important:
// an sRGB decode distorts packed normals and turns the specular mask into a rough color approximation.
export function createFloorMaterial(): BlinnPhongMaterial {
  const material = createBlinnPhongMaterial({
    diffuse: 0xffffffff,
    // Strengthen the tangent-space relief so the tile edges cut as deeply as the reference grooves.
    normalScale: 1.8,
    // AwayJS's SpecularBasicMethod is already Blinn-Phong and defaults to gloss 50; applying the
    // generic Phong-to-Blinn conversion here made the lobe much too tight and the floor read dull.
    shininess: 50,
    specular: 0xffffffff,
  });
  material.doubleSided = true;
  return material;
}

function createFloorTexture(image: Image, colorSpace: 'linear' | 'srgb' = 'srgb'): Texture {
  // The AwayJS sample explicitly requests repeat + smooth filtering with mipmaps disabled. Flight's
  // tiling preset enables trilinear mipmaps, which selects a visibly soft mip over this oblique floor.
  const sampler = createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmaps: false,
    wrapU: 'repeat',
    wrapV: 'repeat',
  });
  const tex = createTexture({ source: image, sampler, colorSpace });
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
