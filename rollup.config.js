import outputManifest from 'rollup-plugin-output-manifest';
import { requireConfig } from '@datawrapper/shared/node/findConfig.js';

const path = require('path');
const svelte = require('rollup-plugin-svelte');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

const { general } = requireConfig();

console.log(
    process.env,
    'moduleDirectory:',
    path.resolve(process.env.INIT_CWD, 'node_modules'),
    path.resolve(process.env.INIT_CWD.replace(process.env.npm_package_name), 'node_modules')
);

const plugins = p => [
    svelte(),
    resolve({
        customResolveOptions: {
            paths: [general.localPluginRoot],
            moduleDirectory: [
                path.resolve(process.env.INIT_CWD, 'node_modules'),
                path.resolve(__dirname, 'node_modules')
            ]
        }
    }),
    commonjs(),
    ...p,
    terser()
];

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
            entryFileNames: '[name].[hash].js',
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
            }),
            outputManifest({ fileName: 'manifest.legacy.json' })
        ]),
        output: {
            format: 'iife',
            entryFileNames: '[name].legacy.[hash].js',
            ...output
        }
    }
];
