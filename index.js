const path = require('path');
const fs = require('fs');

const polyfillDirectory = path.join(
    path.dirname(require.resolve('@datawrapper/polyfills/package.json')),
    'polyfills'
);

module.exports = {
    path: {
        core: __dirname,
        dist: path.join(__dirname, '/dist'),
        lib: path.join(__dirname, '/lib'),
        locale: path.join(__dirname, '/dist/locale')
    },
    svelte: require(path.join(__dirname, '/dist', 'Chart_SSR.js')),
    less: path.join(__dirname, '/lib/styles.less'),
    polyfills: fs.readdirSync(polyfillDirectory).map(file => path.join(polyfillDirectory, file))
};
