import { TEOF } from '@datawrapper/expr-eval/src/token';
import { TokenStream } from '@datawrapper/expr-eval/src/token-stream';
import { ParserState } from '@datawrapper/expr-eval/src/parser-state';
import {
    add,
    sub,
    mul,
    div,
    mod,
    equal,
    notEqual,
    greaterThan,
    lessThan,
    greaterThanEqual,
    lessThanEqual,
    andOperator,
    orOperator,
    // inOperator,
    // sinh,
    // cosh,
    // tanh,
    // asinh,
    // acosh,
    // atanh,
    log10,
    neg,
    not,
    trunc,
    random,
    // factorial,
    // gamma,
    stringOrArrayLength,
    // hypot,
    condition,
    roundTo,
    // setVar,
    arrayIndex,
    max,
    min,
    sum,
    arrayMap,
    arrayFold,
    arrayFilter,
    // stringOrArrayIndexOf,
    // arrayJoin,
    sign,
    // cbrt,
    // expm1,
    log1p,
    log2
} from '@datawrapper/expr-eval/src/functions';

import range from 'underscore/modules/range';
// expression
import evaluate from '@datawrapper/expr-eval/src/evaluate';

function Expression(tokens, parser) {
    this.tokens = tokens;
    this.parser = parser;
    this.unaryOps = parser.unaryOps;
    this.binaryOps = parser.binaryOps;
    this.ternaryOps = parser.ternaryOps;
    this.functions = parser.functions;
}

Expression.prototype.evaluate = function(values) {
    values = values || {};
    return evaluate(this.tokens, this, values);
};

Expression.prototype.variables = function() {
    return (this.tokens || []).filter(token => token.type === 'IVAR').map(token => token.value);
};

function trim(s) {
    return s.trim();
}

