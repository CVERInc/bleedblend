/**
 * Dynamic Safe Area Inset Detector for JavaScript.
 * Returns the safe area insets in pixels. Safe to use in SSR environments.
 * @returns {{top: number, bottom: number, left: number, right: number}} Safe area insets in pixels
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.visibility = 'hidden';
  div.style.pointerEvents = 'none';
  div.style.top = 'env(safe-area-inset-top, 0px)';
  div.style.bottom = 'env(safe-area-inset-bottom, 0px)';
  div.style.left = 'env(safe-area-inset-left, 0px)';
  div.style.right = 'env(safe-area-inset-right, 0px)';

  document.body.appendChild(div);
  const styles = window.getComputedStyle(div);

  const insets = {
    top: parseFloat(styles.top) || 0,
    bottom: parseFloat(styles.bottom) || 0,
    left: parseFloat(styles.left) || 0,
    right: parseFloat(styles.right) || 0
  };

  document.body.removeChild(div);
  return insets;
}

/**
 * Dynamically sets/updates the <meta name="theme-color"> tag in the document head.
 * Returns a cleanup function to restore the previous theme color.
 * Safe to use in SSR environments.
 * @param {string} color CSS color string
 * @returns {() => void} Cleanup function to restore original theme color
 */
export function setThemeColor(color) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !color) {
    return () => {};
  }

  const metas = document.querySelectorAll('meta[name="theme-color"]');
  const originalColors = [];

  if (metas.length > 0) {
    metas.forEach((meta) => {
      originalColors.push({
        element: meta,
        color: meta.getAttribute('content')
      });
      meta.setAttribute('content', color);
    });
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    document.head.appendChild(meta);
    originalColors.push({
      element: meta,
      color: null
    });
  }

  return () => {
    originalColors.forEach((item) => {
      if (item.color !== null) {
        item.element.setAttribute('content', item.color);
      } else {
        item.element.remove();
      }
    });
  };
}

/**
 * Setup and manage meta tags for optimal iOS Safari full-bleed integration.
 * Patches viewport with viewport-fit=cover, adds apple-mobile-web-app-capable and status-bar-style,
 * and sets the theme-color meta tag. Returns a cleanup function to restore previous states.
 * Safe to use in SSR environments.
 * @param {Object} [options] Configuration options
 * @param {string} [options.themeColor] Theme color hex/string
 * @param {boolean} [options.appleWebApp=true] Enable apple-mobile-web-app-capable
 * @param {string} [options.appleStatusBarStyle='black-translucent'] Status bar style
 * @returns {() => void} Cleanup function to restore original meta states
 */
export function setupBleedMeta(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const {
    themeColor,
    appleWebApp = true,
    appleStatusBarStyle = 'black-translucent'
  } = options;

  const cleanups = [];

  // 1. Viewport fit=cover patch
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const originalContent = viewport.getAttribute('content') || '';
    if (!originalContent.includes('viewport-fit=cover')) {
      const separator = originalContent ? (originalContent.endsWith(',') ? ' ' : ', ') : '';
      viewport.setAttribute('content', originalContent + separator + 'viewport-fit=cover');
      cleanups.push(() => viewport.setAttribute('content', originalContent));
    }
  }

  // 2. Theme color meta tag
  if (themeColor) {
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    const originalColors = [];
    if (metas.length > 0) {
      metas.forEach((meta) => {
        originalColors.push({
          element: meta,
          color: meta.getAttribute('content')
        });
        meta.setAttribute('content', themeColor);
      });
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', themeColor);
      document.head.appendChild(meta);
      originalColors.push({
        element: meta,
        color: null
      });
    }
    cleanups.push(() => {
      originalColors.forEach((item) => {
        if (item.color !== null) {
          item.element.setAttribute('content', item.color);
        } else {
          item.element.remove();
        }
      });
    });
  }

  // 3. Apple web app capable
  if (appleWebApp) {
    const capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    const originalCapable = capable ? capable.getAttribute('content') : null;
    let targetCapable = capable;
    if (!targetCapable) {
      targetCapable = document.createElement('meta');
      targetCapable.setAttribute('name', 'apple-mobile-web-app-capable');
      document.head.appendChild(targetCapable);
    }
    targetCapable.setAttribute('content', 'yes');
    cleanups.push(() => {
      if (originalCapable !== null) {
        targetCapable.setAttribute('content', originalCapable);
      } else {
        targetCapable.remove();
      }
    });
  }

  // 4. Apple status bar style
  if (appleStatusBarStyle) {
    const styleTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const originalStyle = styleTag ? styleTag.getAttribute('content') : null;
    let targetStyle = styleTag;
    if (!targetStyle) {
      targetStyle = document.createElement('meta');
      targetStyle.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(targetStyle);
    }
    targetStyle.setAttribute('content', appleStatusBarStyle);
    cleanups.push(() => {
      if (originalStyle !== null) {
        targetStyle.setAttribute('content', originalStyle);
      } else {
        targetStyle.remove();
      }
    });
  }

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {}
    });
  };
}

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);
  return rgbToHex(r, g, b);
}

