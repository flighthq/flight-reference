import type { Texture } from '@flighthq/sdk';
import type { Mesh } from '@flighthq/sdk';
import type {
  Adjustment,
  Camera3D,
  GlRenderEffectPipeline,
  GlRenderState,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
} from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  createAmbientLight,
  createBuiltInScene3DResourceResolver,
  createDirectionalLight,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createScene3D,
  createScene3DFromAwd2,
  createScene3DLights,
  createToneMapEffect,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  isMesh,
  loadScene3DResources,
  prepareMeshSkinning,
  registerGlBlinnPhongMaterial,
  registerBuiltInGlModifierSnippets,
  registerGlExtendedPbrMaterial,
  registerGlRenderEffect,
  registerGlShadedMaterial,
  registerGlSpecularPbrExtension,
  registerScene3DMaterialTextures,
  registerStandardGlTextureResolvers,
  registerGlStandardPbrMaterial,
  registerGlUnlitMaterial,
  renderGlBackground,
  updateMeshSkin,
  walkNodeDescendants,
} from '@flighthq/sdk';

import {
  awayDirection,
  bindOrbitDrag,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createAnimationState } from './animation';
import { createScene3DContext } from './renderer';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  // AwayJS used the sRGB display color 0x333338. Flight clears into the linear-HDR scene target and the
  // present pass applies the linear->sRGB encode, so a raw 0x333338 clear would display much lighter
  // (~0x7c7c81). Pre-linearize to the value that presents back as 0x333338.
  backgroundColor: 0x08080aff,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 70, near: 1, far: 5000 });

// The AWD ships a fully textured diffuse skin, so keep the lights modest — Flight's linear pipeline
// blows the texture out to white at the AwayJS-era intensities (dir 3 / amb 1.5).
const directional = createDirectionalLight({
  direction: awayDirection(0, -1, -1),
  color: 0xffffffff,
  intensity: 1.1,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.35 });
const lights: Scene3DLights = createScene3DLights({ ambient, directional });

const awdBuffer = await fetch('awayjs/shambler.awd').then((r) => r.arrayBuffer());
const awdScene = createScene3DFromAwd2(new Uint8Array(awdBuffer));

// The AWD embeds its diffuse/normal/specular maps as byte blobs; nothing samples them until the
// scene's resource references are resolved. createBuiltInScene3DResourceResolver only lists textures
// for the Standard PBR and Unlit families, and this model parses to ShadedMaterial — so its slots
// need their own lister or no texture is ever selected and the refs stay silently Unresolved.
const resourceResolver = createBuiltInScene3DResourceResolver();
registerScene3DMaterialTextures(resourceResolver.registry, 'ShadedMaterial', (material, out) => {
  const shaded = material as unknown as Record<string, Texture | null | undefined>;
  for (const slot of ['diffuseMap', 'normalMap', 'specularMap']) {
    const texture = shaded[slot];
    if (texture) out.push(texture);
  }
});
await loadScene3DResources(awdScene, resourceResolver);
addNodeChild(scene.root, awdScene.root);

// The AWD's meshes are skinned — their vertex layout carries joint indices and weights, and the
// parser fills in Mesh.skin. Nothing deforms them until skinning is prepared once per mesh and
// refreshed each frame after the skeleton is posed, so without this the model draws at a degenerate
// bind state and reads as an empty scene.
const skinnedMeshes: Mesh[] = [];
walkNodeDescendants(awdScene.root, (node) => {
  if (isMesh(node) && node.skin) {
    prepareMeshSkinning(node);
    skinnedMeshes.push(node);
  }
  // walkNodeDescendants treats a falsy return as "stop traversing"
  return true;
});

const animation = createAnimationState(awdScene.animations);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 150,
  panAngle: 0,
  tiltAngle: 0,
  minTiltAngle: 5,
  maxTiltAngle: 60,
  targetY: 60,
});

bindOrbitDrag(ctx.canvas, orbit, { minDistance: 100, maxDistance: 2000 });

let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  animation.step(dt);
  for (const mesh of skinnedMeshes) updateMeshSkin(mesh);
  orbit.update();
  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pr;
  ctx.canvas.height = h * pr;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);
