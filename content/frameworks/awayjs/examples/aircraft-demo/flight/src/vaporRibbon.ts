import type {
  Mesh,
  MeshGeometry,
  Scene,
  SceneNode,
  UnlitMaterial,
  Vector3,
  VertexAttributeLayout,
} from '@flighthq/sdk';
import {
  addNodeChild,
  createMesh,
  createMeshGeometry,
  createSceneNode,
  createTexture,
  createUnlitMaterial,
  getNodeWorldMatrix4,
  loadImageResourceFromUrl,
  setVector3,
} from '@flighthq/sdk';

// Ribbon-mesh contrail: the true-thin-streak alternative to the particle trail (vaporTrail.ts). Instead of
// hundreds of billboards, each nozzle grows ONE camera-facing triangle strip that follows the jet's path
// through world space — a few dozen quads, continuous by construction, and cheap. The spine is a ring
// buffer of world positions sampled as the jet flies; every frame each spine point emits two edge vertices
// offset perpendicular to (segment direction × view direction), so the strip always faces the camera like
// a classic trail renderer. Width and alpha are baked into a gradient texture (soft across the width, a
// contrail ramp/plateau/taper along the length), so the same profile ideas as the particle trail apply.
//
// This is added to scene.root (world space, identity transform): the strip vertices ARE world positions,
// left behind as the jet flies, exactly like the world-space puffs.

const SEGMENT_SPACING = 36; // world units between committed spine samples (the trail is near-straight)
const MAX_POINTS = 50; // spine capacity → ~1760 units, matching the particle trail's length
const HEAD_HALF_WIDTH = 5; // ribbon half-width at the nozzle (thin)
const TAIL_HALF_WIDTH = 24; // half-width at the far tail (diffused wide)
// A real contrail forms only once the hot exhaust cools to ambient, so it begins well behind the jet, not
// at the nozzle. Start the ribbon head this many world units aft (the jet flies -Z, so aft is +Z), leaving
// a clear gap between the tailpipe and where the trail condenses — the heat-haze region lives in that gap.
const CONTRAIL_START_GAP = 300;
const FLOATS_PER_VERTEX = 12; // canonical PBR record: position(3) + normal(3) + tangent(4) + uv0(2)

// Canonical interleaved vertex layout (stride 48 bytes). Unlit only reads position + uv0; normal/tangent
// stay zero. Matches the layout every mesh builder uses, so the unlit GL renderer binds it unchanged.
const RIBBON_LAYOUT: VertexAttributeLayout = {
  attributes: [
    { byteOffset: 0, format: 'float32x3', semantic: 'position' },
    { byteOffset: 12, format: 'float32x3', semantic: 'normal' },
    { byteOffset: 24, format: 'float32x4', semantic: 'tangent' },
    { byteOffset: 40, format: 'float32x2', semantic: 'uv0' },
  ],
  stride: 48,
};

// Alpha along the ribbon length. v: 0 = head (at the nozzle), 1 = far tail. A quick ramp keeps the head
// faint (so it doesn't haze the jet), a long plateau sells a persistent high-altitude contrail, then a
// gentle taper diffuses the tail. Single translucent layer, so the plateau sits high (~0.85).
function ribbonLengthAlpha(v: number): number {
  if (v < 0.05) return (v / 0.05) * 0.85; // ramp 0 → 0.85 over the first 5%
  if (v < 0.65) return 0.85; // dense plateau
  if (v < 1) return 0.85 * (1 - (v - 0.65) / 0.35); // taper to 0 over the last 35%
  return 0;
}

