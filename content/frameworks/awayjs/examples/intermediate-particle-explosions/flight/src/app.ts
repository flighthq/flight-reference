import type {
  GlRenderTarget,
  ParticleEmitter3D,
  ParticleEmitterConfig,
  ParticleEmitterState,
  SceneLights,
} from '@flighthq/sdk';
import {
  addNodeChild,
  createAmbientLight,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createParticleEmitter3D,
  createParticleEmitterConfig,
  createParticleEmitterState,
  createPointLight,
  createScene,
  createSceneLights,
  createQuaternion,
  DEG_TO_RAD,
  emitParticleBurst3D,
  presentGlScene,
  resizeGlRenderTarget,
  setQuaternionFromAxisAngle,
  setSceneNodeRotationQuaternion,
  stepParticleEmitter3D,
} from '@flighthq/sdk';

import {
  AWAY_MOUSE_SENSITIVITY,
  createCameraFromAway,
  createOrbitControllerFromAway,
} from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
const PARTICLE_SIZE = 2;
const NUM_LOGOS = 4;
const NUM_ANIMATORS = 4;

const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(width, height, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const glState = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

const verifyFrame = createGlFrameVerifier(glState);

const scene = createScene();

const camera = createCameraFromAway({ fov: 60, aspect: width / height });

const greenLight = createPointLight({ color: 0x00ff00ff, intensity: 5, range: 600 });
const blueLight = createPointLight({ color: 0x0000ffff, intensity: 5, range: 600 });
const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1 });
const lights: SceneLights = createSceneLights({ ambient, point: [greenLight, blueLight] });

const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 225,
  tiltAngle: 10,
  minTiltAngle: -89,
  maxTiltAngle: 89,
});

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanAngle = orbit.panAngle;
let lastTiltAngle = orbit.tiltAngle;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastPanAngle = orbit.panAngle;
  lastTiltAngle = orbit.tiltAngle;
});
canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!dragging) return;
  orbit.panAngle = AWAY_MOUSE_SENSITIVITY * (e.clientX - lastMouseX) + lastPanAngle;
  orbit.tiltAngle = AWAY_MOUSE_SENSITIVITY * (e.clientY - lastMouseY) + lastTiltAngle;
});
window.addEventListener('mouseup', () => {
  dragging = false;
});

function samplePixels(img: HTMLImageElement): Array<[number, number, number, number, number]> {
  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth;
  offscreen.height = img.naturalHeight;
  const ctx2d = offscreen.getContext('2d')!;
  ctx2d.drawImage(img, 0, 0);
  const { data, width: w, height: h } = ctx2d.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

  const results: Array<[number, number, number, number, number]> = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = (j * w + i) * 4;
      const alpha = data[idx + 3]!;
      if (alpha > 0xb0) {
        results.push([i - w / 2, -(j - h / 2), data[idx]! / 255, data[idx + 1]! / 255, data[idx + 2]! / 255]);
      }
    }
  }
  return results;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const logoUrls = [
  'awayjs/assets/chrome.png',
  'awayjs/assets/firefox.png',
  'awayjs/assets/safari.png',
  'awayjs/assets/ie.png',
];

const logoOffsets: [number, number, number][] = [
  [-100 * PARTICLE_SIZE, 0, 0],
  [100 * PARTICLE_SIZE, 0, 0],
  [0, 0, 100 * PARTICLE_SIZE],
  [0, 0, -100 * PARTICLE_SIZE],
];

const images = await Promise.all(logoUrls.map(loadImage));
const pixelSets = images.map(samplePixels);

interface LogoEmitter {
  emitter: ParticleEmitter3D;
  state: ParticleEmitterState;
  config: ParticleEmitterConfig;
  pixels: Array<[number, number, number, number, number]>;
  offset: [number, number, number];
  animator: number;
}