// parser
export function Parser(options) {
    this.options = options || {};
    this.unaryOps = {
        SIN: Math.sin,
        COS: Math.cos,
        TAN: Math.tan,
        ASIN: Math.asin,
        ACOS: Math.acos,
        ATAN: Math.atan,
        SQRT: Math.sqrt,
        LOG: Math.log,
        LOG2: Math.log2 || log2,
        LN: Math.log,
        LG: Math.log10 || log10,
        LOG10: Math.log10 || log10,
        LOG1P: Math.log1p || log1p,
        ABS: Math.abs,
        CEIL: Math.ceil,
        TRIM: trim,
        FLOOR: Math.floor,
        ISNULL(a) {
            return a === null;
        },
        TRUNC: Math.trunc || trunc,
        '-': neg,
        '+': Number,
        EXP: Math.exp,
        NOT: not,
        LENGTH: stringOrArrayLength,
        '!': not,
        SIGN: Math.sign || sign,
        TEXT(value) {
            if (isDate(value)) {
                return value.toISOString();
            }
            return String(value);
        },
        NUMBER: Number
    };

    this.binaryOps = {
        '+': add,
        '-': sub,
        '*': mul,
        '/': div,
        '%': mod,
        '^': Math.pow,
        '==': equal,
        '!=': notEqual,
        '>': greaterThan,
        '<': lessThan,
        '>=': greaterThanEqual,
        '<=': lessThanEqual,
        and: andOperator,
        or: orOperator,
        in: (needle, haystack) =>
            Array.isArray(haystack) ? haystack.includes(needle) : String(haystack).includes(needle),
        '[': arrayIndex
    };

    this.ternaryOps = {
        '?': condition
    };

    const isDate = d => d instanceof Date && !isNaN(d);
    const asDate = d => {
        if (isDate(d)) return d;
        try {
            const n = new Date(d);
            if (isDate(n)) return n;
            return null;
        } catch (e) {
            return null;
        }
    };
    function filterNumbers(array) {
        return (arguments.length === 1 && Array.isArray(array) ? array : Array.from(arguments))
            .slice(0)
            .filter(v => !isNaN(v) && Number.isFinite(v));
    }
    // fallback regular expressions for browsers without
    // support for the unicode flag //u
    let PROPER_REGEX = /\w*/g;
    let TITLE_REGEX = /\w\S*/g;

    try {
        PROPER_REGEX = new RegExp('\\p{L}*', 'ug');
        TITLE_REGEX = new RegExp('[\\p{L}\\p{N}]\\S*', 'ug');
    } catch (e) {}

    this.functions = {
        // ---- LOGICAL FUNCTIONS ----
        IF: condition,

        // ---- MATH FUNCTIONS ----
        RANDOM: random,
        // fac: factorial,
        MIN() {
            const v = filterNumbers.apply(this, arguments);
            return min(v);
        },
        MAX() {
            return max(filterNumbers.apply(this, arguments));
        },
        SUM() {
            return sum(filterNumbers.apply(this, arguments));
        },
        MEAN() {
            const v = filterNumbers.apply(this, arguments);
            return sum(v) / v.length;
        },
        MEDIAN() {
            const v = filterNumbers.apply(this, arguments).sort((a, b) => a - b);
            const i = Math.floor(v.length / 2);
            return v.length % 2 === 1 ? v[i] : (v[i - 1] + v[i]) * 0.5;
        },
        POW: Math.pow,
        ATAN2: Math.atan2,
        ROUND: roundTo,

        // ---- STRING FUNCTIONS ----
        CONCAT() {
            return Array.from(arguments).join('');
        },
        TRIM: trim,
        SUBSTR(s, start, end) {
            return s.substr(start, end);
        },

        REPLACE(str, search, replace) {
            return str.replace(search, replace);
        },
        SPLIT(str, sep) {
            return String(str).split(sep);
        },
        LOWER(str) {
            return String(str).toLowerCase();
        },
        UPPER(str) {
            return String(str).toUpperCase();
        },
        PROPER(str) {
            return String(str).replace(
                PROPER_REGEX,
                txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },
        TITLE(str) {
            return String(str).replace(
                TITLE_REGEX,
                txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },

        // ARRAY FUNCTIONS
        SORT(arr, asc = true, key = null) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to SORT is not an array');
            }
            return arr.slice(0).sort((a, b) => {
                a = typeof key === 'string' ? a[key] : typeof key === 'function' ? key(a) : a;
                b = typeof key === 'string' ? b[key] : typeof key === 'function' ? key(b) : b;
                return (a > b ? 1 : a < b ? -1 : 0) * (asc ? 1 : -1);
            });
        },
        SLICE(arr, start, end) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to SLICE is not an array');
            }
            return arr.slice(start, end);
        },
        JOIN(arr, sep, sepLast = null) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to JOIN is not an array');
            }
            return sepLast
                ? [arr.slice(0, arr.length - 1).join(sep), arr[arr.length - 1]].join(sepLast)
                : arr.join(sep);
        },
        MAP: arrayMap,
        FOLD: arrayFold,
        FILTER: arrayFilter,
        PLUCK(arr, key) {
            if (!Array.isArray(arr)) throw new Error('First argument to PLUCK is not an array');
            return arr.map(item => item[key]);
        },
        INDEXOF(arr, target) {
            if (!Array.isArray(arr)) arr = String(arr);
            return arr.indexOf(target);
        },
        RANGE: range,
        FIND(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to FIND is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to FIND is not a function');
            const k = arr.length;
            for (let i = 0; i < k; i++) {
                if (test(arr[i])) return arr[i];
            }
            return null;
        },
        EVERY(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to EVERY is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to EVERY is not a function');
            const k = arr.length;
            let every = true;
            for (let i = 0; i < k; i++) {
                every = every && test(arr[i]);
                if (!every) return false;
            }
            return true;
        },
        SOME(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to SOME is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to SOME is not a function');
            const k = arr.length;
            let some = false;
            for (let i = 0; i < k; i++) {
                some = some || test(arr[i]);
                if (some) return true;
            }
            return false;
        },

        // ---- DATE FUNCTIONS ----
        DATE() {
            if (arguments.length > 1) {
                // "correct" month argument (1=january, etc)
                arguments[1] = arguments[1] - 1;
            }
            return new Date(...arguments);
        },
        YEAR(d) {
            d = asDate(d);
            return d ? d.getFullYear() : null;
        },
        MONTH(d) {
            d = asDate(d);
            return d ? d.getMonth() + 1 : null;
        },
        DAY(d) {
            d = asDate(d);
            return d ? d.getDate() : null;
        },
        WEEKDAY(d) {
            d = asDate(d);
            return d ? d.getDay() : null;
        },
        HOURS(d) {
            d = asDate(d);
            return d ? d.getHours() : null;
        },
        MINUTES(d) {
            d = asDate(d);
            return d ? d.getMinutes() : null;
        },
        SECONDS(d) {
            d = asDate(d);
            return d ? d.getSeconds() : null;
        },
        // the number of days between two dates
        DATEDIFF(d1, d2) {
            d1 = asDate(d1);
            d2 = asDate(d2);
            return d1 && d2 ? (d2.getTime() - d1.getTime()) / 864e5 : null;
        },
        // the number of seconds between two dates
        TIMEDIFF(d1, d2) {
            d1 = asDate(d1);
            d2 = asDate(d2);
            return d1 && d2 ? (d2.getTime() - d1.getTime()) / 1000 : null;
        }
    };

    this.consts = {
        E: Math.E,
        PI: Math.PI,
        TRUE: true,
        FALSE: false,
        NA: Number.NaN,
        NULL: Number.NaN
    };
}

