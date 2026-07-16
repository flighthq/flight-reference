import type { BlinnPhongMaterial } from '@flighthq/sdk';
import {
  createScene,
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createCamera,
  createDirectionalLight,
  createMesh,
  createPerspectiveProjection,
  createPlaneMeshGeometry,
  createSceneLights,
  createSphereMeshGeometry,
  createTexture,
  createTorusMeshGeometry,
  createVector3,
  DEG_TO_RAD,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setCameraViewMatrix4FromLookAt,
  setDirectionalLightDirection,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCamera({
  near: 0.1,
  far: 5000,
  projection: createPerspectiveProjection({
    fovY: 45 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const directional = createDirectionalLight({
  direction: { x: 0, y: -1, z: 0 },
  color: 0xffffffff,
  intensity: 0.7,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.1 });
const lights = createSceneLights({ ambient, directional });

const planeMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20, specular: 0x808080ff });
planeMaterial.doubleSided = true;

const sphereMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20, specular: 0x808080ff });
const cubeMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20, specular: 0x808080ff });
const torusMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20, specular: 0x808080ff });

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
setMatrix4Identity(plane.localMatrix);
translateMatrix4(plane.localMatrix, plane.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(plane);
addNodeChild(scene, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setMatrix4Identity(sphere.localMatrix);
translateMatrix4(sphere.localMatrix, sphere.localMatrix, 300, 160, 300);
invalidateNodeLocalTransform(sphere);
addNodeChild(scene, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setMatrix4Identity(cube.localMatrix);
translateMatrix4(cube.localMatrix, cube.localMatrix, 300, 160, -250);
invalidateNodeLocalTransform(cube);
addNodeChild(scene, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(torusGeometry, [torusMaterial]);
setMatrix4Identity(torus.localMatrix);
translateMatrix4(torus.localMatrix, torus.localMatrix, -250, 160, -250);
invalidateNodeLocalTransform(torus);
addNodeChild(scene, torus);

function applyTextures(
  material: BlinnPhongMaterial,
  maps: { diffuse?: string; normal?: string; specular?: string },
  uvScale?: { x: number; y: number },
): Promise<void[]> {
  const jobs: Promise<void>[] = [];
  if (maps.diffuse) {
    const url = maps.diffuse;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.diffuseMap = tex;
      }),
    );
  }
  if (maps.normal) {
    const url = maps.normal;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.normalMap = tex;
      }),
    );
  }
  if (maps.specular) {
    const url = maps.specular;
    jobs.push(
      loadImageResourceFromUrl(url).then((image) => {
        const tex = createTexture({ image });
        if (uvScale) setTextureUvScale(tex, uvScale.x, uvScale.y);
        material.specularMap = tex;
      }),
    );
  }
  return Promise.all(jobs);
}

const torusWeaveNormalImage = await loadImageResourceFromUrl('awayjs/assets/weave_normal.jpg');
const torusNormalTex = createTexture({ image: torusWeaveNormalImage });
setTextureUvScale(torusNormalTex, 10, 5);
torusMaterial.normalMap = torusNormalTex;

const torusSpecTex = createTexture({ image: torusWeaveNormalImage });
setTextureUvScale(torusSpecTex, 10, 5);
torusMaterial.specularMap = torusSpecTex;

await Promise.all([
  applyTextures(
    planeMaterial,
    {
      diffuse: 'awayjs/assets/floor_diffuse.jpg',
      normal: 'awayjs/assets/floor_normal.jpg',
      specular: 'awayjs/assets/floor_specular.jpg',
    },
    { x: 2, y: 2 },
  ),
  applyTextures(sphereMaterial, {
    diffuse: 'awayjs/assets/beachball_diffuse.jpg',
    specular: 'awayjs/assets/beachball_specular.jpg',
  }),
  applyTextures(cubeMaterial, {
    diffuse: 'awayjs/assets/trinket_diffuse.jpg',
    normal: 'awayjs/assets/trinket_normal.jpg',
    specular: 'awayjs/assets/trinket_specular.jpg',
  }),
  loadImageResourceFromUrl('awayjs/assets/weave_diffuse.jpg').then((image) => {
    const tex = createTexture({ image });
    setTextureUvScale(tex, 10, 5);
    torusMaterial.diffuseMap = tex;
  }),
]);

let panAngle = 45 * DEG_TO_RAD;
let tiltAngle = 20 * DEG_TO_RAD;
let distance = 1000;
const minTiltAngle = 0;
const maxTiltAngle = 90 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = panAngle;
let lastTiltAngle = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

function updateCamera(): void {
  const clampedTilt = Math.max(minTiltAngle, Math.min(maxTiltAngle, tiltAngle));
  tiltAngle = clampedTilt;

  eye.x = distance * Math.sin(panAngle) * Math.cos(clampedTilt);
  eye.y = distance * Math.sin(clampedTilt);
  eye.z = distance * Math.cos(panAngle) * Math.cos(clampedTilt);

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
}

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = panAngle;
  lastTiltAngle = tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  panAngle = 0.3 * DEG_TO_RAD * (event.clientX - lastMouseX) + lastPanAngle;
  tiltAngle = 0.3 * DEG_TO_RAD * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (event: WheelEvent) => {
  distance -= event.deltaY / 2;
  if (distance < 100) distance = 100;
  else if (distance > 2000) distance = 2000;
});

updateCamera();

function frame(ts: number): void {
  const lightX = Math.sin(ts / 10000) * 150000;
  const lightZ = Math.cos(ts / 10000) * 150000;
  setDirectionalLightDirection(directional, lightX, -1000, lightZ);

  updateCamera();
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
