const { h, defineComponent, watch, onUnmounted } = require('vue');
const { setupBleedMeta } = require('./utils');

const BleedTop = defineComponent({
  name: 'BleedTop',
  props: {
    class: {
      type: String,
      default: ''
    },
    style: {
      type: [Object, String],
      default: () => ({})
    },
    themeColor: {
      type: String,
      default: ''
    },
    appleWebApp: {
      type: Boolean,
      default: true
    },
    appleStatusBarStyle: {
      type: String,
      default: 'black-translucent'
    }
  },
  setup(props, { slots, attrs }) {
    let cleanup = null;

    watch(
      () => [props.themeColor, props.appleWebApp, props.appleStatusBarStyle],
      ([newColor, newWebApp, newStyle]) => {
        if (cleanup) cleanup();
        if (newColor) {
          cleanup = setupBleedMeta({
            themeColor: newColor,
            appleWebApp: newWebApp,
            appleStatusBarStyle: newStyle
          });
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      if (cleanup) cleanup();
    });

    return () => {
      const combinedClass = `bleed-top ${props.class || ''}`.trim();
      return h(
        'div',
        {
          ...attrs,
          class: combinedClass,
          style: props.style
        },
        slots.default ? slots.default() : null
      );
    };
  }
});

const BleedBottom = defineComponent({
  name: 'BleedBottom',
  props: {
    class: {
      type: String,
      default: ''
    },
    style: {
      type: [Object, String],
      default: () => ({})
    },
    themeColor: {
      type: String,
      default: ''
    },
    appleWebApp: {
      type: Boolean,
      default: true
    },
    appleStatusBarStyle: {
      type: String,
      default: 'black-translucent'
    }
  },
  setup(props, { slots, attrs }) {
    let cleanup = null;

    watch(
      () => [props.themeColor, props.appleWebApp, props.appleStatusBarStyle],
      ([newColor, newWebApp, newStyle]) => {
        if (cleanup) cleanup();
        if (newColor) {
          cleanup = setupBleedMeta({
            themeColor: newColor,
            appleWebApp: newWebApp,
            appleStatusBarStyle: newStyle
          });
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      if (cleanup) cleanup();
    });

    return () => {
      const combinedClass = `bleed-bottom ${props.class || ''}`.trim();
      return h(
        'div',
        {
          ...attrs,
          class: combinedClass,
          style: props.style
        },
        slots.default ? slots.default() : null
      );
    };
  }
});

const BleedInnerBlur = defineComponent({
  name: 'BleedInnerBlur',
  props: {
    class: {
      type: String,
      default: ''
    },
    style: {
      type: [Object, String],
      default: () => ({})
    }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const combinedClass = `bleed-inner-blur ${props.class || ''}`.trim();
      return h(
        'div',
        {
          ...attrs,
          class: combinedClass,
          style: props.style
        },
        slots.default ? slots.default() : null
      );
    };
  }
});

module.exports = {
  BleedTop,
  BleedBottom,
  BleedInnerBlur
};

