import type {
  Adjustment,
  BlinnPhongMaterial,
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
  appendMatrix4,
  beginGlRenderEffectPipeline,
  createFxaaEffect,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMatrix4,
  createScene3D,
  createScene3DFromAwd2,
  createScene3DLights,
  createToneMapEffect,
  createVector3,
  defaultGlFxaaEffectRunner,
  defaultGlToneMapEffectRunner,
  DEG_TO_RAD,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  findNode,
  getNodeLocalMatrix4,
  isMesh,
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
  rotateMatrix4,
  scaleMatrix4,
  setMatrix4Identity,
  setNodeLocalMatrix4,
  translateMatrix4,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
import { applyAwayGloss, createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x030404ff,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene3D();

const camera = createCameraFromAway({ z: -2000, fov: 60 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0x683019,
  diffuse: 2.8,
  ambient: 0.5,
  ambientColor: 0x30353b,
  tuning: {
    diffuse: 0.7,
    ambient: 0.2,
  },
});
const lights = createScene3DLights({ ambient, directional });

const buffer = await fetch('awayjs/suzanne.awd').then((r) => r.arrayBuffer());
const modelScene = createScene3DFromAwd2(new Uint8Array(buffer));

const templateMesh = findNode(modelScene.root, isMesh) as Mesh | null;
if (!templateMesh?.geometry) throw new Error('No mesh found in suzanne.awd');
const defaultMaterial = templateMesh.materials[0] as BlinnPhongMaterial;
applyAwayGloss(defaultMaterial, { gloss: 50, specular: 1.8 });

const orient = createMatrix4();
const orientSource = getNodeLocalMatrix4(templateMesh);
orient.m.set(orientSource.m);

addNodeChild(scene.root, templateMesh);

const yAxis = createVector3(0, 1, 0);
const scratchMatrix = createMatrix4();
let rotationAngle = 0;

function frame(): void {
  rotationAngle += -1 * DEG_TO_RAD;
  setMatrix4Identity(scratchMatrix);
  translateMatrix4(scratchMatrix, scratchMatrix, 0, -300, 0);
  rotateMatrix4(scratchMatrix, scratchMatrix, yAxis, rotationAngle);
  scaleMatrix4(scratchMatrix, scratchMatrix, 900, 900, 900);
  appendMatrix4(scratchMatrix, scratchMatrix, orient);
  setNodeLocalMatrix4(templateMesh!, scratchMatrix);

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
