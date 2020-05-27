import column from '../dataset/column';
import purifyHtml from '@datawrapper/shared/purifyHtml';
import significantDimension from '@datawrapper/shared/significantDimension';
import tailLength from '@datawrapper/shared/tailLength';
import round from '@datawrapper/shared/round';
import smartRound from '@datawrapper/shared/smartRound';
import equalish from '@datawrapper/shared/equalish';
import clone from '@datawrapper/shared/clone';
import { outerHeight, getNonChartHeight } from './getNonChartHeight';
import dateFormat from './dateFormat';
import htmlTemplate from './htmlTemplate';
import _ from 'underscore';

export {
    purifyHtml,
    significantDimension,
    tailLength,
    round,
    smartRound,
    equalish,
    clone,
    getNonChartHeight,
    outerHeight,
    dateFormat,
    htmlTemplate
};

/*
 * returns the min/max range of a set of columns
 */
export function minMax(columns) {
    const minmax = [Number.MAX_VALUE, -Number.MAX_VALUE];
    columns.forEach(column => {
        minmax[0] = Math.min(minmax[0], column.range()[0]);
        minmax[1] = Math.max(minmax[1], column.range()[1]);
    });
    return minmax;
}

/**
 * DEPRECATED
 * returns a function for formating a date based on the
 * input format of the dates in the dataset
 */
export function longDateFormat(column) {
    /* global Globalize */
    return function(d) {
        if (column.type() === 'date') {
            switch (column.type(true).precision()) {
                case 'year':
                    return d.getFullYear();
                case 'quarter':
                    return d.getFullYear() + ' Q' + (d.getMonth() / 3 + 1);
                case 'month':
                    return Globalize.format(d, 'MMM yy');
                case 'day':
                    return Globalize.format(d, 'MMM d');
                case 'minute':
                    return Globalize.format(d, 't');
                case 'second':
                    return Globalize.format(d, 'T');
            }
        } else {
            return d;
        }
    };
}

/*
 * returns a new column with all column names as values
 */
export function columnNameColumn(columns) {
    const names = columns.map(col => col.title());
    return column('', names);
}

export function name(obj) {
    return _.isFunction(obj.name) ? obj.name() : _.isString(obj.name) ? obj.name : obj;
}

export function getMaxChartHeight() {
    var maxH = window.innerHeight - 8;
    maxH -= getNonChartHeight();
    return maxH;
}

export function nearest(array, value) {
    let minDiff = Number.MAX_VALUE;
    let minDiffVal;
    array.forEach(v => {
        var d = Math.abs(v - value);
        if (d < minDiff) {
            minDiff = d;
            minDiffVal = v;
        }
    });
    return minDiffVal;
}

export function metricSuffix(locale) {
    switch (locale.substr(0, 2).toLowerCase()) {
        case 'de':
            return { 3: ' Tsd.', 6: ' Mio.', 9: ' Mrd.', 12: ' Bio.' };
        case 'fr':
            return { 3: ' mil', 6: ' Mio', 9: ' Mrd' };
        case 'es':
            return { 3: ' Mil', 6: ' millón' };
        default:
            return { 3: 'k', 6: 'M', 9: ' bil' };
    }
}

export function magnitudeRange(minmax) {
    return (
        Math.round(Math.log(minmax[1]) / Math.LN10) - Math.round(Math.log(minmax[0]) / Math.LN10)
    );
}

export function logTicks(min, max) {
    const e0 = Math.round(Math.log(min) / Math.LN10);
    const e1 = Math.round(Math.log(max) / Math.LN10);
    return _.range(e0, e1).map(exp => Math.pow(10, exp));
}

/* globals getComputedStyle */

export function height(element) {
    return parseFloat(getComputedStyle(element, null).height.replace('px', ''));
}

export function width(element) {
    return parseFloat(getComputedStyle(element, null).width.replace('px', ''));
}

export function addClass(element, className) {
    if (element) element.classList.add(className);
}

export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

export function remove(elementOrSelector) {
    const element =
        typeof elementOrSelector === 'string'
            ? document.querySelector(elementOrSelector)
            : elementOrSelector;
    if (element) element.parentElement.removeChild(element);
}

export function domReady(callback) {
    if (/complete|interactive|loaded/.test(document.readyState)) {
        // dom is already loaded
        callback();
    } else {
        // wait for dom to load
        window.addEventListener('DOMContentLoaded', event => {
            callback();
        });
    }
}
