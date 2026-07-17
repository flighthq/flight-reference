import type { StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBoxMeshGeometry,
  createDirectionalLight,
  createMesh,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createSphereMeshGeometry,
  createStandardPbrMaterial,
  createTexture,
  createTorusMeshGeometry,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setDirectionalLightDirection,
  setMatrix4Identity,
  setTextureUvScale,
  translateMatrix4,
} from '@flighthq/sdk';

import {
  awayDirection,
  awayPosition,
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

const directional = createDirectionalLight({
  direction: awayDirection(0, -1, 0),
  color: 0xffffffff,
  intensity: 3,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights = createSceneLights({ ambient, directional });

const planeMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
planeMaterial.doubleSided = true;

const sphereMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const cubeMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const torusMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});

const planeGeometry = createPlaneMeshGeometry(1000, 1000, 1, 1);
const plane = createMesh(planeGeometry, [planeMaterial]);
setMatrix4Identity(plane.localMatrix);
translateMatrix4(plane.localMatrix, plane.localMatrix, 0, -20, 0);
invalidateNodeLocalTransform(plane);
addNodeChild(scene, plane);

const sphereGeometry = createSphereMeshGeometry(150, 40, 20);
const sphere = createMesh(sphereGeometry, [sphereMaterial]);
setMatrix4Identity(sphere.localMatrix);
translateMatrix4(sphere.localMatrix, sphere.localMatrix, ...awayPosition(300, 160, 300));
invalidateNodeLocalTransform(sphere);
addNodeChild(scene, sphere);

const cubeGeometry = createBoxMeshGeometry(200, 200, 200);
const cube = createMesh(cubeGeometry, [cubeMaterial]);
setMatrix4Identity(cube.localMatrix);
translateMatrix4(cube.localMatrix, cube.localMatrix, ...awayPosition(300, 160, -250));
invalidateNodeLocalTransform(cube);
addNodeChild(scene, cube);

const torusGeometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(torusGeometry, [torusMaterial]);
setMatrix4Identity(torus.localMatrix);
translateMatrix4(torus.localMatrix, torus.localMatrix, ...awayPosition(-250, 160, -250));
invalidateNodeLocalTransform(torus);
addNodeChild(scene, torus);

function applyTextures(
  material: StandardPbrMaterial,
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
        material.baseColorMap = tex;
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
        material.metallicRoughnessMap = tex;
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
torusMaterial.metallicRoughnessMap = torusSpecTex;

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
    torusMaterial.baseColorMap = tex;
  }),
]);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (event.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (event.clientY - lastMouseY) + lastTiltAngle;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (event: WheelEvent) => {
  orbit.distance -= event.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;
});

function frame(ts: number): void {
  const lightX = Math.sin(ts / 10000) * 150000;
  const lightZ = -Math.cos(ts / 10000) * 150000;
  setDirectionalLightDirection(directional, lightX, -1000, lightZ);

  orbit.update();
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