// Soft-edged, length-faded gradient baked once as a data URL. Width axis (u) fades to transparent at both
// edges for a soft-sided streak; length axis (v) carries ribbonLengthAlpha. Near-white with a faint warm
// tint, matching the particle vapor color.
function createRibbonTextureUrl(): string {
  const w = 8;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx !== null) {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const lenA = ribbonLengthAlpha(y / (h - 1));
      for (let x = 0; x < w; x++) {
        const edge = Math.sin((Math.PI * x) / (w - 1)); // 0 at edges, 1 at center — soft sides
        const a = lenA * edge;
        const i = (y * w + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 250;
        img.data[i + 2] = 245;
        img.data[i + 3] = Math.round((a < 0 ? 0 : a > 1 ? 1 : a) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  return c.toDataURL('image/png');
}

interface RibbonState {
  // Rides the jet at the nozzle offset; its world translation is the live spine head each frame.
  tracker: SceneNode;
  geometry: MeshGeometry;
  // Interleaved vertex record, owned and rewritten in place each frame (positions only; uv baked once).
  vertices: Float32Array<ArrayBuffer>;
  // Committed spine points as a flat [x,y,z,...] ring buffer; front = oldest (tail), back = newest.
  points: number[];
}

export interface VaporRibbon {
  // Attach a ribbon whose head tracks a model-space nozzle offset on `mesh` (same offsets as the emitter).
  attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void;
  // Rebuild every ribbon's billboarded geometry for this frame's camera eye. Call from render (after the
  // eye is known), not from the fixed-step sim — billboarding depends on the camera, and distance-based
  // spine sampling is already frame-rate independent.
  update(eye: Readonly<Vector3>): void;
}

export async function createVaporRibbon(scene: Scene): Promise<VaporRibbon> {
  const image = await loadImageResourceFromUrl(createRibbonTextureUrl());
  const texture = createTexture({ image });
  const material: UnlitMaterial = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });
  material.alphaMode = 'blend';
  material.doubleSided = true;
  material.blendMode = 'add';

  const ribbons: RibbonState[] = [];

  function attachToNozzle(mesh: SceneNode, x: number, y: number, z: number): void {
    const tracker = createSceneNode();
    setVector3(tracker.position, x, y, z);
    addNodeChild(mesh, tracker);

    const vertices = new Float32Array(MAX_POINTS * 2 * FLOATS_PER_VERTEX);
    // Bake per-slot UVs once: u = 0/1 across the width, v runs 1 (tail) → 0 (head) so slot MAX-1 is the
    // opaque head. Positions are filled per frame; normal/tangent stay zero (unlit ignores them).
    for (let j = 0; j < MAX_POINTS; j++) {
      const v = 1 - j / (MAX_POINTS - 1);
      writeVertexUv(vertices, j * 2, 0, v);
      writeVertexUv(vertices, j * 2 + 1, 1, v);
    }
    const geometry = createMeshGeometry({ vertices, layout: RIBBON_LAYOUT, indices: buildRibbonIndices() });
    const ribbonMesh: Mesh = createMesh(geometry, [material]);
    ribbonMesh.alpha = 0.6;
    addNodeChild(scene.root, ribbonMesh);

    ribbons.push({ tracker, geometry, vertices, points: [] });
  }

  function update(eye: Readonly<Vector3>): void {
    for (const ribbon of ribbons) rebuildRibbon(ribbon, eye);
  }

  return { attachToNozzle, update };
}

// Samples the live nozzle position, commits a new spine point once the jet has travelled SEGMENT_SPACING
// since the last one, then rewrites every billboarded vertex for this frame's eye and bumps the geometry
// version so scene-gl re-uploads.
function rebuildRibbon(ribbon: RibbonState, eye: Readonly<Vector3>): void {
  const m = getNodeWorldMatrix4(ribbon.tracker).m;
  const headX = m[12];
  const headY = m[13];
  const headZ = m[14] + CONTRAIL_START_GAP;

  const pts = ribbon.points;
  if (pts.length === 0) {
    pts.push(headX, headY, headZ);
  } else {
    const dx = headX - pts[pts.length - 3];
    const dy = headY - pts[pts.length - 2];
    const dz = headZ - pts[pts.length - 1];
    if (dx * dx + dy * dy + dz * dz >= SEGMENT_SPACING * SEGMENT_SPACING) {
      pts.push(headX, headY, headZ);
      // Keep one slot free for the live head appended below, so the strip always reaches the nozzle.
      while (pts.length / 3 > MAX_POINTS - 1) pts.splice(0, 3);
    }
  }

  // Spine = committed points + the live head. spineAt() maps a spine index to a world position; geometry
  // slots are right-aligned so the head lands on slot MAX_POINTS-1 (the opaque v=0 end), and the unused
  // front slots collapse onto the tail point (degenerate, zero-area, invisible).
  const committed = pts.length / 3;
  const spineCount = committed + 1;
  const realCount = spineCount < MAX_POINTS ? spineCount : MAX_POINTS;
  const offset = MAX_POINTS - realCount;

  const vertices = ribbon.vertices;
  for (let j = 0; j < MAX_POINTS; j++) {
    const si = j < offset ? 0 : j - offset;
    const px = spineAt(pts, committed, headX, headY, headZ, si, 0);
    const py = spineAt(pts, committed, headX, headY, headZ, si, 1);
    const pz = spineAt(pts, committed, headX, headY, headZ, si, 2);

    // Tangent along the strip from the neighbouring spine points (clamped at the ends).
    const prev = si > 0 ? si - 1 : si;
    const next = si < realCount - 1 ? si + 1 : si;
    let dirX =
      spineAt(pts, committed, headX, headY, headZ, next, 0) - spineAt(pts, committed, headX, headY, headZ, prev, 0);
    let dirY =
      spineAt(pts, committed, headX, headY, headZ, next, 1) - spineAt(pts, committed, headX, headY, headZ, prev, 1);
    let dirZ =
      spineAt(pts, committed, headX, headY, headZ, next, 2) - spineAt(pts, committed, headX, headY, headZ, prev, 2);
    const dirLen = Math.hypot(dirX, dirY, dirZ);
    if (dirLen > 1e-5) {
      dirX /= dirLen;
      dirY /= dirLen;
      dirZ /= dirLen;
    } else {
      dirX = 0;
      dirY = 0;
      dirZ = 1;
    }

    // side = normalize(dir × view): perpendicular to both the strip and the eye ray, so the ribbon faces
    // the camera and its width lies across the strip.
    const viewX = eye.x - px;
    const viewY = eye.y - py;
    const viewZ = eye.z - pz;
    let sideX = dirY * viewZ - dirZ * viewY;
    let sideY = dirZ * viewX - dirX * viewZ;
    let sideZ = dirX * viewY - dirY * viewX;
    const sideLen = Math.hypot(sideX, sideY, sideZ);
    if (sideLen > 1e-5) {
      sideX /= sideLen;
      sideY /= sideLen;
      sideZ /= sideLen;
    } else {
      sideX = 1;
      sideY = 0;
      sideZ = 0;
    }

    const t = j / (MAX_POINTS - 1); // 0 = tail slot, 1 = head slot
    const halfWidth = TAIL_HALF_WIDTH + (HEAD_HALF_WIDTH - TAIL_HALF_WIDTH) * t;
    writeVertexPosition(vertices, j * 2, px - sideX * halfWidth, py - sideY * halfWidth, pz - sideZ * halfWidth);
    writeVertexPosition(vertices, j * 2 + 1, px + sideX * halfWidth, py + sideY * halfWidth, pz + sideZ * halfWidth);
  }

  ribbon.geometry.version++;
}

// Reads component `c` (0=x,1=y,2=z) of spine index `si`: committed points from the buffer, or the live
// head at index == committed.
function spineAt(
  pts: readonly number[],
  committed: number,
  headX: number,
  headY: number,
  headZ: number,
  si: number,
  c: number,
): number {
  if (si >= committed) return c === 0 ? headX : c === 1 ? headY : headZ;
  return pts[si * 3 + c];
}

function writeVertexPosition(
  vertices: Float32Array<ArrayBuffer>,
  vertIndex: number,
  x: number,
  y: number,
  z: number,
): void {
  const o = vertIndex * FLOATS_PER_VERTEX;
  vertices[o] = x;
  vertices[o + 1] = y;
  vertices[o + 2] = z;
}

function writeVertexUv(vertices: Float32Array<ArrayBuffer>, vertIndex: number, u: number, v: number): void {
  const o = vertIndex * FLOATS_PER_VERTEX;
  vertices[o + 10] = u;
  vertices[o + 11] = v;
}

// Two triangles per quad between spine slots s and s+1. Left/right edge vertices of slot i are 2i and
// 2i+1. Winding is irrelevant (the material is double-sided). Built once; only positions change per frame.
function buildRibbonIndices(): Uint16Array<ArrayBuffer> {
  const quads = MAX_POINTS - 1;
  const indices = new Uint16Array(quads * 6);
  for (let s = 0; s < quads; s++) {
    const o = s * 6;
    const a = s * 2;
    indices[o] = a;
    indices[o + 1] = a + 1;
    indices[o + 2] = a + 2;
    indices[o + 3] = a + 1;
    indices[o + 4] = a + 3;
    indices[o + 5] = a + 2;
  }
  return indices;
}
