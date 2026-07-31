import type {
  Adjustment,
  Camera3D,
  GlRenderEffectPipeline,
  GlRenderState,
  Node3D,
  PerspectiveProjection,
  RenderEffect,
  Scene3DLights,
} from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createAmbientLight,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createPointLight,
  createScene3D,
  createScene3DLights,
  createToneMapEffect,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  DEG_TO_RAD,
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

import { bindOrbitDrag, createCameraFromAway, createOrbitControllerFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { CURVE_TIME_SCALE_SECONDS, loadParticleClouds, updateParticleCloud } from './particles';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
});

const scene = createScene3D();

const camera = createCameraFromAway({ fov: 60, aspect: window.innerWidth / window.innerHeight });

const greenLight = createPointLight({ color: 0x00ff00ff, intensity: 5, range: 600 });
const blueLight = createPointLight({ color: 0x0000ffff, intensity: 5, range: 600 });
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1 });
const lights: Scene3DLights = createScene3DLights({ ambient, point: [greenLight, blueLight] });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 225,
  tiltAngle: 10,
  minTiltAngle: -89,
  maxTiltAngle: 89,
});

bindOrbitDrag(ctx.canvas, orbit);

const { clouds, paths } = await loadParticleClouds(scene.root);

// Start with animator 0 fully reformed instead of halfway through its curve, so the source logos are
// immediately legible while the other phase-offset clouds demonstrate the explosion.
let time = -CURVE_TIME_SCALE_SECONDS * (Math.PI / 2);
let lightAngle = 0;
let lastTs = 0;

function frame(ts: number): void {
  const dt = lastTs === 0 ? 1 / 60 : Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;
  time += dt;

  orbit.panAngle += 0.2 * DEG_TO_RAD;
  orbit.update();

  lightAngle += (Math.PI * dt) / 180;
  greenLight.position.x = Math.sin(lightAngle) * 600;
  greenLight.position.y = 0;
  greenLight.position.z = -Math.cos(lightAngle) * 600;
  blueLight.position.x = Math.sin(lightAngle + Math.PI) * 600;
  blueLight.position.y = 0;
  blueLight.position.z = -Math.cos(lightAngle + Math.PI) * 600;

  for (const cloud of clouds) {
    updateParticleCloud(cloud, paths, time);
  }

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
