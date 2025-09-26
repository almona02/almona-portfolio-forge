module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
      ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
          preset: ['default', {
          discardComments: { removeAll: true },
            normalizeWhitespace: true,
          colormin: true,
          minifySelectors: true,
          minifyParams: true,
          minifyGradients: true,
          minifyFontValues: true,
          minifyTimingFunctions: true,
          minifyTransforms: true,
          minifyBorderRadius: true,
          minifyBoxShadow: true,
          minifyFontWeight: true,
          minifyFontFamily: true,
          minifyZIndex: true,
          minifyCalc: true,
          minifyCustomProperties: true,
          minifyKeyframes: true,
          minifyGridTemplate: true,
          mergeLonghand: true,
          mergeRules: true,
          normalizeUrl: true,
          orderedValues: true,
            // Avoid identifier reduction to prevent potential conflicts
            reduceIdents: false,
          reduceInitial: true,
          reduceTransforms: true,
            svgo: true,
          uniqueSelectors: true,
          unused: true,
          zindex: true,
        }]
      }
    } : {})
  }
}
