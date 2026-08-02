import {
  attachWindowResize,
  connectSignal,
  createApplicationWindow,
  createScene2DSymbolFromSwf,
  findNodeByName,
  getNodeHeight,
  getNodeWidth,
  registerDeflateDecompressor,
  setNodeHeight,
  setNodeWidth,
} from '@flighthq/sdk';

import { render, scale, setSize } from './render';

registerDeflateDecompressor();

const response = await fetch('openfl/swf/layout.swf');
if (!response.ok) throw new Error(`Unable to load layout SWF: ${response.status}`);

function requireValue<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

const layout = requireValue(
  createScene2DSymbolFromSwf(new Uint8Array(await response.arrayBuffer()), 'Layout'),
  'Unable to decode the Layout symbol',
);
const background = requireValue(findNodeByName(layout, 'Background'), 'Layout symbol is missing Background');
const column = requireValue(findNodeByName(layout, 'Column'), 'Layout symbol is missing Column');
const header = requireValue(findNodeByName(layout, 'Header'), 'Layout symbol is missing Header');

const columnOffsetHeight = getNodeHeight(column) - getNodeHeight(layout);
const headerOffsetWidth = getNodeWidth(header) - getNodeWidth(layout);
layout.scaleX = scale;
layout.scaleY = scale;

function resize(width: number, height: number): void {
  setSize(width, height);
  setNodeWidth(background, width);
  setNodeHeight(background, height);
  setNodeHeight(column, Math.max(height + columnOffsetHeight, 0));
  setNodeWidth(header, Math.max(width + headerOffsetWidth, 0));
  render(layout);
}

const win = createApplicationWindow();
connectSignal(win.onResize, () => resize(win.width, win.height));
attachWindowResize(win, document.documentElement);
resize(window.innerWidth, window.innerHeight);
