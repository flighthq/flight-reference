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
  addNodeChild,
  beginGlRenderEffectPipeline,
  copyQuaternion,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createQuaternion,
  createScene3D,
  createScene3DLights,
  createTexture,
  createToneMapEffect,
  createTorusMeshGeometry,
  createVector3,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
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
  setQuaternionFromAxisAngle,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createAwayMatteMaterial } from '../../../_shared/flight/src/materials';

const DEG = Math.PI / 180;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect({ operator: 'aces' }), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ z: -1000, fov: 60 });

// AwayJS's DirectionalLight defaults to ambient 0 and this sample adds no ambient light, so the torus
// is lit by the directional alone; the helper supplies the matching ~zero ambient. ACES tone mapping
// (below) compresses the single light's highlights into range without a flat fill washing it out.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, 0, 1),
  diffuse: 0.7,
});

const lights = createScene3DLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/dots.png');
// Flight builds the torus in its native right-handed space while the camera helper mirrors z
// (left-handed AwayJS -> right-handed Flight). The unmirrored mesh renders as the z-reflection of the
// original, flipping the texture along the tube (v) axis; mirror v back to match the AwayJS look.
const texture = createTexture({ source: image });
texture.uvScale.y = -1;
texture.uvOffset.y = 1;

const material = createAwayMatteMaterial(0xffffffff);
material.baseColorMap = texture;

// AwayJS PrimitiveTorusPrefab(radius, tube, segmentsR=32 around the ring, segmentsT=16 around the
// tube). Flight's signature is (radius, tube, radialSegments=around the tube, tubularSegments=around
// the ring), so the counts swap to reproduce the original's tessellation (smoother ring, coarser tube).
const geometry = createTorusMeshGeometry(220, 80, 16, 32);
const torus = createMesh(geometry, [material]);
addNodeChild(scene.root, torus);

const yAxis = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();
let rotationY = 0;

function frame(): void {
  rotationY -= DEG;

  setQuaternionFromAxisAngle(scratchQuat, yAxis, rotationY);
  copyQuaternion(torus.rotation, scratchQuat);
  invalidateNodeLocalTransform(torus);

  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = width * pixelRatio;
  ctx.canvas.height = height * pixelRatio;
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = width / height;
});

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
