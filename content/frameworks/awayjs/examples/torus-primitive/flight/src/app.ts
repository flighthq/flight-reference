import { createScene } from '@flighthq/scene';

import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createSceneLights,
  createTexture,
  createTorusMeshGeometry,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xff000000,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 2000,
  projection: createPerspectiveProjection({
    fovY: (60 * Math.PI) / 180,
    aspect: ctx.width / ctx.height,
  }),
});

const cameraEye = createVector3(0, 0, 600);
const cameraTarget = createVector3(0, 0, 0);
const cameraUp = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, cameraEye, cameraTarget, cameraUp);

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: -1 },
  color: 0xffffff,
  intensity: 0.7,
});

const ambient = createAmbientLight({
  color: 0xffffff,
  intensity: 0.3,
});

const lights = createSceneLights({
  ambient,
  directional,
});

const image = await loadImageResourceFromUrl('awayjs/assets/dots.png');
const texture = createTexture({ image });

const material = createBlinnPhongMaterial({
  diffuse: 0.7,
  specular: 1,
  shininess: 50,
  diffuseMap: texture,
});

const geometry = createTorusMeshGeometry(220, 80, 32, 16);
const torus = createMesh(geometry, [material]);
addNodeChild(scene, torus);

const yAxis = { x: 0, y: 1, z: 0 };
let rotationY = 0;

function frame(): void {
  rotationY += (1 * Math.PI) / 180;

  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, rotationY);
  invalidateNodeLocalTransform(torus);

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.canvas.width = width * (window.devicePixelRatio || 1);
  ctx.canvas.height = height * (window.devicePixelRatio || 1);
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = width / height;
});

frame();
