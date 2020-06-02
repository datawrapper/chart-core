import { TEOF } from 'expr-eval/src/token';
import { TokenStream } from 'expr-eval/src/token-stream';
import { ParserState } from 'expr-eval/src/parser-state';
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
    // arrayMap,
    // arrayFold,
    // arrayFilter,
    // stringOrArrayIndexOf,
    // arrayJoin,
    sign,
    // cbrt,
    // expm1,
    log1p,
    log2
} from 'expr-eval/src/functions';

// expression
import evaluate from 'expr-eval/src/evaluate';

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

    const DATEDIFF = (this.functions = {
        RANDOM: random,
        // fac: factorial,
        MIN: min,
        MAX: max,
        POW: Math.pow,
        ATAN2: Math.atan2,
        IF: condition,
        ROUND: roundTo,
        INDEXOF(arr, target) {
            if (!Array.isArray(arr)) arr = String(arr);
            return arr.indexOf(target);
        },
        CONCAT() {
            return Array.from(arguments).join('');
        },
        DATE() {
            if (arguments.length > 1) {
                // "correct" month argument (1=january, etc)
                arguments[1] = arguments[1] - 1;
            }
            return new Date(...arguments);
        },
        TRIM: trim,
        SUBSTR(s, start, end) {
            return s.substr(start, end);
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
        REPLACE(str, search, replace) {
            return str.replace(search, replace);
        },
        SPLIT(str, sep) {
            return String(str).split(sep);
        },
        JOIN(arr, sep) {
            if (!Array.isArray(arr)) {
                throw new Error('Second argument to join is not an array');
            }
            return arr.join(sep);
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
    });

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
        allowMemberAccess: false
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
    'NOT',
    'and',
    'or',
    'in',
    'ABS',
    'ACOS',
    'ACOSH',
    'ASIN',
    'ASINH',
    'ATAN',
    'ATANH',
    'CBRT',
    'CEIL',
    'COS',
    'COSH',
    'EXP',
    'EXPM1',
    'FLOOR',
    'LENGTH',
    'LN',
    'LOG',
    'LOG10',
    'LOG2',
    'LOG1P',
    'NOT',
    'ROUND',
    'SIGN',
    'SIN',
    'SINH',
    'SQRT',
    'TAN',
    'TANH',
    'TRUNC',
    'RANDOM',
    'MIN',
    'MAX',
    'POW',
    'ATAN2',
    'IF',
    'CONCAT',
    'TRIM',
    'SUBSTR',
    'YEAR',
    'MONTH',
    'DAY',
    'HOURS',
    'MINUTES',
    'SECONDS',
    'WEEKDAY',
    'SPLIT',
    'JOIN',
    'INDEXOF',
    'ISNULL',
    'REPLACE',
    'PI',
    'E',
    'DATEDIFF',
    'TIMEDIFF'
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
    return optionNameMap.hasOwnProperty(op) ? optionNameMap[op] : op;
}

Parser.prototype.isOperatorEnabled = function(op) {
    var optionName = getOptionName(op);
    var operators = this.options.operators || {};

    return !(optionName in operators) || !!operators[optionName];
};