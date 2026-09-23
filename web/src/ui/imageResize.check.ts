// Runnable self-check for the pure dimension math (canvas isn't available in
// Node, so downscaleToJpeg itself is exercised in the browser).
//   npx tsx src/ui/imageResize.check.ts
import assert from 'node:assert/strict';
import { fitDimensions } from './imageResize.ts';

// under the cap → unchanged
assert.deepEqual(fitDimensions(800, 600, 1600), { w: 800, h: 600 }, 'no upscaling');
assert.deepEqual(fitDimensions(1600, 1600, 1600), { w: 1600, h: 1600 }, 'exactly at cap');

// landscape over the cap → longest edge becomes max, ratio kept
assert.deepEqual(fitDimensions(4000, 3000, 1600), { w: 1600, h: 1200 }, 'landscape scaled');
// portrait over the cap → height drives the scale
assert.deepEqual(fitDimensions(3000, 4000, 1600), { w: 1200, h: 1600 }, 'portrait scaled');

console.log('imageResize.check.ts OK');
