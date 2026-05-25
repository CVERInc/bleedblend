"use client";

const React = require('react');
const { useEffect } = React;
const { setupBleedMeta } = require('./utils');

function BleedTop({
  children,
  className = '',
  style = {},
  themeColor,
  appleWebApp = true,
  appleStatusBarStyle = 'black-translucent',
  ...props
}) {
  const combinedClassName = `bleed-top ${className}`.trim();

  useEffect(() => {
    if (themeColor) {
      const cleanup = setupBleedMeta({
        themeColor,
        appleWebApp,
        appleStatusBarStyle
      });
      return cleanup;
    }
  }, [themeColor, appleWebApp, appleStatusBarStyle]);

  return React.createElement(
    'div',
    {
      className: combinedClassName,
      style: style,
      ...props
    },
    children
  );
}

function BleedBottom({
  children,
  className = '',
  style = {},
  themeColor,
  appleWebApp = true,
  appleStatusBarStyle = 'black-translucent',
  ...props
}) {
  const combinedClassName = `bleed-bottom ${className}`.trim();

  useEffect(() => {
    if (themeColor) {
      const cleanup = setupBleedMeta({
        themeColor,
        appleWebApp,
        appleStatusBarStyle
      });
      return cleanup;
    }
  }, [themeColor, appleWebApp, appleStatusBarStyle]);

  return React.createElement(
    'div',
    {
      className: combinedClassName,
      style: style,
      ...props
    },
    children
  );
}

function BleedInnerBlur({ children, className = '', style = {}, ...props }) {
  const combinedClassName = `bleed-inner-blur ${className}`.trim();
  return React.createElement(
    'div',
    {
      className: combinedClassName,
      style: style,
      ...props
    },
    children
  );
}

module.exports = {
  BleedTop,
  BleedBottom,
  BleedInnerBlur
};

