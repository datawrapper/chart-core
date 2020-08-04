import test from 'ava';
import htmlTemplate from './htmlTemplate';

test('hello world', async t => {
    const tpl = htmlTemplate(`hello {{ world }}`);
    t.is(tpl({ world: 'foo' }), 'hello foo');
    t.is(tpl({ world: 'cat' }), 'hello cat');
    t.is(tpl({ world: 42 }), 'hello 42');
});

test('more html', async t => {
    const tpl = htmlTemplate(`<h2>{{ title }}</h2><ul><li>{{ value * 2 }}</li></ul>`);
    t.is(tpl({ title: 'foo', value: 3 }), '<h2>foo</h2><ul><li>6</li></ul>');
    t.is(tpl({ title: 'bar', value: 9 }), '<h2>bar</h2><ul><li>18</li></ul>');
});

test('ternary operator', async t => {
    const tpl = htmlTemplate(`{{ value > 10 ? "bigger" : "smaller" }}`);
    t.is(tpl({ value: 9 }), 'smaller');
    t.is(tpl({ value: 11 }), 'bigger');
});

test('round', async t => {
    const tpl = htmlTemplate(`{{ ROUND(value) }}`);
    t.is(tpl({ value: 1.3 }), '1');
    t.is(tpl({ value: 1.7 }), '2');
});

test('evil expression', async t => {
    t.throws(() => {
        const tpl = htmlTemplate(`{{ window.document.cookie }}`);
        tpl({ title: 'foo' });
    });
});

test('evil expression 2', async t => {
    t.throws(() => {
        const tpl = htmlTemplate(`{{ this.alert(422) }}`);
        tpl({ title: 'foo' });
    });
});

test('evil html', async t => {
    const tpl = htmlTemplate(`{{ title }} <script>alert('you are hacked')</script>`);
    t.is(tpl({ title: 'foo' }), "foo alert('you are hacked')");
});

test('evil expr + html', async t => {
    const tpl = htmlTemplate(`{{ col1 }} alert('you are hacked') {{col2}}`);
    t.is(tpl({ col1: '<script>', col2: '</script>' }), " alert('you are hacked') ");
});
