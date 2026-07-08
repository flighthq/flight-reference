import { createSceneWebglPreview } from '../../../_shared/flightSceneWebgl';

export const preview = createSceneWebglPreview();
export const render = preview.render;
export const width = preview.width;
export const height = preview.height;
export const scale = preview.scale;
