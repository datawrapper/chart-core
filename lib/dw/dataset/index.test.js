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

test('Dataset() sets unique names for columns with empty names', async t => {
    const dataset = Dataset([Column('foo', []), Column('', []), Column('bar', []), Column('', [])]);
    t.deepEqual(
        dataset.columns().map(column => [column.name(), column.origName()]),
        [
            ['foo', 'foo'],
            ['X.1', ''],
            ['bar', 'bar'],
            ['X.2', '']
        ]
    );
});

test('Dataset() sets unique names for columns with same names', async t => {
    const dataset = Dataset([
        Column('foo', []),
        Column('foo', []),
        Column('foo.2', []),
        Column('foo', []),
        Column('foo.1', []),
        Column('foo', [])
    ]);
    t.deepEqual(
        dataset.columns().map(column => [column.name(), column.origName()]),
        [
            ['foo', 'foo'],
            ['foo.1', 'foo'],
            ['foo.2', 'foo.2'],
            ['foo.3', 'foo'],
            ['foo.1.1', 'foo.1'],
            ['foo.4', 'foo']
        ]
    );
});

test('Dataset() handles both columns with empty names and columns with non-unique names', async t => {
    const dataset = Dataset([Column('', []), Column('X', []), Column('X', []), Column('', [])]);
    t.deepEqual(
        dataset.columns().map(column => [column.name(), column.origName()]),
        [
            ['X.1', ''],
            ['X', 'X'],
            ['X.2', 'X'],
            ['X.3', '']
        ]
    );
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

test('Dataset.deleteRow() deletes correct row', async t => {
    const expected = `thing,price,price (EUR)
foo,1.2,24
spam,4,80`;
    // First row is header, so index of `1` deletes 3rd line in csv.
    t.context.dataset.deleteRow(1);
    t.is(t.context.dataset.csv(), expected);
});
