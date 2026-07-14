// Flight port of AwayJS Basic_Skybox
//
// Missing Flight APIs needed:
//   - Skybox rendering (Skybox, BitmapImageCube)
//   - Cube texture loading (ImageTextureCube, LoaderContext)
//   - Environment mapping (EffectEnvMapMethod)
//   - 3D torus mesh (PrimitiveTorusPrefab)
//   - Perspective projection camera with orbit controls
//   - Method materials with specular/ambient methods

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x111199);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
