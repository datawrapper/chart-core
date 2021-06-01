import { isArray, isUndefined, indexOf } from 'underscore';
import createEmotion from '@emotion/css/create-instance';
import get from '@datawrapper/shared/get.js';
import set from '@datawrapper/shared/set.js';

import json from './dataset/json.mjs';
import delimited from './dataset/delimited.mjs';
import { name } from './utils/index.mjs';
import events from './utils/events.mjs';
import reorderColumns from './dataset/reorderColumns.mjs';
import applyChanges from './dataset/applyChanges.mjs';
import addComputedColumns from './dataset/addComputedColumns.mjs';

let visualization;

/**
 * Chart
 * @module dw.chart
 */
export default function(attributes) {
    // private methods and properties
    let dataset;
    let theme;
    let metricPrefix;
    let locale;

    // I believe these are no longer in use anywhere.
    // TODO: Clarify & remove
    const changeCallbacks = events();
    const datasetChangeCallbacks = events();

    let _translations = {};
    let _ds;

    // public interface
    const chart = {
        /**
         * @function chart.get
         */
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

        getElementBounds(element) {
            const rootBounds = visualization.target().getBoundingClientRect();
            const elementBounds = element.getBoundingClientRect();

            return {
                top: elementBounds.top - rootBounds.top,
                right: elementBounds.right - rootBounds.left,
                bottom: elementBounds.bottom - rootBounds.top,
                left: elementBounds.left - rootBounds.left,
                width: elementBounds.width,
                height: elementBounds.height
            };
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
            return isArray(hl) && hl.length > 0;
        },

        isHighlighted(obj) {
            if (isUndefined(obj) === undefined) return false;
            const hl = chart.get('metadata.visualize.highlighted-series');
            const objName = name(obj);
            return !isArray(hl) || hl.length === 0 || indexOf(hl, objName) >= 0;
        },

        locale(_locale, callback) {
            if (arguments.length) {
                locale = _locale.replace('_', '-');
                if (!locale) locale = 'en-US';
                if (typeof callback === 'function') callback();
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

        inEditor: () => {
            try {
                return (
                    window.parent !== window &&
                    window.parent.dw &&
                    window.parent.dw.backend &&
                    window.parent.dw.backend.hooks
                );
            } catch (ex) {
                return false;
            }
        },

        render(container) {
            if (!visualization || !theme || !dataset) {
                throw new Error('cannot render the chart!');
            }

            // initialize emotion instance
            if (!this.emotion) {
                this.emotion = createEmotion({
                    key: `datawrapper-${visualization.id}`,
                    container: document.head
                });
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

        // Legacy event-handling (TODO: Remove/replace?):
        onChange: changeCallbacks.add,
        onDatasetChange: datasetChangeCallbacks.add,

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

        translations(values) {
            if (arguments.length === 0) {
                return _translations;
            }

            _translations = values;

            return this;
        },

        translate(key) {
            if (!_translations[key]) return 'MISSING: ' + key;
            var translation = _translations[key];

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
