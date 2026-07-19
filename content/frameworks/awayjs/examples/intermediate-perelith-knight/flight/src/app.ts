import type { AnimationPlayer, AnimationTrack, BlinnPhongMaterial, GlRenderTarget, Mesh } from '@flighthq/sdk';
import {
  addNodeChild,
  advanceAnimationPlayer,
  cloneMeshGeometry,
  configureDirectionalShadowCamera,
  createAnimationPlayer,
  createBlinnPhongMaterial,
  createCamera,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createOrthographicProjection,
  createPlaneMeshGeometry,
  createScene,
  createSceneLights,
  createTexture,
  createTilingSampler,
  drawGlSceneShadowMap,
  getNodeChildren,
  importMd2,
  isMesh,
  loadImageResourceFromUrl,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  resizeGlRenderTarget,
  sampleAnimationTrack,
  invalidateNodeLocalTransform,
  setVector3,
  setTextureUvScale,
  updateMeshMorph,
} from '@flighthq/sdk';

import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
  awayDirection,
} from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerBlinnPhongGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 5000 });

// This demo shades with BlinnPhongMaterial (classic Lambert, no /π), so the lights skip the Phong→PBR
// ×π exposure — 'shading: phong' passes the AwayJS intensities through unchanged. Under the default
// 'pbr' path every surface would render ~π× too bright and blow the floor to flat white.
//
// tuning lifts the linear-space result back toward AwayJS's gamma-space look: a faithful ×1 conversion
// leaves the knights' camera-facing (ambient-only) sides too dark, since linear shading crushes the
// mid-tone fill that AwayJS shows brighter. The ambient scale targets those shadowed faces hardest; a
// small diffuse scale warms the key light without re-blowing the floor.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(-0.5, -1, -1),
  ambient: 0.4,
  shading: 'phong',
  tuning: { diffuse: 1.15, ambient: 1.9 },
});
const lights = createSceneLights({ ambient, directional });

const floorMaterial = createBlinnPhongMaterial({
  diffuse: 0xffffffff,
  specular: 0x000000ff,
  shininess: 1,
});
floorMaterial.doubleSided = true;

const knightMaterials: BlinnPhongMaterial[] = [];
for (let i = 0; i < 4; i++) {
  knightMaterials.push(createBlinnPhongMaterial({ diffuse: 0xffffffff, specular: 0xffffffff, shininess: 30 }));
}

const [floorImage, ...knightImages] = await Promise.all([
  loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg'),
  loadImageResourceFromUrl('awayjs/assets/pknight1.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight2.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight3.png'),
  loadImageResourceFromUrl('awayjs/assets/pknight4.png'),
]);

const floorTex = createTexture({ image: floorImage, sampler: createTilingSampler() });
setTextureUvScale(floorTex, 5, 5);
floorMaterial.diffuseMap = floorTex;

for (let i = 0; i < 4; i++) {
  knightMaterials[i]!.diffuseMap = createTexture({ image: knightImages[i]! });
}

const floorGeometry = createPlaneMeshGeometry(5000, 5000, 1, 1);
const floor = createMesh(floorGeometry, [floorMaterial]);
addNodeChild(scene, floor);

const md2Buffer = await fetch('awayjs/assets/pknight.md2').then((r) => r.arrayBuffer());
const md2Result = importMd2(new Uint8Array(md2Buffer));
const md2Scene = md2Result.scene;
const md2Clip = md2Result.animations[0] ?? null;
const md2Track: AnimationTrack | null = md2Clip?.channels[0]?.track ?? null;

let templateMesh: Mesh | null = null;
for (const child of getNodeChildren(md2Scene)) {
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

interface KnightInstance {
  mesh: Mesh;
  player: AnimationPlayer | null;
  track: AnimationTrack | null;
}

const knights: KnightInstance[] = [];
const numWide = 20;
const numDeep = 20;

for (let i = 0; i < numWide; i++) {
  for (let j = 0; j < numDeep; j++) {
    const material = knightMaterials[Math.floor(Math.random() * knightMaterials.length)]!;
    const geometry = cloneMeshGeometry(templateGeometry);
    const knight = createMesh(geometry, [material]);

    let player: AnimationPlayer | null = null;
    if (templateMorph != null && md2Clip != null) {
      knight.morph = { targets: templateMorph.targets, weights: new Float32Array(templateMorph.weights.length) };
      player = createAnimationPlayer(md2Clip, { loop: true, time: Math.random() * md2Clip.duration });
    }

    const x = ((i - (numWide - 1) / 2) * 5000) / numWide;
    const z = ((j - (numDeep - 1) / 2) * 5000) / numDeep;
    setVector3(knight.position, x, 120, z);
    setVector3(knight.scale, 5, 5, 5);
    invalidateNodeLocalTransform(knight);
    addNodeChild(scene, knight);
    knights.push({ mesh: knight, player, track: md2Track });
  }
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 2000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 5,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = orbit.panAngle;
let savedTilt = orbit.tiltAngle;

let keyUp = false;
let keyDown = false;
let keyLeft = false;
let keyRight = false;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance -= e.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      keyUp = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyDown = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      keyLeft = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyRight = true;
      break;
  }
});

document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyZ':
      keyUp = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyDown = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyQ':
      keyLeft = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyRight = false;
      break;
  }
});

// Directional shadow: render scene depth from the light's point of view into the shadow map, which the
// classic (BlinnPhong) shading then PCF-samples so the knights cast onto the floor and each other. The
// orthographic light camera is sized to a static bound covering the 5000×5000 floor and the knight
// field above it; direction and bounds never change, so the camera is configured once. The depth pass
// applies the same morph as the forward pass, so re-rendering each frame gives shadows that track the
// knights' animation (as AwayJS's shadow mapper does).
const shadowCamera = createCamera({
  near: 1,
  far: 1,
  projection: createOrthographicProjection({ halfHeight: 1, halfWidth: 1 }),
});
const sceneBounds = {
  min: { x: -2600, y: 0, z: -2600 },
  max: { x: 2600, y: 700, z: 2600 },
};
configureDirectionalShadowCamera(shadowCamera, directional.direction, sceneBounds);

let lastTime = 0;

function frame(now: number): void {
  const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (keyUp) orbit.target.x -= 10;
  if (keyDown) orbit.target.x += 10;
  if (keyLeft) orbit.target.z += 10;
  if (keyRight) orbit.target.z -= 10;

  for (const { mesh, player, track } of knights) {
    if (player !== null && track !== null && mesh.morph != null) {
      advanceAnimationPlayer(player, dt);
      sampleAnimationTrack(mesh.morph.weights, track, player.time);
      updateMeshMorph(mesh);
    }
  }

  orbit.update();
  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  drawGlSceneShadowMap(state, scene, shadowCamera);
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
