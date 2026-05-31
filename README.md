# bleedblend

> **Zero-config Safari chrome tinting.** Paints the browser chrome to match your page content at each viewport edge — across iPhone, iPad, and Mac. Gradients, sections, rubber-band overscroll, all handled automatically. One import. No theme-color juggling. No tint configuration. It just works.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/bleedblend.svg?color=blue)](https://www.npmjs.com/package/bleedblend)
[![iOS Safari 26](https://img.shields.io/badge/iOS%20Safari-26+-blue?logo=safari&logoColor=white)](#)
[![Zero Config](https://img.shields.io/badge/Zero-Config-success)](#)

> 🎮 **[Live Demo →](https://cverinc.github.io/bleedblend/)**

---

## The Despair

iOS Safari tints the chrome (status bar + URL bar) with **whatever happens to be at the viewport edge** — but the rules are quirky, undocumented, and shift between iOS versions. You ship a page with a gradient hero, and it looks great… until:

- The viewport bottom tints mint while your belt section is dark teal — a visible **seam** at the chrome boundary.
- Compact tab bar appears, the tinting "shifts" by 30px because `100lvh - 100svh` doesn't match the current chrome height.
- User pulls past the footer — rubber-band overscroll exposes the html background-color, which is the *wrong* color.
- `theme-color` meta is ignored on iOS 26.
- `position: fixed` elements tint chrome correctly… except when they don't, depending on `opacity`, `display`, viewport edge proximity, and dark-mode mood.
- You add `body::before { position: fixed; gradient }` to fake the bg — but it **stretches into the overscroll exposed area** and overrides whatever you set on `<html>` and `<body>`.

This is a rabbit hole we fell down building real products. `bleedblend` walks it for you.

---

## What you get

```js
import 'bleedblend/auto';
```

That's it. After that one import, `bleedblend` watches scroll, resize, and `visualViewport` events, and:

- **Top chrome tinting** stays light and unobtrusive by default (Safari's natural sampling of whatever's at viewport top). Want it to take your sticky nav's color instead? That's an opt-in — see [Make your own sticky header / footer tint the chrome](#make-your-own-sticky-header--footer-tint-the-chrome-bleedblend-top--bleedblend-bottom).
- **Bottom chrome tinting** mirrors the page content: gradient interp when you're in gradient territory, section color when an opaque section reaches the edge, footer color when you're at page-end.
- **Overscroll tinting** when the page-end section enters viewport — `bleedblend` overwrites `<html>`, `<body>`, AND `body::before` so the rubber-band exposed area tints the same color, not your fallback bg.
- **No flickering** between belt and footer sections — boundary probe and last-section check use the same Y so state transitions are clean.

---

## Install

```bash
npm install bleedblend
```

Make sure your page has the cover viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## Use

### Zero-config (recommended)

```js
import 'bleedblend/auto';
```

Anywhere in your entry point. That's the whole API.

### With options

If you need to pass options (custom section selector, framework page-transition hook) or hold a reference to destroy later:

```js
import { createBleedblendAuto } from 'bleedblend/utils';

const bleed = createBleedblendAuto({
  // CSS selector for "section"-like elements. Default:
  //   'main section, main > *, footer'
  sectionSelector: 'main > section, footer',

  // Re-run bleedblend on framework page transitions:
  onPageLoad: (update) => {
    document.addEventListener('astro:page-load', update);
  },
});

// later, if you ever need to:
bleed.destroy();
```

### Make your own sticky header / footer tint the chrome (`.bleedblend-top` / `.bleedblend-bottom`)

Have a sticky nav or footer bar and want **the status bar / URL bar to take its color** — a cream nav giving you a cream status bar? Mark it `.bleedblend-top` / `.bleedblend-bottom` and import the stylesheet:

```html
<header class="bleedblend-top">
  <!-- your sticky nav -->
</header>
```

```js
import 'bleedblend/style';
```

**This is the recipe that *makes* a sticky bar tint — not just a "defer" flag for bars that already work.** The class does two things that turn "doesn't tint" into "tints":

- **Pins it `position: fixed`, full-width, with `safe-area-inset` padding** — so it sits below the notch and Safari samples it as an edge element.
- **Strips `backdrop-filter` off the outer element.** This is the **#1 reason a sticky nav silently refuses to tint**: a frosted-glass blur on the safe-area layer triggers WebKit's safe-area *clipping* bug and Safari stops sampling the bar. **If your bar looks perfect on screen but the chrome stays plain white, this is almost always why.**

Keep the frosted-glass look by moving the blur to an **inner** element with `.bleedblend-inner-blur` (the outer stays blur-free so sampling survives):

```html
<header class="bleedblend-top">
  <div class="bleedblend-inner-blur"><!-- your nav content, still frosted --></div>
</header>
```

`bleedblend`'s controller also detects the marked bar (`STICKY_OWNED`, see below) and **steps back** on that edge so it never double-paints over you.

> **Prerequisite:** the cover viewport (`viewport-fit=cover`) must be in your **server-rendered `<head>`** — injecting it via JS after load is unreliable on iOS, and without it there's no safe-area for the bar to fill.

### Tailwind CSS integration

```js
// tailwind.config.js
module.exports = {
  plugins: [require('bleedblend')],
};
```

Then use `bleedblend-top`, `bleedblend-bottom`, and `bleedblend-inner-blur` utility classes:

```html
<header class="bleedblend-top bg-emerald-700 text-white p-4">
  <!-- Sticky header, no clipping bug -->
</header>
```

---

## How it works (mental model)

`bleedblend`'s state machine, per viewport edge:

| State | When | What bleedblend does |
|---|---|---|
| `STICKY_OWNED` | User has a visible `.bleedblend-top` / `.bleedblend-bottom` | Steps back entirely. |
| `SAFE_NATURAL` | Page content at viewport edge already produces the right chrome tinting (e.g. top edge, mid-page section) | Hides the bleedblend tint (`display:none`) so Safari tints chrome with its native edge sampling. |
| `BLEED_OVERRIDE` | Page content at viewport edge would tint the wrong color (e.g. gradient terminal ≠ html bg, or page-end section needs explicit tinting) | Renders a 12px tint at the edge with the correct color. Safari samples it for chrome tinting. |

For the bottom edge specifically:

- **Gradient territory**: extend the gradient interpolation into the chrome.
- **Mid-page section** (e.g. a belt between gradient and footer): step back — let Safari's edge sampling render the natural translucent chrome.
- **Last section** (footer at page-end): engage and tint the section color. Also overwrites `<html>`, `<body>`, and `body::before` so iOS rubber-band overscroll tints the same color and you don't see the html-bg mint leak through.

For the top edge: always `SAFE_NATURAL` unless the user owns it via `.bleedblend-top`. Top chrome should feel light.

---

## iOS quirks navigated

Things `bleedblend` figured out (the hard way) so you don't have to:

- **`theme-color` is ignored on iOS 26**. Don't rely on it.
- **Safari samples non-fixed sections at the viewport edge**, not just fixed elements. The official docs and prior research suggested fixed-only.
- **`opacity: 0` is still sampled** — to truly "step back", you need `display: none`.
- **`100lvh - 100svh` is a static value** (the max dynamic chrome height), not the current chrome height. Don't use it for tint sizing — pick a small constant (e.g. 12px) that satisfies Safari's ≥3px sampling threshold.
- **`body::before { position: fixed; inset: 0 }` stretches into iOS rubber-band overscroll exposed area** and covers your `<html>` background. To paint overscroll a section color, you have to override all three: `<html>` bg, `<body>` bg, and `body::before` bg via injected `<style>`.
- **`safe-area-inset-*` reports `0` on iPhone Mirroring** — active probing is needed, with fallbacks for the 0 case.
- **`transparent` keyword has a dark band during alpha transitions** (WebKit treats it as `rgba(0,0,0,0)` = black with alpha 0). Use `rgba(R,G,B,0)` instead if you ever need alpha-0.
- **Boundary probe Y and "is this the last section" check must use the SAME Y** — otherwise you get a 12px flicker zone where one says "belt" and the other says "footer".

---

## API

### `import 'bleedblend/auto'`

Side-effect import. Calls `createBleedblendAuto()` and attaches the controller to `window.__bleedblend_auto`.

### `createBleedblendAuto(options?) → BleedblendController`

```ts
import { createBleedblendAuto } from 'bleedblend/utils';

interface BleedblendAutoOptions {
  sectionSelector?: string;
  onPageLoad?: (update: () => void) => void;
}

interface BleedblendController {
  update(): void;
  destroy(): void;
}
```

### `bleedblend/utils` — building blocks

All the internals are exported in case you want to roll your own controller:

- Color: `parseColor`, `parseColorWithAlpha`, `colorToRgb`, `colorToHex`, `isOpaque`, `colorsClose`
- Gradient: `parseGradient`, `gradientColorAt`, `gradientColorAtY`
- Sampling: `measureInset`, `detectBackgroundFill`, `sampleColorAt`, `naturalSafariColor`
- Section: `findLastOpaqueSection`, `isInsideSection`
- Meta: `setMetaThemeColor`

See `src/utils.d.ts` for full signatures.

---

## Browser support

> **bleedblend does not *manufacture* chrome tinting — it *tames* the tinting Safari already does.** Safari 26's "Liquid Glass" design tints the browser chrome from your page content across the **whole Safari family — iPhone, iPad, *and* Mac** — by sampling the `<body>` background-color (or a top `position: fixed`/`sticky` element ≥6px tall). bleedblend's value reaches exactly as far as that native tinting does. So "it works on Mac/iPad too" is real — but the reason isn't that bleedblend renders something there; it's that the native behavior it rides on is now unified across the family. ([WebKit/Liquid Glass background](#background-the-safari-26-tinting-model))

What bleedblend actually contributes differs per surface:

| Surface | Native Safari 26 tinting | What bleedblend does |
|---|---|---|
| **iPhone Safari 26+** | Present, but quirky: bottom URL bar, rubber-band overscroll leaks `<html>` bg, compact tab bar shifts the sample point, `theme-color` ignored. | **Actively tames it.** JS runs: edge probing, gradient interpolation, 12px override tint, three-layer overscroll overwrite. This is the hard part. |
| **iPad Safari 26+** | Same model as iPhone (iPadOS reports as `MacIntel` + touch). | **Actively tames it** — same code path as iPhone. |
| **Mac Safari 26+** | Present and **well-behaved**: top toolbar only, driven by `<body>` bg, no bottom chrome, no rubber-band leak. | **Deliberately steps back** (`if (!isIOS) return` → tint elements `display: none`). The desktop model needs no taming, so bleedblend defers entirely to Safari's native sampling. Tinting you see on Mac is 100% Safari — and that's correct, not a gap. |
| **iOS Safari 15–25** | No content sampling; `theme-color` honored. | Falls back to keeping `theme-color` in sync, plus tint rendering. |
| **Chrome / Firefox (desktop)** | **No chrome tinting at all.** | No-op — there is nothing to tame. Tint elements stay `display: none` to avoid a stray colored band. |
| **Chrome (Android)** | Tints the address bar via `theme-color` only (no edge sampling). | Currently no-op: the `theme-color` sync path exists internally but is gated behind `isIOS`. Unlocking it is tracked, not yet shipped/validated. |

### Background: the Safari 26 tinting model

Safari 26 (iOS/iPadOS/macOS) **dropped the `theme-color` meta tag** — it's still parsed but its value is ignored. Chrome tinting is now derived live from CSS: the `<body>` background-color, or a top `position: fixed`/`sticky` element that is full-width and ≥6px tall. This is the same model across iPhone, iPad, and Mac because Liquid Glass is a *unified* visual language — "unified visual language requires unified behavior." That unification is why bleedblend's mental model carries across the whole family even though its JS only actively engages on iOS/iPadOS.

Sources: [Why iOS 26 Safari toolbar colors work differently — nasedk.in](https://nasedk.in/blog/ios26-safari-toolbar-colors/) · [Define the Theme Color for Safari 26 — grooovinger](https://grooovinger.com/notes/2026-02-27-safari-26-header-background) · [Meta Theme Color and Trickery — CSS-Tricks](https://css-tricks.com/meta-theme-color-and-trickery/) · [Turn off website tinting — MacRumors](https://www.macrumors.com/how-to/safari-macos-turn-off-website-tinting/)

---

## Migration from v1.x

v2 is a **clean rewrite**. The v1 `trackScrollColors(stops, options)` API is gone — replaced by zero-config auto-detect.

### v1 (manual)

```js
import { trackScrollColors } from 'bleed/utils';
trackScrollColors([
  { progress: 0, color: '#aceace' },
  { progress: 1, color: '#0a8c8e' },
]);
```

### v2 (auto)

```js
import 'bleedblend/auto';
```

`bleedblend` figures out gradient stops from your `body::before` (or `body`, or `<html>`) automatically. No more hand-tuned stop arrays.

The React / Vue / Svelte / UnoCSS framework wrappers from v1 have been removed — `import 'bleedblend/auto'` works from any framework.

The `.bleedblend-top` / `.bleedblend-bottom` CSS classes and the Tailwind plugin remain unchanged.

---

## Acknowledgements

bleedblend started as a bug. While building [reef](https://reef.cver.net), a `backdrop-filter` sticky banner kept getting its blur clipped at the notch — WebKit forces the filter's sample point below the safe area, exposing the background underneath. Instead of fighting it, we painted that exposed strip on purpose, so the status bar took the brand color cleanly. That bug-turned-feature insight got battle-tested across [cver.net](https://www.cver.net)'s full-bleed gradient + sections + footer homepage — where every iOS quirk in the "quirks navigated" list was discovered the hard way — and then extracted into bleedblend. It's not a weekend toy; it's the consolidation of a tool that shipped in production first.

## License

MIT
