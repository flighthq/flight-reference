// Flight port of AwayJS Basic_Fire
//
// Missing Flight APIs needed:
//   - Particle system (ParticleAnimationSet, ParticleAnimator,
//     ParticleBillboardNode, ParticleScaleNode, ParticleVelocityNode,
//     ParticleColorNode, ParticleGraphicsHelper)
//   - Point lights with falloff/radius (PointLight)
//   - Directional lights (DirectionalLight, StaticLightPicker)
//   - Multi-pass materials (MethodMaterial with MethodMaterialMode.MULTI_PASS)
//   - 3D plane mesh (PrimitivePlanePrefab)
//   - Camera orbit controller (HoverController)
//   - Timer events (Timer, TimerEvent)
//   - Normal/specular texture maps
//   - Dynamic light picker updates

import { appendShapeBeginFill, appendShapeRectangle, createShape, ShapeKind } from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  kinds: [ShapeKind],
});

const placeholder = createShape();
appendShapeBeginFill(placeholder, 0x331100);
appendShapeRectangle(placeholder, 200, 150, 400, 300);

target.render(placeholder);
