/* globals dw,_, $ */
// Every visualization must extend this class.
// It provides the basic API between the chart template
// page and the visualization class.

import get from '@datawrapper/shared/get';
import column from '@datawrapper/shared/dataset/column';

const base = function() {}.prototype;

Object.assign(base, {
    // called before rendering
    __init() {
        this.__renderedDfd = $.Deferred();
        this.__rendered = false;
        this.__colors = {};
        this.__callbacks = {};

        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage('datawrapper:vis:init', '*');
        }
        return this;
    },

    render(el) {
        $(el).html('implement me!');
    },

    theme(theme) {
        if (!arguments.length) return this.__theme;
        this.__theme = theme;
        const attrProperties = ['horizontalGrid', 'verticalGrid', 'yAxis', 'xAxis'];
        _.each(attrProperties, function(prop) {
            // convert camel-case to dashes
            if (Object.prototype.hasOwnProperty.call(theme, prop)) {
                for (const key in theme[prop]) {
                    // dasherize
                    const lkey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    if (!Object.prototype.hasOwnProperty.call(theme[prop], lkey)) {
                        theme[prop][lkey] = theme[prop][key];
                    }
                }
            }
        });
        return this;
    },

    size(width, height) {
        const me = this;
        if (!arguments.length) return [me.__w, me.__h];
        me.__w = width;
        me.__h = height;
        return me;
    },

    /**
     * short-cut for this.chart.get('metadata.visualize.*')
     */
    get(str, _default) {
        return this.chart().get('metadata.visualize' + (str ? '.' + str : ''), _default);
    },

    notify(str) {
        if (dw.backend && _.isFunction(dw.backend.notify)) {
            return dw.backend.notify(str);
        } else {
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage('notify:' + str, '*');
            } else if (window.console) {
                // eslint-disable-next-line
                console.log(str);
            }
        }
    },

    /**
     * returns a signature for this visualization which will be used
     * to test correct rendering of the chart in different browsers.
     * See raphael-chart.js for example implementation.
     */
    signature() {
        // nothing here, please overload
    },

    translate(str) {
        var locale = this.meta.locale;
        return locale[str] || str;
    },

    checkBrowserCompatibility() {
        return true;
    },

    chart(chart) {
        var me = this;
        if (!arguments.length) return me.__chart;
        me.dataset = chart.dataset();
        me.theme(chart.theme());
        me.__chart = chart;
        var columnFormat = chart.get('metadata.data.column-format', {});
        var ignore = {};
        _.each(columnFormat, function(format, key) {
            ignore[key] = !!format.ignore;
        });
        if (me.dataset.filterColumns) me.dataset.filterColumns(ignore);
        return me;
    },

    axes(returnAsColumns, noCache) {
        const me = this;
        if (!noCache && me.__axisCache) {
            return me.__axisCache[returnAsColumns ? 'axesAsColumns' : 'axes'];
        }

        const dataset = me.dataset;
        const usedColumns = {};
        const axes = {};
        const axesAsColumns = {};
        const errors = [];

        // get user preference
        const userAxes = me.chart().get('metadata.axes', {});
        _.each(me.meta.axes, (o, key) => {
            if (userAxes[key]) {
                let columns = userAxes[key];
                if (columnExists(columns)) {
                    axes[key] = columns;
                    // mark columns as used
                    if (!_.isArray(columns)) columns = [columns];
                    _.each(columns, function(column) {
                        usedColumns[column] = true;
                    });
                }
            }
        });

        var checked = [];
        // auto-populate remaining axes
        _.each(me.meta.axes, (axisDef, key) => {
            function checkColumn(col) {
                return !usedColumns[col.name()] && _.indexOf(axisDef.accepts, col.type()) >= 0;
            }
            function errMissingColumn() {
                var msg = dw.backend
                    ? dw.backend.messages.insufficientData
                    : 'The visualization needs at least one column of the type %type to populate axis %key';
                errors.push(msg.replace('%type', axisDef.accepts).replace('%key', key));
            }
            function remainingRequiredColumns(accepts) {
                // returns how many required columns there are for the remaining axes
                // either an integer or "multiple" if there's another multi-column axis coming up
                function equalAccepts(a1, a2) {
                    if (typeof a1 === 'undefined' && typeof a2 !== 'undefined') return false;
                    if (typeof a2 === 'undefined' && typeof a1 !== 'undefined') return false;
                    if (a1.length !== a2.length) return false;

                    for (let i = 0; i < a1.length; i++) {
                        if (a2.indexOf(a1[i]) === -1) return false;
                    }
                    return true;
                }

                let res = 0;
                _.each(me.meta.axes, function(axisDef, key) {
                    if (checked.indexOf(key) > -1) return;
                    if (!equalAccepts(axisDef.accepts, accepts)) return;
                    if (typeof res === 'string') return;
                    if (axisDef.optional) return;
                    if (axisDef.multiple) {
                        res = 'multiple';
                        return;
                    }
                    res += 1;
                });
                return res;
            }
            function remainingAvailableColumns(dataset, i) {
                let count = 0;
                dataset.eachColumn((c, index) => {
                    if (checkColumn(c)) {
                        count++;
                    }
                });
                return count;
            }
            checked.push(key);
            if (axes[key]) return; // user has defined this axis already
            if (axisDef.optional) {
                // chart settings may override this
                if (
                    axisDef.overrideOptionalKey &&
                    me.chart().get('metadata.' + axisDef.overrideOptionalKey, false)
                ) {
                    // now the axis is mandatory
                    axisDef.optional = false;
                }
            }
            if (!axisDef.optional) {
                // we only populate mandatory axes
                if (!axisDef.multiple) {
                    const accepted = _.filter(dataset.columns(), checkColumn);
                    let firstMatch;
                    if (axisDef.preferred) {
                        // axis defined a regex for testing column names
                        const regex = new RegExp(axisDef.preferred, 'i');
                        firstMatch = _.find(accepted, function(col) {
                            return (
                                regex.test(col.name()) ||
                                (col.title() !== col.name() && regex.test(col.title()))
                            );
                        });
                    }
                    // simply use first colulmn accepted by axis
                    if (!firstMatch) firstMatch = accepted[0];
                    if (firstMatch) {
                        usedColumns[firstMatch.name()] = true; // mark column as used
                        axes[key] = firstMatch.name();
                    } else {
                        // try to auto-populate missing text column
                        if (_.indexOf(axisDef.accepts, 'text') >= 0) {
                            // try using the first text column in the dataset instead
                            const acceptedAllowUsed = _.filter(dataset.columns(), function(col) {
                                return _.indexOf(axisDef.accepts, col.type()) >= 0;
                            });
                            if (acceptedAllowUsed.length) {
                                axes[key] = acceptedAllowUsed[0].name();
                            } else {
                                // no other text column in dataset, so genetate one with A,B,C,D...
                                const col = column(
                                    key,
                                    _.map(_.range(dataset.numRows()), function(i) {
                                        return (
                                            (i > 25 ? String.fromCharCode(64 + i / 26) : '') +
                                            String.fromCharCode(65 + (i % 26))
                                        );
                                    }),
                                    'text'
                                );
                                dataset.add(col);
                                me.chart().dataset(dataset);
                                usedColumns[col.name()] = true;
                                axes[key] = col.name();
                            }
                        } else {
                            errMissingColumn();
                        }
                    }
                } else {
                    const required = remainingRequiredColumns(axisDef.accepts);
                    let available = remainingAvailableColumns(dataset);

                    // fill axis with all accepted columns
                    axes[key] = [];
                    dataset.eachColumn(function(c) {
                        if (required === 'multiple' && axes[key].length) return;
                        else if (available <= required) return;

                        if (checkColumn(c)) {
                            usedColumns[c.name()] = true;
                            axes[key].push(c.name());
                            available--;
                        }
                    });

                    if (!axes[key].length) {
                        errMissingColumn();
                    }
                }
            } else {
                axes[key] = false;
            }
        });

        if (errors.length) {
            me.notify(errors.join('<br />'));
        }

        _.each(axes, (columns, key) => {
            if (!_.isArray(columns)) {
                axesAsColumns[key] = columns !== false ? me.dataset.column(columns) : null;
            } else {
                axesAsColumns[key] = [];
                _.each(columns, function(column, i) {
                    axesAsColumns[key][i] = column !== false ? me.dataset.column(column) : null;
                });
            }
        });

        me.__axisCache = {
            axes: axes,
            axesAsColumns: axesAsColumns
        };

        function columnExists(columns) {
            if (!_.isArray(columns)) columns = [columns];
            for (var i = 0; i < columns.length; i++) {
                if (!dataset.hasColumn(columns[i])) return false;
            }
            return true;
        }

        return me.__axisCache[returnAsColumns ? 'axesAsColumns' : 'axes'];
    },

    keys() {
        const axesDef = this.axes();
        if (axesDef.labels) {
            const lblCol = this.dataset.column(axesDef.labels);
            const fmt = this.chart().columnFormatter(lblCol);
            const keys = [];
            lblCol.each(val => {
                keys.push(String(fmt(val)));
            });
            return keys;
        }
        return [];
    },

    keyLabel(key) {
        return key;
    },

    /*
     * called by the core whenever the chart is re-drawn
     * without reloading the page
     */
    reset() {
        this.clear();
        $('#chart')
            .html('')
            .off('click')
            .off('mousemove')
            .off('mouseenter')
            .off('mouseover');
        $('.chart .filter-ui').remove();
        $('.chart .legend').remove();
    },

    clear() {},

    renderingComplete() {
        if (window.parent && window.parent.postMessage) {
            setTimeout(function() {
                window.parent.postMessage('datawrapper:vis:rendered', '*');
            }, 200);
        }
        this.__renderedDfd.resolve();
        this.__rendered = true;
        this.postRendering();
    },

    postRendering() {
        const theme = this.theme();

        function renderWatermark() {
            const text = get(theme, 'options.watermark.text', 'CONFIDENTIAL');

            $('.watermark', '#chart').remove();
            $('.dw-chart-body').append(
                '<div class="export-text watermark noscript"><span>' + text + '</span></div>'
            );
            $('.watermark', '#chart').css('font-size', '6px');

            const $watermark = $('.watermark', '#chart');
            let width = $watermark[0].getBoundingClientRect().width;
            const space = Math.sqrt(
                Math.pow(window.innerHeight, 2) + Math.pow(window.innerWidth, 2)
            );
            const fontSize = 6 * ((space * 0.7) / width);
            const angle = Math.atan(window.innerHeight / window.innerWidth);
            const transform = 'rotate(' + -angle + 'rad)';

            $watermark.attr('data-rotate', (-1 * angle * 180) / Math.PI).css('font-size', fontSize);

            const height = $watermark[0].getBoundingClientRect().height;
            width = $watermark[0].getBoundingClientRect().width;
            const diffx = (space - width) * Math.cos(angle);
            const diffy = (space - width) * Math.sin(angle);

            $watermark
                .css('transform', transform)
                .css('bottom', -height / 2 + diffy / 2 + 'px')
                .css('left', diffx / 2 + 'px');
        }

        if (theme && get(theme, 'options.watermark')) {
            renderWatermark();
            $(window)
                .off('resize', renderWatermark)
                .on('resize', renderWatermark);
        }
    },

    rendered() {
        return this.__renderedDfd.promise();
    },

    /*
     * smart rendering means that a visualization is able to
     * re-render itself without having to instantiate it again
     */
    supportsSmartRendering() {
        return false;
    },

    /*
     * this hook is used for optimizing the thumbnails on Datawrapper
     * the function is expected to return the svg element that contains
     * the elements to be rendered in the thumbnails
     */
    _svgCanvas() {
        return false;
    },

    colorMap() {
        return color => {
            this.__colors[color] = 1;
            if (window.__dw && window.__dwColorMap) {
                return window.__dwColorMap(color);
            }
            return color;
        };
    },

    colorsUsed() {
        return Object.keys(this.__colors);
    },

    /**
     * register an event listener for custom vis events
     */
    on(eventType, callback) {
        if (!this.__callbacks[eventType]) {
            this.__callbacks[eventType] = [];
        }
        this.__callbacks[eventType].push(callback);
    },

    /**
     * fire a custom vis event
     */
    fire(eventType, data) {
        if (this.__callbacks[eventType]) {
            this.__callbacks[eventType].forEach(function(cb) {
                if (typeof cb === 'function') cb(data);
            });
        }
    }
});

export default base;
