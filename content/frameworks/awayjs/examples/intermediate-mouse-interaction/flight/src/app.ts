import type { BlinnPhongMaterial, Mesh, SceneHit } from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createBlinnPhongMaterial,
  createBoxMeshGeometry,
  createCamera,
  createCylinderMeshGeometry,
  createMesh,
  createPerspectiveProjection,
  createPointLight,
  createScene,
  createSceneFromObj,
  createSceneHit,
  createSceneLights,
  createSphereMeshGeometry,
  createTorusMeshGeometry,
  createVector3,
  DEG_TO_RAD,
  getNodeChildren,
  invalidateNodeLocalTransform,
  pickScene,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  setSceneNodePosition,
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
    fovY: 60 * DEG_TO_RAD,
    aspect: window.innerWidth / window.innerHeight,
  }),
});

const pointLight = createPointLight({
  color: 0xffffffff,
  intensity: 1.0,
  range: 10000,
});
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.2 });
const lights = createSceneLights({
  ambient,
  directional: null,
  point: [pointLight],
});

const whiteMaterial = createBlinnPhongMaterial({ diffuse: 0xffffffff, shininess: 20 });
const blackMaterial = createBlinnPhongMaterial({ diffuse: 0x333333ff, shininess: 20 });
const grayMaterial = createBlinnPhongMaterial({ diffuse: 0xccccccff, shininess: 20 });
const blueMaterial = createBlinnPhongMaterial({ diffuse: 0x0000ffff, shininess: 20 });
const redMaterial = createBlinnPhongMaterial({ diffuse: 0xff0000ff, shininess: 20 });
const greenTracerMaterial = createBlinnPhongMaterial({ diffuse: 0x00ff00ff, shininess: 10 });
const blueTracerMaterial = createBlinnPhongMaterial({ diffuse: 0x0000ffff, shininess: 10 });

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
  baseMaterial: BlinnPhongMaterial;
}

const objectInfos: ObjectInfo[] = [];
const meshToInfo = new Map<Mesh, ObjectInfo>();

function chooseMaterial(info: ObjectInfo): BlinnPhongMaterial {
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
    mesh = createMesh(createTorusMeshGeometry(12, 4, 16, 12), [grayMaterial]);
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
  setMatrix4Identity(mesh.localMatrix);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, zAxis, rotZ);

  const r = 200 + 100 * Math.random();
  const azimuth = 2 * Math.PI * Math.random();
  const elevation = 0.25 * Math.PI * Math.random();
  const px = r * Math.cos(elevation) * Math.sin(azimuth);
  const py = r * Math.sin(elevation);
  const pz = r * Math.cos(elevation) * Math.cos(azimuth);
  translateMatrix4(mesh.localMatrix, mesh.localMatrix, px, py, pz);
  invalidateNodeLocalTransform(mesh);

  addNodeChild(scene, mesh);
  objectInfos.push(info);
  meshToInfo.set(mesh, info);

  return info;
}

for (let i = 0; i < 40; i++) {
  createRandomObject();
}

let headMesh: Mesh | null = null;
const headMaterial = createBlinnPhongMaterial({ diffuse: 0xccccccff, shininess: 20 });

try {
  const objText = await fetch('awayjs/assets/head.obj').then((r) => r.text());
  const headScene = createSceneFromObj(objText);
  const children = getNodeChildren(headScene);
  for (const child of children) {
    addNodeChild(scene, child);
    const m = child as Mesh;
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

let panAngle = 180 * DEG_TO_RAD;
let tiltAngle = 20 * DEG_TO_RAD;
let distance = 320;
const minTilt = 5 * DEG_TO_RAD;
const maxTilt = 85 * DEG_TO_RAD;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let savedPan = panAngle;
let savedTilt = tiltAngle;

const eye = createVector3(0, 0, 0);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

let tiltSpeed = 4;
let panSpeed = 4;
let distanceSpeed = 4;
let tiltIncrement = 0;
let panIncrement = 0;
let distanceIncrement = 0;

function updateCamera(): void {
  panAngle += panIncrement * DEG_TO_RAD;
  tiltAngle += tiltIncrement * DEG_TO_RAD;
  distance += distanceIncrement;

  tiltAngle = Math.max(minTilt, Math.min(maxTilt, tiltAngle));
  if (distance < 100) distance = 100;
  else if (distance > 2000) distance = 2000;

  eye.x = target.x + distance * Math.sin(panAngle) * Math.cos(tiltAngle);
  eye.y = target.y + distance * Math.sin(tiltAngle);
  eye.z = target.z - distance * Math.cos(panAngle) * Math.cos(tiltAngle);

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);

  pointLight.position = { x: eye.x, y: eye.y, z: eye.z };
}

ctx.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  savedPan = panAngle;
  savedTilt = tiltAngle;
});

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (dragging) {
    panAngle = 0.3 * DEG_TO_RAD * (e.clientX - lastMouseX) + savedPan;
    tiltAngle = 0.3 * DEG_TO_RAD * (e.clientY - lastMouseY) + savedTilt;
  }
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

ctx.canvas.addEventListener('wheel', (e: WheelEvent) => {
  distance -= e.deltaY / 2;
  if (distance < 100) distance = 100;
  else if (distance > 2000) distance = 2000;
});

const hit: SceneHit = createSceneHit();
let previousHoveredInfo: ObjectInfo | null = null;

function positionNormalTracer(
  tracer: Mesh,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
): void {
  setMatrix4Identity(tracer.localMatrix);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 0.001) {
    const dnx = nx / len;
    const dny = ny / len;
    const dnz = nz / len;

    const yaw = Math.atan2(dnx, dnz);
    const pitch = Math.asin(-dny);

    const yAxis = createVector3(0, 1, 0);
    const xAxis = createVector3(1, 0, 0);
    rotateMatrix4(tracer.localMatrix, tracer.localMatrix, yAxis, yaw);
    rotateMatrix4(tracer.localMatrix, tracer.localMatrix, xAxis, pitch + Math.PI / 2);
  }

  translateMatrix4(tracer.localMatrix, tracer.localMatrix, px, py, pz);
  invalidateNodeLocalTransform(tracer);
}

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = ctx.canvas.getBoundingClientRect();
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

  ctx.render(scene, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pr;
  ctx.canvas.height = h * pr;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
