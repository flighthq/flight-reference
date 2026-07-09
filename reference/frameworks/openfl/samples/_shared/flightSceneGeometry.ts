import type { MeshGeometry, VertexAttributeLayout } from '@flighthq/sdk';
import { createMeshGeometry } from '@flighthq/sdk';

const TEXTURED_QUAD_LAYOUT: VertexAttributeLayout = {
  attributes: [
    { byteOffset: 0, format: 'float32x3', semantic: 'position' },
    { byteOffset: 12, format: 'float32x2', semantic: 'uv0' },
  ],
  stride: 20,
};

export function createTexturedQuadGeometry(width: number, height: number, flipY: boolean = false): MeshGeometry {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const bottomV = flipY ? 1 : 0;
  const topV = flipY ? 0 : 1;

  return createMeshGeometry({
    indices: new Uint16Array([0, 1, 2, 2, 1, 3]),
    layout: TEXTURED_QUAD_LAYOUT,
    vertices: new Float32Array([
      -halfWidth,
      -halfHeight,
      0,
      0,
      bottomV,
      halfWidth,
      -halfHeight,
      0,
      1,
      bottomV,
      -halfWidth,
      halfHeight,
      0,
      0,
      topV,
      halfWidth,
      halfHeight,
      0,
      1,
      topV,
    ]),
  });
}
