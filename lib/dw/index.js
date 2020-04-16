import dataset from '@datawrapper/shared/dataset';
import column from '@datawrapper/shared/dataset/column';
import delimited from '@datawrapper/shared/dataset/delimited';
import columnTypes from '@datawrapper/shared/dataset/columnTypes';
import json from '@datawrapper/shared/dataset/json';
import * as utils from './utils';
import chart from './chart';
import visualization from './visualization';
import theme from './theme';

column.types = columnTypes;

// dw.start.js
const dw = {
    dataset,
    column,
    datasource: {
        delimited,
        json
    },
    utils,
    chart,
    visualization,
    theme
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
