import type { GlRenderTarget, Mesh, SceneHit, StandardPbrMaterial } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBoxMeshGeometry,
  createCylinderMeshGeometry,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createScene,
  createSceneFromObj,
  createSceneHit,
  createSceneLights,
  createSphereMeshGeometry,
  createStandardPbrMaterial,
  createTorusMeshGeometry,
  createMatrix4,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  getPbrRoughnessFromPhongShininess,
  packOpaqueColor,
  pickScene,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
  rotateMatrix4,
  setMatrix4Identity,
  setNodeLocalMatrix4,
  setSceneNodePosition,
  setSceneNodeScale,
  translateMatrix4,
} from '@flighthq/sdk';

import {
  createCameraFromAway,
  createOrbitControllerFromAway,
  AWAY_MOUSE_SENSITIVITY,
} from '../../../_shared/flight/src/camera';
import { createPointLightFromAway } from '../../../_shared/flight/src/lighting';
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

registerStandardPbrGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ fov: 60 });

const pointLight = createPointLightFromAway({ range: 10000 });
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights = createSceneLights({
  ambient,
  directional: null,
  point: [pointLight],
});

const whiteMaterial = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const blackMaterial = createStandardPbrMaterial({
  baseColor: packOpaqueColor(0x333333),
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const grayMaterial = createStandardPbrMaterial({
  baseColor: packOpaqueColor(0xcccccc),
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const blueMaterial = createStandardPbrMaterial({
  baseColor: 0x0000ffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const redMaterial = createStandardPbrMaterial({
  baseColor: 0xff0000ff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});
const greenTracerMaterial = createStandardPbrMaterial({
  baseColor: 0x00ff00ff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});
const blueTracerMaterial = createStandardPbrMaterial({
  baseColor: 0x0000ffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(10),
});

const pickingTracer = createMesh(createSphereMeshGeometry(2, 8, 6), [greenTracerMaterial]);
setSceneNodePosition(pickingTracer, 0, 0, 0);
pickingTracer.visible = false;
addNodeChild(scene, pickingTracer);

const sceneTracer = createMesh(createSphereMeshGeometry(2, 8, 6), [blueTracerMaterial]);
setSceneNodePosition(sceneTracer, 0, 0, 0);
sceneTracer.visible = false;
addNodeChild(scene, sceneTracer);

const normalTracerGeometry = createCylinderMeshGeometry(0.5, 0.5, 25, 6, 1);
const pickingNormalTracer = createMesh(normalTracerGeometry, [whiteMaterial]);
pickingNormalTracer.visible = false;
addNodeChild(scene, pickingNormalTracer);

const sceneNormalTracer = createMesh(createCylinderMeshGeometry(0.5, 0.5, 25, 6, 1), [whiteMaterial]);
sceneNormalTracer.visible = false;
addNodeChild(scene, sceneNormalTracer);

const tracerMeshes = new Set<Mesh>([pickingTracer, sceneTracer, pickingNormalTracer, sceneNormalTracer]);

interface ObjectInfo {
  mesh: Mesh;
  mouseEnabled: boolean;
  hasListeners: boolean;
  shapeFlag: boolean;
  baseMaterial: StandardPbrMaterial;
}

const objectInfos: ObjectInfo[] = [];
const meshToInfo = new Map<Mesh, ObjectInfo>();

function chooseMaterial(info: ObjectInfo): StandardPbrMaterial {
  if (!info.mouseEnabled) return blackMaterial;
  if (!info.hasListeners) return grayMaterial;
  return info.shapeFlag ? redMaterial : blueMaterial;
}

function createRandomObject(): ObjectInfo {
  const rand = Math.random();
  let mesh: Mesh;
  if (rand > 0.75) {
    mesh = createMesh(createBoxMeshGeometry(25, 50, 25), [grayMaterial]);
  } else if (rand > 0.5) {
    mesh = createMesh(createSphereMeshGeometry(12, 16, 12), [grayMaterial]);
  } else if (rand > 0.25) {
    mesh = createMesh(createCylinderMeshGeometry(12, 12, 25, 16, 1), [grayMaterial]);
  } else {
    mesh = createMesh(createTorusMeshGeometry(12, 12, 16, 12), [grayMaterial]);
  }

  const isMouseEnabled = Math.random() > 0.25;
  const hasListeners = isMouseEnabled && Math.random() > 0.25;
  const shapeFlag = Math.random() > 0.5;

  const info: ObjectInfo = {
    mesh,
    mouseEnabled: isMouseEnabled,
    hasListeners,
    shapeFlag,
    baseMaterial: grayMaterial,
  };
  info.baseMaterial = chooseMaterial(info);
  mesh.materials = [info.baseMaterial];

  const zAxis = createVector3(0, 0, 1);
  const rotZ = 360 * Math.random() * DEG_TO_RAD;
  const m = createMatrix4();
  setMatrix4Identity(m);
  rotateMatrix4(m, m, zAxis, rotZ);

  const r = 200 + 100 * Math.random();
  const azimuth = 2 * Math.PI * Math.random();
  const elevation = 0.25 * Math.PI * Math.random();
  const px = r * Math.cos(elevation) * Math.sin(azimuth);
  const py = r * Math.sin(elevation);
  const pz = r * Math.cos(elevation) * Math.cos(azimuth);
  translateMatrix4(m, m, px, py, pz);
  setNodeLocalMatrix4(mesh, m);

  addNodeChild(scene, mesh);
  objectInfos.push(info);
  meshToInfo.set(mesh, info);

  return info;
}

for (let i = 0; i < 40; i++) {
  createRandomObject();
}

let headMesh: Mesh | null = null;
const headMaterial = createStandardPbrMaterial({
  baseColor: packOpaqueColor(0xcccccc),
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
});

try {
  const objText = await fetch('awayjs/assets/head.obj').then((r) => r.text());
  const headScene = createSceneFromObj(objText);
  const children = getNodeChildren(headScene);
  for (const child of children) {
    addNodeChild(scene, child);
    const m = child as Mesh;
    // AwayJS loads head.obj through new OBJParser(25), which scales the geometry 25x;
    // createSceneFromObj applies no scale, so match it here or the head renders 1/25 size.
    setSceneNodeScale(m, 25, 25, 25);
    if (m.materials) {
      m.materials = [headMaterial];
      headMesh = m;
      const info: ObjectInfo = {
        mesh: m,
        mouseEnabled: true,
        hasListeners: true,
        shapeFlag: true,
        baseMaterial: headMaterial,
      };
      objectInfos.push(info);
      meshToInfo.set(m, info);
    }
  }
} catch {
  console.warn('Could not load head.obj; skipping head model.');
}

const orbit = createOrbitControllerFromAway(camera, {
  distance: 320,
  panAngle: 180,
  tiltAngle: 20,
  minTiltAngle: 5,
  maxTiltAngle: 90,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = orbit.panAngle;
let savedTilt = orbit.tiltAngle;

let tiltSpeed = 4;
let panSpeed = 4;
let distanceSpeed = 4;
let tiltIncrement = 0;
let panIncrement = 0;
let distanceIncrement = 0;

function updateCamera(): void {
  orbit.panAngle += panIncrement * DEG_TO_RAD;
  orbit.tiltAngle += tiltIncrement * DEG_TO_RAD;
  orbit.distance += distanceIncrement;

  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;

  orbit.update();

  pointLight.position = { x: orbit.eye.x, y: orbit.eye.y, z: orbit.eye.z };
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = orbit.panAngle;
  savedTilt = orbit.tiltAngle;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (dragging) {
    orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + savedPan;
    orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + savedTilt;
  }
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

canvas.addEventListener('wheel', (e: WheelEvent) => {
  orbit.distance -= e.deltaY / 2;
  if (orbit.distance < 100) orbit.distance = 100;
  else if (orbit.distance > 2000) orbit.distance = 2000;
});

const hit: SceneHit = createSceneHit();
let previousHoveredInfo: ObjectInfo | null = null;
const tracerMatrix = createMatrix4();

function positionNormalTracer(
  tracer: Mesh,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
): void {
  setMatrix4Identity(tracerMatrix);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 0.001) {
    const dnx = nx / len;
    const dny = ny / len;
    const dnz = nz / len;

    const yaw = Math.atan2(dnx, dnz);
    const pitch = Math.asin(-dny);

    const yAxis = createVector3(0, 1, 0);
    const xAxis = createVector3(1, 0, 0);
    rotateMatrix4(tracerMatrix, tracerMatrix, yAxis, yaw);
    rotateMatrix4(tracerMatrix, tracerMatrix, xAxis, pitch + Math.PI / 2);
  }

  translateMatrix4(tracerMatrix, tracerMatrix, px, py, pz);
  setNodeLocalMatrix4(tracer, tracerMatrix);
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

  const result = pickScene(scene, camera, screenX, screenY, hit, {
    predicate: (node) => !tracerMeshes.has(node as Mesh),
  });

  if (result) {
    const hitMesh = result.node as Mesh;
    const info = meshToInfo.get(hitMesh);

    if (info && info.mouseEnabled && info.hasListeners) {
      if (previousHoveredInfo && previousHoveredInfo !== info) {
        previousHoveredInfo.mesh.materials = [previousHoveredInfo.baseMaterial];
      }

      if (hitMesh !== headMesh) {
        hitMesh.materials = [whiteMaterial];
      }
      previousHoveredInfo = info;

      pickingTracer.visible = true;
      setSceneNodePosition(pickingTracer, result.pointX, result.pointY, result.pointZ);

      pickingNormalTracer.visible = true;
      positionNormalTracer(
        pickingNormalTracer,
        result.pointX,
        result.pointY,
        result.pointZ,
        result.normalX,
        result.normalY,
        result.normalZ,
      );
    } else {
      if (previousHoveredInfo) {
        previousHoveredInfo.mesh.materials = [previousHoveredInfo.baseMaterial];
        previousHoveredInfo = null;
      }
      pickingTracer.visible = false;
      pickingNormalTracer.visible = false;
    }
  } else {
    if (previousHoveredInfo) {
      previousHoveredInfo.mesh.materials = [previousHoveredInfo.baseMaterial];
      previousHoveredInfo = null;
    }
    pickingTracer.visible = false;
    pickingNormalTracer.visible = false;
  }
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      tiltIncrement = tiltSpeed;
      break;
    case 's':
    case 'arrowdown':
      tiltIncrement = -tiltSpeed;
      break;
    case 'a':
    case 'arrowleft':
      panIncrement = panSpeed;
      break;
    case 'd':
    case 'arrowright':
      panIncrement = -panSpeed;
      break;
    case 'z':
      distanceIncrement = distanceSpeed;
      break;
    case 'x':
      distanceIncrement = -distanceSpeed;
      break;
  }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
    case 's':
    case 'arrowdown':
      tiltIncrement = 0;
      break;
    case 'a':
    case 'arrowleft':
    case 'd':
    case 'arrowright':
      panIncrement = 0;
      break;
    case 'z':
    case 'x':
      distanceIncrement = 0;
      break;
  }
});

updateCamera();

function frame(): void {
  updateCamera();

  sceneTracer.visible = false;
  sceneNormalTracer.visible = false;

  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  canvas.width = w * pr;
  canvas.height = h * pr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
