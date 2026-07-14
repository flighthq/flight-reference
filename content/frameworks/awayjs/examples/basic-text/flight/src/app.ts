// Flight port of AwayJS Basic_Text
//
// Missing Flight APIs needed:
//   - TTF font loading and parsing (FontParser)
//   - TextField with TextFormat (font, color, size, selectable, multiline)
//   - Input text fields (TextFieldType.INPUT)
//   - Tab-based focus cycling (mouseManager.focusNextTab)
//   - Scene with SceneGraphPartition and right-handed coordinates
//
// Flight has RichText and TextLabel nodes but lacks:
//   - Runtime TTF parsing
//   - Input/editable text fields
//   - Focus management across text fields

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffcccccc,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x999999);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
