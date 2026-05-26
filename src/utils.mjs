/**
 * bleed v2 — utils (ESM)
 *
 * Smart iOS Safari chrome染色 helpers. The exported `createBleedAuto()`
 * controller and the `bleed/auto` entry give you a zero-config setup that
 * paints status bar + URL bar to match the page content at each viewport
 * edge — gradient interp, opaque sections, page-end overscroll all handled.
 *
 * See HANDOFF.md (in repo root during dev) for the mental model and the
 * iOS 26 quirks this library navigates around.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Color utilities
// ─────────────────────────────────────────────────────────────────────────────

export function parseColor(str) {
  if (!str) return null;
  const s = str.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 };
    }
    if (hex.length === 6) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
    }
    if (hex.length === 8) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: parseInt(hex.slice(6, 8), 16) / 255 };
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim());
    return {
      r: parseFloat(parts[0]),
      g: parseFloat(parts[1]),
      b: parseFloat(parts[2]),
      a: parts[3] != null ? parseFloat(parts[3]) : 1,
    };
  }
  return null;
}

export function parseColorWithAlpha(str) {
  if (!str) return null;
  const c = parseColor(str);
  if (!c) return null;
  if (str.trim().startsWith('rgba')) {
    const m = str.match(/[\d.]+/g);
    if (m && m.length >= 4) c.a = parseFloat(m[3]);
  }
  return c;
}

export function colorToRgb(c) {
  return c ? 'rgb(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + ')' : null;
}

export function colorToHex(c) {
  if (!c) return null;
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

export function isOpaque(colorStr) {
  const c = parseColor(colorStr);
  return !!c && c.a >= 0.9;
}

export function colorsClose(a, b, threshold = 8) {
  if (!a || !b) return false;
  return Math.abs(a.r - b.r) < threshold && Math.abs(a.g - b.g) < threshold && Math.abs(a.b - b.b) < threshold;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient parsing
// ─────────────────────────────────────────────────────────────────────────────

// Parse a linear-gradient string into ordered stops { color, pos } where
// pos is 0..1. Tolerates the form getComputedStyle returns (direction may be
// dropped when it's the 180deg default).
export function parseGradient(bgImage) {
  if (!bgImage || bgImage === 'none') return null;
  const lg = bgImage.match(/linear-gradient\(([\s\S]+)\)/);
  if (!lg) return null;
  const inner = lg[1];
  const parts = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  if (buf) parts.push(buf);
  const stops = [];
  for (const raw of parts) {
    const p = raw.trim();
    if (/^(\d+(\.\d+)?(deg|turn|rad|grad)|to\s+\w+(\s+\w+)?)$/i.test(p)) continue;
    const colorMatch = p.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
    if (!colorMatch) continue;
    const color = parseColor(colorMatch[1]);
    if (!color) continue;
    const posMatch = p.slice(colorMatch[0].length).match(/(-?\d+(?:\.\d+)?)\s*%/);
    stops.push({ color, posPct: posMatch ? parseFloat(posMatch[1]) : null });
  }
  if (stops.length === 0) return null;
  if (stops[0].posPct == null) stops[0].posPct = 0;
  if (stops[stops.length - 1].posPct == null) stops[stops.length - 1].posPct = 100;
  for (let i = 1; i < stops.length - 1; i++) {
    if (stops[i].posPct != null) continue;
    let next = i + 1;
    while (next < stops.length && stops[next].posPct == null) next++;
    const span = stops[next].posPct - stops[i - 1].posPct;
    const step = span / (next - (i - 1));
    for (let j = i; j < next; j++) stops[j].posPct = stops[i - 1].posPct + step * (j - (i - 1));
  }
  return stops.map((s) => ({ color: s.color, pos: s.posPct / 100 }));
}

export function gradientColorAt(stops, progress) {
  if (!stops || stops.length === 0) return null;
  if (progress <= stops[0].pos) return stops[0].color;
  if (progress >= stops[stops.length - 1].pos) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (progress >= a.pos && progress <= b.pos) {
      const span = b.pos - a.pos;
      const t = span > 0 ? (progress - a.pos) / span : 0;
      return {
        r: a.color.r + t * (b.color.r - a.color.r),
        g: a.color.g + t * (b.color.g - a.color.g),
        b: a.color.b + t * (b.color.b - a.color.b),
        a: 1,
      };
    }
  }
  return stops[stops.length - 1].color;
}

export function gradientColorAtY(stops, y, viewportHeight) {
  const vh = viewportHeight || window.innerHeight || 1;
  const progress = Math.max(0, Math.min(1, y / vh));
  return gradientColorAt(stops, progress);
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe area + viewport probes
// ─────────────────────────────────────────────────────────────────────────────

// Measure actual safe-area-inset in px. env() only falls back when undefined,
// not when 0 — so we need an active probe (iPhone Mirroring reports 0).
export function measureInset(side) {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    side +
    ':env(safe-area-inset-' +
    side +
    ',0px);';
  document.body.appendChild(probe);
  const v = parseFloat(getComputedStyle(probe)[side]) || 0;
  probe.remove();
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Background fill detection
// ─────────────────────────────────────────────────────────────────────────────

// Detect the "fill" sitting behind page content — used as fallback when a
// boundary probe lands in a transparent area. Priority: body::before fixed
// gradient/solid > body > html.
//   { kind: 'gradient', stops, isFixed }
//   { kind: 'solid',    color }
//   null
export function detectBackgroundFill() {
  const before = getComputedStyle(document.body, '::before');
  if (before.position === 'fixed' || before.position === 'absolute') {
    const stops = parseGradient(before.backgroundImage);
    if (stops) return { kind: 'gradient', stops, isFixed: true };
    if (isOpaque(before.backgroundColor)) return { kind: 'solid', color: parseColor(before.backgroundColor) };
  }
  const bodyS = getComputedStyle(document.body);
  const bodyG = parseGradient(bodyS.backgroundImage);
  if (bodyG) return { kind: 'gradient', stops: bodyG, isFixed: bodyS.backgroundAttachment === 'fixed' };
  if (isOpaque(bodyS.backgroundColor)) return { kind: 'solid', color: parseColor(bodyS.backgroundColor) };
  const htmlS = getComputedStyle(document.documentElement);
  const htmlG = parseGradient(htmlS.backgroundImage);
  if (htmlG) return { kind: 'gradient', stops: htmlG, isFixed: htmlS.backgroundAttachment === 'fixed' };
  if (isOpaque(htmlS.backgroundColor)) return { kind: 'solid', color: parseColor(htmlS.backgroundColor) };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite color sampling at a viewport point
// ─────────────────────────────────────────────────────────────────────────────

// Sample the visually composited color at viewport (x, y). Walks up the DOM
// from elementFromPoint, collects every translucent/opaque bg-color, then
// alpha-composites them in stacking order. Returns parsed color or null if
// no opaque base is found before reaching <html>. Hides ignoreIds while
// sampling so we don't pick up our own tint.
export function sampleColorAt(x, y, ignoreIds = []) {
  const saved = ignoreIds.map((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const d = el.style.display;
    el.style.display = 'none';
    return { el, d };
  });
  let element = document.elementFromPoint(x, y);
  saved.forEach((s) => {
    if (s) s.el.style.display = s.d;
  });
  if (!element) return null;

  const stack = [];
  while (element && element !== document.documentElement) {
    const c = parseColorWithAlpha(window.getComputedStyle(element).backgroundColor);
    if (c && c.a > 0.001) {
      stack.push(c);
      if (c.a >= 0.999) break;
    }
    element = element.parentElement;
  }
  if (stack.length === 0) return null;
  if (stack[stack.length - 1].a < 0.999) return null;

  let r = stack[stack.length - 1];
  for (let i = stack.length - 2; i >= 0; i--) {
    const fg = stack[i];
    const a = fg.a;
    r = {
      r: fg.r * a + r.r * (1 - a),
      g: fg.g * a + r.g * (1 - a),
      b: fg.b * a + r.b * (1 - a),
      a: 1,
    };
  }
  return r;
}

// Color Safari染色 chrome with NATURALLY (no tint override): body bg if
// opaque, else html bg.
export function naturalSafariColor() {
  const bodyBg = parseColorWithAlpha(getComputedStyle(document.body).backgroundColor);
  if (bodyBg && bodyBg.a > 0.999) return bodyBg;
  return parseColor(getComputedStyle(document.documentElement).backgroundColor);
}

// ─────────────────────────────────────────────────────────────────────────────
// Last-opaque-section detection
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SECTION_SELECTOR = 'main section, main > *, footer';

export function findLastOpaqueSection(selector = DEFAULT_SECTION_SELECTOR) {
  const candidates = document.querySelectorAll(selector);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const c = parseColorWithAlpha(getComputedStyle(candidates[i]).backgroundColor);
    if (c && c.a > 0.999) return candidates[i];
  }
  return null;
}

// Is the element at viewport (xMid, y) inside `lastSection`?
export function isInsideSection(y, lastSection, ignoreIds = []) {
  if (!lastSection) return false;
  const saved = ignoreIds.map((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const d = el.style.display;
    el.style.display = 'none';
    return { el, d };
  });
  let el = document.elementFromPoint(window.innerWidth / 2, y);
  saved.forEach((s) => {
    if (s) s.el.style.display = s.d;
  });
  while (el && el !== document.documentElement) {
    if (el === lastSection) return true;
    el = el.parentElement;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// theme-color <meta>
// ─────────────────────────────────────────────────────────────────────────────

export function setMetaThemeColor(hex) {
  if (!hex) return;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    m.content = hex;
    document.head.appendChild(m);
  } else {
    metas.forEach((m) => m.setAttribute('content', hex));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main controller — creates tints, runs the smart染色 state machine
// ─────────────────────────────────────────────────────────────────────────────

const TINT_ACTIVE_PX = 12; // just above iOS Safari's 3px sampling threshold

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const TINT_TOP_ID = 'bleed-tint-top';
const TINT_BOT_ID = 'bleed-tint-bottom';
const IGNORE_IDS = [TINT_TOP_ID, TINT_BOT_ID];

function ensureTint(id, isTop) {
  let el = document.getElementById(id);
  if (el) return el;
  el = document.createElement('div');
  el.id = id;
  el.style.cssText =
    'position:fixed;left:0;width:100%;height:0;z-index:99999;' +
    'pointer-events:none;-webkit-backdrop-filter:none;backdrop-filter:none;' +
    'box-sizing:content-box;' +
    (isTop ? 'top:0;' : 'bottom:0;');
  document.body.appendChild(el);
  return el;
}

function ensureBeforeOverride() {
  let el = document.getElementById('bleed-before-override');
  if (el) return el;
  el = document.createElement('style');
  el.id = 'bleed-before-override';
  document.head.appendChild(el);
  return el;
}

/**
 * createBleedAuto — zero-config controller.
 *
 * Returns `{ update, destroy }`. Call once on page ready (or use
 * `bleed/auto` which calls this for you).
 *
 * Options:
 *   sectionSelector  CSS selector for opaque "section"-like elements used
 *                    to find the page-end section. Default:
 *                    'main section, main > *, footer'.
 *   onPageLoad       function(update). Called once at init; pass the
 *                    update function so frameworks (Astro, SvelteKit…)
 *                    can rerun bleed after their own page-transition
 *                    events. Example:
 *                      onPageLoad: (update) =>
 *                        document.addEventListener('astro:page-load', update)
 */
