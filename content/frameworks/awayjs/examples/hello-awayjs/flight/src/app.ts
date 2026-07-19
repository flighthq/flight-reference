import type { GlRenderTarget, Mesh, SceneLights } from '@flighthq/sdk';
import {
  createScene,
  addNodeChild,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createSceneHit,
  createSphereMeshGeometry,
  createTexture,
  createUnlitMaterial,
  loadImageResourceFromUrl,
  pickScene,
  presentGlScene,
  registerUnlitGlMaterial,
  resizeGlRenderTarget,
} from '@flighthq/sdk';
import { setSceneNodePosition, setSceneNodeScale } from '../../../_shared/flight/src/position';

import { createCameraFromAway } from '../../../_shared/flight/src/camera';
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

registerUnlitGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const camera = createCameraFromAway({ y: 500, z: -600, fov: 60 });

const lights: SceneLights = { ambient: null, directional: null };

const material = createUnlitMaterial({ baseColor: 0xffffffff });

const geometry = createSphereMeshGeometry(50);

const spheres: Mesh[] = [];

for (let i = 0; i < 100; i++) {
  const mesh = createMesh(geometry, [material]);

  const px = Math.random() * 1000 - 500;
  const py = Math.random() * 1000 - 500;
  const pz = Math.random() * 1000 - 500;

  setSceneNodePosition(mesh, px, py, pz);

  spheres.push(mesh);
  addNodeChild(scene, mesh);
}

const hit = createSceneHit();

function pickSphere(event: MouseEvent): Mesh | null {
  const rect = canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  const result = pickScene(scene, camera, screenX, screenY, hit);
  if (result) {
    const index = spheres.indexOf(result.node as Mesh);
    if (index !== -1) {
      return spheres[index];
    }
  }
  return null;
}

canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setSceneNodeScale(sphere, 2, 2, 2);
  }
});

canvas.addEventListener('mouseup', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setSceneNodeScale(sphere, 1, 1, 1);
  }
});

const image = await loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg');
const texture = createTexture({ image });
material.baseColorMap = texture;

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

function frame(): void {
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

frame();
