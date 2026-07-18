import type { BlinnPhongMaterial, Material, Mesh, SceneHit } from '@flighthq/sdk';
import {
  addNodeChild,
  appendMatrix4,
  copyMatrix4,
  createAmbientLight,
  createBlinnPhongMaterial,
  createDirectionalLight,
  createMatrix4,
  createMesh,
  createScene,
  createSceneHit,
  createSceneLights,
  createVector3,
  DEG_TO_RAD,
  findNode,
  getNodeChildren,
  invalidateNodeLocalTransform,
  isMesh,
  loadSceneFromAwd,
  packOpaqueColor,
  pickScene,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setDirectionalLightDirection,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';
import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000ff,
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, far: 6000 });

// Match the Away3D reference's MethodMaterial (Blinn-Phong) rather than physically-based shading.
// The AWD's own texture is a near-white AO map, so all of the model's color comes from the lights:
// an orange key over a blue ambient. Feed the lights the RAW Away3D diffuse/ambient — Blinn-Phong
// does not divide albedo by π, so the ×π PBR exposure would make it too bright here.
const directional = createDirectionalLight({
  direction: awayDirection(1, 0, 0),
  color: packOpaqueColor(0x683019),
  intensity: 2.8,
});
const ambient = createAmbientLight({
  color: packOpaqueColor(0x85b2cd),
  intensity: 0.1,
});
const lights = createSceneLights({ ambient, directional });

const hoverMaterial: Material = createBlinnPhongMaterial({
  diffuse: 0xff0000ff,
  specular: 0x000000ff,
});

const buffer = await fetch('awayjs/assets/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = await loadSceneFromAwd(new Uint8Array(buffer));

const templateMesh = findNode(modelScene, isMesh) as Mesh | null;
if (!templateMesh?.geometry) throw new Error('No mesh found in suzanne.awd');
const templateGeometry = templateMesh.geometry;
const defaultMaterial = templateMesh.materials[0] as BlinnPhongMaterial;
console.log(defaultMaterial);

// The AWD mesh node carries a 90°-X that stands the Z-up geometry upright in Y-up world. We instance
// bare geometry across the scene, so re-apply that authored orientation as the innermost transform
// on every instance (append = applied first to the vertex). For this asset the mesh sits directly
// under the scene root, so its localMatrix is already the world orientation.
const orient = createMatrix4();
copyMatrix4(orient, templateMesh.localMatrix);

const yAxis = createVector3(0, 1, 0);

// TRS order: translate, then rotate, then scale (innermost). The scale is uniform so it commutes with
// the rotation, so tx/ty/tz stay in world space — no need to divide by scale.
function placeMesh(scale: number, tx: number, ty: number, tz: number, rotationY: number): Mesh {
  const mesh = createMesh(templateGeometry, [defaultMaterial]);
  setMatrix4Identity(mesh.localMatrix);
  translateMatrix4(mesh.localMatrix, mesh.localMatrix, tx, ty, tz);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, yAxis, rotationY);
  scaleMatrix4(mesh.localMatrix, mesh.localMatrix, scale, scale, scale);
  appendMatrix4(mesh.localMatrix, mesh.localMatrix, orient);
  invalidateNodeLocalTransform(mesh);
  addNodeChild(scene, mesh);
  return mesh;
}

placeMesh(500, 0, -100, 0, 0);

for (let i = 0; i < 80; i++) {
  const scale = 50 + Math.random() * 150;
  placeMesh(
    scale,
    (Math.random() - 0.5) * 4000,
    (Math.random() - 0.5) * 4000,
    (Math.random() - 0.5) * 4000,
    Math.random() * 360 * DEG_TO_RAD,
  );
}

let cameraAngle = 0;
const distance = 1400;
const lookAt = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);
const eye = createVector3(0, 0, 0);

function updateCamera(): void {
  setAwayPosition(eye, Math.cos(cameraAngle) * distance, 0, Math.sin(cameraAngle) * distance);
  setCameraViewMatrix4FromLookAt(camera, eye, lookAt, up);
}

let lastHovered: Mesh | null = null;
const hit: SceneHit = createSceneHit();

ctx.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = ctx.canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const result = pickScene(scene, camera, sx, sy, hit);

  if (lastHovered && lastHovered !== result?.node) {
    lastHovered.materials[0] = defaultMaterial;
    lastHovered = null;
  }

  if (result) {
    const mesh = result.node;
    mesh.materials[0] = hoverMaterial;
    lastHovered = mesh;
  }
});

updateCamera();

function frame(): void {
  cameraAngle += 0.01;
  updateCamera();

  setDirectionalLightDirection(directional, -Math.cos(-cameraAngle) * 1400, 0, Math.sin(cameraAngle) * 1400);

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
