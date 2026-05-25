/**
 * UnoCSS preset for bleed.
 * Add to uno.config.js:
 * import presetBleed from 'bleed/unocss';
 * defineConfig({ presets: [presetBleed()] })
 */

function presetBleed() {
  return {
    name: 'unocss-preset-bleed',
    rules: [
      [
        'bleed-top',
        {
          'position': 'fixed !important',
          'top': '0 !important',
          'left': '0 !important',
          'width': '100% !important',
          'min-height': 'auto !important',
          'padding-top': 'calc(8px + env(safe-area-inset-top, 0px)) !important',
          'box-sizing': 'border-box !important',
          'z-index': '50',
          '-webkit-backdrop-filter': 'none !important',
          'backdrop-filter': 'none !important'
        }
      ],
      [
        'bleed-bottom',
        {
          'position': 'fixed !important',
          'bottom': '0 !important',
          'left': '0 !important',
          'width': '100% !important',
          'min-height': 'auto !important',
          'padding-bottom': 'calc(8px + env(safe-area-inset-bottom, 0px)) !important',
          'box-sizing': 'border-box !important',
          'z-index': '50',
          '-webkit-backdrop-filter': 'none !important',
          'backdrop-filter': 'none !important'
        }
      ],
      [
        'bleed-inner-blur',
        {
          '-webkit-backdrop-filter': 'blur(10px) saturate(140%)',
          'backdrop-filter': 'blur(10px) saturate(140%)'
        }
      ]
    ]
  };
}

module.exports = presetBleed;
module.exports.presetBleed = presetBleed;
