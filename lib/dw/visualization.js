import _clone from 'underscore/modules/clone';
import base from './visualization.base';
const __vis = {};

function visualization(id, target) {
    if (!__vis[id]) {
        console.warn('unknown visualization type: ' + id);
        const known = Object.keys(__vis);
        if (known.length > 0) console.warn('try one of these instead: ' + known.join(', '));
        return false;
    }

    let parents = [];

    while (vis.parentVis !== 'base') {
        parents.push({ id: vis.parentVis, vis: __vis[vis.parentVis] });
    }

    parents.unshift({ id, vis: __vis[id] });

    let vis = _clone(base);

    parents.reverse().forEach(el => {
        Object.assign(
            vis,
            typeof el.vis.init === 'function' ? el.vis.init({ target }) : el.vis.init,
            { id }
        );
    });

    if (target) {
        vis.target(target);
    }

    return vis;
}

visualization.register = function(id) {
    let parentVis, init;

    if (arguments.length === 2) {
        parentVis = 'base';
        init = arguments[1];
    } else if (arguments.length === 3) {
        parentVis = arguments[1];
        init = arguments[2];
    }

    __vis[id] = {
        parentVis,
        init
    };
};

visualization.has = function(id) {
    return __vis[id] !== undefined;
};

visualization.base = base;

export default visualization;
