import _ from 'underscore';
import get from '@datawrapper/shared/get';
import set from '@datawrapper/shared/set';
import significantDimension from '@datawrapper/shared/significantDimension';
import columnNameToVariable from '@datawrapper/shared/columnNameToVariable';
import column from './dataset/column';
import json from './dataset/json';
import delimited from './dataset/delimited';
import { name } from './utils';
import events from './utils/events';
import { loadScript } from '@datawrapper/shared/fetch';
import reorderColumns from './dataset/reorderColumns';
import applyChanges from './dataset/applyChanges';
import addComputedColumns from './dataset/addComputedColumns';

let visualization;

export default function(attributes) {
    // private methods and properties
    let dataset;
    let theme;
    let metricPrefix;
    let locale;
    const changeCallbacks = events();
    const datasetChangeCallbacks = events();

    var _ds;

    // public interface
    const chart = {
        // returns an attribute
        get(key, _default) {
            return get(attributes, key, _default);
        },

        getMetadata(key, _default) {
            return get(attributes, `metadata.${key}`, _default);
        },

        set(key, value) {
            if (set(attributes, key, value)) {
                changeCallbacks.fire(chart, key, value);
            }
            return this;
        },

        // loads the dataset and returns a deferred
        load(csv, externalData) {
            const dsopts = {
                firstRowIsHeader: chart.get('metadata.data.horizontal-header', true),
                transpose: chart.get('metadata.data.transpose', false)
            };

            if ((csv || csv === '') && !externalData) dsopts.csv = csv;
            else dsopts.url = externalData || 'data.csv';

            const datasource = chart.get('metadata.data.json') ? json(dsopts) : delimited(dsopts);

            return datasource
                .dataset()
                .then(ds => {
                    this.dataset(ds);
                    datasetChangeCallbacks.fire(chart, ds);
                    return ds;
                })
                .catch(e => {
                    console.error('could not fetch datasource', e);
                });
        },

        // returns the dataset
        dataset(ds) {
            if (arguments.length) {
                if (ds !== true) _ds = ds;
                dataset = chart.get('metadata.data.json')
                    ? _ds
                    : reorderColumns(chart, applyChanges(chart, addComputedColumns(chart, _ds)));
                if (ds === true) return dataset;
                return chart;
            }
            return dataset;
        },

        // sets or gets the theme
        theme(_theme) {
            if (arguments.length) {
                theme = _theme;
                return chart;
            }
            return theme || {};
        },

        // sets or gets the visualization
        vis(_vis) {
            if (arguments.length) {
                visualization = _vis;
                visualization.chart(chart);
                return chart;
            }
            return visualization;
        },

        // returns true if the user has set any highlights
        hasHighlight() {
            var hl = chart.get('metadata.visualize.highlighted-series');
            return _.isArray(hl) && hl.length > 0;
        },

        isHighlighted(obj) {
            if (_.isUndefined(obj) === undefined) return false;
            const hl = chart.get('metadata.visualize.highlighted-series');
            const objName = name(obj);
            return !_.isArray(hl) || hl.length === 0 || _.indexOf(hl, objName) >= 0;
        },

        locale(_locale, callback) {
            /* global Globalize */
            if (arguments.length) {
                locale = _locale.replace('_', '-');
                if (!locale) locale = 'en-US';

                if (window.Globalize) {
                    if (Object.hasOwnProperty.call(Globalize.cultures, locale)) {
                        Globalize.culture(locale);
                        if (typeof callback === 'function') callback();
                    } else {
                        loadScript(
                            '/static/vendor/globalize/cultures/globalize.culture.' + locale + '.js',
                            function() {
                                chart.locale(locale);
                                if (typeof callback === 'function') callback();
                            }
                        );
                    }
                }
                return chart;
            }
            return locale;
        },

        metricPrefix(_metricPrefix) {
            if (arguments.length) {
                metricPrefix = _metricPrefix;
                return chart;
            }
            return metricPrefix;
        },

        formatValue(val, full, round) {
            let format = chart.get('metadata.describe.number-format');
            const div = Number(chart.get('metadata.describe.number-divisor'));
            const append = chart.get('metadata.describe.number-append', '').replace(' ', '&nbsp;');
            const prepend = chart
                .get('metadata.describe.number-prepend', '')
                .replace(' ', '&nbsp;');

            if (div !== 0) val = Number(val) / Math.pow(10, div);
            if (format !== '-') {
                if (round || val === Math.round(val)) format = format.substr(0, 1) + '0';
                val = Globalize.format(val, format);
            } else if (div !== 0) {
                val = val.toFixed(1);
            }
            return full ? prepend + val + append : val;
        },

        render(container) {
            if (!visualization || !theme || !dataset) {
                throw new Error('cannot render the chart!');
            }
            visualization.chart(chart);
            visualization.__init();
            container.parentElement.classList.add('vis-' + visualization.id);
            container.parentElement.classList.add('theme-' + theme.id);
            // a little hack to add support for older visualizations
            container.get = () => container;
            visualization.render(container);
        },

        attributes(attrs) {
            if (arguments.length) {
                attributes = attrs;
                return chart;
            }
            return attributes;
        },

        onChange: changeCallbacks.add,

        onDatasetChange: datasetChangeCallbacks.add,

        columnFormatter(column) {
            // pull output config from metadata
            // return column.formatter(config);
            var colFormat = chart.get('metadata.data.column-format', {});
            colFormat = _.clone(
                colFormat[column.name()] || { type: 'auto', 'number-format': 'auto' }
            );

            if (
                column.type() === 'number' &&
                (colFormat === 'auto' ||
                    colFormat['number-format'] === undefined ||
                    colFormat['number-format'] === 'auto')
            ) {
                var values = column.values();
                var dim = significantDimension(values);
                colFormat['number-format'] = 'n' + Math.max(0, dim);
            }
            return column.type(true).formatter(colFormat);
        },

        dataCellChanged(column, row) {
            const changes = chart.get('metadata.data.changes', []);
            const transpose = chart.get('metadata.data.transpose', false);
            let changed = false;

            const order = dataset.columnOrder();
            column = order[column];

            changes.forEach(change => {
                let r = 'row';
                let c = 'column';
                if (transpose) {
                    r = 'column';
                    c = 'row';
                }
                if (column === change[c] && change[r] === row) {
                    changed = true;
                }
            });
            return changed;
        }
    };

    return chart;
}
