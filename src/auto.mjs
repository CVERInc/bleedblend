/**
 * bleed/auto — zero-config entry.
 *
 *   import 'bleed/auto';
 *
 * That's it. As soon as this module loads it spins up a bleed controller
 * that watches scroll / resize / visualViewport and paints iOS Safari's
 * status bar + URL bar to match the page content at each viewport edge.
 *
 * If you need to pass options or grab the controller handle, use
 * `createBleedAuto()` from `bleed/utils` instead:
 *
 *   import { createBleedAuto } from 'bleed/utils';
 *   const bleed = createBleedAuto({
 *     onPageLoad: (update) =>
 *       document.addEventListener('astro:page-load', update),
 *   });
 *   // later: bleed.destroy();
 */

import { createBleedAuto } from './utils.mjs';

if (typeof window !== 'undefined') {
  window.__bleed_auto = createBleedAuto();
}
