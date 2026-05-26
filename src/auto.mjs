/**
 * bleedblend/auto — zero-config entry.
 *
 *   import 'bleedblend/auto';
 *
 * That's it. As soon as this module loads it spins up a bleedblend controller
 * that watches scroll / resize / visualViewport and paints iOS Safari's
 * status bar + URL bar to match the page content at each viewport edge.
 *
 * If you need to pass options or grab the controller handle, use
 * `createBleedblendAuto()` from `bleedblend/utils` instead:
 *
 *   import { createBleedblendAuto } from 'bleedblend/utils';
 *   const bleed = createBleedblendAuto({
 *     onPageLoad: (update) =>
 *       document.addEventListener('astro:page-load', update),
 *   });
 *   // later: bleed.destroy();
 */

import { createBleedblendAuto } from './utils.mjs';

if (typeof window !== 'undefined') {
  window.__bleedblend_auto = createBleedblendAuto();
}
