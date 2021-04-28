module.exports = { getDependencies };

/**
 * Options object
 *
 * @typedef {Object} Options
 * @property {string} locale - Chart locale
 * @property {Object} dependencies - Map of required dependencies
 */

/**
 * Function do get all required global dependencies of a visualization.
 *
 * @param {Options} options
 * @returns {string[]} List of required js files
 */
function getDependencies({ locale, dependencies = { jquery: true } }) {
    const scripts = [];
    locale = locale.replace('_', '-');

    Object.entries(dependencies)
        .filter(([, value]) => value)
        .forEach(([key, value]) => {
            switch (key) {
                case 'jquery':
                    scripts.push('jquery.min.js');
                    break;
                default:
                    break;
            }
        });

    scripts.push('underscore.min.js', 'dw-2.0.min.js');

    return scripts;
}
