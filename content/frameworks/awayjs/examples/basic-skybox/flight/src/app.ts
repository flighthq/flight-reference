import type { SceneLights } from '@flighthq/sdk';
import {
  createScene,
  drawGlEnvironmentSkybox,
  drawGlScene,
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createCamera,
  createCubeTexture,
  createDirectionalLight,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createMesh,
  createPerspectiveProjection,
  createSceneLights,
  createTorusMeshGeometry,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerBlinnPhongGlMaterial,
  renderGlBackground,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
} from '@flighthq/sdk';

const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(width, height, pixelRatio);

if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}

document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0xffff00ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
  pixelRatio,
});

registerBlinnPhongGlMaterial(state);

const scene = createScene();

const torusMaterial = createBlinnPhongMaterial({
  diffuse: 0x111199ff,
  shininess: 20,
  specular: 0x808080ff,
});

const geometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(geometry, [torusMaterial]);
addNodeChild(scene, torus);

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({ fovY: 90 * DEG_TO_RAD }),
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 1 },
  color: 0xffffffff,
  intensity: 0.7,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const cubeTexture = createCubeTexture();

const faceUrls = [
  'awayjs/assets/skybox/snow_positive_x.jpg',
  'awayjs/assets/skybox/snow_negative_x.jpg',
  'awayjs/assets/skybox/snow_positive_y.jpg',
  'awayjs/assets/skybox/snow_negative_y.jpg',
  'awayjs/assets/skybox/snow_positive_z.jpg',
  'awayjs/assets/skybox/snow_negative_z.jpg',
];

const faceImages = await Promise.all(faceUrls.map((url) => loadImageResourceFromUrl(url)));

for (let i = 0; i < 6; i++) {
  setCubeTextureFace(cubeTexture, i, faceImages[i]);
}

const environment = createEnvironment({ environment: cubeTexture, intensity: 1 });

let mouseX = width / 2;
let cameraRotationY = 0;

const eye = createVector3(0, 0, -600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);

document.addEventListener('mousemove', (event: MouseEvent) => {
  mouseX = event.clientX;
});

const aspect = width / height;

let torusRotX = 0;
let torusRotY = 0;

function frame(): void {
  torusRotX += 2 * DEG_TO_RAD;
  torusRotY += 1 * DEG_TO_RAD;

  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, xAxis, torusRotX);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, torusRotY);
  invalidateNodeLocalTransform(torus);

  cameraRotationY += (0.5 * (mouseX - window.innerWidth / 2)) / 800;
  const rotRad = cameraRotationY * DEG_TO_RAD;

  eye.x = -600 * Math.sin(rotRad);
  eye.y = 0;
  eye.z = -600 * Math.cos(rotRad);

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);

  renderGlBackground(state);
  const gl = state.gl;
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(state, environment, camera, aspect);
  drawGlScene(state, scene, camera, lights);

  requestAnimationFrame(frame);
}

frame();
