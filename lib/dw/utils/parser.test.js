/*
 * test our own custom methods and operators for `expr-eval`
 */
import test from 'ava';
import { Parser } from './parser';

const parser = new Parser();

test('in operator', t => {
    const expr = parser.parse('needle in haystack ? "y" : "n"');
    t.is(expr.evaluate({ needle: 'foo', haystack: 'lot of foo here' }), 'y');
    t.is(expr.evaluate({ needle: 'bar', haystack: 'lot of foo here' }), 'n');
});

test('!operator', t => {
    const expr = parser.parse('!(needle in haystack) ? "y" : "n"');
    t.is(expr.evaluate({ needle: 'foo', haystack: 'lot of foo here' }), 'n');
    t.is(expr.evaluate({ needle: 'bar', haystack: 'lot of foo here' }), 'y');
});

test('not function', t => {
    const expr = parser.parse('NOT(needle in haystack) ? "y" : "n"');
    t.is(expr.evaluate({ needle: 'foo', haystack: 'lot of foo here' }), 'n');
    t.is(expr.evaluate({ needle: 'bar', haystack: 'lot of foo here' }), 'y');
});

test('substr function', t => {
    const expr = parser.parse('SUBSTR(name, 0, 5)');
    t.is(expr.evaluate({ name: 'Datawrapper' }), 'Dataw');
});

test('variable substr', t => {
    const expr = parser.parse('SUBSTR(name, start, len)');
    t.is(expr.evaluate({ name: 'Datawrapper', start: 0, len: 6 }), 'Datawr');
    t.is(expr.evaluate({ name: 'Datawrapper', start: 3, len: 6 }), 'awrapp');
});

test('concat function', t => {
    const expr = parser.parse('CONCAT(first, " ", last)');
    t.is(expr.evaluate({ first: 'Lorem', last: 'Ipsum' }), 'Lorem Ipsum');
});

test('trim function', t => {
    const expr = parser.parse('TRIM(name)');
    t.is(expr.evaluate({ name: '  spaces\t\t' }), 'spaces');
});

test('trim function without brackets', t => {
    const expr = parser.parse('TRIM name');
    t.is(expr.evaluate({ name: '  spaces\t\t' }), 'spaces');
});

test('TRUE', t => {
    const expr = parser.parse('TRUE');
    t.is(expr.evaluate({ name: '' }), true);
});

test('NOT TRUE', t => {
    const expr = parser.parse('NOT TRUE');
    t.is(expr.evaluate({ name: '' }), false);
});

test('IF(TRUE', t => {
    const expr = parser.parse('IF(TRUE, "yes", "no")');
    t.is(expr.evaluate({ name: '' }), 'yes');
});

test('FALSE', t => {
    const expr = parser.parse('FALSE');
    t.is(expr.evaluate({ name: '' }), false);
});

test('TRUE and FALSE', t => {
    const expr = parser.parse('TRUE and FALSE');
    t.is(expr.evaluate({ name: '' }), false);
});

test('true', t => {
    const expr = parser.parse('true');
    t.is(expr.evaluate({ true: 12 }), 12);
    t.throws(() => expr.evaluate({ foo: 12 }));
});

test('ABS()', t => {
    const expr = parser.parse('ABS(a)');
    t.is(expr.evaluate({ a: -12 }), 12);
    t.is(expr.evaluate({ a: 10 }), 10);
});

test('ABS', t => {
    const expr = parser.parse('ABS a');
    t.is(expr.evaluate({ a: -12 }), 12);
    t.is(expr.evaluate({ a: 10 }), 10);
});

test('ROUND()', t => {
    const expr = parser.parse('ROUND(a)');
    t.is(expr.evaluate({ a: -12.345 }), -12);
    t.is(expr.evaluate({ a: 10.56 }), 11);
});

test('ROUND(a,1)', t => {
    const expr = parser.parse('ROUND(a, 1)');
    t.is(expr.evaluate({ a: -12.345 }), -12.3);
    t.is(expr.evaluate({ a: 10.56 }), 10.6);
});

