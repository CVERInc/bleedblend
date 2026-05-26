const plugin = require('tailwindcss/plugin');

module.exports = plugin(function bleedblend({ addUtilities }) {
  addUtilities(
    {
      '.bleedblend-top': {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        minHeight: 'auto',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        boxSizing: 'border-box',
        zIndex: '50',
        '-webkit-backdrop-filter': 'none !important',
        backdropFilter: 'none !important',
      },
      '.bleedblend-bottom': {
        position: 'fixed',
        bottom: '0',
        left: '0',
        width: '100%',
        minHeight: 'auto',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        zIndex: '50',
        '-webkit-backdrop-filter': 'none !important',
        backdropFilter: 'none !important',
      },
      '.bleedblend-inner-blur': {
        '-webkit-backdrop-filter': 'blur(10px) saturate(140%)',
        backdropFilter: 'blur(10px) saturate(140%)',
      },
    },
    ['responsive']
  );
});
