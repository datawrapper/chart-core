import path from 'path';
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
        /* Svelte Visualization Component as web component */
        input: path.resolve(__dirname, 'web-component.js'),
        plugins: [
            svelte({
                customElement: true,
                include: /\.wc\.svelte$/
            }),
            svelte({
                customElement: false,
                exclude: /\.wc\.svelte$/,
                css: css => {
                    css.write(path.resolve(__dirname, 'dist', 'web-component.css'));
                }
            }),
            // for @emotion/css
            replace({
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            resolve(),
            commonjs(),
            production &&
                babel({
                    ...babelConfig,
                    presets: [
                        [
                            '@babel/env',
                            // needs to at least not throw syntax errors in IE
                            { targets: ['> 1%'], corejs: 3, useBuiltIns: 'entry' }
                        ]
                    ],
                    plugins: ['babel-plugin-transform-async-to-promises']
                }),
            production && terser()
        ],
        onwarn,
        output: {
            format: 'iife',
            entryFileNames: 'web-component.js',
            ...output
        }
    },
    {
        /* Client side Svelte Visualization Component */
        input: path.resolve(__dirname, 'main.js'),
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
            production && terser()
        ],
        onwarn,
        output: {
            sourcemap: true,
            file: path.resolve(__dirname, 'dist/dw-2.0.min.js'),
            format: 'iife'
        }
    }
];
