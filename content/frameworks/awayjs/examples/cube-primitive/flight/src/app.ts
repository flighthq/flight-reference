import {
  addNodeChild,
  BlendMode,
  createAmbientLight,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createScene,
  createSceneLights,
  createTexture,
  createTorusMeshGeometry,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
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
  far: 5000,
  projection: createPerspectiveProjection({ fovY: 120 * DEG, aspect: window.innerWidth / window.innerHeight }),
});

const directional = createDirectionalLight({
  direction: { x: 1, y: 0, z: 0 },
  color: 0xffffff,
  intensity: 2.8,
});

const ambient = createAmbientLight({ color: 0x85b2cd, intensity: 0.4 });
const lights = createSceneLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/assets/spacy_texture.png');
const texture = createTexture({ image });

const material = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  shininess: 50,
  specular: 0xffffffff,
});
material.diffuseMap = texture;
material.blendMode = BlendMode.Add;
material.alphaMode = 'blend';
material.doubleSided = true;

const torusGeometry = createTorusMeshGeometry(150, 80, 32, 16);
const torus = createMesh(torusGeometry, [material]);
addNodeChild(scene, torus);

const cubeGeometry = createBoxMeshGeometry(20, 20, 20);
const cube = createMesh(cubeGeometry, [material]);
setMatrix4Identity(cube.localMatrix);
translateMatrix4(cube.localMatrix, cube.localMatrix, 130, 0, 40);
invalidateNodeLocalTransform(cube);
addNodeChild(scene, cube);

const eye = createVector3(130, 0, 0);
const lookTarget = createVector3(130, 0, 40);
const up = createVector3(0, 1, 0);
const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);

let cameraAngle = 0;
let torusAngleY = 0;
let cubeAngleX = 0;
let cubeAngleY = 0;

setCameraViewMatrix4FromLookAt(camera, eye, lookTarget, up);

function frame(): void {
  cameraAngle += DEG;
  torusAngleY += DEG;
  cubeAngleX += 0.4 * DEG;
  cubeAngleY += 0.4 * DEG;

  eye.x = 130 * Math.cos(cameraAngle);
  eye.y = 130 * Math.sin(cameraAngle);

  lookTarget.x = eye.x;
  lookTarget.y = eye.y;

  up.x = -Math.sin(cameraAngle);
  up.y = Math.cos(cameraAngle);
  up.z = 0;

  setCameraViewMatrix4FromLookAt(camera, eye, lookTarget, up);

  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, torusAngleY);
  invalidateNodeLocalTransform(torus);

  setMatrix4Identity(cube.localMatrix);
  translateMatrix4(cube.localMatrix, cube.localMatrix, 130, 0, 40);
  rotateMatrix4(cube.localMatrix, cube.localMatrix, yAxis, cubeAngleY);
  rotateMatrix4(cube.localMatrix, cube.localMatrix, xAxis, cubeAngleX);
  invalidateNodeLocalTransform(cube);

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

frame();
