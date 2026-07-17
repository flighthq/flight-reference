import type { SceneNode } from '@flighthq/sdk';
import {
  addNodeChild,
  createScene,
  createSceneFromAwd,
  createSceneLights,
  createStandardPbrMaterial,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  isMesh,
  rotateMatrix4,
  scaleMatrix4,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';
import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x1e2125ff,
});

const scene = createScene();

const camera = createCameraFromAway({ z: -2000, fov: 60 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0x683019,
  diffuse: 2.8,
  ambient: 0.5,
  ambientColor: 0x30353b,
});
const lights = createSceneLights({ ambient, directional });

const defaultMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});

const buffer = await fetch('awayjs/assets/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = createSceneFromAwd(new Uint8Array(buffer));

function assignDefaultMaterial(node: SceneNode): void {
  if (isMesh(node)) {
    if (node.materials.length === 0) node.materials.push(defaultMaterial);
    for (let i = 0; i < node.materials.length; i++) {
      if (!node.materials[i]) node.materials[i] = defaultMaterial;
    }
  }
  for (const child of getNodeChildren(node)) {
    assignDefaultMaterial(child);
  }
}

assignDefaultMaterial(modelScene);

const modelChildren: SceneNode[] = [];
for (const child of getNodeChildren(modelScene)) {
  setMatrix4Identity(child.localMatrix);
  translateMatrix4(child.localMatrix, child.localMatrix, 0, -300, 0);
  scaleMatrix4(child.localMatrix, child.localMatrix, 900, 900, 900);
  invalidateNodeLocalTransform(child);
  addNodeChild(scene, child);
  modelChildren.push(child);
}

const yAxis = createVector3(0, 1, 0);

function frame(): void {
  for (const child of modelChildren) {
    rotateMatrix4(child.localMatrix, child.localMatrix, yAxis, -1 * DEG_TO_RAD);
    invalidateNodeLocalTransform(child);
  }

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
