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
    // arrayIndex,
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

function trim(s) {
    return s.trim();
}

// parser
export function Parser(options) {
    this.options = options || {};
    this.unaryOps = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        sqrt: Math.sqrt,
        log: Math.log,
        log2: Math.log2 || log2,
        ln: Math.log,
        lg: Math.log10 || log10,
        log10: Math.log10 || log10,
        log1p: Math.log1p || log1p,
        abs: Math.abs,
        ceil: Math.ceil,
        trim,
        floor: Math.floor,
        round: Math.round,
        trunc: Math.trunc || trunc,
        '-': neg,
        '+': Number,
        exp: Math.exp,
        not: not,
        length: stringOrArrayLength,
        '!': not,
        sign: Math.sign || sign
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
        in: (needle, haystack) => String(haystack).includes(needle)
    };

    this.ternaryOps = {
        '?': condition
    };

    const isDate = d => d instanceof Date && !isNaN(d);

    this.functions = {
        random: random,
        // fac: factorial,
        min: min,
        max: max,
        pow: Math.pow,
        atan2: Math.atan2,
        if: condition,
        roundTo: roundTo,
        concat() {
            return Array.from(arguments).join('');
        },
        trim,
        substr(s, start, end) {
            return s.substr(start, end);
        },
        year(d) {
            return isDate(d) ? d.getFullYear() : null;
        },
        month(d) {
            return isDate(d) ? d.getMonth() + 1 : null;
        },
        day(d) {
            return isDate(d) ? d.getDate() : null;
        },
        hours(d) {
            return isDate(d) ? d.getHours() : null;
        },
        minutes(d) {
            return isDate(d) ? d.getMinutes() : null;
        },
        seconds(d) {
            return isDate(d) ? d.getSeconds() : null;
        }
    };

    this.consts = {
        E: Math.E,
        PI: Math.PI,
        true: true,
        false: false
    };
}

Parser.prototype.parse = function(expr) {
    var instr = [];
    var parserState = new ParserState(this, new TokenStream(this, expr), {
        allowMemberAccess: this.options.allowMemberAccess
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
    and: 'logical',
    or: 'logical',
    not: 'logical',
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
