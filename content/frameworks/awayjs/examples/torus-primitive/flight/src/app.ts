import {
  createScene,
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
  PerspectiveProjection,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const DEG = Math.PI / 180;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 2000,
  projection: createPerspectiveProjection({
    fovY: 60 * DEG,
    aspect: ctx.width / ctx.height,
  }),
});

const eye = createVector3(0, 0, 600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
setCameraViewMatrix4FromLookAt(camera, eye, target, up);

const directional = createDirectionalLight({
  direction: { x: 0, y: -0.5, z: -1 },
  color: 0xffffffff,
  intensity: 6,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights = createSceneLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/assets/dots.png');
const texture = createTexture({ image });

const material = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  specular: 0xffffffff,
  shininess: 20,
  diffuseMap: texture,
});

const geometry = createTorusMeshGeometry(220, 80, 32, 16);
const torus = createMesh(geometry, [material]);
addNodeChild(scene, torus);

const yAxis = createVector3(0, 1, 0);
let rotationY = 0;

function frame(): void {
  rotationY -= DEG;

  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, rotationY);
  invalidateNodeLocalTransform(torus);

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = width * pixelRatio;
  ctx.canvas.height = height * pixelRatio;
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = width / height;
});

frame();