// The original clones the combined particle cloud NUM_ANIMATORS times, each rotated
// rotationY = 45*(i-1) degrees, producing a fan of rotated explosion clouds. Each clone
// is driven by its own animator whose phase is offset by PI*i/4. We reproduce this by
// instancing the full per-logo emitter set once per animator, rotating each instance's
// emitters about world Y. Y rotation negates for the left-handed → right-handed flip;
// the per-logo offset is already baked into the burst spawn positions, so the emitter's
// local matrix carries only the instance rotation.
const logoEmitters: LogoEmitter[] = [];

for (let a = 0; a < NUM_ANIMATORS; a++) {
  const rotationY = -45 * (a - 1) * DEG_TO_RAD;

  for (let g = 0; g < NUM_LOGOS; g++) {
    const pixels = pixelSets[g]!;
    const config: ParticleEmitterConfig = createParticleEmitterConfig({
      maxParticles: pixels.length,
      spawnRate: 0,
      duration: 1,
      loop: true,
      lifetimeMin: 1,
      lifetimeMax: 1,
      scaleMin: PARTICLE_SIZE,
      scaleMax: PARTICLE_SIZE,
      alphaStart: 1,
      alphaEnd: 1,
      blendMode: 'add',
    });

    const state: ParticleEmitterState = createParticleEmitterState();
    const emitter: ParticleEmitter3D = createParticleEmitter3D();

    const emitterQuat = createQuaternion();
    setQuaternionFromAxisAngle(emitterQuat, { x: 0, y: 1, z: 0 }, rotationY);
    setSceneNodeRotationQuaternion(emitter, emitterQuat);
    addNodeChild(scene, emitter);

    logoEmitters.push({ emitter, state, config, pixels, offset: logoOffsets[g]!, animator: a });
  }
}

for (const entry of logoEmitters) {
  for (const [px, py, r, g2, b] of entry.pixels) {
    const x = entry.offset[0] + px * PARTICLE_SIZE;
    const y = entry.offset[1] + py * PARTICLE_SIZE;
    const z = entry.offset[2];
    const tint = ((Math.round(r * 255) << 24) | (Math.round(g2 * 255) << 16) | (Math.round(b * 255) << 8) | 0xff) >>> 0;
    emitParticleBurst3D(entry.emitter, entry.state, entry.config, 1, x, y, z, tint);
  }
}

let time = 0;
let renderTarget: GlRenderTarget | null = null;
let angle = 0;
let lastTs = 0;

function frame(ts: number): void {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;
  time += dt;

  orbit.panAngle += 0.2 * DEG_TO_RAD;
  orbit.update();

  angle += (Math.PI * dt) / 180;
  greenLight.position.x = Math.sin(angle) * 600;
  greenLight.position.y = 0;
  greenLight.position.z = -Math.cos(angle) * 600;
  blueLight.position.x = Math.sin(angle + Math.PI) * 600;
  blueLight.position.y = 0;
  blueLight.position.z = -Math.cos(angle + Math.PI) * 600;

  for (const entry of logoEmitters) {
    const groupTime = 1000 * (Math.sin(time / 5 + (Math.PI * entry.animator) / 4) + 1);

    stepParticleEmitter3D(entry.emitter, entry.state, entry.config, dt);

    if (groupTime < 50) {
      for (const [px, py, r, g2, b] of entry.pixels) {
        const x = entry.offset[0] + px * PARTICLE_SIZE;
        const y = entry.offset[1] + py * PARTICLE_SIZE;
        const z = entry.offset[2];
        const tint =
          ((Math.round(r * 255) << 24) | (Math.round(g2 * 255) << 16) | (Math.round(b * 255) << 8) | 0xff) >>> 0;
        emitParticleBurst3D(entry.emitter, entry.state, entry.config, 1, x, y, z, tint);
      }
    }
  }

  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(glState, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(glState, renderTarget, w, h);
  }

  presentGlScene(glState, renderTarget, scene, camera, lights);

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
  glState.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

requestAnimationFrame(frame);
