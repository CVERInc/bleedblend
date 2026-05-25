const { setupBleedMeta } = require('./utils');

function bleedTop(node, options) {
  node.classList.add('bleed-top');
  
  let cleanup = null;
  const config = typeof options === 'string' ? { themeColor: options } : options;
  if (config && (config.themeColor || config.appleWebApp || config.appleStatusBarStyle)) {
    cleanup = setupBleedMeta(config);
  }

  return {
    update(newOptions) {
      if (cleanup) cleanup();
      const newConfig = typeof newOptions === 'string' ? { themeColor: newOptions } : newOptions;
      if (newConfig && (newConfig.themeColor || newConfig.appleWebApp || newConfig.appleStatusBarStyle)) {
        cleanup = setupBleedMeta(newConfig);
      }
    },
    destroy() {
      node.classList.remove('bleed-top');
      if (cleanup) cleanup();
    }
  };
}

function bleedBottom(node, options) {
  node.classList.add('bleed-bottom');
  
  let cleanup = null;
  const config = typeof options === 'string' ? { themeColor: options } : options;
  if (config && (config.themeColor || config.appleWebApp || config.appleStatusBarStyle)) {
    cleanup = setupBleedMeta(config);
  }

  return {
    update(newOptions) {
      if (cleanup) cleanup();
      const newConfig = typeof newOptions === 'string' ? { themeColor: newOptions } : newOptions;
      if (newConfig && (newConfig.themeColor || newConfig.appleWebApp || newConfig.appleStatusBarStyle)) {
        cleanup = setupBleedMeta(newConfig);
      }
    },
    destroy() {
      node.classList.remove('bleed-bottom');
      if (cleanup) cleanup();
    }
  };
}

function bleedInnerBlur(node) {
  node.classList.add('bleed-inner-blur');
  return {
    destroy() {
      node.classList.remove('bleed-inner-blur');
    }
  };
}

module.exports = {
  bleedTop,
  bleedBottom,
  bleedInnerBlur
};

