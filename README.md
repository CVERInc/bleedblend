# bleed

> **Zero-config iOS Safari chrome tinting.** Paints the status bar and URL bar to match your page content at each viewport edge — gradients, sections, rubber-band overscroll, all handled automatically. One import. No theme-color juggling. No tint configuration. It just works.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/bleed.svg?color=blue)](https://www.npmjs.com/package/bleed)
[![iOS Safari 26](https://img.shields.io/badge/iOS%20Safari-26+-blue?logo=safari&logoColor=white)](#)
[![Zero Config](https://img.shields.io/badge/Zero-Config-success)](#)

> 🎮 **[Live Demo →](https://cverinc.github.io/bleed/)**

---

## The Despair

iOS Safari tints the chrome (status bar + URL bar) with **whatever happens to be at the viewport edge** — but the rules are quirky, undocumented, and shift between iOS versions. You ship a page with a gradient hero, and it looks great… until:

- The viewport bottom tints mint while your belt section is dark teal — a visible **seam** at the chrome boundary.
- Compact tab bar appears, the tinting "shifts" by 30px because `100lvh - 100svh` doesn't match the current chrome height.
- User pulls past the footer — rubber-band overscroll exposes the html background-color, which is the *wrong* color.
- `theme-color` meta is ignored on iOS 26.
- `position: fixed` elements tint chrome correctly… except when they don't, depending on `opacity`, `display`, viewport edge proximity, and dark-mode mood.
- You add `body::before { position: fixed; gradient }` to fake the bg — but it **stretches into the overscroll exposed area** and overrides whatever you set on `<html>` and `<body>`.

This is a four-day rabbit hole. `bleed` walks it for you.

---

## What you get

```js
import 'bleed/auto';
```

That's it. After that one import, `bleed` watches scroll, resize, and `visualViewport` events, and:

- **Top chrome tinting** stays light and unobtrusive (Safari's natural sampling of whatever's at viewport top).
- **Bottom chrome tinting** mirrors the page content: gradient interp when you're in gradient territory, section color when an opaque section reaches the edge, footer color when you're at page-end.
- **Overscroll tinting** when the page-end section enters viewport — `bleed` overwrites `<html>`, `<body>`, AND `body::before` so the rubber-band exposed area tints the same color, not your fallback bg.
- **No flickering** between belt and footer sections — boundary probe and last-section check use the same Y so state transitions are clean.

---

## Install

```bash
npm install bleed
```

Make sure your page has the cover viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## Use

### Zero-config (recommended)

```js
import 'bleed/auto';
```

Anywhere in your entry point. That's the whole API.

### With options

If you need to pass options (custom section selector, framework page-transition hook) or hold a reference to destroy later:

```js
import { createBleedAuto } from 'bleed/utils';

const bleed = createBleedAuto({
  // CSS selector for "section"-like elements. Default:
  //   'main section, main > *, footer'
  sectionSelector: 'main > section, footer',

  // Re-run bleed on framework page transitions:
  onPageLoad: (update) => {
    document.addEventListener('astro:page-load', update);
  },
});

// later, if you ever need to:
bleed.destroy();
```

### Sticky banners (`.bleed-top` / `.bleed-bottom`)

If you have your own sticky header or footer banner that already tints chrome correctly, mark it with `.bleed-top` / `.bleed-bottom`. `bleed` will detect it and **step out of the way** on that edge.

```html
<header class="bleed-top">
  <!-- Your sticky nav. bleed defers to you. -->
</header>
```

The class also pins it `position: fixed` with proper safe-area padding and disables `backdrop-filter` on the outer wrapper (preventing WebKit's safe-area clipping bug). Import the stylesheet:

```js
import 'bleed/style';
```

Or via Tailwind plugin (see below).

### Tailwind CSS integration

```js
// tailwind.config.js
module.exports = {
  plugins: [require('bleed')],
};
```

Then use `bleed-top`, `bleed-bottom`, and `bleed-inner-blur` utility classes:

```html
<header class="bleed-top bg-emerald-700 text-white p-4">
  <!-- Sticky header, no clipping bug -->
</header>
```

---

## How it works (mental model)

`bleed`'s state machine, per viewport edge:

| State | When | What bleed does |
|---|---|---|
| `STICKY_OWNED` | User has a visible `.bleed-top` / `.bleed-bottom` | Steps back entirely. |
| `SAFE_NATURAL` | Page content at viewport edge already produces the right chrome tinting (e.g. top edge, mid-page section) | Hides the bleed tint (`display:none`) so Safari tints chrome with its native edge sampling. |
| `BLEED_OVERRIDE` | Page content at viewport edge would tint the wrong color (e.g. gradient terminal ≠ html bg, or page-end section needs explicit tinting) | Renders a 12px tint at the edge with the correct color. Safari samples it for chrome tinting. |

For the bottom edge specifically:

- **Gradient territory**: extend the gradient interpolation into the chrome.
- **Mid-page section** (e.g. a belt between gradient and footer): step back — let Safari's edge sampling render the natural translucent chrome.
- **Last section** (footer at page-end): engage and tint the section color. Also overwrites `<html>`, `<body>`, and `body::before` so iOS rubber-band overscroll tints the same color and you don't see the html-bg mint leak through.

For the top edge: always `SAFE_NATURAL` unless the user owns it via `.bleed-top`. Top chrome should feel light.

---

## iOS quirks navigated

Things `bleed` figured out (the hard way) so you don't have to:

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

### `import 'bleed/auto'`

Side-effect import. Calls `createBleedAuto()` and attaches the controller to `window.__bleed_auto`.

### `createBleedAuto(options?) → BleedController`

```ts
import { createBleedAuto } from 'bleed/utils';

interface BleedAutoOptions {
  sectionSelector?: string;
  onPageLoad?: (update: () => void) => void;
}

interface BleedController {
  update(): void;
  destroy(): void;
}
```

### `bleed/utils` — building blocks

All the internals are exported in case you want to roll your own controller:

- Color: `parseColor`, `parseColorWithAlpha`, `colorToRgb`, `colorToHex`, `isOpaque`, `colorsClose`
- Gradient: `parseGradient`, `gradientColorAt`, `gradientColorAtY`
- Sampling: `measureInset`, `detectBackgroundFill`, `sampleColorAt`, `naturalSafariColor`
- Section: `findLastOpaqueSection`, `isInsideSection`
- Meta: `setMetaThemeColor`

See `src/utils.d.ts` for full signatures.

---

## Browser support

| Browser | Behavior |
|---|---|
| **iOS Safari 26+** | Full tinting with native chrome sampling. Tested extensively. |
| **iOS Safari 15-25** | Falls back to `theme-color` metatinting (we update it in sync) plus tint rendering. |
| **Desktop Safari, Chrome, Firefox** | No-op. Tint elements are kept `display: none` on non-iOS to avoid a colored band on browsers that don't tint chrome. |

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
import 'bleed/auto';
```

`bleed` figures out gradient stops from your `body::before` (or `body`, or `<html>`) automatically. No more hand-tuned stop arrays.

The React / Vue / Svelte / UnoCSS framework wrappers from v1 have been removed — `import 'bleed/auto'` works from any framework.

The `.bleed-top` / `.bleed-bottom` CSS classes and the Tailwind plugin remain unchanged.

---

## Acknowledgements

Built and refined through a four-day surgical iteration against [cver.net](https://www.cver.net)'s gradient + sections + footer page structure. Every iOS quirk in the "quirks navigated" list was discovered the hard way.

## License

MIT
