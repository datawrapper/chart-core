import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import outputManifest from 'rollup-plugin-output-manifest';
import { terser } from 'rollup-plugin-terser';
import { requireConfig } from '@datawrapper/shared/node/findConfig.js';

const { general } = requireConfig();

const output = {
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
        /* Client side Svelte Chart Component */
        input: path.resolve(__dirname, 'main.js'),
        plugins: [
            svelte({ hydratable: true }),
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [['@babel/env', { targets: '> 2%', corejs: 3, useBuiltIns: 'entry' }]]
            }),
            outputManifest({ fileName: 'manifest.json', isMerge: true }),
            terser()
        ],
        output: {
            format: 'esm',
            entryFileNames: 'main.[hash].js',
            ...output
        }
    },
    {
        /* Server side rendered Svelte Chart Component */
        input: path.resolve(__dirname, 'lib/Chart.svelte'),
        plugins: [
            svelte({ generate: 'ssr' }),
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
        /* Client side Svelte Chart Component for older browsers */
        input: path.resolve(__dirname, 'main.legacy.js'),
        plugins: [
            svelte({ hydratable: true }),
            resolve(),
            commonjs(),
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
            outputManifest({ fileName: 'manifest.json', isMerge: true }),
            terser()
        ],
        output: {
            format: 'iife',
            entryFileNames: 'main.legacy.[hash].js',
            ...output
        }
    }
];
