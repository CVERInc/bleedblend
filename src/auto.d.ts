/**
 * `bleedblend/auto` — side-effectful entry. Imports automatically wire up bleedblend
 * on iOS Safari pages. The active controller (if any) is attached to
 * `window.__bleedblend_auto`.
 */

import type { BleedblendController } from './utils';

declare global {
  interface Window {
    __bleedblend_auto?: BleedblendController;
    __bleedblend_top_state?: 'STICKY_OWNED' | 'SAFE_NATURAL' | 'BLEED_OVERRIDE';
    __bleedblend_bot_state?: 'STICKY_OWNED' | 'SAFE_NATURAL' | 'BLEED_OVERRIDE';
    __bleedblend_has_fixed?: boolean;
  }
}

export {};
