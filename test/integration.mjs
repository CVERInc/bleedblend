// Integration tests for the zero-config controller, driven through real Chrome
// over CDP (no npm install). Exercises the decision/state-machine and the
// visual-application path across a battery of synthetic "any site" shapes.
//
//   node test/integration.mjs
//
// What this CAN verify on a dev machine: every decision bleedblend's JS makes
// (which edge state, which color, tint element application, html/body/::before
// overwrite, desktop no-op, lifecycle). What it CANNOT: that real iOS Safari 26
// then samples the 12px tint band and paints the chrome — that is native WebKit
// behaviour and needs a real device / iOS Simulator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, launchChrome, CDP, openPage, evaluate, sleep } from './cdp-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GEN = path.join(__dirname, '__generated__');
const GEN_URL = '/test/__generated__';

const PORT = 8731;
const DBG = 9341;
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const UA_DESK = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

const page = (head, body, importLine = '<script type="module" src="/src/auto.mjs"></script>') => `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>html,body{margin:0;padding:0}${head}</style></head><body>${body}
${importLine}</body></html>`;

const GRAD = 'linear-gradient(180deg,#aceace 0%,#0a8c8e 100%)';

const CASES = [
  {
    name: 'A solid-white (no gradient/sections)', ua: 'ios',
    html: page('body{background:#ffffff}', '<div style="height:220vh"></div>'),
    check: (t, b) => [
      ['top SAFE_NATURAL', t.topState === 'SAFE_NATURAL'],
      ['bottom SAFE_NATURAL', b.botState === 'SAFE_NATURAL'],
      ['bottom tint display:none', b.botDisplay === 'none'],
      ['no html overwrite', b.htmlBg === ''],
    ],
  },
  {
    name: 'B gradient terminal != html bg', ua: 'ios',
    html: page(`html{background:#ffffff}body::before{content:"";position:fixed;inset:0;z-index:-1;background:${GRAD}}`, '<div style="height:300vh"></div>'),
    check: (t) => [
      ['top SAFE_NATURAL', t.topState === 'SAFE_NATURAL'],
      ['bottom BLEED_OVERRIDE', t.botState === 'BLEED_OVERRIDE'],
      ['bottom tint display:block', t.botDisplay === 'block'],
      ['bottom tint ~teal', near(t.botBg, 13, 142, 143, 16)],
      ['bottom tint pad 12px', t.botPadBottom === '12px'],
    ],
  },
  {
    name: 'C gradient terminal == html bg (smart no-op)', ua: 'ios',
    html: page(`html{background:#0a8c8e}body::before{content:"";position:fixed;inset:0;z-index:-1;background:${GRAD}}`, '<div style="height:300vh"></div>'),
    check: (t) => [
      ['bottom SAFE_NATURAL (already matches)', t.botState === 'SAFE_NATURAL'],
      ['bottom tint display:none', t.botDisplay === 'none'],
    ],
  },
  {
    name: 'D sections + opaque footer (no gradient)', ua: 'ios',
    html: page('section{min-height:120vh;background:#ffffff}footer{min-height:70vh;background:#0b1d3a}',
      '<main><section>1</section><section>2</section></main><footer>foot</footer>'),
    check: (t, b) => [
      ['top: mid-section SAFE_NATURAL', t.botState === 'SAFE_NATURAL'],
      ['top: no overscroll overwrite yet', t.htmlBg === ''],
      ['bottom: footer BLEED_OVERRIDE', b.botState === 'BLEED_OVERRIDE'],
      ['bottom tint ~navy', near(b.botBg, 11, 29, 58, 10)],
      ['overscroll html bg ~navy', near(b.htmlBg, 11, 29, 58, 10)],
      ['body::before overwritten', /background:\s*rgb\(11,\s*29,\s*58\)/.test(b.beforeOverride || '')],
    ],
  },
  {
    name: 'E dark mode', ua: 'ios', dark: true,
    html: page('body{background:#fff}@media (prefers-color-scheme:dark){body{background:#101418}}', '<div style="height:220vh"></div>'),
    check: (t, b) => [['runs, bottom state is a string', typeof b.botState === 'string']],
  },
  {
    name: 'F sticky .bleedblend-top header', ua: 'ios',
    html: page('.bleedblend-top{position:fixed;top:0;left:0;width:100%;background:#123456;color:#fff;padding:12px}', '<header class="bleedblend-top">nav</header><div style="height:220vh"></div>'),
    check: (t) => [['top STICKY_OWNED', t.topState === 'STICKY_OWNED']],
  },
  {
    name: 'G sticky .bleedblend-bottom bar', ua: 'ios',
    html: page('.bleedblend-bottom{position:fixed;bottom:0;left:0;width:100%;background:#222;color:#fff;padding:12px}', '<div style="height:220vh"></div><footer class="bleedblend-bottom">bar</footer>'),
    check: (t) => [['bottom STICKY_OWNED', t.botState === 'STICKY_OWNED']],
  },
  {
    name: 'H translucent overlay (alpha compositing)', ua: 'ios',
    html: page('body{background:#ffffff}.ov{min-height:220vh;background:rgba(0,0,0,0.5)}', '<div class="ov"></div>'),
    check: (t, b) => [['bottom SAFE_NATURAL (no last opaque section)', b.botState === 'SAFE_NATURAL']],
  },
  {
    name: 'I image bg, no detectable fill', ua: 'ios',
    html: page('body{background:url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==) repeat}', '<div style="height:220vh"></div>'),
    check: (t, b) => [
      ['bottom SAFE_NATURAL (cannot determine color)', b.botState === 'SAFE_NATURAL'],
      ['no overscroll overwrite', b.htmlBg === ''],
    ],
  },
  {
    name: 'J non-semantic divs (zero-config limitation)', ua: 'ios',
    html: page('.block{min-height:120vh;background:#fff}.end{min-height:80vh;background:#0b1d3a}', '<div class="block">a</div><div class="block">b</div><div class="end">end</div>'),
    check: (t, b) => [
      ['page-end NOT engaged (SAFE_NATURAL) — needs semantic markup', b.botState === 'SAFE_NATURAL'],
      ['degrades safely: no overscroll paint', b.htmlBg === ''],
    ],
  },
  {
    name: 'J2 same divs + custom sectionSelector (escape hatch)', ua: 'ios',
    html: page('.block{min-height:120vh;background:#fff}.end{min-height:80vh;background:#0b1d3a}',
      '<div class="block">a</div><div class="block">b</div><div class="end">end</div>',
      '<script type="module">import {createBleedblendAuto} from "/src/utils.mjs"; window.__c=createBleedblendAuto({sectionSelector:".block,.end"});</script>'),
    check: (t, b) => [
      ['page-end engaged via custom selector', b.botState === 'BLEED_OVERRIDE'],
      ['bottom tint ~navy', near(b.botBg, 11, 29, 58, 10)],
      ['overscroll html bg ~navy', near(b.htmlBg, 11, 29, 58, 10)],
    ],
  },
  {
    name: 'L gradient stops in oklch() (modern color)', ua: 'ios',
    html: page(`html{background:#ffffff}body::before{content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,oklch(0.95 0.03 160) 0%,oklch(0.55 0.13 195) 100%)}`, '<div style="height:300vh"></div>'),
    check: (t) => [
      ['bottom BLEED_OVERRIDE (oklch resolved, was SAFE before fix)', t.botState === 'BLEED_OVERRIDE'],
      ['bottom tint is a real color, not transparent', rgb(t.botBg) !== null && !/, 0\)$/.test(t.botBg)],
      ['bottom tint is teal-ish (r<g, r<b)', tealish(t.botBg)],
    ],
  },
  {
    name: 'M footer bg in color(display-p3)', ua: 'ios',
    html: page('section{min-height:120vh;background:#ffffff}footer{min-height:70vh;background:color(display-p3 0 0.5 0.55)}',
      '<main><section>1</section></main><footer>foot</footer>'),
    check: (t, b) => [
      ['footer BLEED_OVERRIDE', b.botState === 'BLEED_OVERRIDE'],
      ['footer color read correctly (teal-ish, not white)', tealish(b.botBg)],
      ['overscroll html bg teal-ish', tealish(b.htmlBg)],
    ],
  },
  {
    name: 'K desktop UA -> no-op (browser-support claim)', ua: 'desktop',
    html: page(`html{background:#fff}body::before{content:"";position:fixed;inset:0;z-index:-1;background:${GRAD}}`, '<div style="height:300vh"></div>'),
    check: (t, b) => [
      ['not iOS', t.isIOS === false],
      ['top tint display:none', t.topDisplay === 'none'],
      ['bottom tint display:none', t.botDisplay === 'none'],
      ['no html overwrite on desktop', b.htmlBg === ''],
      ['logic still resolves a state', typeof b.botState === 'string'],
    ],
  },
];

