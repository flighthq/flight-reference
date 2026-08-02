import type { AnimationClip, Mesh, Node3D, Scene3D, Texture2D } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  computeMeshGeometryTangents,
  createExtendedPbrMaterial,
  createScene3D,
  createScene3DFromMd5Mesh,
  createSpecularPbrExtension,
  createStandardPbrMaterial,
  createStandardPbrMaterialProperties,
  createTexture,
  createTilingSampler,
  getNodeChildren,
  isMesh,
  loadImageResourceFromUrl,
  parseMd5Anim,
} from '@flighthq/sdk';

export const ANIM_NAMES = [
  'idle2',
  'walk7',
  'attack3',
  'turret_attack',
  'attack2',
  'chest',
  'roar1',
  'leftslash',
  'headpain',
  'pain1',
  'pain_luparm',
  'range_attack2',
];
export const IDLE_NAME = 'idle2';
export const WALK_NAME = 'walk7';

export interface CharacterData {
  clips: Map<string, AnimationClip>;
  skinnedMeshes: Mesh[];
  jointNodes: Node3D[];
  characterPositionNode: Scene3D;
  characterNode: Scene3D;
  gobTexture: Texture2D;
}

export async function loadCharacter(): Promise<CharacterData> {
  const [bodyDiffuse, bodyNormal, bodySpecular, gobImage] = await Promise.all([
    loadImageResourceFromUrl('awayjs/hellknight/hellknight_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/hellknight/hellknight_normals.png'),
    loadImageResourceFromUrl('awayjs/hellknight/hellknight_specular.png'),
    loadImageResourceFromUrl('awayjs/hellknight/gob.png'),
  ]);
  const bodyMaterial = createExtendedPbrMaterial({
    standard: createStandardPbrMaterialProperties({
      baseColor: 0xffffffff,
      baseColorMap: createTexture({ source: bodyDiffuse }),
      metallic: 0,
      normalMap: createTexture({ source: bodyNormal, colorSpace: 'linear' }),
      normalScale: 0.8,
      roughness: 0.42,
    }),
    // The source uses this RGB map as Phong specular strength. Keeping it on the PBR specular-colour
    // extension preserves its wet highlights without interpreting its dark pixels as roughness.
    extensions: [
      createSpecularPbrExtension({
        specular: 1,
        specularColorMap: createTexture({ source: bodySpecular, colorSpace: 'linear' }),
      }),
    ],
  });

  const gobTexture = createTexture({ source: gobImage, sampler: createTilingSampler() });
  const gobMaterial = createStandardPbrMaterial({
    baseColor: 0xcbd8cfff,
    baseColorMap: gobTexture,
    emissive: 0x101810ff,
    emissiveStrength: 0.2,
    metallic: 0,
    roughness: 0.18,
  });
  // Flight now draws blended materials after opaque geometry, so the source's translucent scrolling
  // saliva can be restored without the old transparent depth-write hiding the character body.
  gobMaterial.alphaMode = 'blend';
  gobMaterial.doubleSided = true;

  const meshText = await fetch('awayjs/hellknight/hellknight.md5mesh').then((r) => r.text());
  const md5Scene = createScene3DFromMd5Mesh(meshText);

  const md5Children = getNodeChildren(md5Scene.root);
  const characterPositionNode = createScene3D();
  const characterNode = createScene3D();
  const skinnedMeshes: Mesh[] = [];
  let meshIndex = 0;
  for (const child of md5Children) {
    if (isMesh(child)) {
      child.materials[0] = meshIndex === 0 ? bodyMaterial : gobMaterial;
      computeMeshGeometryNormals(child.geometry, child.geometry);
      computeMeshGeometryTangents(child.geometry, child.geometry);
      skinnedMeshes.push(child);
      meshIndex++;
    }
    addNodeChild(characterNode.root, child);
  }
  const jointNodes = skinnedMeshes[0]?.skin?.skeleton.joints ?? [];
  addNodeChild(characterPositionNode.root, characterNode.root);

  const animTexts = await Promise.all(
    ANIM_NAMES.map((name) => fetch(`awayjs/hellknight/${name}.md5anim`).then((r) => r.text())),
  );

  const clips: Map<string, AnimationClip> = new Map();
  for (let i = 0; i < ANIM_NAMES.length; i++) {
    const clip = parseMd5Anim(animTexts[i]!, jointNodes);
    if (!clip) continue;
    // AwayJS consumes joint zero's translation as owner root motion and omits it from the rendered
    // skeleton for every clip. Zero it here so the skeleton doesn't shift inside the mesh.
    for (const channel of clip.channels) {
      const target = channel.targetRef as { node?: Node3D; path?: string } | null;
      if (target?.node === jointNodes[0] && target.path === 'Translation') {
        channel.track.values = new Float32Array(channel.track.values.length);
      }
    }
    clips.set(ANIM_NAMES[i]!, clip);
  }

  return { clips, skinnedMeshes, jointNodes, characterPositionNode, characterNode, gobTexture };
}
