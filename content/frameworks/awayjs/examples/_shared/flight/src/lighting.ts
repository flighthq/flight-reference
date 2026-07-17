import type { AmbientLight, DirectionalLight, PointLight, Vector3Like } from '@flighthq/sdk';
import {
  applyLightExposure,
  createAmbientLight,
  createDirectionalLight,
  createPointLight,
  getPhongToPbrLightExposure,
  packOpaqueColor,
} from '@flighthq/sdk';

const pbrExposure = getPhongToPbrLightExposure();

function pbrIntensity(awayDiffuse: number): number {
  return applyLightExposure(awayDiffuse, pbrExposure);
}

export interface AwayDirectionalLightOptions {
  direction: Vector3Like;
  color?: number;
  diffuse?: number;
  ambient?: number;
  ambientColor?: number;
}

export interface AwayDirectionalLightResult {
  directional: DirectionalLight;
  ambient: AmbientLight;
}

export function createDirectionalLightFromAway(
  opts: Readonly<AwayDirectionalLightOptions>,
): AwayDirectionalLightResult {
  const color = opts.color ?? 0xffffff;
  const diffuse = opts.diffuse ?? 1;
  const ambient = opts.ambient ?? 0;
  const ambientColor = opts.ambientColor ?? 0xffffff;

  return {
    directional: createDirectionalLight({
      direction: opts.direction,
      color: packOpaqueColor(color),
      intensity: pbrIntensity(diffuse),
    }),
    ambient: createAmbientLight({
      color: packOpaqueColor(ambientColor),
      intensity: pbrIntensity(ambient),
    }),
  };
}

export interface AwayPointLightOptions {
  color?: number;
  diffuse?: number;
  range: number;
}

export function createPointLightFromAway(opts: Readonly<AwayPointLightOptions>): PointLight {
  const color = opts.color ?? 0xffffff;
  const diffuse = opts.diffuse ?? 1;

  return createPointLight({
    color: packOpaqueColor(color),
    intensity: pbrIntensity(diffuse),
    range: opts.range,
  });
}

export { pbrIntensity as awayIntensity };