const slug = (name) => name.replace(/[^a-z0-9]+/gi, '_');
function rgb(s) { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).map(parseFloat); return { r: p[0], g: p[1], b: p[2] }; }
function near(s, r, g, b, t = 12) { const c = rgb(s); return !!c && Math.abs(c.r - r) < t && Math.abs(c.g - g) < t && Math.abs(c.b - b) < t; }
function tealish(s) { const c = rgb(s); return !!c && c.r < c.g && c.r < c.b && c.b > 90; }

const PROBE = `(async () => {
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,40));
  const top=document.getElementById('bleedblend-tint-top');
  const bot=document.getElementById('bleedblend-tint-bottom');
  const bo=document.getElementById('bleedblend-before-override');
  const g=el=>el?getComputedStyle(el):null;
  return {
    topState: window.__bleedblend_top_state ?? null,
    botState: window.__bleedblend_bot_state ?? null,
    topDisplay: top?g(top).display:null,
    botDisplay: bot?g(bot).display:null,
    botBg: bot?g(bot).backgroundColor:null,
    botPadBottom: bot?g(bot).paddingBottom:null,
    htmlBg: document.documentElement.style.backgroundColor,
    bodyBg: document.body.style.backgroundColor,
    beforeOverride: bo?bo.textContent:null,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    innerH: window.innerHeight, scrollY: window.scrollY
  };
})()`;

