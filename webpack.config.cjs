if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const compression_webpack_plugin_1 = __importDefault(require("compression-webpack-plugin"));
const config = {
    mode: 'production',
    entry: './src/simon42-dashboard-strategy.ts',
    output: {
        clean: true,
        filename: 'simon42-dashboard-strategy.js',
        chunkFilename: 'simon42-dashboard-strategy-[name].[contenthash:8].js',
        path: path_1.default.resolve(__dirname, 'dist'),
        // publicPath must match the HA resource URL path for async chunk loading
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
            //   core          → Registry, Utils, OverviewViewStrategy, Cards (home screen)
            //   views         → LightsView, CoversView, SecurityView, BatteriesView, RoomView
            //   editor        → StrategyEditor + js-yaml (on-demand only)
            cacheGroups: {
                lit: {
                    test: /[\\/]node_modules[\\/](?:lit|@lit|lit-html|lit-element)[\\/]/,
                    name: 'lit',
                    chunks: 'async',
                    enforce: true,
                    priority: 20,
                },
                core: {
                    test: /[\\/]src[\\/](?:Registry|utils|translations|sections|cards|views[\\/]OverviewViewStrategy)/,
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
        new compression_webpack_plugin_1.default({
            algorithm: 'gzip',
            test: /\.js$/,
            minRatio: 0.8,
        }),
        new compression_webpack_plugin_1.default({
            algorithm: 'brotliCompress',
            test: /\.js$/,
            compressionOptions: { params: { [zlib_1.default.constants.BROTLI_PARAM_QUALITY]: 11 } },
            minRatio: 0.8,
            filename: '[path][base].br',
        }),
    ],
};
exports.default = config;
