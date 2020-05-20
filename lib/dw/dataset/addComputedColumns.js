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
    let virtualColumns = chart.get('metadata.describe.computed-columns', {});
    if (!Array.isArray(virtualColumns)) {
        // convert to array
        virtualColumns = Object.keys(virtualColumns).reduce((acc, cur) => {
            acc.push({
                name: cur,
                formula: virtualColumns[cur]
            });
            return acc;
        }, []);
    }
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

    // initialize meta objects for each computed column
    const vNamesToVar = virtualColumns.reduce((acc, val, idx) => {
        const key = columnNameToVariable(val.name);
        return acc.set(key, {
            name: val.name,
            index: dataset.numColumns() + idx,
            key,
            formula: val.formula,
            visited: 0,
            computed: false,
            dependsOn: []
        });
    }, new Map());

    // parse formulas to detect cross-column dependencies
    virtualColumns.forEach(({ formula, name }) => {
        const col = vNamesToVar.get(columnNameToVariable(name));
        if (formula.trim()) {
            try {
                col.expr = parser.parse(formula.trim());
                col.expr.variables().forEach(v => {
                    v = v.split('__')[0];
                    if (vNamesToVar.has(v)) {
                        col.dependsOn.push(vNamesToVar.get(v));
                    }
                });
            } catch (e) {
                col.error = e.message;
                console.error('err', e);
            }
        } else {
            col.expr = {
                evaluate() {
                    return '';
                },
                variables() {
                    return [];
                }
            };
        }
    });

    // sort computed columns in order of their dependency graph
    // circular dependencies are not allowed and will result in
    // errors
    const computedColumns = [];

    let curIter = 0;
    while (vNamesToVar.size) {
        if (curIter > 1000) break;
        vNamesToVar.forEach(col => {
            curIter++;
            try {
                visit(col, []);
            } catch (e) {
                if (e.message.startsWith('circular-dependency')) {
                    col.error = e.message;
                    // col.computed = true;
                    vNamesToVar.delete(col.key);
                    computedColumns.push(col);
                } else {
                    throw e;
                }
            }
        });
    }

    // compute in order of dependencies
    computedColumns.forEach(col => {
        if (col.error) {
            const errorCol = column(
                col.name,
                data.map(d => 'null')
            );
            errorCol.isComputed = true;
            errorCol.formula = col.formula;
            errorCol.errors = [
                {
                    message: col.error,
                    row: 'all'
                }
            ];
            col.column = errorCol;
        } else {
            col.column = addComputedColumn(col);
        }
    });

    // add to dataset in original order
    computedColumns.sort((a, b) => a.index - b.index).forEach(({ column }) => dataset.add(column));

    return dataset;

    function visit(col, stack) {
        if (col.computed) return;
        stack.push(col.name);
        for (let i = 0; i < stack.length - 2; i++) {
            if (col.name === stack[i]) {
                throw new Error('circular-dependency: ' + stack.join(' ‣ '));
            }
        }
        col.curIter = curIter;
        let allComputed = true;
        for (let i = 0; i < col.dependsOn.length; i++) {
            allComputed = allComputed && col.dependsOn[i].computed;
        }
        if (allComputed) {
            // no dependencies, we can compute this now
            col.computed = true;
            computedColumns.push(col);
            vNamesToVar.delete(col.key);
        } else {
            if (stack.length < 10) {
                col.dependsOn.forEach(c => {
                    visit(c, stack.slice(0));
                });
            }
        }
    }

    function addComputedColumn({ formula, name, expr, error }) {
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
        if (error) {
            errors.push({ row: 'all', message: error });
        }

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
                errors.push({ message: error.message, row: index });
                return null;
            }
        });
        columnNameToVar[name] = columnNameToVariable(name);
        // apply values to rows so they can be used in formulas
        values.forEach((val, i) => {
            data[i][name] = val;
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
        virtualColumn.formula = formula;
        return virtualColumn;
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