const SCROLL = `(async () => { window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,60)))); return window.scrollY; })()`;

async function configure(cdp, sessionId, c) {
  const ua = c.ua === 'desktop' ? UA_DESK : UA_IOS;
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: ua }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: c.ua === 'desktop' ? 1280 : 393, height: c.ua === 'desktop' ? 900 : 852, deviceScaleFactor: c.ua === 'desktop' ? 1 : 3, mobile: c.ua !== 'desktop' }, sessionId);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: c.dark ? 'dark' : 'light' }] }, sessionId);
}

async function runCase(cdp, c) {
  const { sessionId, errors } = await openPage(cdp);
  await configure(cdp, sessionId, c);
  const url = `http://localhost:${PORT}${GEN_URL}/${slug(c.name)}.html`;
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loaded;
  const top = await evaluate(cdp, sessionId, PROBE);
  await evaluate(cdp, sessionId, SCROLL);
  const bot = await evaluate(cdp, sessionId, PROBE);
  return { results: c.check(top, bot), errors, top, bot };
}

async function colorSerializationProbe(cdp) {
  const { sessionId } = await openPage(cdp);
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: UA_IOS }, sessionId);
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url: `http://localhost:${PORT}${GEN_URL}/domunit.html` }, sessionId);
  await loaded; await sleep(50);
  const expr = `(() => {
    const U = window.U;
    const probe = a => { const d=document.createElement('div'); d.style.backgroundColor=a; document.body.appendChild(d); const s=getComputedStyle(d).backgroundColor; d.remove(); return s; };
    const authored = ['white','red','#0a8c8e','rgb(10 20 30)','rgb(10 20 30 / 0.5)','hsl(180 50% 40%)','hsla(180,50%,40%,0.5)','oklch(0.7 0.15 180)','color(display-p3 1 0 0)','rgba(0,0,0,0.5)','transparent'];
    const ser = authored.map(a => { const s = probe(a); const p = U.parseColor(s); const ok = !!(p && Number.isFinite(p.r) && Number.isFinite(p.g) && Number.isFinite(p.b)); return { authored:a, serialized:s, parses:ok }; });
    const sample = U.sampleColorAt(window.innerWidth/2, window.innerHeight-13, []);
    return { ser, sample };
  })()`;
  return evaluate(cdp, sessionId, expr, false);
}

async function lifecycleProbe(cdp) {
  const { sessionId } = await openPage(cdp);
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: UA_IOS }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true }, sessionId);
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url: `http://localhost:${PORT}${GEN_URL}/domunit.html` }, sessionId);
  await loaded; await sleep(50);
  const expr = `(async () => {
    const U = window.U;
    const c1 = U.createBleedblendAuto();
    const c2 = U.createBleedblendAuto();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const tintNodes = document.querySelectorAll('#bleedblend-tint-top, #bleedblend-tint-bottom').length;
    c1.destroy(); c2.destroy();
    const leftover = document.querySelectorAll('#bleedblend-tint-top,#bleedblend-tint-bottom,#bleedblend-before-override,#bleedblend-transition-style').length;
    const bgCleared = document.documentElement.style.backgroundColor === '' && document.body.style.backgroundColor === '';
    return { tintNodes, leftover, bgCleared };
  })()`;
  return evaluate(cdp, sessionId, expr);
}

