import { createScene } from '@flighthq/scene';

import type { SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createMesh,
  createOrthographicProjection,
  createTexture,
  createUnlitMaterial,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { createTexturedQuadGeometry } from '../../../_shared/flightSceneGeometry';
import { height, render, width } from './render';

const image = await loadImageResourceFromUrl('assets/openfl.png');
const texture = createTexture({ image: image });
const scene = createScene();
const material = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });
material.doubleSided = true;
const mesh = createMesh(createTexturedQuadGeometry(image.width, image.height, true), [material]);
addNodeChild(scene, mesh);

const camera = createCamera({
  far: 10,
  near: 0.1,
  projection: createOrthographicProjection({ halfHeight: height / 2, halfWidth: width / 2 }),
});
setCameraViewMatrix4FromLookAt(camera, createVector3(0, 0, 1), createVector3(0, 0, 0), createVector3(0, 1, 0));

const lights: SceneLights = { ambient: null, directional: null };

setMatrix4Identity(mesh.localMatrix);
translateMatrix4(
  mesh.localMatrix,
  mesh.localMatrix,
  -width / 2 + 100 + image.width / 2,
  height / 2 - 100 - image.height / 2,
  0,
);
invalidateNodeLocalTransform(mesh);

render(scene, camera, lights);
