import { PerspectiveProjection, CoordinateSystem } from '@awayjs/core';
import { Graphics, TextureAtlas, GradientFillStyle } from '@awayjs/graphics';
import { Camera, Scene, DisplayObjectContainer } from '@awayjs/scene';
import { View } from '@awayjs/view';
import { MethodMaterial } from '@awayjs/materials';

const colorMaterials: Record<string, MethodMaterial> = {};
const textureMaterials: Record<string, MethodMaterial> = {};

export function initGraphicsMaterials(): void {
  Graphics.get_material_for_color = function (color: number, alpha: number = 1): any {
    if (color === 0) color = 0x000001;
    const texObj: any = TextureAtlas.getTextureForColor(color, alpha);
    if (colorMaterials[texObj.bitmap.id]) {
      texObj.material = colorMaterials[texObj.bitmap.id];
      return texObj;
    }
    const mat = new MethodMaterial(texObj.bitmap);
    mat.alphaBlending = true;
    mat.useColorTransform = true;
    mat.bothSides = true;
    colorMaterials[texObj.bitmap.id] = mat;
    texObj.material = mat;
    return texObj;
  };

  Graphics.get_material_for_gradient = function (gradient: GradientFillStyle): any {
    const texObj: any = TextureAtlas.getTextureForGradient(gradient);
    const lookupId: string = texObj.bitmap.id + gradient.type;
    if (textureMaterials[lookupId]) {
      texObj.material = textureMaterials[lookupId];
      return texObj;
    }
    const mat = new MethodMaterial(texObj.bitmap);
    mat.useColorTransform = true;
    mat.alphaBlending = true;
    mat.bothSides = true;
    textureMaterials[lookupId] = mat;
    texObj.material = mat;
    return texObj;
  };
}

export interface Graphics2DContext {
  scene: Scene;
  view: View;
  root: DisplayObjectContainer;
}

export function createGraphics2DScene(backgroundColor: number = 0x777777): Graphics2DContext {
  initGraphicsMaterials();

  const root = new DisplayObjectContainer();
  const scene = new Scene(root);
  (scene as any).renderer.renderableSorter = null;

  const view = scene.view;
  view.backgroundColor = backgroundColor;

  (scene as any).mouseManager.eventBubbling = true;

  const projection = new PerspectiveProjection();
  projection.coordinateSystem = CoordinateSystem.RIGHT_HANDED;
  projection.fieldOfView = (Math.atan(window.innerHeight / 1000 / 2) * 360) / Math.PI;
  projection.originX = -1;
  projection.originY = 1;

  const camera = new Camera();
  camera.projection = projection;
  scene.camera = camera;

  const onResize = () => {
    view.y = 0;
    view.x = 0;
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    projection.fieldOfView = (Math.atan(window.innerHeight / 1000 / 2) * 360) / Math.PI;
  };

  window.onresize = onResize;
  onResize();

  return { scene, view, root };
}