function parseColorToRgb(color) {
  if (color.startsWith('#')) {
    const c = color.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return { r, g, b };
  }
  if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return {
        r: parseInt(matches[0]),
        g: parseInt(matches[1]),
        b: parseInt(matches[2])
      };
    }
  }
  return { r: 0, g: 0, b: 0 };
}

function isBackgroundFixed() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const bodyStyle = window.getComputedStyle(document.body);
  
  if (htmlStyle.backgroundAttachment === 'fixed' || 
      bodyStyle.backgroundAttachment === 'fixed') {
    return true;
  }
  
  const bodyBeforeStyle = window.getComputedStyle(document.body, '::before');
  if (bodyBeforeStyle.position === 'fixed' && 
      (bodyBeforeStyle.backgroundImage !== 'none' || bodyBeforeStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
    return true;
  }
  
  return false;
}

function isColorOpaque(color) {
  if (!color) return false;
  const trimmed = color.trim().toLowerCase();
  
  if (trimmed === 'transparent' || trimmed === 'initial' || trimmed === 'inherit') {
    return false;
  }
  
  if (trimmed.startsWith('rgba')) {
    const matches = trimmed.match(/[\d.]+/g);
    if (matches && matches.length >= 4) {
      const alpha = parseFloat(matches[3]);
      return !isNaN(alpha) && alpha >= 0.8;
    }
    return false;
  }
  
  if (trimmed.startsWith('rgb')) {
    return true;
  }
  
  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '');
    if (hex.length === 4) {
      const alpha = parseInt(hex.substring(3, 4), 16) / 15;
      return alpha >= 0.8;
    }
    if (hex.length === 8) {
      const alpha = parseInt(hex.substring(6, 8), 16) / 255;
      return alpha >= 0.8;
    }
    return true;
  }
  
  return true;
}

function getBgColorUnderElement(statusBarHeight, baseColor, isFixedBg) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return baseColor;
  }
  
  const y = statusBarHeight + 4;
  const x = window.innerWidth / 2;
  
  const statusBar = document.getElementById('bleed-status-bar-tint');
  let originalDisplay = '';
  if (statusBar) {
    originalDisplay = statusBar.style.display;
    statusBar.style.display = 'none';
  }
  
  let element = document.elementFromPoint(x, y);
  
  if (statusBar) {
    statusBar.style.display = originalDisplay;
  }
  
  if (!element) {
    return baseColor;
  }
  
  while (element && element !== document.documentElement && element !== document.body) {
    const style = window.getComputedStyle(element);
    const bg = style.backgroundColor;
    
    if (bg && isColorOpaque(bg)) {
      return bg;
    }
    element = element.parentElement;
  }
  
  return isFixedBg ? null : baseColor;
}


/**
 * Tracks scroll position and dynamically interpolates theme-color meta tag.
 * @param {Array<{progress: number, color: string}>} stops Color stops (sorted by progress 0..1)
 * @param {Object} [options] Meta options
 * @param {boolean} [options.appleWebApp=true] Manage PWA capable meta tag
 * @param {string} [options.appleStatusBarStyle='black-translucent'] PWA status bar style
 * @returns {() => void} Function to stop tracking scroll
 */
