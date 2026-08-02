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
    emissive: 0xffffffff,
    emissiveStrength: 0.12,
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

  // Give the pale weave texture a cool pewter tint and let the studio environment supply its reflected
  // color. The map below carries the final metalness and roughness, so these factors stay at one.
  const torusMaterial = createStandardPbrMaterial({
    baseColor: 0xaeb5b9ff,
    metallic: 1,
    roughness: 1,
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
        const tex = createTexture({
          source: image,
          sampler: uvScale ? tilingSampler : createSampler(),
        });
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
          source: image,
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
  return createTexture({ source: mrImage, colorSpace: 'linear' });
}

export async function loadSceneTextures(materials: SceneMaterials, tilingSampler: Sampler): Promise<void> {
  const { planeMaterial, sphereMaterial, cubeMaterial, torusMaterial } = materials;

  const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/weave_normal.jpg');
  const torusNormalTex = createTexture({
    source: torusWeaveNormalImage,
    colorSpace: 'linear',
    sampler: tilingSampler,
  });
  torusMaterial.normalMap = torusNormalTex;

  // AwayJS assigns weave_normal.jpg to both the normal and specular maps. Preserve that variation as
  // a medium-rough metallic response: brighter weave catches a tighter highlight, while darker fibers
  // stay more diffuse. High, slightly sub-unity metalness keeps the result in pewter/silver territory.
  const torusMrImage = createMetallicRoughnessImage(torusWeaveNormalImage, (r) => ({
    roughness: 0.34 + (1 - r) * 0.24,
    metallic: 0.9,
  }));
  torusMaterial.metallicRoughnessMap = createTexture({
    source: torusMrImage,
    colorSpace: 'linear',
    sampler: tilingSampler,
  });

  await Promise.all([
    applyTextures(
      planeMaterial,
      {
        diffuse: 'awayjs/floor_diffuse.jpg',
        normal: 'awayjs/floor_normal.jpg',
      },
      tilingSampler,
      { x: 2, y: 2 },
    ),
    createMetalRoughnessFromSpecular('awayjs/floor_specular.jpg').then((tex) => {
      tex.sampler = tilingSampler;
      setTextureUvScale(tex, 2, 2);
      planeMaterial.metallicRoughnessMap = tex;
    }),
    loadImageResourceFromUrl('awayjs/beachball_diffuse.jpg').then((image) => {
      const tex = createTexture({ source: image });
      sphereMaterial.baseColorMap = tex;
      // A restrained albedo-matched lift keeps the red panels red beneath the strong cyan fill without
      // making the vinyl look self-lit or erasing the moving directional shading.
      sphereMaterial.emissiveMap = tex;
    }),
    createMetalRoughnessFromSpecular('awayjs/beachball_specular.jpg').then((tex) => {
      sphereMaterial.metallicRoughnessMap = tex;
    }),
    applyTextures(
      cubeMaterial,
      {
        diffuse: 'awayjs/trinket_diffuse.jpg',
        normal: 'awayjs/trinket_normal.jpg',
      },
      tilingSampler,
    ),
    createMetalRoughnessFromSpecular('awayjs/trinket_specular.jpg').then((tex) => {
      cubeMaterial.metallicRoughnessMap = tex;
    }),
    loadImageResourceFromUrl('awayjs/weave_diffuse.jpg').then((image) => {
      const tex = createTexture({ source: image, sampler: tilingSampler });
      torusMaterial.baseColorMap = tex;
    }),
  ]);
}
