import {
  addNodeChild,
  createBitmap,
  createCustomShaderEffect,
  createDisplayObject,
  loadImageResourceFromUrl,
  registerGlCustomShaderSource,
} from '@flighthq/sdk';

import { render, scale, state } from './render';

const image = await loadImageResourceFromUrl('openfl/assets/openfl.png');

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const logo = createBitmap();
logo.data.image = image;
logo.data.smoothing = true;
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

registerGlCustomShaderSource(state, 'passthrough', FRAGMENT_SOURCE);

const effect = createCustomShaderEffect({ shaderKey: 'passthrough' });

render(root, [effect]);
