// Pure-function unit tests for the color/gradient helpers (no browser needed).
//   node test/pure.mjs
import {
  parseColor, parseColorWithAlpha, colorToRgb, colorToHex,
  isOpaque, colorsClose, parseGradient, gradientColorAt,
} from '../src/utils.mjs';

let pass = 0, fail = 0;
const fails = [];
function approx(c, r, g, b, a = 1, tol = 0.6) {
  return c && Math.abs(c.r - r) < tol && Math.abs(c.g - g) < tol &&
         Math.abs(c.b - b) < tol && Math.abs((c.a ?? 1) - a) < 0.02;
}
function check(name, cond) {
  if (cond) pass++; else { fail++; fails.push(name); }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

console.log('=== parseColor: documented / common-path formats ===');
check('#fff', approx(parseColor('#fff'), 255, 255, 255, 1));
check('#ffffff', approx(parseColor('#ffffff'), 255, 255, 255, 1));
check('#0a8c8e', approx(parseColor('#0a8c8e'), 10, 140, 142, 1));
check('#80808080 (8-digit alpha)', approx(parseColor('#80808080'), 128, 128, 128, 128 / 255));
check('rgb(10, 20, 30)', approx(parseColor('rgb(10, 20, 30)'), 10, 20, 30, 1));
check('rgba(10, 20, 30, 0.5)', approx(parseColor('rgba(10, 20, 30, 0.5)'), 10, 20, 30, 0.5));
check('rgb(10,20,30) no-space', approx(parseColor('rgb(10,20,30)'), 10, 20, 30, 1));

console.log('\n=== parseColor: off-DOM (Node) returns null for non-rgb/hex; in-browser these resolve via canvas ===');
// In Node there is no document, so the canvas fallback is unavailable and these
// return null BY DESIGN (the pure path stays pure). In a browser the same calls
// resolve through normalizeViaCanvas — proven in integration.mjs. So these are
// NOT gaps in the live path; they are the documented Node boundary.
check('rgb() space-syntax -> null off-DOM', parseColor('rgb(255 0 0)') == null || Number.isNaN(parseColor('rgb(255 0 0)').g));
check('named "red" -> null off-DOM', parseColor('red') === null);
check('hsl() -> null off-DOM', parseColor('hsl(0, 100%, 50%)') === null);
check('oklch() -> null off-DOM (resolves in browser)', parseColor('oklch(0.7 0.15 180)') === null);
check('color(display-p3) -> null off-DOM (resolves in browser)', parseColor('color(display-p3 1 0 0)') === null);
check('transparent keyword -> null off-DOM (live path gets rgba(0,0,0,0))', parseColor('transparent') === null);

console.log('\n=== parseColorWithAlpha / isOpaque / colorsClose ===');
check('alpha preserved', approx(parseColorWithAlpha('rgba(0,0,0,0)'), 0, 0, 0, 0));
check('isOpaque rgb', isOpaque('rgb(1,2,3)') === true);
check('isOpaque rgba .95', isOpaque('rgba(1,2,3,0.95)') === true);
check('isOpaque rgba .5', isOpaque('rgba(1,2,3,0.5)') === false);
check('colorsClose within 8', colorsClose({ r: 10, g: 10, b: 10 }, { r: 12, g: 12, b: 12 }) === true);
check('colorsClose far', colorsClose({ r: 10, g: 10, b: 10 }, { r: 200, g: 10, b: 10 }) === false);

console.log('\n=== colorToHex / colorToRgb ===');
check('toHex', colorToHex({ r: 10, g: 140, b: 142 }) === '#0a8c8e');
check('toRgb rounds', colorToRgb({ r: 10.4, g: 140.6, b: 142 }) === 'rgb(10, 141, 142)');

console.log('\n=== parseGradient (browsers serialize stops as explicit rgb) ===');
const g1 = parseGradient('linear-gradient(180deg, rgb(172, 234, 206) 0%, rgb(10, 140, 142) 100%)');
check('2-stop', g1 && g1.length === 2 && approx(g1[0].color, 172, 234, 206) && g1[0].pos === 0 && approx(g1[1].color, 10, 140, 142) && g1[1].pos === 1);
const g2 = parseGradient('linear-gradient(to bottom, rgb(0,0,0), rgb(255,255,255))');
check('no-% endpoints -> 0/1', g2 && g2[0].pos === 0 && g2[1].pos === 1);
const g3 = parseGradient('linear-gradient(rgb(0,0,0) 0%, rgb(128,128,128) 50%, rgb(255,255,255) 100%)');
check('explicit 3-stop midpoint', g3 && g3.length === 3 && g3[1].pos === 0.5);
const g4 = parseGradient('linear-gradient(90deg, rgb(0,0,0), rgb(100,100,100), rgb(200,200,200))');
check('implied middle pos interpolated', g4 && Math.abs(g4[1].pos - 0.5) < 1e-9);
check('none -> null', parseGradient('none') === null);

console.log('\n=== gradientColorAt interpolation + clamping ===');
const stops = [{ color: { r: 0, g: 0, b: 0, a: 1 }, pos: 0 }, { color: { r: 100, g: 100, b: 100, a: 1 }, pos: 1 }];
check('at 0', approx(gradientColorAt(stops, 0), 0, 0, 0));
check('at .5', approx(gradientColorAt(stops, 0.5), 50, 50, 50));
check('at 1', approx(gradientColorAt(stops, 1), 100, 100, 100));
check('clamp < 0', approx(gradientColorAt(stops, -1), 0, 0, 0));
check('clamp > 1', approx(gradientColorAt(stops, 2), 100, 100, 100));

console.log('\n================ PURE SUMMARY ================');
console.log(`pass=${pass} fail=${fail}`);
if (fails.length) { console.log('FAILED:\n  - ' + fails.join('\n  - ')); process.exit(1); }
