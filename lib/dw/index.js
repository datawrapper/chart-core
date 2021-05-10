import dataset from './dataset';
import column from './dataset/column';
import delimited from './dataset/delimited';
import columnTypes from './dataset/columnTypes';
import json from './dataset/json';
import * as utils from './utils';
import chart from './chart';
import visualization from './visualization';
import theme from './theme';
import block from './block';
import notify from './notify';

column.types = columnTypes;

// dw.start.js
const dw = {
    version: 'chart-core@__chartCoreVersion__',
    dataset,
    column,
    datasource: {
        delimited,
        json
    },
    utils,
    chart,
    visualization,
    theme,
    block,
    notify
};

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = dw;
    }
    exports.dw = dw;
} else {
    window.dw = dw;
}

export default dw;
