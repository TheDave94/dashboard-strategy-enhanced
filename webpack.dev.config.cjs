// Webpack 5 development build — single-bundle, source-maps inline,
// no chunk-splitting (LimitChunkCountPlugin) so the loader picks up
// every change in one file under `dist/`.

'use strict';

// Node 18 fallback — see webpack.config.cjs for context.
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

const path = require('path');
const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
const config = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/dashboard-enhanced-strategy.ts',
  output: {
    clean: true,
    filename: 'dashboard-enhanced-strategy.js',
    path: path.resolve(__dirname, 'dist'),
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
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
};

module.exports = config;