Parser.prototype.parse = function(expr) {
    var instr = [];
    var parserState = new ParserState(this, new TokenStream(this, expr), {
        allowMemberAccess: true
    });

    parserState.parseExpression(instr);
    parserState.expect(TEOF, 'EOF');

    return new Expression(instr, this);
};

Parser.prototype.evaluate = function(expr, variables) {
    return this.parse(expr).evaluate(variables);
};

var sharedParser = new Parser();

Parser.parse = function(expr) {
    return sharedParser.parse(expr);
};

Parser.evaluate = function(expr, variables) {
    return sharedParser.parse(expr).evaluate(variables);
};

Parser.keywords = [
    'ABS',
    'ACOS',
    'ACOSH',
    'and',
    'ASIN',
    'ASINH',
    'ATAN',
    'ATAN2',
    'ATANH',
    'CBRT',
    'CEIL',
    'CONCAT',
    'COS',
    'COSH',
    'DATEDIFF',
    'DAY',
    'E',
    'EVERY',
    'EXP',
    'EXPM1',
    'FIND',
    'FLOOR',
    'HOURS',
    'IF',
    'in',
    'INDEXOF',
    'ISNULL',
    'JOIN',
    'LENGTH',
    'LN',
    'LOG',
    'LOG10',
    'LOG1P',
    'LOG2',
    'LOWER',
    'MAP',
    'MAX',
    'MEAN',
    'MEDIAN',
    'MIN',
    'MINUTES',
    'MONTH',
    'NOT',
    'NOT',
    'or',
    'PI',
    'PLUCK',
    'POW',
    'PROPER',
    'RANDOM',
    'RANGE',
    'REPLACE',
    'ROUND',
    'SECONDS',
    'SIGN',
    'SIN',
    'SINH',
    'SLICE',
    'SOME',
    'SORT',
    'SPLIT',
    'SQRT',
    'SUBSTR',
    'SUM',
    'TAN',
    'TANH',
    'TIMEDIFF',
    'TITLE',
    'TRIM',
    'TRUNC',
    'UPPER',
    'WEEKDAY',
    'YEAR'
];

var optionNameMap = {
    '+': 'add',
    '-': 'subtract',
    '*': 'multiply',
    '/': 'divide',
    '%': 'remainder',
    '^': 'power',
    '!': 'factorial',
    '<': 'comparison',
    '>': 'comparison',
    '<=': 'comparison',
    '>=': 'comparison',
    '==': 'comparison',
    '!=': 'comparison',
    '||': 'concatenate',
    AND: 'logical',
    OR: 'logical',
    NOT: 'logical',
    IN: 'logical',
    '?': 'conditional',
    ':': 'conditional',
    '=': 'assignment',
    '[': 'array',
    '()=': 'fndef'
};

function getOptionName(op) {
    return Object.prototype.hasOwnProperty.call(optionNameMap, op) ? optionNameMap[op] : op;
}

Parser.prototype.isOperatorEnabled = function(op) {
    var optionName = getOptionName(op);
    var operators = this.options.operators || {};

    return !(optionName in operators) || !!operators[optionName];
};
