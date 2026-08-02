import type { Sampler, StandardPbrMaterial, Texture } from '@flighthq/sdk';
import {
  createBitmap,
  createClampLinearSampler,
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

function createFloorEdgeFadeTexture(): Texture {
  const size = 128;
  const bitmap = createBitmap(size, size, 0x000000ff);
  const data = bitmap.data;

  for (let y = 0; y < size; y++) {
    const ny = Math.abs((y + 0.5) / size - 0.5) * 2;
    for (let x = 0; x < size; x++) {
      const nx = Math.abs((x + 0.5) / size - 0.5) * 2;
      const edge = Math.max(nx, ny);
      const t = Math.min(1, Math.max(0, (edge - 0.62) / 0.36));
      const smooth = t * t * (3 - 2 * t);
      const coverage = Math.round((1 - smooth) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = coverage;
      data[offset + 1] = coverage;
      data[offset + 2] = coverage;
      data[offset + 3] = 255;
    }
  }

  return createTexture({
    source: bitmap,
    colorSpace: 'linear',
    sampler: createClampLinearSampler(),
  });
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
  planeMaterial.alphaMode = 'blend';
  planeMaterial.alphaMap = createFloorEdgeFadeTexture();

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
  // The remastered floor is 1.8x wider than the original 1000-unit plane, so 3.6 repeats retain the
  // original two-tiles-per-1000-unit density while the independent alpha map feathers only once.
  const floorUvScale = { x: 3.6, y: 3.6 };

  const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/weave_normal.jpg');
  const torusNormalTex = createTexture({
    source: torusWeaveNormalImage,
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
      floorUvScale,
    ),
    createMetalRoughnessFromSpecular('awayjs/floor_specular.jpg').then((tex) => {
      tex.sampler = tilingSampler;
      setTextureUvScale(tex, floorUvScale.x, floorUvScale.y);
      planeMaterial.metallicRoughnessMap = tex;
    }),
    applyTextures(
      sphereMaterial,
      {
        diffuse: 'awayjs/beachball_diffuse.jpg',
      },
      tilingSampler,
    ),
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
