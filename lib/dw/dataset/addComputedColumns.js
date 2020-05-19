import _ from 'underscore';
import arrayMin from 'd3-array/src/min';
import arrayMax from 'd3-array/src/max';
import arraySum from 'd3-array/src/sum';
import arrayMean from 'd3-array/src/mean';
import arrayMedian from 'd3-array/src/median';
import column from './column';
import columnNameToVariable from '@datawrapper/shared/columnNameToVariable';
import { Parser } from '../utils/parser';

export default function addComputedColumns(chart, dataset) {
    const virtualColumns = chart.get('metadata.describe.computed-columns', {});
    const data = dataset.list();
    const columnNameToVar = {};
    const colAggregates = {};
    const parser = new Parser();

    dataset.eachColumn(function(col) {
        if (col.isComputed) return;
        columnNameToVar[col.name()] = columnNameToVariable(col.name());
        if (col.type() === 'number') {
            const [min, max] = col.range();
            colAggregates[col.name()] = {
                min,
                max,
                sum: sum(col.values()),
                mean: mean(col.values()),
                median: median(col.values())
            };
        } else if (col.type() === 'date') {
            const [min, max] = col.range();
            colAggregates[col.name()] = { min, max };
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
        const errors = [];
        let expr;
        try {
            expr = formula.trim() ? parser.parse(formula) : null;
        } catch (e) {
            errors.push(e.message);
        }
        if (!expr)
            expr = {
                evaluate() {
                    return '';
                }
            };
        const values = data.map(function(row, index) {
            const context = {
                ROWNUMBER: index
            };
            _.each(row, function(val, key) {
                if (!columnNameToVar[key]) return;
                context[columnNameToVar[key]] = val;
                if (colAggregates[key]) {
                    Object.keys(colAggregates[key]).forEach(aggr => {
                        context[`${columnNameToVar[key]}__${aggr}`] = colAggregates[key][aggr];
                    });
                }
            });
            try {
                return expr.evaluate(context);
            } catch (error) {
                errors.push(error.message);
                return null;
            }
        });
        columnNameToVar[name] = columnNameToVariable(name);
        // apply values to rows so they can be used in formulas
        values.forEach((val, i) => {
            data[i][columnNameToVar[name]] = val;
        });
        var virtualColumn = column(
            name,
            values.map(function(v) {
                if (_.isBoolean(v)) return v ? 'yes' : 'no';
                if (_.isDate(v)) return v.toISOString();
                if (_.isNumber(v)) return String(v);
                if (_.isNull(v)) return null;
                return String(v);
            })
        );
        // aggregate values
        if (virtualColumn.type() === 'number') {
            const [min, max] = virtualColumn.range();
            colAggregates[name] = {
                min,
                max,
                sum: sum(virtualColumn.values()),
                mean: mean(virtualColumn.values()),
                median: median(virtualColumn.values())
            };
        } else if (virtualColumn.type() === 'date') {
            const [min, max] = virtualColumn.range();
            colAggregates[name] = { min, max };
        }
        virtualColumn.isComputed = true;
        virtualColumn.errors = errors;
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
