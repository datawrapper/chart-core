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

test('not operator', t => {
    const expr = parser.parse('not(needle in haystack) ? "y" : "n"');
    t.is(expr.evaluate({ needle: 'foo', haystack: 'lot of foo here' }), 'n');
    t.is(expr.evaluate({ needle: 'bar', haystack: 'lot of foo here' }), 'y');
});

test('substr function', t => {
    const expr = parser.parse('substr(name, 0, 5)');
    t.is(expr.evaluate({ name: 'Datawrapper' }), 'Dataw');
});

test('variable substr', t => {
    const expr = parser.parse('substr(name, start, len)');
    t.is(expr.evaluate({ name: 'Datawrapper', start: 0, len: 6 }), 'Datawr');
    t.is(expr.evaluate({ name: 'Datawrapper', start: 3, len: 6 }), 'awrapp');
});

test('concat function', t => {
    const expr = parser.parse('concat(first, " ", last)');
    t.is(expr.evaluate({ first: 'Lorem', last: 'Ipsum' }), 'Lorem Ipsum');
});

test('trim function', t => {
    const expr = parser.parse('trim(name)');
    t.is(expr.evaluate({ name: '  spaces\t\t' }), 'spaces');
});

test('trim function without brackets', t => {
    const expr = parser.parse('trim name');
    t.is(expr.evaluate({ name: '  spaces\t\t' }), 'spaces');
});

test('year() function', t => {
    const expr = parser.parse('year(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 2020);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 2017);
    t.is(expr.evaluate({ date: '2017-06-23' }), 2017);
});

test('month() function', t => {
    const expr = parser.parse('month(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 2);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 5);
});

test('day() function', t => {
    const expr = parser.parse('day(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 1);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14) }), 14);
});

test('hours() function', t => {
    const expr = parser.parse('hours(date)');
    t.is(expr.evaluate({ date: new Date(2020, 1, 1) }), 0);
    t.is(expr.evaluate({ date: new Date(2017, 4, 14, 18, 30, 5) }), 18);
});

test('sin a^b', t => {
    const expr = parser.parse('sin a^b');
    t.is(expr.evaluate({ a: 4, b: 2 }), Math.sin(Math.pow(4, 2)));
});

test('(sin a)^b', t => {
    const expr = parser.parse('(sin a)^b');
    t.is(expr.evaluate({ a: 4, b: 2 }), Math.pow(Math.sin(4), 2));
});

test('sin(a)', t => {
    const expr = parser.parse('sin(a)');
    t.is(expr.evaluate({ a: 4 }), Math.sin(4));
});

test('v1+v2+v3', t => {
    const expr = parser.parse('v1+v2+v3');
    t.is(expr.evaluate({ v1: 1, v2: 2, v3: 3 }), 6);
});
