module.exports = { getDependencies };

/**
 * Options object
 *
 * @typedef {Object} Options
 * @property {string} locale - Chart locale
 * @property {Object} dependencies - Map of required dependencies
 * @property {Object} libraries - Map of required libraries
 */

/**
 * Function do get all required global dependencies of a visualization.
 *
 * @param {Options} options
 * @returns {string[]} List of required js files
 */
function getDependencies({ locale, dependencies = { globalize: true, jquery: true }, libraries }) {
    const scripts = [];
    locale = locale.replace('_', '-');

    Object.entries(dependencies)
        .filter(([, value]) => value)
        .forEach(([key, value]) => {
            switch (key) {
                case 'globalize':
                    scripts.push(
                        'globalize/globalize.min.js',
                        `globalize/cultures/globalize.culture.${locale}.js`
                    );
                    break;
                case 'jquery':
                    scripts.push('jquery.dw.min.js');
                    break;
                case 'numeral':
                /* @todo */
                case 'dayjs':
                /* @todo */
                default:
                    break;
            }
        });

    scripts.push('document-register-element.js', 'underscore.min.js', 'dw-2.0.min.js');

    return scripts;
}
