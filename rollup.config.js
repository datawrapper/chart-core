/* eslint-env node */

import path from 'path';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

const output = {
    name: 'chart',
    dir: path.resolve(__dirname, 'dist'),
    compact: true
};

const babelConfig = {
    exclude: [/node_modules\/(?!(@datawrapper|svelte)\/).*/],
    extensions: ['.js', '.mjs', '.svelte']
};

function onwarn(warning, warn) {
    if (warning.code === 'EVAL') return;
    if (warning.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') return;
    warn(warning);
}

module.exports = [
    {
        /* Client side Svelte Visualization Component */
        input: path.resolve(__dirname, 'main.mjs'),
        plugins: [
            svelte({ hydratable: true }),
            // for @emotion/css
            replace({
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            resolve(),
            commonjs(),
            production &&
                babel({
                    ...babelConfig,
                    presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                    plugins: ['babel-plugin-transform-async-to-promises']
                }),
            production && terser()
        ],
        onwarn,
        output: {
            format: 'iife',
            entryFileNames: 'main.js',
            ...output
        }
    },
    {
        /* Server side rendered Svelte Visualization Component */
        input: path.resolve(__dirname, 'lib/Visualization.svelte'),
        plugins: [
            svelte({ generate: 'ssr', hydratable: true }),
            // for @emotion/css
            replace({
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: { node: true } }]]
            })
        ],
        onwarn,
        output: {
            format: 'umd',
            entryFileNames: 'Visualization_SSR.js',
            ...output
        }
    },
    {
        input: path.resolve(__dirname, 'load-polyfills.js'),
        plugins: [
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                plugins: ['babel-plugin-transform-async-to-promises']
            }),
            production && terser()
        ],
        onwarn,
        output: {
            format: 'iife',
            entryFileNames: 'load-polyfills.js',
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
            production && terser()
        ],
        output: {
            name: 'embed',
            file: path.resolve(__dirname, 'dist/embed.js'),
            format: 'iife'
        }
    },
    {
        input: path.resolve(__dirname, 'lib/dw/index.mjs'),
        plugins: [
            resolve(),
            commonjs(),
            replace({
                __chartCoreVersion__: require('./package.json').version,
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 1%', corejs: 3, useBuiltIns: 'entry' }]],
                plugins: ['babel-plugin-transform-async-to-promises']
            }),
            production && terser()
        ],
        onwarn,
        output: {
            sourcemap: true,
            file: path.resolve(__dirname, 'dist/dw-2.0.min.js'),
            format: 'iife'
        }
    },
    {
        input: path.resolve(__dirname, 'lib/dw/index.mjs'),
        plugins: [
            alias({
                entries: [
                    {
                        find:
                            '@emotion/css/create-instance/dist/emotion-css-create-instance.cjs.js',
                        replacement: '@emotion/css/create-instance'
                    }
                ]
            }),
            resolve({
                modulesOnly: true
            }),
            commonjs(),
            replace({
                __chartCoreVersion__: require('./package.json').version,
                'process.env.NODE_ENV': JSON.stringify('production')
            })
        ],
        onwarn,
        output: {
            sourcemap: true,
            file: path.resolve(__dirname, 'dist/dw-2.0.cjs.js'),
            format: 'cjs'
        }
    }
];
