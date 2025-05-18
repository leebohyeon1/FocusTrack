/**
 * Babel configuration for FocusTrack
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
        electron: '28.0'
      }
    }],
    '@babel/preset-react'
  ],
  plugins: [
    // Add any plugins here if needed
  ]
};