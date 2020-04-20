import _ from 'underscore';
import base from './theme.base';

const __themes = {};

function theme(id) {
    return __themes[id];
}

theme.register = function(id) {
    const parent = arguments.length === 3 ? __themes[arguments[1]] : base;
    const props = arguments[arguments.length - 1];

    __themes[id] = extend({}, parent, { id: id }, props);
};

theme.base = base;

export default theme;

/*
 * taken from jQuery 1.10.2 $.extend, but changed a little
 * so that arrays are not deep-copied. also deep-coping
 * cannot be turned off anymore.
 */
function extend() {
    var options;
    var name;
    var src;
    var copy;
    var clone;
    var target = arguments[0] || {};
    var i = 1;
    var length = arguments.length;

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && !_.isFunction(target)) {
        target = {};
    }

    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null) {
            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (copy && isPlainObject(copy)) {
                    clone = src && isPlainObject(src) ? src : {};

                    // Never move original objects, clone them
                    target[name] = extend(clone, copy);
                    // Don't bring in undefined values
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }
    // Return the modified object
    return target;
}

function isPlainObject(o) {
    return _.isObject(o) && !_.isArray(o) && !_.isFunction(o);
}
