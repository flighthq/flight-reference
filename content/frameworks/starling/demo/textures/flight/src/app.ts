import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createImageResourceFromCanvas,
  createInteractionManager,
  createInputManager,
  createRectangle,
  createRichText,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  RichTextKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const flight00 = createBitmap();
flight00.data.image = atlas;
flight00.data.sourceRectangle = createRectangle(1, 145, 165, 163);
flight00.x = -20 + 42;
flight00.y = 0 + 21;
addNodeChild(root, flight00);

const flight04 = createBitmap();
flight04.data.image = atlas;
flight04.data.sourceRectangle = createRectangle(808, 1, 200, 108);
flight04.x = 90 + 8;
flight04.y = 85 + 68;
addNodeChild(root, flight04);

const flight08 = createBitmap();
flight08.data.image = atlas;
flight08.data.sourceRectangle = createRectangle(851, 492, 165, 129);
flight08.x = 100 + 42;
flight08.y = -60 + 67;
addNodeChild(root, flight08);

interface AtfBlock {
  format: 'bc1' | 'bc3' | 'etc1' | 'etc2Rgba';
  byteOffset: number;
  byteLength: number;
  width: number;
  height: number;
}

function parseAtfLocal(bytes: Uint8Array): AtfBlock[] | null {
  if (bytes.length < 7 || bytes[0] !== 0x41 || bytes[1] !== 0x54 || bytes[2] !== 0x46) return null;
  const isNew = bytes[6] === 0xff;
  const hdr = isNew ? 12 : 6;
  if (bytes.length < hdr + 4) return null;
  const code = bytes[hdr] & 0x7f;
  const cube = (bytes[hdr] & 0x80) !== 0;
  const w = 1 << bytes[hdr + 1];
  const h = 1 << bytes[hdr + 2];
  const mips = Math.max(1, bytes[hdr + 3]);
  const faces = cube ? 6 : 1;
  const fmtTable: Record<number, readonly ('bc1' | 'bc3' | 'etc1' | 'etc2Rgba')[]> = {
    2: ['bc1', 'etc1' as const],
    3: ['bc1', 'etc1' as const],
    4: ['bc3', 'etc2Rgba'],
    5: ['bc3', 'etc2Rgba'],
  };
  const rawFmts: readonly ('bc1' | 'bc3' | 'etc1' | 'etc2Rgba')[] | undefined = fmtTable[code];
  const fmtCount = code <= 1 ? 1 : code <= 5 ? 3 : code === 12 ? 5 : code === 13 ? 4 : 0;
  if (fmtCount === 0) return null;
  const lenSize = isNew ? 4 : 3;
  const readLen = (off: number) =>
    lenSize === 4
      ? ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0
      : (bytes[off] << 16) | (bytes[off + 1] << 8) | bytes[off + 2];

  const blocks: AtfBlock[] = [];
  let off = hdr + 4;
  for (let face = 0; face < faces; face++) {
    for (let mip = 0; mip < mips; mip++) {
      const mw = Math.max(1, w >> mip);
      const mh = Math.max(1, h >> mip);
      for (let f = 0; f < fmtCount; f++) {
        if (off + lenSize > bytes.length) return null;
        const len = readLen(off);
        off += lenSize;
        if (len === 0) continue;
        if (off + len > bytes.length) return null;
        if (rawFmts && (f === 0 || f === fmtCount - 1)) {
          const fmt = f === 0 ? rawFmts[0] : rawFmts[1];
          blocks.push({ format: fmt, byteOffset: off, byteLength: len, width: mw, height: mh });
        }
        off += len;
      }
    }
  }
  return blocks.length > 0 ? blocks : null;
}

const atfImage = await (async () => {
  try {
    const response = await fetch('starling/assets/textures/1x/compressed_texture.atf');
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const blocks = parseAtfLocal(bytes);
    if (!blocks) return null;

    const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) return null;

    const glFormats: Record<string, { ext: string; glFmt: number }> = {
      bc3: { ext: 'WEBGL_compressed_texture_s3tc', glFmt: 0x83f3 },
      bc1: { ext: 'WEBGL_compressed_texture_s3tc', glFmt: 0x83f1 },
      etc2Rgba: { ext: 'WEBGL_compressed_texture_etc', glFmt: 0x9278 },
      etc1: { ext: 'WEBGL_compressed_texture_etc', glFmt: 0x8d64 },
    };

    let chosen: AtfBlock | null = null;
    let glFormat = 0;
    for (const block of blocks) {
      const entry = glFormats[block.format];
      if (entry && gl.getExtension(entry.ext)) {
        chosen = block;
        glFormat = entry.glFmt;
        break;
      }
    }
    if (!chosen) return null;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const data = bytes.subarray(chosen.byteOffset, chosen.byteOffset + chosen.byteLength);
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, glFormat, chosen.width, chosen.height, 0, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const w = chosen.width;
    const h = chosen.height;

    const rgbaTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rgbaTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rgbaTex, 0);

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, 'attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0,1);}');
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fs,
      'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}',
    );
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);

    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    gl.deleteTexture(rgbaTex);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buf);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d')!;
    const imgData = new ImageData(new Uint8ClampedArray(pixels.buffer), w, h);
    ctx.putImageData(imgData, 0, 0);
    return createImageResourceFromCanvas(out);
  } catch {
    return null;
  }
})();

if (atfImage) {
  const compressedBmp = createBitmap();
  compressedBmp.data.image = atfImage;
  compressedBmp.x = CenterX - 64;
  compressedBmp.y = 280;
  addNodeChild(root, compressedBmp);
} else {
  const fallback = createRichText();
  fallback.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0x000000, align: 'center' };
  fallback.x = CenterX - 110;
  fallback.y = 280;
  fallback.data.width = 220;
  fallback.data.height = 128;
  fallback.data.text = 'ATF textures are not fully supported in non Flash/Air targets.';
  addNodeChild(root, fallback);
}

registerDefaultHitTestPoints();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 50,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 50 + 4;
backBtn.connect(interaction);
addNodeChild(root, backBtn.root);

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
