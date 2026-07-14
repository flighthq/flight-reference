// Flight port of AwayJS Basic_Shading
//
// Missing Flight APIs needed:
//   - 3D mesh primitives (PrimitivePlanePrefab, PrimitiveSpherePrefab,
//     PrimitiveCubePrefab, PrimitiveTorusPrefab)
//   - Directional lighting (DirectionalLight, StaticLightPicker)
//   - Method materials with normal/specular maps (MethodMaterial)
//   - Camera orbit controller (HoverController)
//   - UV scaling (graphics.scaleUV)
//   - Scene with Camera convenience class

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
