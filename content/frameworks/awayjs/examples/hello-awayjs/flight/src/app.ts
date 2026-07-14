// Flight port of AwayJS Hello_AwayJS
//
// Missing Flight APIs needed:
//   - 3D mesh primitives (PrimitiveSpherePrefab)
//   - 3D scene with camera positioning (camera.z, camera.y, camera.lookAt)
//   - Basic material with texture (BasicMaterial, ImageTexture2D)
//   - 3D mouse event picking (MouseEvent on 3D display objects)
//   - 3D object scaling (scaleX/Y/Z in 3D context)
//   - Asset event system (AssetEvent.ASSET_COMPLETE)
//
// Note: Flight has 2D interaction via InteractionManager but lacks
// 3D ray-casting hit-test for mesh picking.

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 500,
  height: 500,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x444444);
appendShapeRectangle(placeholder, 100, 100, 300, 300);

target.render(placeholder);
