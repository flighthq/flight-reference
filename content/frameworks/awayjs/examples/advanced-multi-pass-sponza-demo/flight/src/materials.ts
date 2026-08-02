import type { BlinnPhongMaterial, Image, Material, Mesh, Node3D, Texture2D } from '@flighthq/sdk';
import {
  createBlinnPhongMaterial,
  createTexture,
  createTilingSampler,
  getNodeChildren,
  isMesh,
  loadImageResourceFromUrl,
} from '@flighthq/sdk';

import { applyAwayGloss } from '../../../_shared/flight/src/lighting';

export const materialNameToTextureFile: Record<string, string> = {
  arch: 'arch_diff.jpg',
  Material__298: 'background.jpg',
  bricks: 'bricks_a_diff.jpg',
  ceiling: 'ceiling_a_diff.jpg',
  chain: 'chain_texture.png',
  column_a: 'column_a_diff.jpg',
  column_b: 'column_b_diff.jpg',
  column_c: 'column_c_diff.jpg',
  fabric_g: 'curtain_blue_diff.jpg',
  fabric_c: 'curtain_diff.jpg',
  fabric_f: 'curtain_green_diff.jpg',
  details: 'details_diff.jpg',
  fabric_d: 'fabric_blue_diff.jpg',
  fabric_a: 'fabric_diff.jpg',
  fabric_e: 'fabric_green_diff.jpg',
  flagpole: 'flagpole_diff.jpg',
  floor: 'floor_a_diff.jpg',
  '16___Default': 'gi_flag.jpg',
  Material__25: 'lion.jpg',
  roof: 'roof_diff.jpg',
  leaf: 'thorn_diff.png',
  vase: 'vase_dif.jpg',
  vase_hanging: 'vase_hanging.jpg',
  Material__57: 'vase_plant.png',
  vase_round: 'vase_round.jpg',
};

export const materialNameToNormalFile: Record<string, string> = {
  arch: 'arch_ddn.jpg',
  Material__298: 'background_ddn.jpg',
  bricks: 'bricks_a_ddn.jpg',
  chain: 'chain_texture_ddn.jpg',
  column_a: 'column_a_ddn.jpg',
  column_b: 'column_b_ddn.jpg',
  column_c: 'column_c_ddn.jpg',
  Material__25: 'lion2_ddn.jpg',
  leaf: 'thorn_ddn.jpg',
  vase: 'vase_ddn.jpg',
  vase_round: 'vase_round_ddn.jpg',
};

export const materialNameToSpecularFile: Record<string, string> = {
  arch: 'arch_spec.jpg',
  bricks: 'bricks_a_spec.jpg',
  ceiling: 'ceiling_a_spec.jpg',
  column_a: 'column_a_spec.jpg',
  column_b: 'column_b_spec.jpg',
  column_c: 'column_c_spec.jpg',
  fabric_g: 'curtain_spec.jpg',
  fabric_c: 'curtain_spec.jpg',
  fabric_f: 'curtain_spec.jpg',
  details: 'details_spec.jpg',
  fabric_d: 'fabric_spec.jpg',
  fabric_a: 'fabric_spec.jpg',
  fabric_e: 'fabric_spec.jpg',
  flagpole: 'flagpole_spec.jpg',
  floor: 'floor_a_spec.jpg',
  leaf: 'thorn_spec.jpg',
  Material__57: 'vase_plant_spec.jpg',
  vase_round: 'vase_round_spec.jpg',
};

export const alphaCutoutMaterials = new Set(['chain', 'leaf', 'Material__57']);

export async function loadSponzaTextures(files: readonly string[]): Promise<Image[]> {
  return Promise.all(files.map((file) => loadImageResourceFromUrl(`awayjs/sponza/${file}`)));
}

