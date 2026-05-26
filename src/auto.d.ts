/**
 * `bleed/auto` — side-effectful entry. Imports automatically wire up bleed
 * on iOS Safari pages. The active controller (if any) is attached to
 * `window.__bleed_auto`.
 */

import type { BleedController } from './utils';

declare global {
  interface Window {
    __bleed_auto?: BleedController;
    __bleed_top_state?: 'STICKY_OWNED' | 'SAFE_NATURAL' | 'BLEED_OVERRIDE';
    __bleed_bot_state?: 'STICKY_OWNED' | 'SAFE_NATURAL' | 'BLEED_OVERRIDE';
    __bleed_has_fixed?: boolean;
  }
}

export {};
