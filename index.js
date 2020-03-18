const path = require('path');
const fs = require('fs');

module.exports = {
    path: {
        core: __dirname,
        dist: path.join(__dirname, '/dist'),
        lib: path.join(__dirname, '/lib'),
        vendor: path.join(__dirname, '/dist/core'),
        locale: path.join(__dirname, '/dist/core/locale')
    },
    svelte: require(path.join(__dirname, '/dist/core', 'Chart_SSR.js')),
    less: path.join(__dirname, '/lib/styles.less')
};
