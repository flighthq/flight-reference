import type { Sampler, StandardPbrMaterial, Texture } from '@flighthq/sdk';
import {
  createSampler,
  createStandardPbrMaterial,
  createTexture,
  loadImageResourceFromUrl,
  setTextureUvScale,
} from '@flighthq/sdk';

import { createMetallicRoughnessImage } from '../../../_shared/flight/src/pbrConvert';

export interface SceneMaterials {
  planeMaterial: StandardPbrMaterial;
  sphereMaterial: StandardPbrMaterial;
  cubeMaterial: StandardPbrMaterial;
  torusMaterial: StandardPbrMaterial;
}

// PBR material intent (per the sample's assets): floor = stone (rough dielectric), beach ball =
// vinyl (smooth dielectric), trinket = mixed metal + wood (part-metallic), ring = polished metal.
export function createSceneMaterials(): SceneMaterials {
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

  // AwayJS uses default Phong (gloss ~50, specular 1) with the weave_normal doubling as specular.
  // In PBR, metallic=0 (dielectric) with low roughness produces a similar tight specular highlight
  // from the sweeping light. The metallicRoughnessMap (generated from weave_normal below) adds the
  // per-texel specular variation that AwayJS gets from using weave_normal as both maps.
  const torusMaterial = createStandardPbrMaterial({
    baseColor: 0xffffffff,
    metallic: 0,
    roughness: 0.15,
  });

  return { planeMaterial, sphereMaterial, cubeMaterial, torusMaterial };
}

export function applyTextures(
  material: StandardPbrMaterial,
  maps: { diffuse?: string; normal?: string; specular?: string },
  tilingSampler: Sampler,
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

export async function createMetalRoughnessFromSpecular(url: string): Promise<Texture> {
  const image = await loadImageResourceFromUrl(url);
  const mrImage = createMetallicRoughnessImage(image, (r) => ({
    roughness: Math.max(0.12, 1 - r * 1.7),
    metallic: r,
  }));
  return createTexture({ image: mrImage, colorSpace: 'linear' });
}

export async function loadSceneTextures(materials: SceneMaterials, tilingSampler: Sampler): Promise<void> {
  const { planeMaterial, sphereMaterial, cubeMaterial, torusMaterial } = materials;

  const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/assets/weave_normal.jpg');
  const torusNormalTex = createTexture({
    image: torusWeaveNormalImage,
    colorSpace: 'linear',
    sampler: tilingSampler,
  });
  torusMaterial.normalMap = torusNormalTex;

  // AwayJS assigns weave_normal.jpg to both the normal and specular maps (using the red channel
  // as specular intensity). This MR map approximates that by varying roughness from the red
  // channel — bright texels get lower roughness (tighter highlights), dark texels get higher
  // roughness. This does not preserve the exact specular strength semantics, but adds per-texel
  // variation that the flat scalar values alone would miss.
  const torusMrImage = createMetallicRoughnessImage(torusWeaveNormalImage, (r) => ({
    roughness: Math.max(0.08, 1 - r * 1.5),
    metallic: 0,
  }));
  torusMaterial.metallicRoughnessMap = createTexture({
    image: torusMrImage,
    colorSpace: 'linear',
    sampler: tilingSampler,
  });

  await Promise.all([
    applyTextures(
      planeMaterial,
      {
        diffuse: 'awayjs/assets/floor_diffuse.jpg',
        normal: 'awayjs/assets/floor_normal.jpg',
      },
      tilingSampler,
      { x: 2, y: 2 },
    ),
    createMetalRoughnessFromSpecular('awayjs/assets/floor_specular.jpg').then((tex) => {
      tex.sampler = tilingSampler;
      setTextureUvScale(tex, 2, 2);
      planeMaterial.metallicRoughnessMap = tex;
    }),
    applyTextures(
      sphereMaterial,
      {
        diffuse: 'awayjs/assets/beachball_diffuse.jpg',
      },
      tilingSampler,
    ),
    createMetalRoughnessFromSpecular('awayjs/assets/beachball_specular.jpg').then((tex) => {
      sphereMaterial.metallicRoughnessMap = tex;
    }),
    applyTextures(
      cubeMaterial,
      {
        diffuse: 'awayjs/assets/trinket_diffuse.jpg',
        normal: 'awayjs/assets/trinket_normal.jpg',
      },
      tilingSampler,
    ),
    createMetalRoughnessFromSpecular('awayjs/assets/trinket_specular.jpg').then((tex) => {
      cubeMaterial.metallicRoughnessMap = tex;
    }),
    loadImageResourceFromUrl('awayjs/assets/weave_diffuse.jpg').then((image) => {
      const tex = createTexture({ image, sampler: tilingSampler });
      torusMaterial.baseColorMap = tex;
    }),
  ]);
}
