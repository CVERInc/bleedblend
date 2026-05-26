/**
 * bleed/auto — zero-config entry (CommonJS mirror of auto.mjs).
 */

'use strict';

const { createBleedAuto } = require('./utils.js');

if (typeof window !== 'undefined') {
  window.__bleed_auto = createBleedAuto();
}

module.exports = {};