export function createTextureMap(
  sponzaTextureFiles: readonly string[],
  sponzaTextureImages: readonly Image[],
): Map<string, Texture2D> {
  const textureMap = new Map<string, Texture2D>();
  // Sponza's authored UVs deliberately extend well outside the unit square. AwayJS applies
  // ImageSampler(repeat=true, smooth=true, mipmap=true) to every material map, so use Flight's
  // equivalent tiling sampler for diffuse, normal, and specular textures.
  const sampler = createTilingSampler();
  for (const file of new Set(Object.values(materialNameToTextureFile))) {
    const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
    if (image) textureMap.set(file, createTexture({ source: image, sampler }));
  }
  for (const file of new Set(Object.values(materialNameToNormalFile))) {
    const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
    if (image) textureMap.set(file, createTexture({ source: image, colorSpace: 'linear', sampler }));
  }
  for (const file of new Set(Object.values(materialNameToSpecularFile))) {
    const image = sponzaTextureImages[sponzaTextureFiles.indexOf(file)];
    if (image) textureMap.set(file, createTexture({ source: image, colorSpace: 'linear', sampler }));
  }
  return textureMap;
}

const knownMaterialNames = new Set(Object.keys(materialNameToTextureFile));

export function getOrCreateMaterial(
  name: string,
  textureMap: ReadonlyMap<string, Texture2D>,
  materialCache: Map<string, BlinnPhongMaterial>,
): BlinnPhongMaterial {
  let mat = materialCache.get(name);
  if (mat) return mat;

  // AwayJS MethodMaterial uses a classic Blinn-Phong base. Keep the source specular maps as
  // specular strength instead of reinterpreting them as PBR roughness. Preserve the source's
  // default gloss; its specularMethod.strength = 2 saturates at Flight's maximum packed-white
  // specular color through the shared conversion helper.
  mat = createBlinnPhongMaterial({ diffuse: 0xffffffff });
  applyAwayGloss(mat, { gloss: 50, specular: 2 });

  const textureFile = materialNameToTextureFile[name];
  if (textureFile) {
    const tex = textureMap.get(textureFile);
    if (tex) mat.diffuseMap = tex;
  }

  const normalFile = materialNameToNormalFile[name];
  if (normalFile) {
    const tex = textureMap.get(normalFile);
    if (tex) mat.normalMap = tex;
  }

  const specularFile = materialNameToSpecularFile[name];
  if (specularFile) {
    const tex = textureMap.get(specularFile);
    if (tex) mat.specularMap = tex;
  }

  if (alphaCutoutMaterials.has(name)) {
    mat.alphaMode = 'mask';
    mat.alphaCutoff = 0.5;
    mat.doubleSided = true;
  }

  materialCache.set(name, mat);
  return mat;
}

const hiddenMeshNames = new Set(['sponza_04', 'sponza_379']);
const skippedFlagpoleNums = new Set([260, 261, 263, 265, 268, 269, 271, 273]);

export function walkAndAssignMaterials(
  node: Node3D,
  materialCache: Map<string, BlinnPhongMaterial>,
  textureMap: ReadonlyMap<string, Texture2D>,
): void {
  if (isMesh(node)) {
    const mesh = node as Mesh;
    const meshName = mesh.name ?? '';

    if (hiddenMeshNames.has(meshName)) {
      mesh.visible = false;
      for (const child of getNodeChildren(node)) walkAndAssignMaterials(child as Node3D, materialCache, textureMap);
      return;
    }

    const awdMat = mesh.materials[0] as Material | undefined;
    const materialName = awdMat?.name ?? meshName;
    const matchedName = knownMaterialNames.has(materialName) ? materialName : null;

    if (matchedName) {
      const num = Number(meshName.substring(7));
      if (matchedName === 'column_c' && (num < 22 || num > 33)) {
        mesh.visible = false;
      } else if (matchedName === 'flagpole' && skippedFlagpoleNums.has(num)) {
        mesh.visible = false;
      } else {
        mesh.materials[0] = getOrCreateMaterial(matchedName, textureMap, materialCache);
      }
    } else {
      mesh.visible = false;
    }
  }

  for (const child of getNodeChildren(node)) {
    walkAndAssignMaterials(child as Node3D, materialCache, textureMap);
  }
}
