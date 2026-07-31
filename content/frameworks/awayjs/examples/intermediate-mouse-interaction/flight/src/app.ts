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
  beginGlRenderEffectPipeline,
  createAmbientLight,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createScene3D,
  createScene3DLights,
  createToneMapEffect,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
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
} from '@flighthq/sdk';

import { createCameraFromAway, createOrbitControllerFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createPointLightFromAway } from '../../../_shared/flight/src/lighting';
import { bindHoverPicking, bindOrbitControls } from './controls';
import type { ObjectInfo } from './objects';
import { createRandomObject, loadHeadModel } from './objects';
import { createTracers } from './tracers';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect({ exposure: 1.5 }), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60 });

const pointLight = createPointLightFromAway({ range: 10000, referenceDistance: 300 });
// AwayJS uses only a point light at the camera — no ambient. A tiny ambient keeps PBR
// surfaces from going pure black in shadow without washing out the dramatic headlight look.
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 0.05 });
const lights = createScene3DLights({
  ambient,
  directional: null,
  point: [pointLight],
});

const objectInfos: ObjectInfo[] = [];
const meshToInfo = new Map<Mesh, ObjectInfo>();

for (let i = 0; i < 40; i++) {
  createRandomObject(scene, objectInfos, meshToInfo);
}

const headMesh = await loadHeadModel(scene, objectInfos, meshToInfo);

const tracers = createTracers(scene);

const orbit = createOrbitControllerFromAway(camera, {
  distance: 320,
  panAngle: 180,
  tiltAngle: 20,
  minTiltAngle: 5,
  maxTiltAngle: 90,
});

const updateCamera = bindOrbitControls(ctx.canvas, orbit, pointLight);
bindHoverPicking(ctx.canvas, scene, camera, tracers, meshToInfo, headMesh);

updateCamera();

function frame(): void {
  updateCamera();

  tracers.sceneTracer.visible = false;
  tracers.sceneNormalTracer.visible = false;

  ctx.render(scene.root, camera, lights);
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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

requestAnimationFrame(frame);

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
