import type { AnimationPlayer, AnimationTrack, BlinnPhongMaterial, Mesh, Scene3D } from '@flighthq/sdk';
import {
  addNodeChild,
  cloneMeshGeometry,
  createAnimationPlayer,
  createBlinnPhongMaterial,
  createMesh,
  createScene3DFromMd2,
  createTexture,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadImageResourceFromUrl,
  setVector3,
} from '@flighthq/sdk';

export interface KnightAnimationBucket {
  driver: Mesh;
  player: AnimationPlayer | null;
  track: AnimationTrack | null;
}

export interface KnightsResult {
  animationBuckets: KnightAnimationBucket[];
  knightMaterials: BlinnPhongMaterial[];
}

export async function loadKnights(scene: Readonly<Scene3D>): Promise<KnightsResult> {
  const knightMaterials: BlinnPhongMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    knightMaterials.push(createBlinnPhongMaterial({ diffuse: 0xffffffff, specular: 0xffffffff, shininess: 30 }));
  }

  const knightImages = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/pknight1.png'),
    loadImageResourceFromUrl('awayjs/assets/pknight2.png'),
    loadImageResourceFromUrl('awayjs/assets/pknight3.png'),
    loadImageResourceFromUrl('awayjs/assets/pknight4.png'),
  ]);

  for (let i = 0; i < 4; i++) {
    knightMaterials[i]!.diffuseMap = createTexture({ image: knightImages[i]! });
  }

  const md2Buffer = await fetch('awayjs/assets/pknight.md2').then((r) => r.arrayBuffer());
  const md2Scene = await createScene3DFromMd2(new Uint8Array(md2Buffer));
  const md2Clips = Object.values(md2Scene.animations);

  let templateMesh: Mesh | null = null;
  for (const child of getNodeChildren(md2Scene.root)) {
    if (isMesh(child)) {
      templateMesh = child as Mesh;
      break;
    }
  }

  if (!templateMesh?.geometry) {
    throw new Error('No mesh found in MD2 file');
  }

  const templateGeometry = templateMesh.geometry;
  const templateMorph = templateMesh.morph;

  const animationBuckets: KnightAnimationBucket[] = [];
  const numWide = 20;
  const numDeep = 20;
  // CPU morphing rewrites and uploads a full geometry each frame. Sixteen independently phased shared
  // geometries retain a lively crowd while reducing deformation work and animated GPU buffers from 400
  // to 16. Every visible knight still has its own transform/material and participates in both shadow and
  // forward passes.
  const animationBucketCount = templateMorph != null && md2Clips.length > 0 ? Math.min(16, md2Clips.length) : 1;

  for (let i = 0; i < animationBucketCount; i++) {
    const geometry = cloneMeshGeometry(templateGeometry);
    const driver = createMesh(geometry, []);
    const clip = md2Clips[i % md2Clips.length] ?? null;
    let player: AnimationPlayer | null = null;
    let track: AnimationTrack | null = null;
    if (templateMorph != null && clip != null) {
      driver.morph = { targets: templateMorph.targets, weights: new Float32Array(templateMorph.weights.length) };
      player = createAnimationPlayer(clip, {
        loop: true,
        time: (i / animationBucketCount) * clip.duration,
      });
      track = clip.channels[0]?.track ?? null;
    }
    animationBuckets.push({ driver, player, track });
  }

  for (let i = 0; i < numWide; i++) {
    for (let j = 0; j < numDeep; j++) {
      const material = knightMaterials[Math.floor(Math.random() * knightMaterials.length)]!;
      const bucket = animationBuckets[Math.floor(Math.random() * animationBuckets.length)]!;
      const knight = createMesh(bucket.driver.geometry, [material]);

      const x = ((i - (numWide - 1) / 2) * 5000) / numWide;
      const z = ((j - (numDeep - 1) / 2) * 5000) / numDeep;
      setVector3(knight.position, x, 120, z);
      setVector3(knight.scale, 5, 5, 5);
      invalidateNodeLocalTransform(knight);
      addNodeChild(scene.root, knight);
    }
  }

  return { animationBuckets, knightMaterials };
}
