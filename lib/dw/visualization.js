import base from './visualization.base';
const __vis = {};

function visualization(id) {
    if (!__vis[id]) {
        console.warn('unknown visualization type: ' + id);
        const known = Object.keys(__vis);
        if (known.length > 0) console.warn('try one of these instead: ' + known.join(', '));
        return false;
    }
    return new __vis[id]();
}

visualization.register = function(id) {
    const parent = arguments.length === 3 ? __vis[arguments[1]].prototype : base;
    const props = arguments[arguments.length - 1];
    const vis = (__vis[id] = function() {});

    Object.assign(vis.prototype, parent, { id: id }, props);
};

visualization.has = function(id) {
    return __vis[id] !== undefined;
};

visualization.base = base;

export default visualization;
