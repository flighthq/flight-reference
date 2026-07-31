import {
  addNodeChild,
  createCustomShaderEffect,
  createDisplayObject,
  createSprite,
  createTexture,
  loadImageResourceFromUrl,
} from '@flighthq/sdk';

import { registerCustomShader, render, scale } from './render';

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon_large.png');

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const logo = createSprite();
logo.data.texture = createTexture({ source: image });
logo.x = 100;
logo.y = 100;
addNodeChild(root, logo);

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture0;
out vec4 o_color;
void main() {
  o_color = texture(u_texture0, v_texCoord);
}`;

registerCustomShader('passthrough', FRAGMENT_SOURCE);
const effect = createCustomShaderEffect({ shaderKey: 'passthrough' });

render(root, [effect]);
