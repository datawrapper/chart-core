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
import { width, outerHeight, getNonChartHeight, getMaxChartHeight } from './utils';

let visualization;

export default function(attributes) {
    // private methods and properties
    let dataset;
    let theme;
    let metricPrefix;
    let locale;
    let __translations = {};
    let __inEditor;

    const changeCallbacks = events();
    const datasetChangeCallbacks = events();
    const __assets = {};

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

        setMetadata(key, value) {
            return chart.set(`metadata.${key}`, value);
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
            if (arguments.length) {
                locale = _locale.replace('_', '-');
                if (!locale) locale = 'en-US';
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

        inEditor: () => __inEditor,

        render(container, visualization, isIframe, inEditor) {
            if (!visualization) {
                throw new Error('Cannot render the chart: visualization was not registered');
            }

            if (!theme) {
                throw new Error('Cannot render the chart: theme was not registered');
            }

            if (!dataset) {
                throw new Error('Cannot render the chart: dataset not registered');
            }

            chart.vis(visualization);
            visualization.chart(chart);

            __inEditor = inEditor;

            // compute chart dimensions
            const w = width(container);
            const h = isIframe
                ? getMaxChartHeight()
                : chart.getMetadata('publish.chart-height') || 400;

            // only render if iframe has valid dimensions
            if (chart.getHeightMode() === 'fixed' ? w <= 0 : w <= 0 || h <= 0) {
                console.warn('Aborting chart rendering due to invalid container dimensions');
                return;
            }

            // really needed?
            container.parentElement.classList.add('vis-' + visualization.id);

            visualization.reset(container);
            visualization.size(w, h);
            visualization.__init();
            visualization.render(container);

            initResizeHandler(container, visualization);
            isIframe && postMessage(container, chart, visualization, inEditor);

            function initResizeHandler(container, vis) {
                let reloadTimer;
                function renderLater() {
                    clearTimeout(reloadTimer);
                    reloadTimer = setTimeout(function() {
                        chart.render(container, visualization, isIframe, inEditor);
                    }, 100);
                }

                let currentWidth = width(container);

                const resize = () => {
                    chart.vis().fire('resize');
                    renderLater();
                };

                const resizeFixed = () => {
                    const w = width(container);
                    if (currentWidth !== w) {
                        currentWidth = w;
                        resize();
                    }
                };

                const fixedHeight = chart.getHeightMode() === 'fixed';
                const resizeHandler = fixedHeight ? resizeFixed : resize;
                window.addEventListener('resize', resizeHandler);
            }

            function postMessage(container, chart, vis, inEditor) {
                let desiredHeight;

                if (chart.getHeightMode() === 'fit') {
                    if (inEditor || !chart.getMetadata('publish.chart-height')) return;
                    desiredHeight = getNonChartHeight() + chart.getMetadata('publish.chart-height');
                } else {
                    desiredHeight = outerHeight(document.querySelector('html'), true);
                }

                // datawrapper responsive embed
                window.parent.postMessage(
                    {
                        'datawrapper-height': {
                            [chart.get().id]: desiredHeight
                        }
                    },
                    '*'
                );

                // Google AMP
                window.parent.postMessage(
                    {
                        sentinel: 'amp',
                        type: 'embed-size',
                        height: desiredHeight
                    },
                    '*'
                );

                // Medium
                window.parent.postMessage(
                    JSON.stringify({
                        src: window.location.toString(),
                        context: 'iframe.resize',
                        height: desiredHeight
                    }),
                    '*'
                );

                if (typeof window.datawrapperHeightCallback === 'function') {
                    window.datawrapperHeightCallback(desiredHeight);
                }
            }
        },

        getHeightMode() {
            const themeFitChart =
                get(visualization.theme(), 'vis.d3-pies.fitchart', false) &&
                ['d3-pies', 'd3-donuts', 'd3-multiple-pies', 'd3-multiple-donuts'].indexOf(
                    visualization.meta.id
                ) > -1;
            const urlParams = new URLSearchParams(window.location.search);
            const urlFitChart = !!urlParams.get('fitchart');

            return themeFitChart || urlFitChart || visualization.meta.height !== 'fixed'
                ? 'fit'
                : 'fixed';
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
        },

        asset(id, asset) {
            if (arguments.length === 1) {
                return __assets[id];
            }

            __assets[id] = asset;
        },

        translations(values) {
            if (arguments.length === 0) {
                return __translations;
            }

            __translations = values;

            return this;
        },

        translate(key) {
            if (!__translations[key]) return 'MISSING: ' + key;
            var translation = __translations[key];

            if (typeof translation === 'string' && arguments.length > 1) {
                // replace $0, $1 etc with remaining arguments
                translation = translation.replace(/\$(\d)/g, (m, i) => {
                    i = 1 + Number(i);
                    if (arguments[i] === undefined) return m;
                    return arguments[i];
                });
            }

            return translation;
        }
    };

    return chart;
}
