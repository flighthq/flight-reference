import type { Environment, Mesh, ScreenSpaceFogEffect } from '@flighthq/sdk';
import {
  createEnvironment,
  createExtendedPbrMaterial,
  createMesh,
  createPlaneMeshGeometry,
  createScreenSpaceFogEffect,
  createSpecularPbrExtension,
  createStandardPbrMaterialProperties,
  createTexture,
  createTilingSampler,
  loadImageResourceFromUrl,
  setTextureUvScale,
} from '@flighthq/sdk';

import { createCubeTextureFromAwayFaces } from '../../../_shared/flight/src/cubemap';

export interface EnvironmentData {
  environment: Environment;
  groundMesh: Mesh;
  fogEffect: ScreenSpaceFogEffect;
}

export async function loadEnvironment(): Promise<EnvironmentData> {
  const skyFaceNames = ['posX', 'negX', 'posY', 'negY', 'posZ', 'negZ'];
  const skyImages = await Promise.all(
    skyFaceNames.map((face) => loadImageResourceFromUrl(`awayjs/skybox/grimnight_${face}.png`)),
  );
  const skyTexture = createCubeTextureFromAwayFaces(skyImages);
  const environment = createEnvironment({ environment: skyTexture, intensity: 0.875 });

  const [rockDiffuse, rockNormal, rockSpecular] = await Promise.all([
    loadImageResourceFromUrl('awayjs/rockbase_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/rockbase_normals.png'),
    loadImageResourceFromUrl('awayjs/rockbase_specular.png'),
  ]);

  const groundSampler = createTilingSampler();
  const groundDiffuseTexture = createTexture({ source: rockDiffuse });
  const groundNormalTexture = createTexture({ source: rockNormal, colorSpace: 'linear' });
  const groundSpecularTexture = createTexture({ source: rockSpecular, colorSpace: 'linear' });
  groundDiffuseTexture.sampler = groundSampler;
  groundNormalTexture.sampler = groundSampler;
  groundSpecularTexture.sampler = groundSampler;
  setTextureUvScale(groundDiffuseTexture, 200, 200);
  setTextureUvScale(groundNormalTexture, 200, 200);
  setTextureUvScale(groundSpecularTexture, 200, 200);

  const groundMaterial = createExtendedPbrMaterial({
    standard: createStandardPbrMaterialProperties({
      baseColor: 0xffffffff,
      baseColorMap: groundDiffuseTexture,
      metallic: 0,
      normalMap: groundNormalTexture,
      normalScale: 0.75,
      roughness: 0.68,
    }),
    extensions: [createSpecularPbrExtension({ specularColorMap: groundSpecularTexture })],
  });
  groundMaterial.doubleSided = false;

  const groundMesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);

  // WebGL stores perspective depth nonlinearly. These window-depth values correspond to the AwayJS
  // fog interval of 2,500–5,000 world units for this camera's near/far planes. The background-aware
  // runner leaves the skybox untouched, allowing the ground to fade almost completely into its dark
  // lower horizon before the far-plane clip.
  const fogEffect = createScreenSpaceFogEffect({
    color: 0x02040aff,
    near: 0.995984,
    far: 1,
    density: 4,
  });

  return { environment, groundMesh, fogEffect };
}
