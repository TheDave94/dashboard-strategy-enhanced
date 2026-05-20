// Webpack 5 production build for the simon42-dashboard-strategy fork.
//
// Single source of truth: this file is the production config.
// (Webpack auto-resolves .cjs before .ts when both exist, so keeping
// both led to silent drift between them — fixed in beta.16 by deleting
// webpack.config.ts.)
//
// Dev build lives in webpack.dev.config.ts and is invoked explicitly
// from package.json.

'use strict';

// Node 18 polyfill — webpack 5 uses globalThis.crypto for hashing.
// Removed once engines.node is bumped past 20 everywhere in dev.
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

const path = require('path');
const zlib = require('zlib');
const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const pkg = require('./package.json');

/** @type {import('webpack').Configuration} */
const config = {
  mode: 'production',
  entry: './src/simon42-dashboard-strategy.ts',
  // Separate `.map` files alongside `.js`. Lets bug reports show real
  // source frames; doesn't reference them via `//# sourceMappingURL=`
  // so the HACS bundle itself stays tiny on first byte.
  devtool: 'hidden-source-map',
  output: {
    clean: true,
    filename: 'simon42-dashboard-strategy.js',
    chunkFilename: 'simon42-dashboard-strategy-[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
    // publicPath must match the HA resource URL path for async chunk loading.
    publicPath: '/hacsfiles/simon42-dashboard-strategy/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: {
      // Chunk architecture:
      //   main (entry)  → tiny, registers custom element instantly
      //   lit           → Lit framework, shared by core + views + editor
      //   core          → Registry, Utils, Types, OverviewViewStrategy, Cards (home screen)
      //   views         → LightsView, CoversView, SecurityView, BatteriesView, RoomView
      //   editor        → StrategyEditor + js-yaml (on-demand only)
      //
      // `types/` joins `core` so DEFAULT_SECTIONS_ORDER and related
      // constants don't get duplicated into two 228B "orphan" chunks
      // (the beta.16 audit caught this).
      cacheGroups: {
        lit: {
          test: /[\\/]node_modules[\\/](?:lit|@lit|lit-html|lit-element)[\\/]/,
          name: 'lit',
          chunks: 'async',
          enforce: true,
          priority: 20,
        },
        core: {
          test: /[\\/]src[\\/](?:Registry|utils|translations|sections|types|cards|features|views[\\/]OverviewViewStrategy)/,
          name: 'core',
          chunks: 'async',
          enforce: true,
          priority: 10,
        },
        views: {
          test: /[\\/]src[\\/]views[\\/](?!OverviewViewStrategy)/,
          name: 'views',
          chunks: 'async',
          enforce: true,
          priority: 10,
        },
        editor: {
          test: /[\\/](?:src[\\/]editor|node_modules[\\/]js-yaml)[\\/]/,
          name: 'editor',
          chunks: 'async',
          enforce: true,
          priority: 15,
        },
      },
    },
  },
  plugins: [
    // Inject the package.json version at build time so the runtime
    // log + diagnostics report the same string as the release tag.
    // Replaces the previously-hardcoded STRATEGY_VERSION constant
    // that lied at runtime (it stayed at '1.3.4-beta.9' through a
    // dozen releases — beta.16 audit caught this).
    new webpack.DefinePlugin({
      __SIMON42_VERSION__: JSON.stringify(pkg.version),
    }),
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.js$/,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.js$/,
      compressionOptions: {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
      },
      minRatio: 0.8,
      filename: '[path][base].br',
    }),
  ],
};

module.exports = config;
