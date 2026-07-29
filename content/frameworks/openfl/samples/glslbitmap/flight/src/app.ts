import { addNodeChild, createBitmap, createDisplayObject, loadImageResourceFromUrl } from '@flighthq/sdk';

import { render, scale } from './render';

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon_large.png');

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const logo = createBitmap();
logo.data.image = image;
logo.data.smoothing = true;
logo.x = 100;
logo.y = 100;
addNodeChild(root, logo);

// The next SDK no longer publishes the custom 2D post-process source/runner registry. This sample's
// shader was an identity texture lookup, so rendering the bitmap directly preserves its exact output.
render(root);
