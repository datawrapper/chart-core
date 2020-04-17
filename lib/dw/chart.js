import _ from 'underscore';
import $ from 'jquery';
import get from '@datawrapper/shared/get';
import set from '@datawrapper/shared/set';
import significantDimension from '@datawrapper/shared/significantDimension';
import columnNameToVariable from '@datawrapper/shared/columnNameToVariable';
import column from '@datawrapper/shared/dataset/column';
import json from '@datawrapper/shared/dataset/json';
import delimited from '@datawrapper/shared/dataset/delimited';
import { name } from './utils';

export default function(attributes) {
    // private methods and properties
    let dataset;
    let theme;
    let visualization;
    let metricPrefix;
    let locale;
    const changeCallbacks = $.Callbacks();
    const datasetChangeCallbacks = $.Callbacks();

    var _ds;

    // public interface
    const chart = {
        // returns an attribute
        get(key, _default) {
            return get(attributes, key, _default);
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
                    : reorderColumns(applyChanges(addComputedColumns(_ds)));
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
                if (window.Globalize) {
                    if (Object.hasOwnProperty.call(Globalize.cultures, locale)) {
                        Globalize.culture(locale);
                        if (typeof callback === 'function') callback();
                    } else {
                        $.getScript(
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

    function reorderColumns(dataset) {
        const order = chart.get('metadata.data.column-order', []);
        if (order.length && order.length === dataset.numColumns()) {
            dataset.columnOrder(order);
        }
        return dataset;
    }

    function applyChanges(dataset) {
        const changes = chart.get('metadata.data.changes', []);
        const transpose = chart.get('metadata.data.transpose', false);
        // apply changes
        changes.forEach(change => {
            let row = 'row';
            let column = 'column';
            if (transpose) {
                row = 'column';
                column = 'row';
            }

            if (dataset.hasColumn(change[column])) {
                if (change[row] === 0) {
                    if (change.previous) {
                        var oldTitle = dataset.column(change[column]).title();
                        if (oldTitle !== change.previous) return;
                    }
                    dataset.column(change[column]).title(change.value);
                } else {
                    if (change.previous) {
                        var curValue = dataset.column(change[column]).raw(change[row] - 1);
                        if (curValue !== change.previous) return;
                    }
                    dataset.column(change[column]).raw(change[row] - 1, change.value);
                }
            }
        });

        // overwrite column types
        const columnFormats = chart.get('metadata.data.column-format', {});
        _.each(columnFormats, function(columnFormat, key) {
            if (columnFormat.type && dataset.hasColumn(key) && columnFormat.type !== 'auto') {
                dataset.column(key).type(columnFormat.type);
            }
            if (columnFormat['input-format'] && dataset.hasColumn(key)) {
                dataset
                    .column(key)
                    .type(true)
                    .format(columnFormat['input-format']);
            }
        });
        return dataset;
    }

    function addComputedColumns(dataset) {
        const virtualColumns = chart.get('metadata.describe.computed-columns', {});
        const data = dataset.list();
        const columnNameToVar = {};
        const colAggregates = {};

        dataset.eachColumn(function(col) {
            if (col.isComputed) return;
            columnNameToVar[col.name()] = columnNameToVariable(col.name());
            if (col.type() === 'number') {
                colAggregates[col.name()] = {
                    min: min(col.values()),
                    max: max(col.values()),
                    sum: sum(col.values()),
                    mean: mean(col.values()),
                    median: median(col.values())
                };
            }
        });

        _.each(virtualColumns, addComputedColumns);

        return dataset;

        function addComputedColumns(formula, name) {
            const datefmt = function(d) {
                return (
                    d.getFullYear() +
                    '-' +
                    leftPad(1 + d.getMonth(), 2, 0) +
                    '-' +
                    leftPad(1 + d.getDate(), 2, 0)
                );
            };
            const values = data
                .map(function(row, index) {
                    var context = [];
                    context.push('var __row = ' + index + ';');
                    _.each(row, function(val, key) {
                        if (!columnNameToVar[key]) return;
                        context.push(
                            'var ' + columnNameToVar[key] + ' = ' + JSON.stringify(val) + ';'
                        );
                        if (dataset.column(key).type() === 'number') {
                            context.push(
                                'var ' +
                                    columnNameToVar[key] +
                                    '__sum = ' +
                                    colAggregates[key].sum +
                                    ';'
                            );
                            context.push(
                                'var ' +
                                    columnNameToVar[key] +
                                    '__min = ' +
                                    colAggregates[key].min +
                                    ';'
                            );
                            context.push(
                                'var ' +
                                    columnNameToVar[key] +
                                    '__max = ' +
                                    colAggregates[key].max +
                                    ';'
                            );
                            context.push(
                                'var ' +
                                    columnNameToVar[key] +
                                    '__mean = ' +
                                    colAggregates[key].mean +
                                    ';'
                            );
                            context.push(
                                'var ' +
                                    columnNameToVar[key] +
                                    '__median = ' +
                                    colAggregates[key].median +
                                    ';'
                            );
                        }
                    });
                    context.push('var max = Math.max, min = Math.min;');
                    // console.log(context.join('\n'));
                    return function() {
                        try {
                            // eslint-disable-next-line
                            return eval(this.context.join('\n') + '\n' + formula);
                        } catch (e) {
                            console.warn(e);
                            return 'n/a';
                        }
                    }.call({ context: context });
                })
                .map(function(v) {
                    if (_.isBoolean(v)) return v ? 'yes' : 'no';
                    if (_.isDate(v)) return datefmt(v);
                    if (_.isNumber(v)) return '' + v;
                    return String(v);
                });
            var virtualColumn = column(name, values);
            virtualColumn.isComputed = true;
            dataset.add(virtualColumn);
        }

        // some d3 stuff
        function min(array) {
            var i = -1;
            var n = array.length;
            var a, b;
            if (arguments.length === 1) {
                while (++i < n)
                    // eslint-disable-next-line
                    if ((b = array[i]) != null && b >= b) {
                        a = b;
                        break;
                    }
                while (++i < n) if ((b = array[i]) != null && a > b) a = b;
            }
            return a;
        }
        function max(array) {
            var i = -1;
            var n = array.length;
            var a, b;
            if (arguments.length === 1) {
                while (++i < n)
                    // eslint-disable-next-line
                    if ((b = array[i]) != null && b >= b) {
                        a = b;
                        break;
                    }
                while (++i < n) if ((b = array[i]) != null && b > a) a = b;
            }
            return a;
        }
        function sum(array) {
            var s = 0;
            var n = array.length;
            var a;
            var i = -1;
            if (arguments.length === 1) {
                while (++i < n) if (numeric((a = +array[i]))) s += a;
            }
            return s;
        }
        function mean(array) {
            var s = 0;
            var n = array.length;
            var a;
            var i = -1;
            var j = n;
            while (++i < n)
                if (numeric((a = number(array[i])))) s += a;
                else --j;
            if (j) return s / j;
        }
        function median(array) {
            var numbers = [];
            var n = array.length;
            var a;
            var i = -1;
            if (arguments.length === 1) {
                while (++i < n) if (numeric((a = number(array[i])))) numbers.push(a);
            }
            if (numbers.length) return quantile(numbers.sort(ascending), 0.5);
        }
        function quantile(values, p) {
            var H = (values.length - 1) * p + 1;
            var h = Math.floor(H);
            var v = +values[h - 1];
            var e = H - h;
            return e ? v + e * (values[h] - v) : v;
        }
        function number(x) {
            return x === null ? NaN : +x;
        }
        function numeric(x) {
            return !isNaN(x);
        }
        function ascending(a, b) {
            return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        }

        function leftPad(s, l, pad) {
            s = String(s);
            while (s.length < l) s = String(pad) + s;
            return s;
        }
    }

    return chart;
}
