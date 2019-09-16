const path = require('path');
const svelte = require('rollup-plugin-svelte');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

const plugins = p => [svelte(), resolve({ browser: true }), commonjs(), ...p, terser()];

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
            })
        ]),
        output: {
            format: 'esm',
            entryFileNames: '[name].js',
            ...output
        }
    },
    {
        input: path.resolve(__dirname, 'main.js'),
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
            })
        ]),
        output: {
            format: 'iife',
            entryFileNames: '[name].legacy.js',
            ...output
        }
    }
];
