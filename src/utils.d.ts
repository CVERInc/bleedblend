/**
 * bleedblend v2 — type declarations.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GradientStop {
  color: Rgba;
  pos: number; // 0..1
}

export type BackgroundFill =
  | { kind: 'gradient'; stops: GradientStop[]; isFixed: boolean }
  | { kind: 'solid'; color: Rgba }
  | null;

export interface BleedblendAutoOptions {
  /**
   * CSS selector for opaque "section"-like elements that bleedblend uses to
   * find the page-end section. Default: 'main section, main > *, footer'.
   */
  sectionSelector?: string;
  /**
   * Called once at init with the update function. Use it to wire up
   * framework page-transition events so bleedblend re-runs after them.
   *
   * @example
   *   onPageLoad: (update) =>
   *     document.addEventListener('astro:page-load', update)
   */
  onPageLoad?: (update: () => void) => void;
  /**
   * How far the page-end overwrite reaches when the last opaque section is in
   * view (controls the "footer flood" on flat content pages).
   *
   * - `'auto'` (default): heuristic — full `html` + `body` + `body::before`
   *   overwrite on a designed end-zone (gradient ending or a tall closing
   *   section), but only the rubber-band-exposed `<html>` is tinted on an
   *   incidental short footer over a flat background, so the visible body
   *   isn't flooded with the footer color.
   * - `'always'`: legacy behavior — always overwrite `html` + `body` +
   *   `body::before`. Correct for pages designed to end in the footer color.
   * - `'never'`: chrome-edge tint only — never touch `html`/`body` background.
   */
  overscrollFill?: 'auto' | 'always' | 'never';
}

export interface BleedblendController {
  /** Manually trigger a re-evaluation. */
  update(): void;
  /** Tear down all listeners and remove injected DOM. */
  destroy(): void;
}

// ── Color utilities ────────────────────────────────────────────────────────
export declare function parseColor(str: string | null | undefined): Rgba | null;
export declare function parseColorWithAlpha(str: string | null | undefined): Rgba | null;
export declare function colorToRgb(c: Rgba | null): string | null;
export declare function colorToHex(c: Rgba | null): string | null;
export declare function isOpaque(colorStr: string | null | undefined): boolean;
export declare function colorsClose(a: Rgba | null, b: Rgba | null, threshold?: number): boolean;

// ── Gradient parsing ───────────────────────────────────────────────────────
export declare function parseGradient(bgImage: string | null | undefined): GradientStop[] | null;
export declare function gradientColorAt(stops: GradientStop[] | null, progress: number): Rgba | null;
export declare function gradientColorAtY(stops: GradientStop[] | null, y: number, viewportHeight?: number): Rgba | null;

// ── Sampling / detection ───────────────────────────────────────────────────
export declare function measureInset(side: 'top' | 'bottom' | 'left' | 'right'): number;
export declare function detectBackgroundFill(): BackgroundFill;
export declare function sampleColorAt(x: number, y: number, ignoreIds?: string[]): Rgba | null;
export declare function naturalSafariColor(): Rgba | null;
export declare function findLastOpaqueSection(selector?: string): Element | null;
export declare function isInsideSection(y: number, lastSection: Element | null, ignoreIds?: string[]): boolean;
export declare function isDesignedEndZone(lastSection: Element | null, fill: BackgroundFill): boolean;

// ── theme-color meta ───────────────────────────────────────────────────────
export declare function setMetaThemeColor(hex: string | null | undefined): void;

// ── Main controller ────────────────────────────────────────────────────────
export declare function createBleedblendAuto(options?: BleedblendAutoOptions): BleedblendController;
export default createBleedblendAuto;
