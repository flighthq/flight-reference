// Flight port of AwayJS TorusPrimitive
//
// Missing Flight APIs needed:
//   - 3D mesh primitives (PrimitiveTorusPrefab)
//   - Directional lighting (DirectionalLight, StaticLightPicker)
//   - Method materials with textures (MethodMaterial, ImageSampler)
//   - 3D object rotation (rotationY)
//   - Scene with camera auto-setup

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x336633);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
