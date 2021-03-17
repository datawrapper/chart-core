import test from 'ava';
import Column from './column.js';
import Dataset from './index.js';

test.beforeEach(t => {
    const priceEUR = Column('price (EUR)', [24, 0, 80], 'number');
    priceEUR.isComputed = true;
    t.context.dataset = Dataset([
        Column('thing', ['foo', 'bar', 'spam'], 'text'),
        Column('price', [1.2, undefined, '4'], 'number'),
        priceEUR
    ]);
});

test('Dataset.csv() returns a CSV including computed columns by default', async t => {
    const expected = `thing,price,price (EUR)
foo,1.2,24
bar,undefined,0
spam,4,80`;
    t.is(t.context.dataset.csv(), expected);
});

test('Dataset.csv() returns a CSV without computed columns when an option is passed', async t => {
    const expected = `thing,price
foo,1.2
bar,undefined
spam,4`;
    t.is(t.context.dataset.csv({ includeComputedColumns: false }), expected);
});
