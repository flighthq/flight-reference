// Flight port of AwayJS Basic_View
//
// Missing Flight APIs needed:
//   - 3D mesh primitives (PrimitivePlanePrefab → createPlane)
//   - Perspective camera with moveTo/lookAt
//   - Material system with image textures (BasicMaterial, ImageTexture2D)
//   - 3D scene rendering pipeline (View, RenderGroup, BasicPartition)
//   - Asset loading pipeline (AssetLibrary, URLRequest, LoaderEvent)
//   - 3D object rotation (rotationY)

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x333333);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
