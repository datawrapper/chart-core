/*
 * column abstracts the functionality of each column
 * of a dataset. A column has a type (text|number|date).
 *
 * API:
 *
 * column.name() ... returns the name (string)
 * column.type() ... return column type (string)
 * column.length ... number of rows (number)
 * column.val(i) ... parsed value in row i
 * column.each(func) ... apply function to each value
 * column.raw() ... access raw, unparsed values
 *
 */

import _ from 'underscore';
import columnTypes from './columnTypes';
import purifyHtml from '@datawrapper/shared/purifyHtml';

/**
 * @class dw.Column
 */
export default function Column(name, rows, type) {
    function notEmpty(d) {
        return d !== null && d !== undefined && d !== '';
    }

    function guessType(sample) {
        if (_.every(rows, _.isNumber)) return columnTypes.number();
        if (_.every(rows, _.isDate)) return columnTypes.date();
        // guessing column type by counting parsing errors
        // for every known type
        const types = [columnTypes.date(sample), columnTypes.number(sample), columnTypes.text()];
        let type;
        const tolerance = 0.1 * rows.filter(notEmpty).length; // allowing 10% mis-parsed values

        _.each(rows, function(val) {
            _.each(types, function(t) {
                t.parse(val);
            });
        });
        _.every(types, function(t) {
            if (t.errors() < tolerance) type = t;
            return !type;
        });
        if (_.isUndefined(type)) type = types[2]; // default to text;
        return type;
    }

    // we pick random 200 non-empty values for column type testing
    const sample = _.shuffle(_.range(rows.length))
        .filter(function(i) {
            return notEmpty(rows[i]);
        })
        .slice(0, 200)
        .map(function(i) {
            return rows[i];
        });

    type = type ? columnTypes[type](sample) : guessType(sample);

    let range, sum, mean, median;
    const origRows = rows.slice(0);
    let title;

    // public interface
    var column = {
        // column name (used for reference in chart metadata)
        name() {
            if (arguments.length) {
                name = arguments[0];
                return column;
            }
            return purifyHtml(name);
        },

        // column title (used for presentation)
        title() {
            if (arguments.length) {
                title = arguments[0];
                return column;
            }
            return purifyHtml(title || name);
        },

        /**
         * number of rows
         */
        length: rows.length,

        /**
         * returns ith row of the col, parsed
         *
         * @param i
         * @param unfiltered  if set to true, precedent calls of filterRows are ignored
         */
        val(i, unfiltered) {
            if (!arguments.length) return undefined;
            var r = unfiltered ? origRows : rows;
            if (i < 0) i += r.length;
            return type.parse(_.isDate(r[i]) || _.isNumber(r[i]) ? r[i] : purifyHtml(r[i]));
        },

        /*
         * returns an array of parsed values
         */
        values(unfiltered) {
            var r = unfiltered ? origRows : rows;
            r = _.map(r, function(d) {
                return _.isDate(d) || _.isNumber(d) ? d : purifyHtml(d);
            });
            return _.map(r, type.parse);
        },

        /**
         * apply function to each value
         */
        each(f) {
            for (var i = 0; i < rows.length; i++) {
                f(column.val(i), i);
            }
        },

        // access to raw values
        raw(i, val) {
            if (!arguments.length)
                return rows.map(d => (_.isDate(d) || _.isNumber(d) ? d : purifyHtml(d)));
            if (arguments.length === 2) {
                rows[i] = val;
                return column;
            }
            return _.isDate(rows[i]) || _.isNumber(rows[i]) ? rows[i] : purifyHtml(rows[i]);
        },

        /**
         * if called with no arguments, this returns the column type name
         * if called with true as argument, this returns the column type (as object)
         * if called with a string as argument, this sets a new column type
         */
        type(o) {
            if (o === true) return type;
            if (_.isString(o)) {
                if (columnTypes[o]) {
                    type = columnTypes[o](sample);
                    return column;
                } else {
                    throw new Error('unknown column type: ' + o);
                }
            }
            return type.name();
        },

        // [min,max] range
        range() {
            if (!type.toNum) return false;
            if (!range) {
                range = [Number.MAX_VALUE, -Number.MAX_VALUE];
                column.each(function(v) {
                    v = type.toNum(v);
                    if (!_.isNumber(v) || _.isNaN(v)) return;
                    if (v < range[0]) range[0] = v;
                    if (v > range[1]) range[1] = v;
                });
                range[0] = type.fromNum(range[0]);
                range[1] = type.fromNum(range[1]);
            }
            return range;
        },
        // sum of values
        sum() {
            if (!type.toNum) return false;
            if (sum === undefined) {
                sum = 0;
                column.each(function(v) {
                    const n = type.toNum(v);
                    if (Number.isFinite(n)) {
                        sum += n;
                    }
                });
                sum = type.fromNum(sum);
            }
            return sum;
        },

        mean() {
            if (!type.toNum) return false;
            if (mean === undefined) {
                mean = 0;
                let count = 0;
                column.each(function(v) {
                    const n = type.toNum(v);
                    if (Number.isFinite(n)) {
                        mean += n;
                        count++;
                    }
                });
                mean = type.fromNum(mean / count);
            }
            return mean;
        },

        median() {
            if (!type.toNum) return false;
            if (median === undefined) {
                const arr = column.values().map(type.toNum);
                median = type.fromNum(d3Median(arr));
            }
            return median;
        },

        // remove rows from column, keep those whose index
        // is within @r
        filterRows(r) {
            rows = [];
            if (arguments.length) {
                _.each(r, function(i) {
                    rows.push(origRows[i]);
                });
            } else {
                rows = origRows.slice(0);
            }
            column.length = rows.length;
            // invalidate range and total
            range = sum = mean = median = undefined;
            return column;
        },

        toString() {
            return name + ' (' + type.name() + ')';
        },

        indexOf(val) {
            return _.find(_.range(rows.length), function(i) {
                return column.val(i) === val;
            });
        },

        limitRows(numRows) {
            if (origRows.length > numRows) {
                origRows.length = numRows;
                rows.length = numRows;
                column.length = numRows;
            }
        },

        /**
         * add one or more new rows
         * @param {...*} values
         */
        add(...values) {
            origRows.push(...values);
            rows.push(...values);
            column.length = rows.length;
        },

        /**
         * create a copy of the column
         * @returns {dw.Column}
         */
        clone() {
            return Column(name, rows.slice(), type.name());
        },

        /**
         * delete all rows
         */
        clear() {
            rows.splice(0);
            column.length = rows.length;
        }
    };
    // backwards compatibility
    column.total = column.sum;
    return column;
}

// some d3 stuff
function d3Median(array) {
    var numbers = [];
    var n = array.length;
    var a;
    var i = -1;
    if (arguments.length === 1) {
        while (++i < n) if (d3Numeric((a = d3Number(array[i])))) numbers.push(a);
    }
    if (numbers.length) return d3Quantile(numbers.sort(d3Ascending), 0.5);
}
function d3Quantile(values, p) {
    var H = (values.length - 1) * p + 1;
    var h = Math.floor(H);
    var v = +values[h - 1];
    var e = H - h;
    return e ? v + e * (values[h] - v) : v;
}
function d3Number(x) {
    return x === null ? NaN : +x;
}
function d3Numeric(x) {
    return !isNaN(x);
}
function d3Ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
