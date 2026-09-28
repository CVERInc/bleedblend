// Headless decision-logic units — no browser needed.
//   node test/units.mjs
//
// Two areas the integration suite can only reach through real Chrome, covered
// here deterministically so CI guards them on every push:
//   1. isDesignedEndZone() — the page-end "designed end-zone vs incidental
//      footer" classifier that decides how far the overscroll overwrite reaches.
//   2. .bleedblend-* parity between src/index.css and the Tailwind plugin, so the
//      two ways of applying the classes can't silently drift apart.
//
// IMPORTANT: bleedblend ships a two-engine mirror (src/utils.mjs ESM +
// src/utils.js CJS). The classifier checks run against BOTH so a fix that lands
// in one file but not the other is caught here, not in production.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import * as utilsMjs from '../src/utils.mjs';

const require = createRequire(import.meta.url);
const utilsCjs = require('../src/utils.js');
const { isDesignedEndZone: isDesignedEndZoneMjs } = utilsMjs;
const { isDesignedEndZone: isDesignedEndZoneCjs } = utilsCjs;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let pass = 0, fail = 0;
const fails = [];
function check(name, cond) {
  if (cond) pass++; else { fail++; fails.push(name); }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

// ── Minimal DOM stub: just what isDesignedEndZone() touches ──────────────────
// window.innerHeight, lastSection.getBoundingClientRect(), getComputedStyle().
function withStubbedDom(innerHeight, fn) {
  const savedWindow = globalThis.window;
  const savedGCS = globalThis.getComputedStyle;
  globalThis.window = { innerHeight };
  globalThis.getComputedStyle = (el) => ({ backgroundColor: (el && el.__bg) || '' });
  try { return fn(); }
  finally { globalThis.window = savedWindow; globalThis.getComputedStyle = savedGCS; }
}
function section(height, bg) {
  return { getBoundingClientRect: () => ({ height }), __bg: bg };
}

// Run a classifier assertion against BOTH engines (mirror guard).
function bothEngines(name, innerHeight, lastSection, fill, expected) {
  withStubbedDom(innerHeight, () => {
    const a = isDesignedEndZoneMjs(lastSection, fill);
    const b = isDesignedEndZoneCjs(lastSection, fill);
    check(`${name} [mjs]`, a === expected);
    check(`${name} [js mirror]`, b === expected);
    check(`${name} [mjs≡js]`, a === b);
  });
}

console.log('=== dual-implementation sync-marker: utils.js ⇄ utils.mjs ===');

// Mechanical drift guard: each file's header carries a `sync-marker: vN` line
// bumped whenever the pair is edited together. This doesn't verify semantic
// equivalence — it just catches "edited one file, forgot the other." The
// behavioural guards are the parity checks below and the integration suite,
// which runs every case against both engines.
{
  const syncMarker = (text) => (text.match(/sync-marker:\s*(\S+)/) || [])[1] || null;
  const jsText = readFileSync(join(root, 'src', 'utils.js'), 'utf8');
  const mjsText = readFileSync(join(root, 'src', 'utils.mjs'), 'utf8');
  const jsMarker = syncMarker(jsText);
  const mjsMarker = syncMarker(mjsText);
  check('utils.js has a sync-marker', !!jsMarker);
  check('utils.mjs has a sync-marker', !!mjsMarker);
  check(`utils.js sync-marker (${jsMarker}) ≡ utils.mjs sync-marker (${mjsMarker})`, jsMarker != null && jsMarker === mjsMarker);
}

console.log('\n=== dual-implementation parity: same exports, same answers ===');
{
  const keys = (m) => Object.keys(m).sort().join(',');
  check('utils.js exports ≡ utils.mjs exports', keys(utilsCjs) === keys(utilsMjs));

  const a = { r: 10, g: 10, b: 10 };
  const PURE_CALLS = [
    ['parseColor', '#0a8c8e'], ['parseColor', '#80808080'], ['parseColor', 'rgba(10, 20, 30, 0.5)'],
    ['parseColor', 'rgb(10,20,30)'], ['parseColor', 'red'], ['parseColor', ''], ['parseColor', null],
    ['parseColorWithAlpha', 'rgba(0,0,0,0)'], ['parseColorWithAlpha', '#fff'],
    ['colorToRgb', { r: 10.4, g: 140.6, b: 142 }], ['colorToRgb', null],
    ['colorToHex', { r: 10, g: 140, b: 142 }], ['colorToHex', null],
    ['isOpaque', 'rgb(1,2,3)'], ['isOpaque', 'rgba(1,2,3,0.95)'], ['isOpaque', 'rgba(1,2,3,0.5)'], ['isOpaque', null],
    ['colorsClose', a, { r: 12, g: 12, b: 12 }], ['colorsClose', a, { r: 19, g: 10, b: 10 }],
    ['colorsClose', a, { r: 18, g: 10, b: 10 }], ['colorsClose', a, { r: 10, g: 10, b: 10 }, 0],
    ['colorsClose', a, { r: 11, g: 10, b: 10 }, 0], ['colorsClose', a, { r: 30, g: 10, b: 10 }, 24],
    ['colorsClose', a, { r: 12, g: 12, b: 12 }, null], ['colorsClose', a, null],
    ['parseGradient', 'linear-gradient(180deg, rgb(172, 234, 206) 0%, rgb(10, 140, 142) 100%)'],
    ['parseGradient', 'linear-gradient(90deg, rgb(0,0,0), rgb(100,100,100), rgb(200,200,200))'],
    ['parseGradient', 'none'], ['parseGradient', null],
  ];
  for (const [fn, ...args] of PURE_CALLS) {
    const run = (m) => { try { return JSON.stringify(m[fn](...args)); } catch (e) { return 'threw ' + e.message; } };
    const mjs = run(utilsMjs), cjs = run(utilsCjs);
    check(`${fn}(${args.map((x) => JSON.stringify(x)).join(', ')}) mjs ≡ js (${mjs} vs ${cjs})`, mjs === cjs);
  }
  const stops = utilsMjs.parseGradient('linear-gradient(rgb(0,0,0) 0%, rgb(128,128,128) 50%, rgb(255,255,255) 100%)');
  for (const t of [0, 0.25, 0.5, 0.9, 1]) {
    const mjs = JSON.stringify(utilsMjs.gradientColorAt(stops, t)), cjs = JSON.stringify(utilsCjs.gradientColorAt(stops, t));
    check(`gradientColorAt(3-stop, ${t}) mjs ≡ js`, mjs === cjs);
  }
}

console.log('\n=== isDesignedEndZone: designed end-zones flood, incidental footers do not ===');

// A short, high-contrast footer over a flat light page → incidental, NO flood.
// This is the exact footer-flood regression the classifier exists to prevent.
bothEngines(
  'short footer on flat light page → incidental',
  800, section(250, 'rgb(74, 53, 38)'),
  { kind: 'solid', color: { r: 247, g: 250, b: 252 } }, false,
);

// A tall closing section (≥ 50% of the viewport) → designed, floods.
bothEngines(
  'tall closing section (≥50vh) → designed',
  800, section(500, 'rgb(74, 53, 38)'),
  { kind: 'solid', color: { r: 247, g: 250, b: 252 } }, true,
);

// Exactly 50% of the viewport is the boundary (>=), still designed.
bothEngines(
  'closing section exactly 50vh → designed (boundary inclusive)',
  800, section(400, 'rgb(74, 53, 38)'),
  { kind: 'solid', color: { r: 247, g: 250, b: 252 } }, true,
);

// A page-spanning gradient behind the content → designed gradient ending.
bothEngines(
  'gradient fill → designed (gradient ending)',
  800, section(120, 'rgb(0, 0, 0)'),
  { kind: 'gradient', stops: [] }, true,
);

// Footer color continuous with the flat body bg → seamless, floods.
bothEngines(
  'footer color ≈ flat body bg → designed (continuous)',
  800, section(250, 'rgb(20, 26, 32)'),
  { kind: 'solid', color: { r: 16, g: 20, b: 24 } }, true,
);

// Just past the 24-channel closeness threshold → reads as high-contrast → incidental.
bothEngines(
  'footer color far from body bg (Δ>24) → incidental',
  800, section(250, 'rgb(80, 26, 32)'),
  { kind: 'solid', color: { r: 16, g: 20, b: 24 } }, false,
);

// No detectable fill + short footer → safe default is incidental.
bothEngines(
  'no fill + short footer → incidental (safe default)',
  800, section(120, 'rgb(1, 2, 3)'), null, false,
);

// No last section at all → not an end-zone.
bothEngines('null lastSection → not an end-zone', 800, null, null, false);

console.log('\n=== .bleedblend-* parity: src/index.css ⇄ Tailwind plugin ===');

// Pull the plugin's generated utilities without a tailwind runtime: the plugin
// is `tailwindcss/plugin(fn)`, and the wrapper exposes the raw fn at .handler.
const pluginMod = require('../src/tailwind-plugin.js');
let pluginUtils = null;
let pluginBase = null;
(pluginMod.handler || pluginMod)({
  addUtilities: (u) => { pluginUtils = u; },
  addBase: (b) => { pluginBase = b; },
  e: (s) => s, theme: () => ({}), config: () => ({}),
});

const css = readFileSync(join(root, 'src', 'index.css'), 'utf8');

// The compact-tab-bar correction (`100lvh - 100svh`) is the library's core
// thesis. index.css folds it into .bleedblend-bottom's padding via the
// --bleedblend-dynamic-bar-height var; the plugin must do the same or a Tailwind
// user silently loses that offset. (This assertion failed before the fix.)
const DYN = '--bleedblend-dynamic-bar-height';
check('index.css defines the dynamic-bar-height var', css.includes(`${DYN}: calc(100lvh - 100svh)`));
check(
  'index.css .bleedblend-bottom padding uses the dynamic-bar-height term',
  /\.bleedblend-bottom\s*\{[^}]*padding-bottom:[^;]*var\(--bleedblend-dynamic-bar-height/s.test(css),
);
const pluginBottomPad = pluginUtils?.['.bleedblend-bottom']?.paddingBottom || '';
check(
  'plugin .bleedblend-bottom padding includes the dynamic-bar-height term (parity with index.css)',
  pluginBottomPad.includes('var(--bleedblend-dynamic-bar-height'),
);
check(
  'plugin makes the dynamic-bar-height var available (addBase :root)',
  !!(pluginBase && JSON.stringify(pluginBase).includes(DYN)),
);

// The whole family must exist in both surfaces.
for (const cls of ['.bleedblend-top', '.bleedblend-bottom', '.bleedblend-inner-blur']) {
  check(`index.css defines ${cls}`, css.includes(cls));
  check(`plugin defines ${cls}`, !!(pluginUtils && pluginUtils[cls]));
}

// Both surfaces must strip backdrop-filter off the outer bars (the #1 clipping fix).
check(
  'plugin .bleedblend-top strips backdrop-filter',
  pluginUtils?.['.bleedblend-top']?.backdropFilter?.includes('none'),
);
check(
  'plugin .bleedblend-bottom strips backdrop-filter',
  pluginUtils?.['.bleedblend-bottom']?.backdropFilter?.includes('none'),
);

// .bleedblend-push variant: must exist in both surfaces and set position:sticky,
// so the bar reserves layout space (pushes content) instead of overlaying — and
// the two surfaces must agree or a Tailwind user gets different behavior.
check(
  'index.css defines the .bleedblend-push variant as position:sticky',
  /\.bleedblend-(top|bottom)\.bleedblend-push[^{]*\{[^}]*position:\s*sticky/s.test(css),
);
const pushKey = pluginUtils && Object.keys(pluginUtils).find((k) => k.includes('bleedblend-push'));
check('plugin defines a .bleedblend-push variant', !!pushKey);
check(
  'plugin .bleedblend-push variant is position:sticky (parity with index.css)',
  !!pushKey && pluginUtils[pushKey]?.position === 'sticky',
);

console.log('\n================ UNITS SUMMARY ================');
console.log(`pass=${pass} fail=${fail}`);
if (fails.length) { console.log('FAILED:\n  - ' + fails.join('\n  - ')); process.exit(1); }