(async () => {
  fs.rmSync(GEN, { recursive: true, force: true });
  fs.mkdirSync(GEN, { recursive: true });
  for (const c of CASES) fs.writeFileSync(path.join(GEN, `${slug(c.name)}.html`), c.html);
  fs.writeFileSync(path.join(GEN, 'domunit.html'),
    page('body{background:#ffffff}.ov{min-height:220vh;background:rgba(0,0,0,0.5)}', '<div class="ov"></div>',
      '<script type="module">import * as U from "/src/utils.mjs"; window.U=U;</script>'));

  const server = await startServer(PORT, REPO_ROOT);
  const { proc, wsUrl } = await launchChrome(DBG);
  const cdp = await CDP.connect(wsUrl);

  let pass = 0, fail = 0; const failLines = [];
  console.log('\n================ INTEGRATION: state machine across site shapes ================\n');
  for (const c of CASES) {
    try {
      const { results, errors, top, bot } = await runCase(cdp, c);
      console.log(`• ${c.name}   [${c.ua}]`);
      for (const [label, ok] of results) { console.log(`    ${ok ? 'PASS' : 'FAIL'}  ${label}`); if (ok) pass++; else { fail++; failLines.push(`${c.name} :: ${label}`); } }
      const realErrors = errors.filter((e) => !/favicon/.test(e));
      if (realErrors.length) { fail++; failLines.push(`${c.name} :: errors`); console.log(`    FAIL  no console errors -> ${realErrors.join(' | ')}`); }
      else { pass++; console.log('    PASS  no console errors'); }
    } catch (e) { fail++; failLines.push(`${c.name} :: THREW ${e.message}`); console.log(`• ${c.name}  THREW: ${e.message}`); }
  }

  console.log('\n================ COLOR SERIALIZATION (what parseColor actually receives) ================\n');
  try {
    const { ser, sample } = await colorSerializationProbe(cdp);
    for (const row of ser) console.log(`    ${row.parses ? 'parses OK ' : 'parses ✗  '} authored=${JSON.stringify(row.authored).padEnd(26)} -> "${row.serialized}"`);
    console.log(`\n    alpha compositing (50% black over white) = ${JSON.stringify(sample)}  (expect ~127.5)`);
    if (sample && Math.abs(sample.r - 127.5) < 2) pass++; else { fail++; failLines.push('compositing wrong'); }
    const oklchRow = ser.find((r) => r.authored.startsWith('oklch('));
    const p3Row = ser.find((r) => r.authored.startsWith('color(display-p3'));
    for (const [label, ok] of [
      ['oklch() now resolves via canvas readback', !!oklchRow && oklchRow.parses],
      ['color(display-p3) now resolves via canvas readback', !!p3Row && p3Row.parses],
    ]) { console.log(`    ${ok ? 'PASS' : 'FAIL'}  ${label}`); if (ok) pass++; else { fail++; failLines.push('serialization :: ' + label); } }
  } catch (e) { fail++; console.log('    serialization probe THREW: ' + e.message); }

  console.log('\n================ LIFECYCLE: double-init idempotency + destroy ================\n');
  try {
    const lc = await lifecycleProbe(cdp);
    for (const [label, ok] of [
      ['double-init => exactly 2 tint nodes (reused, not duplicated)', lc.tintNodes === 2],
      ['destroy() removes all injected nodes', lc.leftover === 0],
      ['destroy() clears html/body bg overrides', lc.bgCleared === true],
    ]) { console.log(`    ${ok ? 'PASS' : 'FAIL'}  ${label}`); if (ok) pass++; else { fail++; failLines.push('lifecycle :: ' + label); } }
  } catch (e) { fail++; failLines.push('lifecycle :: THREW ' + e.message); console.log('    THREW ' + e.message); }

  console.log('\n================ SUMMARY ================');
  console.log(`pass=${pass} fail=${fail}`);
  if (failLines.length) console.log('FAILED:\n  - ' + failLines.join('\n  - '));

  cdp.close(); proc.kill(); server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
