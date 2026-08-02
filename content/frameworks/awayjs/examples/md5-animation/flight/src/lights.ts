import type { Billboard, DirectionalLight, Image, Node3D, PointLight, Scene3DLights } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createBillboard,
  createQuadMeshGeometry,
  createSampler,
  createScene3DLights,
  createTexture,
  createUnlitMaterial,
} from '@flighthq/sdk';

import { awayDirection, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway, createPointLightFromAway } from '../../../_shared/flight/src/lighting';

export interface Md5LightRig {
  directional: DirectionalLight;
  lights: Scene3DLights;
  update(timeSeconds: number): void;
}

export function createMd5LightRig(root: Node3D, redImage: Image, blueImage: Image): Md5LightRig {
  const redLight = createPointLightFromAway({
    color: 0xff1111,
    diffuse: 0.9,
    range: 5000,
    referenceDistance: 850,
  });
  const blueLight = createPointLightFromAway({
    color: 0x1111ff,
    diffuse: 0.9,
    range: 5000,
    referenceDistance: 850,
  });
  const { directional, ambient } = createDirectionalLightFromAway({
    direction: awayDirection(-50, -20, 10),
    color: 0xffffee,
    diffuse: 1,
    ambient: 1,
    ambientColor: 0x303040,
    // Retain just enough cool fill to read the diffuse texture while allowing the directional
    // shadow and roaming red/blue lights to define the Doom-like character silhouette.
    tuning: { diffuse: 1.1, ambient: 0.65, ambientColor: 0x343947 },
  });

  const redSprite = createLightSprite(redImage);
  const blueSprite = createLightSprite(blueImage);
  addNodeChild(root, redSprite);
  addNodeChild(root, blueSprite);

  const lights = createScene3DLights({ ambient, directional, point: [redLight, blueLight] });

  function update(timeSeconds: number): void {
    // AwayJS advanced this phase by 0.01 per 60 Hz frame. Preserve that pace while bringing the
    // orbit inward: Flight point lights use physical inverse-square attenuation whereas AwayJS's
    // enormous default radius kept these lights at full power throughout their 1,500-unit orbit.
    const count = timeSeconds * 0.6;
    setLightPosition(
      redLight,
      redSprite,
      Math.sin(count) * 950,
      250 + Math.sin(count * 0.54) * 180,
      Math.cos(count * 0.7) * 950,
    );
    setLightPosition(
      blueLight,
      blueSprite,
      -Math.sin(count * 0.8) * 950,
      250 - Math.sin(count * 0.65) * 180,
      -Math.cos(count * 0.9) * 950,
    );
  }

  update(0);
  return { directional, lights, update };
}

function createLightSprite(image: Image): Billboard {
  const texture = createTexture({
    source: image,
    sampler: createSampler({ magFilter: 'linear', minFilter: 'linear', mipmaps: false }),
  });
  const material = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });
  material.alphaMode = 'blend';
  material.blendMode = BlendMode.Add;
  material.doubleSided = true;
  return createBillboard(createQuadMeshGeometry(130, 130), [material], 'screenAligned');
}

function setLightPosition(light: PointLight, sprite: Billboard, x: number, y: number, z: number): void {
  setAwayPosition(light.position, x, y, z);
  setAwayPosition(sprite.position, x, y, z);
}
