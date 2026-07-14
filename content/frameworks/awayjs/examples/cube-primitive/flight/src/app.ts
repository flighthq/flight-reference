// Flight port of AwayJS CubePrimitive
//
// Missing Flight APIs needed:
//   - 3D mesh primitives (PrimitiveCubePrefab, PrimitiveTorusPrefab)
//   - Perspective projection camera (PerspectiveProjection)
//   - Camera rotation around arbitrary axis (transform.rotate)
//   - Method materials with blend modes (MethodMaterial, BlendMode.ADD)
//   - Directional lighting (DirectionalLight, StaticLightPicker)
//   - Blob-based image loading (URLLoader with BLOB data format)

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x333366);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
