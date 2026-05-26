/**
 * bleed v2 — utils (CommonJS)
 *
 * CommonJS mirror of utils.mjs. Keep these two files in sync.
 * See utils.mjs for documentation and HANDOFF.md for the mental model.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Color utilities
// ─────────────────────────────────────────────────────────────────────────────

function parseColor(str) {
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

function parseColorWithAlpha(str) {
  if (!str) return null;
  const c = parseColor(str);
  if (!c) return null;
  if (str.trim().startsWith('rgba')) {
    const m = str.match(/[\d.]+/g);
    if (m && m.length >= 4) c.a = parseFloat(m[3]);
  }
  return c;
}

function colorToRgb(c) {
  return c ? 'rgb(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + ')' : null;
}

function colorToHex(c) {
  if (!c) return null;
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

function isOpaque(colorStr) {
  const c = parseColor(colorStr);
  return !!c && c.a >= 0.9;
}

function colorsClose(a, b, threshold) {
  if (!a || !b) return false;
  const t = threshold == null ? 8 : threshold;
  return Math.abs(a.r - b.r) < t && Math.abs(a.g - b.g) < t && Math.abs(a.b - b.b) < t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseGradient(bgImage) {
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

function gradientColorAt(stops, progress) {
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

function gradientColorAtY(stops, y, viewportHeight) {
  const vh = viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 1) || 1;
  const progress = Math.max(0, Math.min(1, y / vh));
  return gradientColorAt(stops, progress);
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe area + sampling
// ─────────────────────────────────────────────────────────────────────────────

function measureInset(side) {
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

function detectBackgroundFill() {
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

function sampleColorAt(x, y, ignoreIds) {
  const ids = ignoreIds || [];
  const saved = ids.map((id) => {
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

function naturalSafariColor() {
  const bodyBg = parseColorWithAlpha(getComputedStyle(document.body).backgroundColor);
  if (bodyBg && bodyBg.a > 0.999) return bodyBg;
  return parseColor(getComputedStyle(document.documentElement).backgroundColor);
}

const DEFAULT_SECTION_SELECTOR = 'main section, main > *, footer';

function findLastOpaqueSection(selector) {
  const sel = selector || DEFAULT_SECTION_SELECTOR;
  const candidates = document.querySelectorAll(sel);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const c = parseColorWithAlpha(getComputedStyle(candidates[i]).backgroundColor);
    if (c && c.a > 0.999) return candidates[i];
  }
  return null;
}

function isInsideSection(y, lastSection, ignoreIds) {
  if (!lastSection) return false;
  const ids = ignoreIds || [];
  const saved = ids.map((id) => {
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

function setMetaThemeColor(hex) {
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
// Main controller
// ─────────────────────────────────────────────────────────────────────────────

const TINT_ACTIVE_PX = 12;

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

function ensureTransitionStyle() {
  let el = document.getElementById('bleed-transition-style');
  if (el) return el;
  el = document.createElement('style');
  el.id = 'bleed-transition-style';
  el.textContent =
    'html, body { transition: background-color 400ms ease; } ' +
    'body::before { transition: background 400ms ease; }';
  document.head.appendChild(el);
  return el;
}

function createBleedAuto(options) {
  const opts = options || {};
  if (typeof document === 'undefined') return { update() {}, destroy() {} };

  const sectionSelector = opts.sectionSelector || DEFAULT_SECTION_SELECTOR;
  const cleanups = [];

  function pickVisible(sel) {
    const list = document.querySelectorAll(sel);
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
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

  function resolveEdge(edge, userOwned, boundary, lastSection, probeY) {
    if (userOwned) return { state: 'STICKY_OWNED', color: null };
    if (edge === 'top') return { state: 'SAFE_NATURAL', color: null };
    if (!boundary) return { state: 'SAFE_NATURAL', color: null };
    if (boundary.source === 'section') {
      if (isInsideSection(probeY, lastSection, IGNORE_IDS)) {
        return { state: 'BLEED_OVERRIDE', color: boundary.color };
      }
      return { state: 'SAFE_NATURAL', color: boundary.color };
    }
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
    ensureTransitionStyle();
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

    const topHex = colorToHex(topC && topC.color);
    if (topHex) setMetaThemeColor(topHex);

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
  cleanups.push(function () { window.removeEventListener('scroll', update); });
  cleanups.push(function () { window.removeEventListener('resize', update); });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update, passive);
    window.visualViewport.addEventListener('scroll', update, passive);
    cleanups.push(function () { window.visualViewport.removeEventListener('resize', update); });
    cleanups.push(function () { window.visualViewport.removeEventListener('scroll', update); });
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const mqHandler = function () { update(); };
  if (mq.addEventListener) mq.addEventListener('change', mqHandler);
  else if (mq.addListener) mq.addListener(mqHandler);
  cleanups.push(function () {
    if (mq.removeEventListener) mq.removeEventListener('change', mqHandler);
    else if (mq.removeListener) mq.removeListener(mqHandler);
  });

  if (typeof opts.onPageLoad === 'function') {
    try { opts.onPageLoad(update); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update, { once: true });
  } else {
    update();
  }

  return {
    update,
    destroy() {
      cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
      cleanups.length = 0;
      [TINT_TOP_ID, TINT_BOT_ID].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      const before = document.getElementById('bleed-before-override');
      if (before) before.remove();
      const transition = document.getElementById('bleed-transition-style');
      if (transition) transition.remove();
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    },
  };
}

module.exports = {
  parseColor,
  parseColorWithAlpha,
  colorToRgb,
  colorToHex,
  isOpaque,
  colorsClose,
  parseGradient,
  gradientColorAt,
  gradientColorAtY,
  measureInset,
  detectBackgroundFill,
  sampleColorAt,
  naturalSafariColor,
  findLastOpaqueSection,
  isInsideSection,
  setMetaThemeColor,
  createBleedAuto,
  default: createBleedAuto,
};