export function trackScrollColors(stops, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (!stops || stops.length === 0) {
    return () => {};
  }

  const {
    appleWebApp = true,
    appleStatusBarStyle = 'black-translucent',
    statusBarTint = true,
    trackHtml = true,
    htmlColor = stops[stops.length - 1].color
  } = options;

  const metaCleanup = setupBleedMeta({
    appleWebApp,
    appleStatusBarStyle
  });

  const originalHtmlBg = document.documentElement.style.backgroundColor;

  let statusBar = null;
  if (statusBarTint) {
    statusBar = document.getElementById('bleed-status-bar-tint');
    if (!statusBar) {
      statusBar = document.createElement('div');
      statusBar.id = 'bleed-status-bar-tint';
      statusBar.style.position = 'fixed';
      statusBar.style.top = '0';
      statusBar.style.left = '0';
      statusBar.style.width = '100%';
      statusBar.style.height = '0';
      statusBar.style.paddingTop = 'calc(8px + env(safe-area-inset-top, 0px))';
      statusBar.style.boxSizing = 'content-box';
      statusBar.style.webkitBackdropFilter = 'none';
      statusBar.style.backdropFilter = 'none';
      statusBar.style.zIndex = '99999';
      statusBar.style.pointerEvents = 'none';
      document.body.appendChild(statusBar);
    }
  }

  const scrollMetaCleanup = setThemeColor(stops[0].color);

  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0;

    let lowerStop = stops[0];
    let upperStop = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
      if (ratio >= stops[i].progress && ratio <= stops[i + 1].progress) {
        lowerStop = stops[i];
        upperStop = stops[i + 1];
        break;
      }
    }

    let baseColor = lowerStop.color;
    if (lowerStop !== upperStop) {
      const range = upperStop.progress - lowerStop.progress;
      const factor = range > 0 ? (ratio - lowerStop.progress) / range : 0;
      baseColor = interpolateColor(lowerStop.color, upperStop.color, factor);
    }

    const insets = getSafeAreaInsets();
    const isFixedBg = isBackgroundFixed();
    const sampledColor = getBgColorUnderElement(insets.top, baseColor, isFixedBg);
    
    let targetColor = baseColor;
    if (sampledColor) {
      targetColor = sampledColor;
    } else if (isFixedBg) {
      targetColor = stops[0].color;
    }

    const rgb = parseColorToRgb(targetColor);
    const opaqueColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const transparentColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;
    const hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((meta) => {
        meta.setAttribute('content', hexColor);
      });
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', hexColor);
      document.head.appendChild(meta);
    }

    document.documentElement.style.setProperty('--bleed-status-bar-color', opaqueColor);

    if (trackHtml) {
      const isIOS = typeof navigator !== 'undefined' && 
                    (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (isIOS) {
        // iOS Safari: Keep html background color fixed to bottomColor/htmlColor
        const fallbackHtmlColor = htmlColor || stops[stops.length - 1].color;
        document.documentElement.style.backgroundColor = fallbackHtmlColor;
      } else {
        // macOS Safari: Keep html background color dynamic to match the theme color
        document.documentElement.style.backgroundColor = opaqueColor;
      }
    }

    if (statusBar) {
      const isIOS = typeof navigator !== 'undefined' && 
                    (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (isIOS) {
        statusBar.style.display = 'block';
        statusBar.style.background = 'none';
        statusBar.style.backgroundColor = opaqueColor;
        const topHeight = insets.top > 0 ? insets.top : 20;
        statusBar.style.paddingTop = `${topHeight}px`;
      } else {
        statusBar.style.display = 'none';
      }
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  update();

  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    document.documentElement.style.backgroundColor = originalHtmlBg;
    document.documentElement.style.removeProperty('--bleed-status-bar-color');
    if (statusBar && statusBar.parentNode) {
      statusBar.parentNode.removeChild(statusBar);
    }
    scrollMetaCleanup();
    metaCleanup();
  };
}