test('year() function', t => {
    const expr = parser.parse('YEAR(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 2020);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 2017);
    t.is(expr.evaluate({ date: '2017-06-23' }), 2017);
});

test('month() function', t => {
    const expr = parser.parse('MONTH(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 2);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 5);
});

test('day() function', t => {
    const expr = parser.parse('DAY(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 1);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 14);
});

test('hours() function', t => {
    const expr = parser.parse('HOURS(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 0);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14, 18, 30, 5) }), 18);
});

test('sin a^b', t => {
    const expr = parser.parse('SIN a^b');
    t.is(expr.evaluate({ a: 4, b: 2 }), Math.sin(Math.pow(4, 2)));
});

test('(sin a)^b', t => {
    const expr = parser.parse('(SIN a)^b');
    t.is(expr.evaluate({ a: 4, b: 2 }), Math.pow(Math.sin(4), 2));
});

test('sin(a)', t => {
    const expr = parser.parse('SIN(a)');
    t.is(expr.evaluate({ a: 4 }), Math.sin(4));
});

test('v1+v2+v3', t => {
    const expr = parser.parse('v1+v2+v3');
    t.is(expr.evaluate({ v1: 1, v2: 2, v3: 3 }), 6);
});

test('REPLACE()', t => {
    const expr = parser.parse('REPLACE(REPLACE(country, "Yemen", ":ye:"), "Zambia", ":zm:")');
    t.is(expr.evaluate({ country: 'Yemen' }), ':ye:');
    t.is(expr.evaluate({ country: 'Zambia' }), ':zm:');
});

test('ISNULL', t => {
    const expr = parser.parse('ISNULL value');
    t.is(expr.evaluate({ value: 12 }), false);
    t.is(expr.evaluate({ value: 0 }), false);
    t.throws(() => expr.evaluate({ value: undefined }));
    t.is(expr.evaluate({ value: null }), true);
});

test('FORMAT', t => {
    const expr = parser.parse('FORMAT(value, "0.00")');
    const FORMAT = (val, format) => {
        if (format === '0.00') return val.toFixed(2);
        return val.toFixed();
    };
    t.is(expr.evaluate({ value: 12, FORMAT }), '12.00');
});

test('ARRAY IN', t => {
    const expr = parser.parse('"are" in SPLIT(str, " ")');
    t.is(expr.evaluate({ str: 'charts are cool' }), true);
    t.is(expr.evaluate({ str: "charts aren't cool" }), false);
});

test('SPLIT', t => {
    const expr = parser.parse('(SPLIT(region, ", "))[0]');
    t.is(expr.evaluate({ region: 'Berlin, Germany' }), 'Berlin');
});

test('SPLIT + JOIN', t => {
    const expr = parser.parse('JOIN(SPLIT(region, ", "), " = ")');
    t.is(expr.evaluate({ region: 'Berlin, Germany' }), 'Berlin = Germany');
});

test('INDEXOF', t => {
    t.is(parser.evaluate('INDEXOF(text, "two")', { text: 'one,two,three' }), 4);
    t.is(parser.evaluate('INDEXOF(SPLIT(text, ","), "two")', { text: 'one,two,three' }), 1);
});

test('TEXT', t => {
    t.is(parser.evaluate('TEXT num', { num: 123456 }), '123456');
    t.is(parser.evaluate('TEXT(num)', { num: 123456 }), '123456');
});

test('NUMBER', t => {
    t.is(parser.evaluate('NUMBER str', { str: '123456' }), 123456);
    t.is(parser.evaluate('NUMBER(str)', { str: '123456' }), 123456);
});

test('NA', t => {
    t.is(parser.evaluate('NA'), Number.NaN);
    t.is(parser.evaluate('NULL'), Number.NaN);
});

test('DATE', t => {
    t.deepEqual(parser.evaluate('DATE()'), new Date());
    t.deepEqual(parser.evaluate('DATE(0)'), new Date(0));
    t.deepEqual(parser.evaluate('DATE(str)', { str: '2018/01/20' }), new Date('2018/01/20'));
    t.deepEqual(parser.evaluate('DATE(2020,5,6)'), new Date(2020, 4, 6));
});
