import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const output = {
    name: 'chart',
    dir: path.resolve(__dirname, 'dist'),
    compact: true
};

const babelConfig = {
    exclude: [/node_modules\/(?!(@datawrapper|svelte)\/).*/],
    extensions: ['.js', '.mjs', '.svelte']
};

module.exports = [
    {
        /* Client side Svelte Chart Component */
        input: path.resolve(__dirname, 'main.js'),
        plugins: [
            svelte({ hydratable: true }),
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                plugins: ['babel-plugin-transform-async-to-promises']
            }),
            terser()
        ],
        output: {
            format: 'iife',
            entryFileNames: 'main.js',
            ...output
        }
    },
    {
        /* Server side rendered Svelte Chart Component */
        input: path.resolve(__dirname, 'lib/Chart.svelte'),
        plugins: [
            svelte({ generate: 'ssr', hydratable: true }),
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: { node: true } }]]
            })
        ],
        output: {
            format: 'umd',
            entryFileNames: 'Chart_SSR.js',
            ...output
        }
    },
    {
        input: path.resolve(__dirname, 'lib/embed.js'),
        plugins: [
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                plugins: ['babel-plugin-transform-async-to-promises']
            }),
            terser()
        ],
        output: {
            name: 'embed',
            file: path.resolve(__dirname, 'dist/embed.js'),
            format: 'iife'
        }
    },
    {
        input: path.resolve(__dirname, 'lib/dw/index.js'),
        plugins: [
            resolve(),
            commonjs(),
            replace({
                __chartCoreVersion__: require('./package.json').version
            }),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                plugins: ['babel-plugin-transform-async-to-promises']
            }),
            terser()
        ],
        external: ['underscore', 'jquery'],
        output: {
            // name: 'dw',
            sourcemap: true,
            file: path.resolve(__dirname, 'dist/dw-2.0.min.js'),
            format: 'iife',
            globals: {
                jquery: '$',
                underscore: '_'
            }
        }
    }
];