export function createBleedAuto(options = {}) {
  if (typeof document === 'undefined') return { update() {}, destroy() {} };

  const sectionSelector = options.sectionSelector || DEFAULT_SECTION_SELECTOR;
  const cleanups = [];

  function pickVisible(sel) {
    const list = document.querySelectorAll(sel);
    for (const el of list) {
      if (el.hidden) continue;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      return el;
    }
    return null;
  }

  function colorAtY(y, fill, xMid) {
    const probed = sampleColorAt(xMid, y, IGNORE_IDS);
    if (probed) return { color: probed, source: 'section' };
    if (fill && fill.kind === 'gradient') return { color: gradientColorAtY(fill.stops, y), source: 'gradient' };
    if (fill && fill.kind === 'solid') return { color: fill.color, source: 'gradient' };
    return null;
  }

  // Per-edge state resolution.
  function resolveEdge(edge, userOwned, boundary, lastSection, probeY) {
    if (userOwned) return { state: 'STICKY_OWNED', color: null };
    if (edge === 'top') {
      // Top永遠 SAFE_NATURAL: chrome top stays light/unobtrusive. Safari
      // naturally samples top edge content — that's correct染色 without
      // bleed intervention. Sticky-navs take STICKY_OWNED above.
      return { state: 'SAFE_NATURAL', color: null };
    }
    if (!boundary) return { state: 'SAFE_NATURAL', color: null };
    if (boundary.source === 'section') {
      // Section reaches bottom edge. OVERRIDE染色 only if it's the LAST
      // opaque section in DOM (page-end); mid-page sections should退場
      // so chrome染色 stays light via Safari's edge sampling.
      if (isInsideSection(probeY, lastSection, IGNORE_IDS)) {
        return { state: 'BLEED_OVERRIDE', color: boundary.color };
      }
      return { state: 'SAFE_NATURAL', color: boundary.color };
    }
    // boundary.source === 'gradient' → OVERRIDE染色 only if it would visually
    // differ from Safari's natural染色 (html/body bg).
    const natural = naturalSafariColor();
    if (colorsClose(natural, boundary.color)) {
      return { state: 'SAFE_NATURAL', color: boundary.color };
    }
    return { state: 'BLEED_OVERRIDE', color: boundary.color };
  }

  function applyTint(el, resolved, isTop) {
    const padProp = isTop ? 'paddingTop' : 'paddingBottom';
    if (resolved.state === 'BLEED_OVERRIDE') {
      if (resolved.color) el.style.backgroundColor = colorToRgb(resolved.color);
      el.style[padProp] = TINT_ACTIVE_PX + 'px';
      el.style.display = 'block';
    } else {
      // SAFE / STICKY: display:none so Safari truly stops sampling our tint.
      // (opacity:0 is still sampled per iOS 26 — must be display:none.)
      el.style.display = 'none';
      el.style[padProp] = '0px';
    }
  }

  let rafScheduled = false;
  function update() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      runUpdate();
    });
  }

  function runUpdate() {
    const topEl = ensureTint(TINT_TOP_ID, true);
    const botEl = ensureTint(TINT_BOT_ID, false);
    const beforeOverrideEl = ensureBeforeOverride();
    const htmlEl = document.documentElement;

    const userTop = pickVisible('.bleed-top:not(#' + TINT_TOP_ID + ')');
    const userBottom = pickVisible('.bleed-bottom:not(#' + TINT_BOT_ID + ')');

    const fill = detectBackgroundFill();

    const safeTop = measureInset('top');
    const safeTopPx = safeTop > 0 ? safeTop : 20;
    const probeYTop = safeTopPx + 1;
    const probeYBot = window.innerHeight - (TINT_ACTIVE_PX + 1);
    const xMid = window.innerWidth / 2;

    const topC = colorAtY(probeYTop, fill, xMid);
    const botC = colorAtY(probeYBot, fill, xMid);

    const lastSection = findLastOpaqueSection(sectionSelector);

    const topResolved = resolveEdge('top', !!userTop, topC, lastSection, probeYTop);
    const botResolved = resolveEdge('bottom', !!userBottom, botC, lastSection, probeYBot);

    window.__bleed_top_state = topResolved.state;
    window.__bleed_bot_state = botResolved.state;
    window.__bleed_has_fixed = !!userTop;

    if (!isIOS) {
      topEl.style.display = 'none';
      botEl.style.display = 'none';
      htmlEl.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      beforeOverrideEl.textContent = '';
      return;
    }

    applyTint(topEl, topResolved, true);
    applyTint(botEl, botResolved, false);

    // theme-color follows top probe (iOS 15-18 compat; iOS 26 ignores it).
    const topHex = colorToHex(topC && topC.color);
    if (topHex) setMetaThemeColor(topHex);

    // Page-end overscroll染色 — body::before stretches into iOS rubber-band
    // exposed area, so html bg alone isn't enough. Overwrite html, body,
    // AND body::before together. Only when LAST opaque section is in view.
    let lastSectionColor = null;
    if (lastSection) {
      const r = lastSection.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        lastSectionColor = parseColor(getComputedStyle(lastSection).backgroundColor);
      }
    }
    if (lastSectionColor) {
      const colorRgb = colorToRgb(lastSectionColor);
      htmlEl.style.backgroundColor = colorRgb;
      document.body.style.backgroundColor = colorRgb;
      beforeOverrideEl.textContent = 'body::before { background: ' + colorRgb + ' !important; }';
      const hex = colorToHex(lastSectionColor);
      if (hex) setMetaThemeColor(hex);
    } else {
      htmlEl.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      beforeOverrideEl.textContent = '';
    }
  }

  const passive = { passive: true };
  window.addEventListener('scroll', update, passive);
  window.addEventListener('resize', update, passive);
  cleanups.push(() => window.removeEventListener('scroll', update));
  cleanups.push(() => window.removeEventListener('resize', update));

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update, passive);
    window.visualViewport.addEventListener('scroll', update, passive);
    cleanups.push(() => window.visualViewport.removeEventListener('resize', update));
    cleanups.push(() => window.visualViewport.removeEventListener('scroll', update));
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const mqHandler = () => update();
  if (mq.addEventListener) mq.addEventListener('change', mqHandler);
  else if (mq.addListener) mq.addListener(mqHandler);
  cleanups.push(() => {
    if (mq.removeEventListener) mq.removeEventListener('change', mqHandler);
    else if (mq.removeListener) mq.removeListener(mqHandler);
  });

  if (typeof options.onPageLoad === 'function') {
    try {
      options.onPageLoad(update);
    } catch (e) {
      // user-supplied hook errored — ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update, { once: true });
  } else {
    update();
  }

  return {
    update,
    destroy() {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
      cleanups.length = 0;
      [TINT_TOP_ID, TINT_BOT_ID].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      const before = document.getElementById('bleed-before-override');
      if (before) before.remove();
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    },
  };
}

export default createBleedAuto;
