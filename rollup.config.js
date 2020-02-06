import outputManifest from 'rollup-plugin-output-manifest';
import { requireConfig } from '@datawrapper/shared/node/findConfig.js';

const path = require('path');
const svelte = require('rollup-plugin-svelte');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

const { general } = requireConfig();

const plugins = p => [svelte(), resolve(), commonjs(), ...p, terser()];

const output = {
    sourcemap: true,
    name: 'chart',
    dir: path.resolve(__dirname, 'dist/core'),
    compact: true
};

const babelConfig = {
    exclude: [/node_modules\/(?!(@datawrapper|svelte)\/).*/],
    extensions: ['.js', '.mjs', '.svelte']
};

module.exports = [
    {
        input: path.resolve(__dirname, 'main.js'),
        plugins: plugins([
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 2%', corejs: 3, useBuiltIns: 'entry' }]]
            }),
            outputManifest({ fileName: 'manifest.json' })
        ]),
        output: {
            format: 'esm',
            entryFileNames: 'main.[hash].js',
            ...output
        }
    },
    {
        input: path.resolve(__dirname, 'main.legacy.js'),
        plugins: plugins([
            babel({
                ...babelConfig,
                runtimeHelpers: true,
                presets: [
                    [
                        '@babel/env',
                        {
                            targets: 'last 2 versions, not IE 10, not dead',
                            corejs: 3,
                            useBuiltIns: 'entry'
                        }
                    ]
                ],
                plugins: ['@babel/plugin-transform-runtime']
            }),
            outputManifest({ fileName: 'manifest.legacy.json' })
        ]),
        output: {
            format: 'iife',
            entryFileNames: 'main.legacy.[hash].js',
            ...output
        }
    }
];
