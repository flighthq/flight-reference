import type { AnimationClip, Mesh, Node3D, Scene3D } from '@flighthq/sdk';
import {
  addNodeChild,
  computeMeshGeometryNormals,
  createScene3D,
  createScene3DFromMd5Mesh,
  createTexture,
  getNodeChildren,
  isMesh,
  loadImageResourceFromUrl,
  parseMd5Anim,
} from '@flighthq/sdk';

import { createAwayMatteMaterial } from '../../../_shared/flight/src/materials';

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
}

export async function loadCharacter(): Promise<CharacterData> {
  const bodyMaterial = createAwayMatteMaterial(0xffffffff);
  const [bodyDiffuse, bodyNormal] = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/assets/hellknight/hellknight_normals.png'),
  ]);
  bodyMaterial.baseColorMap = createTexture({ image: bodyDiffuse });
  bodyMaterial.normalMap = createTexture({ image: bodyNormal, colorSpace: 'linear' });

  const meshText = await fetch('awayjs/assets/hellknight/hellknight.md5mesh').then((r) => r.text());
  const md5Scene = createScene3DFromMd5Mesh(meshText);

  const md5Children = getNodeChildren(md5Scene.root);
  const characterPositionNode = createScene3D();
  const characterNode = createScene3D();
  const skinnedMeshes: Mesh[] = [];
  for (const child of md5Children) {
    if (isMesh(child)) {
      child.materials[0] = bodyMaterial;
      computeMeshGeometryNormals(child.geometry, child.geometry);
      skinnedMeshes.push(child);
    }
    addNodeChild(characterNode.root, child);
  }
  const jointNodes = skinnedMeshes[0]?.skin?.skeleton.joints ?? [];
  addNodeChild(characterPositionNode.root, characterNode.root);

  const animTexts = await Promise.all(
    ANIM_NAMES.map((name) => fetch(`awayjs/assets/hellknight/${name}.md5anim`).then((r) => r.text())),
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

  return { clips, skinnedMeshes, jointNodes, characterPositionNode, characterNode };
}
