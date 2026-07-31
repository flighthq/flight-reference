import type {
  Adjustment,
  Camera3D,
  GlRenderEffectPipeline,
  GlRenderState,
  Mesh,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
} from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createScene3D,
  createScene3DHit,
  createScene3DLights,
  createSphereMeshGeometry,
  createTexture,
  createToneMapEffect,
  createUnlitMaterial,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  pickScene3D,
  registerBlinnPhongGlMaterial,
  registerBuiltInGlModifierSnippets,
  registerExtendedPbrGlMaterial,
  registerGlRenderEffect,
  registerShadedGlMaterial,
  registerSpecularPbrGlExtension,
  registerStandardGlTextureResolvers,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
  setVector3,
} from '@flighthq/sdk';

import { createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ y: 500, z: -600, fov: 60 });

const lights = createScene3DLights();

const material = createUnlitMaterial({ baseColor: 0xffffffff });

const geometry = createSphereMeshGeometry(50);

const spheres: Mesh[] = [];

for (let i = 0; i < 100; i++) {
  const mesh = createMesh(geometry, [material]);

  const px = Math.random() * 1000 - 500;
  const py = Math.random() * 1000 - 500;
  const pz = Math.random() * 1000 - 500;

  setVector3(mesh.position, px, py, pz);
  invalidateNodeLocalTransform(mesh);

  spheres.push(mesh);
  addNodeChild(scene.root, mesh);
}

const hit = createScene3DHit();

function pickSphere(event: MouseEvent): Mesh | null {
  const rect = ctx.canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const screenY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  const result = pickScene3D(scene.root, camera, screenX, screenY, hit);
  if (result) {
    const index = spheres.indexOf(result.node as Mesh);
    if (index !== -1) {
      return spheres[index];
    }
  }
  return null;
}

ctx.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setVector3(sphere.scale, 2, 2, 2);
    invalidateNodeLocalTransform(sphere);
  }
});

ctx.canvas.addEventListener('mouseup', (event: MouseEvent) => {
  const sphere = pickSphere(event);
  if (sphere) {
    setVector3(sphere.scale, 1, 1, 1);
    invalidateNodeLocalTransform(sphere);
  }
});

const image = await loadImageResourceFromUrl('awayjs/floor_diffuse.jpg');
const texture = createTexture({ source: image });
material.baseColorMap = texture;

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

function frame(): void {
  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

frame();

// Standalone GL setup for this example: canvas, render state, the material/effect registrations this
// scene needs, and an HDR effect pipeline that tone-maps the result. Each awayjs example carries its
// own copy so it reads end to end without chasing shared harness code.
interface Scene3DContext {
  canvas: HTMLCanvasElement;
  height: number;
  render: (scene: Readonly<Node3D>, camera: Readonly<Camera3D>, lights: Readonly<Scene3DLights>) => void;
  state: GlRenderState;
  width: number;
}

interface Scene3DOptions {
  backgroundColor?: number;
  height?: number;
  width?: number;
  effects?: ReadonlyArray<RenderEffect | Adjustment>;
}

function createScene3DContext(options: Readonly<Scene3DOptions> = {}): Scene3DContext {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
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
    backgroundColor: options.backgroundColor ?? 0x000000ff,
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
    pixelRatio,
  });

  // Textured materials resolve their maps through the backing-kind registry; without this every
  // texture resolves to null and the scene renders untextured.
  registerStandardGlTextureResolvers(state);
  registerUnlitGlMaterial(state);
  registerBlinnPhongGlMaterial(state);
  registerStandardPbrGlMaterial(state);
  registerExtendedPbrGlMaterial(state);
  registerSpecularPbrGlExtension(state);
  registerShadedGlMaterial(state);
  registerBuiltInGlModifierSnippets(state);

  const verifyFrame = createGlFrameVerifier(state);

  const effects = options.effects ?? [createToneMapEffect()];
  registerGlRenderEffect(state, 'FxaaEffect', defaultGlFxaaEffectRunner);
  registerGlRenderEffect(state, 'ToneMapEffect', defaultGlToneMapEffectRunner);

  let pipeline: GlRenderEffectPipeline | null = null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      if (pipeline === null) {
        pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
      }
      beginGlRenderEffectPipeline(state, pipeline);
      renderGlBackground(state);
      const gl = state.gl;
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      drawGlScene3D(state, scene, camera, lights);
      endGlRenderEffectPipeline(state, pipeline, effects);

      verifyFrame();
    },
    state,
    width,
  };
}
