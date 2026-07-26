import type { CubeTexture, Environment, Mesh, ScreenSpaceFogEffect } from '@flighthq/sdk';
import {
  createCubeTexture,
  createEnvironment,
  createMesh,
  createPlaneMeshGeometry,
  createScreenSpaceFogEffect,
  createTexture,
  createTilingSampler,
  loadImageResourceFromUrl,
  setCubeTextureFace,
  setTextureUvScale,
} from '@flighthq/sdk';

import { createAwayMatteMaterial } from '../../../_shared/flight/src/materials';

export interface EnvironmentData {
  environment: Environment;
  groundMesh: Mesh;
  fogEffect: ScreenSpaceFogEffect;
}

export async function loadEnvironment(): Promise<EnvironmentData> {
  const skyFaceNames = ['posX', 'negX', 'posY', 'negY', 'posZ', 'negZ'];
  const skyImages = await Promise.all(
    skyFaceNames.map((face) => loadImageResourceFromUrl(`awayjs/assets/skybox/grimnight_${face}.png`)),
  );
  const skyTexture: CubeTexture = createCubeTexture();
  for (let i = 0; i < skyImages.length; i++) setCubeTextureFace(skyTexture, i, skyImages[i]);
  const environment = createEnvironment({ environment: skyTexture, intensity: 1 });

  const groundMaterial = createAwayMatteMaterial(0xffffffff, 10);
  groundMaterial.doubleSided = false;

  const [rockDiffuse, rockNormal] = await Promise.all([
    loadImageResourceFromUrl('awayjs/assets/rockbase_diffuse.jpg'),
    loadImageResourceFromUrl('awayjs/assets/rockbase_normals.png'),
  ]);

  const groundDiffuseTexture = createTexture({ image: rockDiffuse });
  const groundNormalTexture = createTexture({ image: rockNormal, colorSpace: 'linear' });
  const groundSampler = createTilingSampler();
  groundDiffuseTexture.sampler = groundSampler;
  groundNormalTexture.sampler = groundSampler;
  setTextureUvScale(groundDiffuseTexture, 200, 200);
  setTextureUvScale(groundNormalTexture, 200, 200);
  groundMaterial.baseColorMap = groundDiffuseTexture;
  groundMaterial.normalMap = groundNormalTexture;
  groundMaterial.normalScale = 0.75;

  const groundMesh = createMesh(createPlaneMeshGeometry(50000, 50000, 1, 1), [groundMaterial]);

  // WebGL stores perspective depth nonlinearly. These window-depth values correspond to the AwayJS
  // fog interval of 2,500–5,000 world units for this camera's near/far planes.
  const fogEffect = createScreenSpaceFogEffect({
    color: 0x000000ff,
    near: 0.995984,
    far: 1,
    density: 8,
  });

  return { environment, groundMesh, fogEffect };
}
