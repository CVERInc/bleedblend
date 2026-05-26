/**
 * bleedblend/auto — zero-config entry (CommonJS mirror of auto.mjs).
 */

'use strict';

const { createBleedblendAuto } = require('./utils.js');

if (typeof window !== 'undefined') {
  window.__bleedblend_auto = createBleedblendAuto();
}

module.exports = {};
