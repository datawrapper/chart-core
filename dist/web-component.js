<<<<<<< HEAD
(function(){'use strict';function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
class HtmlTag {
    constructor(anchor = null) {
        this.a = anchor;
        this.e = this.n = null;
    }
    m(html, target, anchor = null) {
        if (!this.e) {
            this.e = element(target.nodeName);
            this.t = target;
            this.h(html);
        }
        this.i(anchor);
    }
    h(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.childNodes);
    }
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(this.t, this.n[i], anchor);
        }
    }
    p(html) {
        this.d();
        this.h(html);
        this.i(this.a);
    }
    d() {
        this.n.forEach(detach);
    }
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
let SvelteElement;
if (typeof HTMLElement === 'function') {
    SvelteElement = class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            // @ts-ignore todo: improve typings
            for (const key in this.$$.slotted) {
                // @ts-ignore todo: improve typings
                this.appendChild(this.$$.slotted[key]);
            }
        }
        attributeChangedCallback(attr, _oldValue, newValue) {
            this[attr] = newValue;
        }
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            // TODO should this delegate to addEventListener?
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    };
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}const TAGS = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
const COMMENTS_AND_PHP_TAGS = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
const defaultAllowed = '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>';

/**
 * Remove all non-whitelisted html tags from the given string
 *
 * @exports purifyHTML
 * @kind function
 *
 * @param {string} input - dirty html input
 * @param {string} allowed - list of allowed tags, defaults to `<a><b><br><br/><i><strong><sup><sub><strike><u><em><tt>`
 * @return {string} - the cleaned html output
 */
function purifyHTML(input, allowed) {
    /*
     * written by Kevin van Zonneveld et.al.
     * taken from https://github.com/kvz/phpjs/blob/master/functions/strings/strip_tags.js
     */
    if (input === null) return null;
    if (input === undefined) return undefined;
    input = String(input);
    // strip tags
    if (input.indexOf('<') < 0 || input.indexOf('>') < 0) {
        return input;
    }
    input = stripTags(input, allowed);
    // remove all event attributes
    if (typeof document === 'undefined') return input;
    var d = document.createElement('div');
    d.innerHTML = input;
    var sel = d.querySelectorAll('*');
    for (var i = 0; i < sel.length; i++) {
        if (sel[i].nodeName.toLowerCase() === 'a') {
            // special treatment for <a> elements
            if (sel[i].getAttribute('target') !== '_self') sel[i].setAttribute('target', '_blank');
            sel[i].setAttribute('rel', 'nofollow noopener noreferrer');
            if (
                sel[i].getAttribute('href') &&
                sel[i]
                    .getAttribute('href')
                    .trim()
                    .replace(/[^a-zA-Z0-9 -:]/g, '')
                    .startsWith('javascript:')
            ) {
                // remove entire href to be safe
                sel[i].setAttribute('href', '');
            }
        }
        const removeAttrs = [];
        for (var j = 0; j < sel[i].attributes.length; j++) {
            var attrib = sel[i].attributes[j];
            if (attrib.specified) {
                if (attrib.name.substr(0, 2) === 'on') removeAttrs.push(attrib.name);
            }
        }
        removeAttrs.forEach(attr => sel[i].removeAttribute(attr));
    }
    return d.innerHTML;
}

function stripTags(input, allowed) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = (
        ((allowed !== undefined ? allowed || '' : defaultAllowed) + '')
            .toLowerCase()
            .match(/<[a-z][a-z0-9]*>/g) || []
    ).join('');

    var before = input;
    var after = input;
    // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
    while (true) {
        before = after;
        after = before.replace(COMMENTS_AND_PHP_TAGS, '').replace(TAGS, function($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
        // return once no more tags are removed
        if (before === after) {
            return after;
        }
    }
}function clean(s) {
    return purifyHTML(s, '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>');
}/* lib/Block.svelte generated by Svelte v3.23.2 */

function create_if_block_1(ctx) {
	let span;
	let raw_value = clean(/*block*/ ctx[0].prepend) + "";

	return {
		c() {
			span = element("span");
			attr(span, "class", "prepend");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty & /*block*/ 1 && raw_value !== (raw_value = clean(/*block*/ ctx[0].prepend) + "")) span.innerHTML = raw_value;		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (15:0) {#if block.append}
function create_if_block(ctx) {
	let span;
	let raw_value = clean(/*block*/ ctx[0].append) + "";

	return {
		c() {
			span = element("span");
			attr(span, "class", "append");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty & /*block*/ 1 && raw_value !== (raw_value = clean(/*block*/ ctx[0].append) + "")) span.innerHTML = raw_value;		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment(ctx) {
	let t0;
	let span;
	let switch_instance;
	let t1;
	let if_block1_anchor;
	let current;
	let if_block0 = /*block*/ ctx[0].prepend && create_if_block_1(ctx);
	var switch_value = /*block*/ ctx[0].component;

	function switch_props(ctx) {
		return { props: { props: /*block*/ ctx[0].props } };
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props(ctx));
	}

	let if_block1 = /*block*/ ctx[0].append && create_if_block(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			span = element("span");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			t1 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr(span, "class", "block-inner");
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, span, anchor);

			if (switch_instance) {
				mount_component(switch_instance, span, null);
			}

			insert(target, t1, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*block*/ ctx[0].prepend) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			const switch_instance_changes = {};
			if (dirty & /*block*/ 1) switch_instance_changes.props = /*block*/ ctx[0].props;

			if (switch_value !== (switch_value = /*block*/ ctx[0].component)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, span, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			if (/*block*/ ctx[0].append) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(span);
			if (switch_instance) destroy_component(switch_instance);
			if (detaching) detach(t1);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { block } = $$props;

	$$self.$set = $$props => {
		if ("block" in $$props) $$invalidate(0, block = $$props.block);
	};

	return [block];
}

class Block extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { block: 0 });
	}
}/* lib/BlocksRegion.svelte generated by Svelte v3.23.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

// (9:0) {#if blocks.length}
function create_if_block$1(ctx) {
	let div;
	let current;
	let each_value = /*blocks*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "id", /*id*/ ctx[0]);
			attr(div, "class", /*name*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*blocks*/ 4) {
				each_value = /*blocks*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty & /*id*/ 1) {
				attr(div, "id", /*id*/ ctx[0]);
			}

			if (!current || dirty & /*name*/ 2) {
				attr(div, "class", /*name*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (20:12) {:else}
function create_else_block(ctx) {
	let div;
	let block;
	let t;
	let div_class_value;
	let div_style_value;
	let current;
	block = new Block({ props: { block: /*block*/ ctx[3] } });

	return {
		c() {
			div = element("div");
			create_component(block.$$.fragment);
			t = space();
			attr(div, "class", div_class_value = "block " + /*block*/ ctx[3].id + "-block");

			attr(div, "style", div_style_value = /*block*/ ctx[3].id.includes("svg-rule")
			? "font-size:0px;"
			: "");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(block, div, null);
			append(div, t);
			current = true;
		},
		p(ctx, dirty) {
			const block_changes = {};
			if (dirty & /*blocks*/ 4) block_changes.block = /*block*/ ctx[3];
			block.$set(block_changes);

			if (!current || dirty & /*blocks*/ 4 && div_class_value !== (div_class_value = "block " + /*block*/ ctx[3].id + "-block")) {
				attr(div, "class", div_class_value);
			}

			if (!current || dirty & /*blocks*/ 4 && div_style_value !== (div_style_value = /*block*/ ctx[3].id.includes("svg-rule")
			? "font-size:0px;"
			: "")) {
				attr(div, "style", div_style_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(block.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(block.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(block);
		}
	};
}

// (16:40) 
function create_if_block_2(ctx) {
	let p;
	let block;
	let t;
	let p_class_value;
	let current;
	block = new Block({ props: { block: /*block*/ ctx[3] } });

	return {
		c() {
			p = element("p");
			create_component(block.$$.fragment);
			t = space();
			attr(p, "class", p_class_value = "block " + /*block*/ ctx[3].id + "-block");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			mount_component(block, p, null);
			append(p, t);
			current = true;
		},
		p(ctx, dirty) {
			const block_changes = {};
			if (dirty & /*blocks*/ 4) block_changes.block = /*block*/ ctx[3];
			block.$set(block_changes);

			if (!current || dirty & /*blocks*/ 4 && p_class_value !== (p_class_value = "block " + /*block*/ ctx[3].id + "-block")) {
				attr(p, "class", p_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(block.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(block.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(p);
			destroy_component(block);
		}
	};
}

// (12:12) {#if block.tag === 'h1'}
function create_if_block_1$1(ctx) {
	let h1;
	let block;
	let t;
	let h1_class_value;
	let current;
	block = new Block({ props: { block: /*block*/ ctx[3] } });

	return {
		c() {
			h1 = element("h1");
			create_component(block.$$.fragment);
			t = space();
			attr(h1, "class", h1_class_value = "block " + /*block*/ ctx[3].id + "-block");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			mount_component(block, h1, null);
			append(h1, t);
			current = true;
		},
		p(ctx, dirty) {
			const block_changes = {};
			if (dirty & /*blocks*/ 4) block_changes.block = /*block*/ ctx[3];
			block.$set(block_changes);

			if (!current || dirty & /*blocks*/ 4 && h1_class_value !== (h1_class_value = "block " + /*block*/ ctx[3].id + "-block")) {
				attr(h1, "class", h1_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(block.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(block.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			destroy_component(block);
		}
	};
}

// (11:8) {#each blocks as block}
function create_each_block(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1$1, create_if_block_2, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*block*/ ctx[3].tag === "h1") return 0;
		if (/*block*/ ctx[3].tag === "p") return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$1(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*blocks*/ ctx[2].length && create_if_block$1(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*blocks*/ ctx[2].length) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*blocks*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { id } = $$props;
	let { name } = $$props;
	let { blocks } = $$props;

	$$self.$set = $$props => {
		if ("id" in $$props) $$invalidate(0, id = $$props.id);
		if ("name" in $$props) $$invalidate(1, name = $$props.name);
		if ("blocks" in $$props) $$invalidate(2, blocks = $$props.blocks);
	};

	return [id, name, blocks];
}

class BlocksRegion extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { id: 0, name: 1, blocks: 2 });
	}
}/* lib/Menu.svelte generated by Svelte v3.23.2 */

function create_if_block$2(ctx) {
	let div0;
	let t;
	let div1;
	let blocksregion;
	let current;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*props*/ ctx[3].icon) return create_if_block_1$2;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	blocksregion = new BlocksRegion({
			props: {
				id: /*id*/ ctx[0],
				name: /*name*/ ctx[1],
				blocks: /*blocks*/ ctx[2]
			}
		});

	return {
		c() {
			div0 = element("div");
			if_block.c();
			t = space();
			div1 = element("div");
			create_component(blocksregion.$$.fragment);
			attr(div0, "class", "menu container svelte-1lt126s");
			toggle_class(div0, "ha-menu", !/*props*/ ctx[3].icon);
			attr(div1, "class", "menu-content container svelte-1lt126s");
			toggle_class(div1, "hidden", !/*open*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			if_block.m(div0, null);
			insert(target, t, anchor);
			insert(target, div1, anchor);
			mount_component(blocksregion, div1, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div0, "click", stop_propagation(/*toggle*/ ctx[5])),
					listen(div1, "click", stop_propagation(/*click_handler*/ ctx[7]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div0, null);
				}
			}

			if (dirty & /*props*/ 8) {
				toggle_class(div0, "ha-menu", !/*props*/ ctx[3].icon);
			}

			const blocksregion_changes = {};
			if (dirty & /*id*/ 1) blocksregion_changes.id = /*id*/ ctx[0];
			if (dirty & /*name*/ 2) blocksregion_changes.name = /*name*/ ctx[1];
			if (dirty & /*blocks*/ 4) blocksregion_changes.blocks = /*blocks*/ ctx[2];
			blocksregion.$set(blocksregion_changes);

			if (dirty & /*open*/ 16) {
				toggle_class(div1, "hidden", !/*open*/ ctx[4]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(blocksregion.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(blocksregion.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if_block.d();
			if (detaching) detach(t);
			if (detaching) detach(div1);
			destroy_component(blocksregion);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (86:8) {:else}
function create_else_block$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "svelte-1lt126s");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (84:8) {#if props.icon}
function create_if_block_1$2(ctx) {
	let html_tag;
	let raw_value = /*props*/ ctx[3].icon + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*props*/ 8 && raw_value !== (raw_value = /*props*/ ctx[3].icon + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

function create_fragment$2(ctx) {
	let if_block_anchor;
	let current;
	let mounted;
	let dispose;
	let if_block = /*blocks*/ ctx[2].length && create_if_block$2(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(window, "click", /*hide*/ ctx[6]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*blocks*/ ctx[2].length) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*blocks*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
			mounted = false;
			dispose();
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { id } = $$props;
	let { name } = $$props;
	let { blocks } = $$props;
	let { props } = $$props;
	let open = false;

	function toggle() {
		$$invalidate(4, open = !open);
	}

	function hide() {
		$$invalidate(4, open = false);
	}

	function click_handler(event) {
		bubble($$self, event);
	}

	$$self.$set = $$props => {
		if ("id" in $$props) $$invalidate(0, id = $$props.id);
		if ("name" in $$props) $$invalidate(1, name = $$props.name);
		if ("blocks" in $$props) $$invalidate(2, blocks = $$props.blocks);
		if ("props" in $$props) $$invalidate(3, props = $$props.props);
	};

	return [id, name, blocks, props, open, toggle, hide, click_handler];
}

class Menu extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { id: 0, name: 1, blocks: 2, props: 3 });
	}
}/* lib/blocks/Headline.svelte generated by Svelte v3.23.2 */

function create_fragment$3(ctx) {
	let html_tag;

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(/*headline*/ ctx[0], target, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*headline*/ 1) html_tag.p(/*headline*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(1, props = $$props.props);
	};

	let chart;
	let headline;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 2) {
			 $$invalidate(2, chart = props.chart);
		}

		if ($$self.$$.dirty & /*chart*/ 4) {
			 $$invalidate(0, headline = purifyHtml(chart.title));
		}
	};

	return [headline, props];
}

class Headline extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { props: 1 });
	}
}/* lib/blocks/Description.svelte generated by Svelte v3.23.2 */

function create_fragment$4(ctx) {
	let html_tag;

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(/*description*/ ctx[0], target, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*description*/ 1) html_tag.p(/*description*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

const allowedTags = "<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>";

function instance$4($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(1, props = $$props.props);
	};

	let chart;
	let description;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 2) {
			 $$invalidate(2, chart = props.chart);
		}

		if ($$self.$$.dirty & /*chart*/ 4) {
			// internal props
			 $$invalidate(0, description = purifyHtml(get(chart, "metadata.describe.intro"), allowedTags));
		}
	};

	return [description, props];
}

class Description extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { props: 1 });
	}
}/* lib/blocks/Source.svelte generated by Svelte v3.23.2 */

function create_if_block$3(ctx) {
	let span;
	let t0_value = /*__*/ ctx[3](/*footer*/ ctx[0].sourceCaption) + "";
	let t0;
	let t1;
	let t2;
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*sourceUrl*/ ctx[2]) return create_if_block_1$3;
		return create_else_block$2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = text(":");
			t2 = space();
			if_block.c();
			if_block_anchor = empty();
			attr(span, "class", "source-caption");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
			insert(target, t2, anchor);
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*footer*/ 1 && t0_value !== (t0_value = /*__*/ ctx[3](/*footer*/ ctx[0].sourceCaption) + "")) set_data(t0, t0_value);

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if (detaching) detach(span);
			if (detaching) detach(t2);
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (19:4) {:else}
function create_else_block$2(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			attr(span, "class", "source");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = /*sourceName*/ ctx[1];
		},
		p(ctx, dirty) {
			if (dirty & /*sourceName*/ 2) span.innerHTML = /*sourceName*/ ctx[1];		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (15:4) {#if sourceUrl}
function create_if_block_1$3(ctx) {
	let a;

	return {
		c() {
			a = element("a");
			attr(a, "class", "source");
			attr(a, "target", "_blank");
			attr(a, "rel", "noopener noreferrer");
			attr(a, "href", /*sourceUrl*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			a.innerHTML = /*sourceName*/ ctx[1];
		},
		p(ctx, dirty) {
			if (dirty & /*sourceName*/ 2) a.innerHTML = /*sourceName*/ ctx[1];
			if (dirty & /*sourceUrl*/ 4) {
				attr(a, "href", /*sourceUrl*/ ctx[2]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

function create_fragment$5(ctx) {
	let if_block_anchor;
	let if_block = /*sourceName*/ ctx[1] && create_if_block$3(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*sourceName*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$3(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { __, get, purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(4, props = $$props.props);
	};

	let chart;
	let theme;
	let footer;
	let sourceName;
	let sourceUrl;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 16) {
			 $$invalidate(5, { chart, theme } = props, chart, ($$invalidate(6, theme), $$invalidate(4, props)));
		}

		if ($$self.$$.dirty & /*theme*/ 64) {
			// internal props
			 $$invalidate(0, footer = get(theme, "data.options.footer"));
		}

		if ($$self.$$.dirty & /*chart*/ 32) {
			 $$invalidate(1, sourceName = purifyHtml(get(chart, "metadata.describe.source-name")));
		}

		if ($$self.$$.dirty & /*chart*/ 32) {
			 $$invalidate(2, sourceUrl = get(chart, "metadata.describe.source-url"));
		}
	};

	return [footer, sourceName, sourceUrl, __, props];
}

class Source extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { props: 4 });
	}
}/* lib/blocks/Byline.svelte generated by Svelte v3.23.2 */

function create_if_block$4(ctx) {
	let html_tag;
	let raw_value = /*purifyHtml*/ ctx[4](/*basedOnByline*/ ctx[3]) + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*basedOnByline*/ 8 && raw_value !== (raw_value = /*purifyHtml*/ ctx[4](/*basedOnByline*/ ctx[3]) + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

function create_fragment$6(ctx) {
	let span;
	let t0_value = /*__*/ ctx[5](/*bylineCaption*/ ctx[1]) + "";
	let t0;
	let t1;
	let t2;
	let t3;
	let if_block_anchor;
	let if_block = /*chart*/ ctx[0].basedOnByline && create_if_block$4(ctx);

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			t2 = text(/*byline*/ ctx[2]);
			t3 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(span, "class", "byline-caption");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*bylineCaption*/ 2 && t0_value !== (t0_value = /*__*/ ctx[5](/*bylineCaption*/ ctx[1]) + "")) set_data(t0, t0_value);
			if (dirty & /*byline*/ 4) set_data(t2, /*byline*/ ctx[2]);

			if (/*chart*/ ctx[0].basedOnByline) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
			if (detaching) detach(t1);
			if (detaching) detach(t2);
			if (detaching) detach(t3);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml, __ } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(6, props = $$props.props);
	};

	let chart;
	let theme;
	let caption;
	let bylineCaption;
	let byline;
	let forkCaption;
	let needBrackets;
	let basedOnByline;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 64) {
			 $$invalidate(0, chart = props.chart);
		}

		if ($$self.$$.dirty & /*props*/ 64) {
			 $$invalidate(7, theme = props.theme);
		}

		if ($$self.$$.dirty & /*props*/ 64) {
			 $$invalidate(8, caption = props.caption);
		}

		if ($$self.$$.dirty & /*caption, theme*/ 384) {
			// internal props
			 $$invalidate(1, bylineCaption = caption === "map"
			? get(theme, "data.options.footer.mapCaption", "Map:")
			: caption === "table"
				? get(theme, "data.options.footer.tableCaption", "Table:")
				: get(theme, "data.options.footer.chartCaption", "Chart:"));
		}

		if ($$self.$$.dirty & /*chart*/ 1) {
			 $$invalidate(2, byline = get(chart, "metadata.describe.byline", false));
		}

		if ($$self.$$.dirty & /*theme*/ 128) {
			 $$invalidate(9, forkCaption = get(theme, "data.options.footer.forkCaption", "footer / based-on"));
		}

		if ($$self.$$.dirty & /*chart, byline*/ 5) {
			 $$invalidate(10, needBrackets = chart.basedOnByline && byline);
		}

		if ($$self.$$.dirty & /*needBrackets, forkCaption, chart*/ 1537) {
			 $$invalidate(3, basedOnByline = (needBrackets ? "(" : "") + __(forkCaption) + " " + purifyHtml(chart.basedOnByline) + (needBrackets ? ")" : ""));
		}
	};

	return [chart, bylineCaption, byline, basedOnByline, purifyHtml, __, props];
}

class Byline extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, { props: 6 });
	}
}/* lib/blocks/Notes.svelte generated by Svelte v3.23.2 */

function create_fragment$7(ctx) {
	let html_tag;
	let raw_value = /*purifyHtml*/ ctx[2](/*get*/ ctx[1](/*chart*/ ctx[0], "metadata.annotate.notes")) + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*chart*/ 1 && raw_value !== (raw_value = /*purifyHtml*/ ctx[2](/*get*/ ctx[1](/*chart*/ ctx[0], "metadata.annotate.notes")) + "")) html_tag.p(raw_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(3, props = $$props.props);
	};

	let chart;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 8) {
			 $$invalidate(0, chart = props.chart);
		}
	};

	return [chart, get, purifyHtml, props];
}

class Notes extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { props: 3 });
	}
}/* lib/blocks/GetTheData.svelte generated by Svelte v3.23.2 */

function create_if_block$5(ctx) {
	let a;
	let t_value = /*__*/ ctx[5](/*getTheData*/ ctx[3].caption) + "";
	let t;
	let a_aria_label_value;
	let a_target_value;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "this", "dataLink");
			attr(a, "class", "dw-data-link");
			attr(a, "aria-label", a_aria_label_value = "" + (/*__*/ ctx[5](/*getTheData*/ ctx[3].caption) + ": " + /*purifyHtml*/ ctx[6](/*chart*/ ctx[2].title, "")));
			attr(a, "download", /*download*/ ctx[1]);
			attr(a, "target", a_target_value = /*externalData*/ ctx[4] ? "_blank" : "_self");
			attr(a, "href", a_href_value = /*externalData*/ ctx[4] || "data");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*getTheData*/ 8 && t_value !== (t_value = /*__*/ ctx[5](/*getTheData*/ ctx[3].caption) + "")) set_data(t, t_value);

			if (dirty & /*getTheData, chart*/ 12 && a_aria_label_value !== (a_aria_label_value = "" + (/*__*/ ctx[5](/*getTheData*/ ctx[3].caption) + ": " + /*purifyHtml*/ ctx[6](/*chart*/ ctx[2].title, "")))) {
				attr(a, "aria-label", a_aria_label_value);
			}

			if (dirty & /*download*/ 2) {
				attr(a, "download", /*download*/ ctx[1]);
			}

			if (dirty & /*externalData*/ 16 && a_target_value !== (a_target_value = /*externalData*/ ctx[4] ? "_blank" : "_self")) {
				attr(a, "target", a_target_value);
			}

			if (dirty & /*externalData*/ 16 && a_href_value !== (a_href_value = /*externalData*/ ctx[4] || "data")) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

function create_fragment$8(ctx) {
	let if_block_anchor;
	let if_block = /*getTheData*/ ctx[3].enabled && !/*hidden*/ ctx[0] && create_if_block$5(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*getTheData*/ ctx[3].enabled && !/*hidden*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$5(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, __, purifyHtml } = props;
	let dataLink;
	let hidden = false;
	let download = "";

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(7, props = $$props.props);
	};

	let chart;
	let dwChart;
	let data;
	let theme;
	let getTheData;
	let externalData;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 128) {
			 $$invalidate(2, { chart, dwChart, data, theme } = props, chart, ($$invalidate(9, dwChart), $$invalidate(7, props)), ($$invalidate(11, theme), $$invalidate(7, props)));
		}

		if ($$self.$$.dirty & /*theme*/ 2048) {
			// internal props
			 $$invalidate(3, getTheData = get(theme, "data.options.footer.getTheData", { enabled: false }));
		}

		if ($$self.$$.dirty & /*dwChart, chart*/ 516) {
			 {
				// update data link to point to edited dataset
				if (dwChart && dwChart.dataset()) {
					const csv = dwChart.dataset().toCSV && dwChart.dataset().toCSV();

					if (!csv || csv && csv.trim && csv.trim() === "X.1") {
						$$invalidate(0, hidden = true);
					} else {
						if (window.navigator.msSaveOrOpenBlob) {
							const blobObject = new Blob([csv]);

							dataLink.addEventListener("click", event => {
								window.navigator.msSaveOrOpenBlob(blobObject, "data-" + chart.id + ".csv");
								event.preventDefault();
								return false;
							});
						} else {
							$$invalidate(1, download = "data-" + chart.id + ".csv");
						}
					}
				}
			}
		}

		if ($$self.$$.dirty & /*dwChart*/ 512) {
			 $$invalidate(4, externalData = get(dwChart, "externalData"));
		}
	};

	return [hidden, download, chart, getTheData, externalData, __, purifyHtml, props];
}

class GetTheData extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { props: 7 });
	}
}/* lib/blocks/Embed.svelte generated by Svelte v3.23.2 */

function create_if_block$6(ctx) {
	let a;
	let t0_value = /*__*/ ctx[3](/*embed*/ ctx[1].caption) + "";
	let t0;
	let t1;
	let if_block_anchor;
	let mounted;
	let dispose;
	let if_block = !/*modalIsHidden*/ ctx[0] && create_if_block_1$4(ctx);

	return {
		c() {
			a = element("a");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(a, "href", "#embed");
			attr(a, "class", "chart-action-embed");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t0);
			insert(target, t1, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);

			if (!mounted) {
				dispose = listen(a, "click", /*handleClick*/ ctx[4]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*embed*/ 2 && t0_value !== (t0_value = /*__*/ ctx[3](/*embed*/ ctx[1].caption) + "")) set_data(t0, t0_value);

			if (!/*modalIsHidden*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1$4(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) detach(a);
			if (detaching) detach(t1);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
			mounted = false;
			dispose();
		}
	};
}

// (30:4) {#if !modalIsHidden}
function create_if_block_1$4(ctx) {
	let div2;
	let div0;
	let t1;
	let div1;
	let t2_value = (/*embed*/ ctx[1].text || "Please use the following HTML code to embed this chart:") + "";
	let t2;
	let t3;
	let textarea;
	let mounted;
	let dispose;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			div0.textContent = "×";
			t1 = space();
			div1 = element("div");
			t2 = text(t2_value);
			t3 = space();
			textarea = element("textarea");
			attr(div0, "class", "close");
			textarea.readOnly = true;
			textarea.value = /*embedCode*/ ctx[2];
			attr(div2, "class", "embed-code");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t1);
			append(div2, div1);
			append(div1, t2);
			append(div2, t3);
			append(div2, textarea);

			if (!mounted) {
				dispose = [
					listen(div0, "click", /*handleClick*/ ctx[4]),
					listen(textarea, "click", handleTextareaClick)
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*embed*/ 2 && t2_value !== (t2_value = (/*embed*/ ctx[1].text || "Please use the following HTML code to embed this chart:") + "")) set_data(t2, t2_value);

			if (dirty & /*embedCode*/ 4) {
				textarea.value = /*embedCode*/ ctx[2];
			}
		},
		d(detaching) {
			if (detaching) detach(div2);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$9(ctx) {
	let if_block_anchor;
	let if_block = /*embed*/ ctx[1].enabled && create_if_block$6(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*embed*/ ctx[1].enabled) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$6(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function handleTextareaClick(e) {
	e.target.focus();
	e.target.select();
}

function instance$9($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, __ } = props;
	let modalIsHidden = true;

	function handleClick(e) {
		e.preventDefault();
		$$invalidate(0, modalIsHidden = !modalIsHidden);
	}

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(5, props = $$props.props);
	};

	let chart;
	let theme;
	let embed;
	let embedCode;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 32) {
			 $$invalidate(6, { chart, theme } = props, chart, ($$invalidate(7, theme), $$invalidate(5, props)));
		}

		if ($$self.$$.dirty & /*theme*/ 128) {
			// internal props
			 $$invalidate(1, embed = get(theme, "data.options.footer.embed", { enabled: false }));
		}

		if ($$self.$$.dirty & /*chart*/ 64) {
			 $$invalidate(2, embedCode = get(chart, "metadata.publish.embed-codes.embed-method-iframe", "<!-- embed code will be here after publishing -->"));
		}
	};

	return [modalIsHidden, embed, embedCode, __, handleClick, props];
}

class Embed extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { props: 5 });
	}
}/* lib/blocks/LogoInner.svelte generated by Svelte v3.23.2 */

function create_if_block_1$5(ctx) {
	let img;
	let img_height_value;
	let img_src_value;
	let img_alt_value;

	return {
		c() {
			img = element("img");
			attr(img, "height", img_height_value = /*logo*/ ctx[1].height);
			if (img.src !== (img_src_value = /*logo*/ ctx[1].url)) attr(img, "src", img_src_value);
			attr(img, "alt", img_alt_value = /*theme*/ ctx[2].title);
		},
		m(target, anchor) {
			insert(target, img, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*logo*/ 2 && img_height_value !== (img_height_value = /*logo*/ ctx[1].height)) {
				attr(img, "height", img_height_value);
			}

			if (dirty & /*logo*/ 2 && img.src !== (img_src_value = /*logo*/ ctx[1].url)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*theme*/ 4 && img_alt_value !== (img_alt_value = /*theme*/ ctx[2].title)) {
				attr(img, "alt", img_alt_value);
			}
		},
		d(detaching) {
			if (detaching) detach(img);
		}
	};
}

// (10:0) {#if logo.text}
function create_if_block$7(ctx) {
	let span;
	let raw_value = /*purifyHtml*/ ctx[0](/*logo*/ ctx[1].text) + "";

	return {
		c() {
			span = element("span");
			attr(span, "class", "logo-text");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty & /*purifyHtml, logo*/ 3 && raw_value !== (raw_value = /*purifyHtml*/ ctx[0](/*logo*/ ctx[1].text) + "")) span.innerHTML = raw_value;		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$a(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*logo*/ ctx[1].url && create_if_block_1$5(ctx);
	let if_block1 = /*logo*/ ctx[1].text && create_if_block$7(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*logo*/ ctx[1].url) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$5(ctx);
					if_block0.c();
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*logo*/ ctx[1].text) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$7(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { purifyHtml } = $$props;
	let { logo } = $$props;
	let { theme } = $$props;

	$$self.$set = $$props => {
		if ("purifyHtml" in $$props) $$invalidate(0, purifyHtml = $$props.purifyHtml);
		if ("logo" in $$props) $$invalidate(1, logo = $$props.logo);
		if ("theme" in $$props) $$invalidate(2, theme = $$props.theme);
	};

	return [purifyHtml, logo, theme];
}

class LogoInner extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, { purifyHtml: 0, logo: 1, theme: 2 });
	}
}/* lib/blocks/Logo.svelte generated by Svelte v3.23.2 */

function create_else_block$3(ctx) {
	let logoinner;
	let current;

	logoinner = new LogoInner({
			props: {
				logo: /*logo*/ ctx[1],
				purifyHtml: /*purifyHtml*/ ctx[2],
				theme: /*theme*/ ctx[0]
			}
		});

	return {
		c() {
			create_component(logoinner.$$.fragment);
		},
		m(target, anchor) {
			mount_component(logoinner, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const logoinner_changes = {};
			if (dirty & /*logo*/ 2) logoinner_changes.logo = /*logo*/ ctx[1];
			if (dirty & /*theme*/ 1) logoinner_changes.theme = /*theme*/ ctx[0];
			logoinner.$set(logoinner_changes);
		},
		i(local) {
			if (current) return;
			transition_in(logoinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(logoinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(logoinner, detaching);
		}
	};
}

// (13:0) {#if logo.link}
function create_if_block$8(ctx) {
	let a;
	let logoinner;
	let a_href_value;
	let current;

	logoinner = new LogoInner({
			props: {
				logo: /*logo*/ ctx[1],
				purifyHtml: /*purifyHtml*/ ctx[2],
				theme: /*theme*/ ctx[0]
			}
		});

	return {
		c() {
			a = element("a");
			create_component(logoinner.$$.fragment);
			attr(a, "href", a_href_value = /*logo*/ ctx[1].link);
			attr(a, "target", "_blank");
			attr(a, "rel", "noopener noreferrer");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			mount_component(logoinner, a, null);
			current = true;
		},
		p(ctx, dirty) {
			const logoinner_changes = {};
			if (dirty & /*logo*/ 2) logoinner_changes.logo = /*logo*/ ctx[1];
			if (dirty & /*theme*/ 1) logoinner_changes.theme = /*theme*/ ctx[0];
			logoinner.$set(logoinner_changes);

			if (!current || dirty & /*logo*/ 2 && a_href_value !== (a_href_value = /*logo*/ ctx[1].link)) {
				attr(a, "href", a_href_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(logoinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(logoinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			destroy_component(logoinner);
		}
	};
}

function create_fragment$b(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$8, create_else_block$3];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*logo*/ ctx[1].link) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(3, props = $$props.props);
	};

	let theme;
	let logo;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 8) {
			 $$invalidate(0, theme = props.theme);
		}

		if ($$self.$$.dirty & /*theme*/ 1) {
			// internal props
			 $$invalidate(1, logo = get(theme, "data.options.footer.logo"));
		}
	};

	return [theme, logo, purifyHtml, props];
}

class Logo extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { props: 3 });
	}
}/* lib/blocks/Rectangle.svelte generated by Svelte v3.23.2 */

function create_fragment$c(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "export-rect");
			set_style(div, "width", px(/*width*/ ctx[0]));
			set_style(div, "height", px(/*height*/ ctx[1]));
			set_style(div, "background", /*background*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*width*/ 1) {
				set_style(div, "width", px(/*width*/ ctx[0]));
			}

			if (dirty & /*height*/ 2) {
				set_style(div, "height", px(/*height*/ ctx[1]));
			}

			if (dirty & /*background*/ 4) {
				set_style(div, "background", /*background*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function px(val) {
	return typeof val === "string" ? val : val + "px";
}

function instance$c($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(3, props = $$props.props);
	};

	let theme;
	let data;
	let width;
	let height;
	let background;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 8) {
			 $$invalidate(4, theme = props.theme);
		}

		if ($$self.$$.dirty & /*theme*/ 16) {
			 $$invalidate(5, data = get(theme, "data.options.blocks.rectangle.data", {}));
		}

		if ($$self.$$.dirty & /*data*/ 32) {
			 $$invalidate(0, width = get(data, "width", 50));
		}

		if ($$self.$$.dirty & /*data*/ 32) {
			 $$invalidate(1, height = get(data, "height", 5));
		}

		if ($$self.$$.dirty & /*data*/ 32) {
			 $$invalidate(2, background = get(data, "background", "red"));
		}
	};

	return [width, height, background, props];
}

class Rectangle extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { props: 3 });
	}
}/**
 * returns the estimated width of a given text in Roboto.
 * this method has proven to be a good compromise between pixel-perfect
 * but expensive text measuring methods using canvas or getClientBoundingRect
 * and just multiplying the number of characters with a fixed width.
 *
 * be warned that this is just a rough estimate of the text width. the
 * character widths will vary from typeface to typeface and may be
 * off quite a bit for some fonts (like monospace fonts).
 *
 * @exports estimateTextWidth
 * @kind function
 *
 * @param {string} text - the text to measure
 * @param {number} fontSize - the output font size (optional, default is 14)
 *
 * @example
 * import estimateTextWidth from '@datawrapper/shared/estimateTextWidth';
 * // or import {estimateTextWidth} from '@datawrapper/shared';
 * const width = estimateTextWidth('my text', 12);
 *
 * @export
 * @returns {number}
 */
function estimateTextWidth(text, fontSize = 14) {
    const f = fontSize / 14;
    return text.split('').reduce((w, char) => w + (CHAR_W[char] || CHAR_W.a), 0) * f;
}

const CHAR_W = {
    a: 9,
    A: 10,
    b: 9,
    B: 10,
    c: 8,
    C: 10,
    d: 9,
    D: 11,
    e: 9,
    E: 9,
    f: 5,
    F: 8,
    g: 9,
    G: 11,
    h: 9,
    H: 11,
    i: 4,
    I: 4,
    j: 4,
    J: 4,
    k: 8,
    K: 9,
    l: 4,
    L: 8,
    m: 14,
    M: 12,
    n: 9,
    N: 10,
    o: 9,
    O: 11,
    p: 9,
    P: 8,
    q: 9,
    Q: 11,
    r: 6,
    R: 10,
    s: 7,
    S: 9,
    t: 5,
    T: 9,
    u: 9,
    U: 10,
    v: 8,
    V: 10,
    w: 11,
    W: 14,
    x: 8,
    X: 10,
    y: 8,
    Y: 9,
    z: 7,
    Z: 10,
    '.': 4,
    '!': 4,
    '|': 4,
    ',': 4,
    ':': 5,
    ';': 5,
    '-': 5,
    '+': 12,
    ' ': 4
};/* lib/blocks/Watermark.svelte generated by Svelte v3.23.2 */

function create_fragment$d(ctx) {
	let div;
	let span;
	let raw_value = /*purifyHtml*/ ctx[6](/*text*/ ctx[2]) + "";
	let mounted;
	let dispose;
	add_render_callback(/*onwindowresize*/ ctx[8]);

	return {
		c() {
			div = element("div");
			span = element("span");
			attr(div, "class", "watermark noscript svelte-111z7el");
			set_style(div, "transform", "rotate(" + /*angle*/ ctx[3] + "rad)");
			set_style(div, "font-size", /*fontSize*/ ctx[5]);
			attr(div, "data-rotate", /*angleDeg*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			span.innerHTML = raw_value;

			if (!mounted) {
				dispose = listen(window, "resize", /*onwindowresize*/ ctx[8]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*text*/ 4 && raw_value !== (raw_value = /*purifyHtml*/ ctx[6](/*text*/ ctx[2]) + "")) span.innerHTML = raw_value;
			if (dirty & /*angle*/ 8) {
				set_style(div, "transform", "rotate(" + /*angle*/ ctx[3] + "rad)");
			}

			if (dirty & /*fontSize*/ 32) {
				set_style(div, "font-size", /*fontSize*/ ctx[5]);
			}

			if (dirty & /*angleDeg*/ 16) {
				attr(div, "data-rotate", /*angleDeg*/ ctx[4]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get, purifyHtml } = props;
	let width;
	let height;

	function onwindowresize() {
		$$invalidate(0, width = window.innerWidth);
		$$invalidate(1, height = window.innerHeight);
	}

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(7, props = $$props.props);
	};

	let chart;
	let theme;
	let monospace;
	let field;
	let text;
	let angle;
	let angleDeg;
	let diagonal;
	let estWidth;
	let fontSize;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 128) {
			 $$invalidate(9, { chart, theme } = props, chart, ($$invalidate(10, theme), $$invalidate(7, props)));
		}

		if ($$self.$$.dirty & /*theme*/ 1024) {
			 $$invalidate(11, monospace = get(theme, "data.options.watermark.monospace", false));
		}

		if ($$self.$$.dirty & /*theme*/ 1024) {
			 $$invalidate(12, field = get(theme, "data.options.watermark.custom-field"));
		}

		if ($$self.$$.dirty & /*theme, field, chart*/ 5632) {
			 $$invalidate(2, text = get(theme, "data.options.watermark")
			? field
				? get(chart, `metadata.custom.${field}`, "")
				: get(theme, "data.options.watermark.text", "CONFIDENTIAL")
			: false);
		}

		if ($$self.$$.dirty & /*height, width*/ 3) {
			 $$invalidate(3, angle = -Math.atan(height / width));
		}

		if ($$self.$$.dirty & /*angle*/ 8) {
			 $$invalidate(4, angleDeg = angle * 180 / Math.PI);
		}

		if ($$self.$$.dirty & /*width, height*/ 3) {
			 $$invalidate(13, diagonal = Math.sqrt(width * width + height * height));
		}

		if ($$self.$$.dirty & /*monospace, text*/ 2052) {
			// estimateTextWidth works reasonable well for normal fonts
			// set theme.data.options.watermark.monospace to true if you
			// have a monospace font
			 $$invalidate(14, estWidth = monospace
			? text.length * 20
			: estimateTextWidth(text, 20));
		}

		if ($$self.$$.dirty & /*diagonal, estWidth*/ 24576) {
			 $$invalidate(5, fontSize = `${Math.round(20 * (diagonal * 0.75 / estWidth))}px`);
		}
	};

	return [
		width,
		height,
		text,
		angle,
		angleDeg,
		fontSize,
		purifyHtml,
		props,
		onwindowresize
	];
}

class Watermark extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$d, create_fragment$d, safe_not_equal, { props: 7 });
	}
}/* lib/blocks/HorizontalRule.svelte generated by Svelte v3.23.2 */

function create_fragment$e(ctx) {
	let hr;

	return {
		c() {
			hr = element("hr");
			attr(hr, "class", "dw-line");
			set_style(hr, "border", "0");
			set_style(hr, "border-bottom", /*border*/ ctx[0]);
			set_style(hr, "margin", /*margin*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, hr, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*border*/ 1) {
				set_style(hr, "border-bottom", /*border*/ ctx[0]);
			}

			if (dirty & /*margin*/ 2) {
				set_style(hr, "margin", /*margin*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(hr);
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get } = props;

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(2, props = $$props.props);
	};

	let theme;
	let data;
	let border;
	let margin;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 4) {
			 $$invalidate(3, theme = props.theme);
		}

		if ($$self.$$.dirty & /*theme, props*/ 12) {
			 $$invalidate(4, data = get(theme, `data.options.blocks.${props.id}.data`, {}));
		}

		if ($$self.$$.dirty & /*data*/ 16) {
			 $$invalidate(0, border = get(data, "border", "1px solid #cccccc"));
		}

		if ($$self.$$.dirty & /*data*/ 16) {
			 $$invalidate(1, margin = get(data, "margin", "0px"));
		}
	};

	return [border, margin, props];
}

class HorizontalRule extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$e, create_fragment$e, safe_not_equal, { props: 2 });
	}
}/* lib/blocks/svgRule.svelte generated by Svelte v3.23.2 */

function create_fragment$f(ctx) {
	let svg_1;
	let line;
	let line_y__value;
	let line_y__value_1;

	return {
		c() {
			svg_1 = svg_element("svg");
			line = svg_element("line");
			set_style(line, "stroke", /*color*/ ctx[3]);
			set_style(line, "stroke-width", /*width*/ ctx[4]);
			set_style(line, "stroke-dasharray", /*strokeDasharray*/ ctx[5]);
			set_style(line, "stroke-linecap", /*strokeLinecap*/ ctx[6]);
			attr(line, "x1", "0");
			attr(line, "y1", line_y__value = /*width*/ ctx[4] / 2);
			attr(line, "x2", /*length*/ ctx[1]);
			attr(line, "y2", line_y__value_1 = /*width*/ ctx[4] / 2);
			set_style(svg_1, "height", Math.max(/*width*/ ctx[4], 1) + "px");
			set_style(svg_1, "margin", /*margin*/ ctx[2]);
			attr(svg_1, "class", "svelte-eczzvz");
		},
		m(target, anchor) {
			insert(target, svg_1, anchor);
			append(svg_1, line);
			/*svg_1_binding*/ ctx[8](svg_1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*color*/ 8) {
				set_style(line, "stroke", /*color*/ ctx[3]);
			}

			if (dirty & /*width*/ 16) {
				set_style(line, "stroke-width", /*width*/ ctx[4]);
			}

			if (dirty & /*strokeDasharray*/ 32) {
				set_style(line, "stroke-dasharray", /*strokeDasharray*/ ctx[5]);
			}

			if (dirty & /*strokeLinecap*/ 64) {
				set_style(line, "stroke-linecap", /*strokeLinecap*/ ctx[6]);
			}

			if (dirty & /*width*/ 16 && line_y__value !== (line_y__value = /*width*/ ctx[4] / 2)) {
				attr(line, "y1", line_y__value);
			}

			if (dirty & /*length*/ 2) {
				attr(line, "x2", /*length*/ ctx[1]);
			}

			if (dirty & /*width*/ 16 && line_y__value_1 !== (line_y__value_1 = /*width*/ ctx[4] / 2)) {
				attr(line, "y2", line_y__value_1);
			}

			if (dirty & /*width*/ 16) {
				set_style(svg_1, "height", Math.max(/*width*/ ctx[4], 1) + "px");
			}

			if (dirty & /*margin*/ 4) {
				set_style(svg_1, "margin", /*margin*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg_1);
			/*svg_1_binding*/ ctx[8](null);
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let { props } = $$props;
	const { get } = props;
	let svg;
	let length = 0;

	onMount(() => {
		$$invalidate(1, length = svg.getBoundingClientRect().width);
	});

	if (typeof window !== "undefined") {
		window.addEventListener("resize", () => {
			$$invalidate(1, length = svg.getBoundingClientRect().width);
		});
	}

	function svg_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			svg = $$value;
			$$invalidate(0, svg);
		});
	}

	$$self.$set = $$props => {
		if ("props" in $$props) $$invalidate(7, props = $$props.props);
	};

	let theme;
	let data;
	let margin;
	let color;
	let width;
	let strokeDasharray;
	let strokeLinecap;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*props*/ 128) {
			 $$invalidate(9, theme = props.theme);
		}

		if ($$self.$$.dirty & /*theme, props*/ 640) {
			 $$invalidate(10, data = get(theme, `data.options.blocks.${props.id}.data`, {}));
		}

		if ($$self.$$.dirty & /*data*/ 1024) {
			 $$invalidate(2, margin = get(data, "margin", "0px"));
		}

		if ($$self.$$.dirty & /*data*/ 1024) {
			 $$invalidate(3, color = get(data, "color", "#000000"));
		}

		if ($$self.$$.dirty & /*data*/ 1024) {
			 $$invalidate(4, width = get(data, "width", 1));
		}

		if ($$self.$$.dirty & /*data*/ 1024) {
			 $$invalidate(5, strokeDasharray = get(data, "strokeDasharray", "none"));
		}

		if ($$self.$$.dirty & /*data*/ 1024) {
			 $$invalidate(6, strokeLinecap = get(data, "strokeLinecap", "butt"));
		}
	};

	return [
		svg,
		length,
		margin,
		color,
		width,
		strokeDasharray,
		strokeLinecap,
		props,
		svg_1_binding
	];
}

class SvgRule extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$f, create_fragment$f, safe_not_equal, { props: 7 });
	}
}// Current version.
var VERSION = '1.12.1';

// Establish the root object, `window` (`self`) in the browser, `global`
// on the server, or `this` in some virtual machines. We use `self`
// instead of `window` for `WebWorker` support.
var root = typeof self == 'object' && self.self === self && self ||
          typeof global == 'object' && global.global === global && global ||
          Function('return this')() ||
          {};

// Save bytes in the minified (but not gzipped) version:
var ArrayProto = Array.prototype, ObjProto = Object.prototype;

// Create quick reference variables for speed access to core prototypes.
var slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

// Modern feature detection.
var supportsDataView = typeof DataView !== 'undefined';

// All **ECMAScript 5+** native function implementations that we hope to use
// are declared here.
var nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeCreate = Object.create;

// Create references to these builtin functions because we override them.
var _isNaN = isNaN;

// Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
  'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

// The largest integer that can be represented exactly.
var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;// Some functions take a variable number of arguments, or a few expected
// arguments at the beginning and then a variable number of values to operate
// on. This helper accumulates all remaining arguments past the function’s
// argument length (or an explicit `startIndex`), into an array that becomes
// the last argument. Similar to ES6’s "rest parameter".
function restArguments(func, startIndex) {
  startIndex = startIndex == null ? func.length - 1 : +startIndex;
  return function() {
    var length = Math.max(arguments.length - startIndex, 0),
        rest = Array(length),
        index = 0;
    for (; index < length; index++) {
      rest[index] = arguments[index + startIndex];
    }
    switch (startIndex) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, arguments[0], rest);
      case 2: return func.call(this, arguments[0], arguments[1], rest);
    }
    var args = Array(startIndex + 1);
    for (index = 0; index < startIndex; index++) {
      args[index] = arguments[index];
    }
    args[startIndex] = rest;
    return func.apply(this, args);
  };
}// Is a given variable an object?
function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}// Is a given value a boolean?
function isBoolean(obj) {
  return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
}// Internal function for creating a `toString`-based type tester.
function tagTester(name) {
  var tag = '[object ' + name + ']';
  return function(obj) {
    return toString.call(obj) === tag;
  };
}var isNumber = tagTester('Number');var isRegExp = tagTester('RegExp');var isFunction = tagTester('Function');

// Optimize `isFunction` if appropriate. Work around some `typeof` bugs in old
// v8, IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
var nodelist = root.document && root.document.childNodes;
if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
  isFunction = function(obj) {
    return typeof obj == 'function' || false;
  };
}

var isFunction$1 = isFunction;var hasObjectTag = tagTester('Object');// In IE 10 - Edge 13, `DataView` has string tag `'[object Object]'`.
// In IE 11, the most common among them, this problem also applies to
// `Map`, `WeakMap` and `Set`.
var hasStringTagBug = (
      supportsDataView && hasObjectTag(new DataView(new ArrayBuffer(8)))
    ),
    isIE11 = (typeof Map !== 'undefined' && hasObjectTag(new Map));// Is a given value an array?
// Delegates to ECMA5's native `Array.isArray`.
var isArray = nativeIsArray || tagTester('Array');// Internal function to check whether `key` is an own property name of `obj`.
function has(obj, key) {
  return obj != null && hasOwnProperty.call(obj, key);
}var isArguments = tagTester('Arguments');

// Define a fallback version of the method in browsers (ahem, IE < 9), where
// there isn't any inspectable "Arguments" type.
(function() {
  if (!isArguments(arguments)) {
    isArguments = function(obj) {
      return has(obj, 'callee');
    };
  }
}());

var isArguments$1 = isArguments;// Is the given value `NaN`?
function isNaN$1(obj) {
  return isNumber(obj) && _isNaN(obj);
}// Common internal logic for `isArrayLike` and `isBufferLike`.
function createSizePropertyCheck(getSizeProperty) {
  return function(collection) {
    var sizeProperty = getSizeProperty(collection);
    return typeof sizeProperty == 'number' && sizeProperty >= 0 && sizeProperty <= MAX_ARRAY_INDEX;
  }
}// Internal helper to generate a function to obtain property `key` from `obj`.
function shallowProperty(key) {
  return function(obj) {
    return obj == null ? void 0 : obj[key];
  };
}// Internal helper to obtain the `length` property of an object.
var getLength = shallowProperty('length');// Internal helper to create a simple lookup structure.
// `collectNonEnumProps` used to depend on `_.contains`, but this led to
// circular imports. `emulatedSet` is a one-off solution that only works for
// arrays of strings.
function emulatedSet(keys) {
  var hash = {};
  for (var l = keys.length, i = 0; i < l; ++i) hash[keys[i]] = true;
  return {
    contains: function(key) { return hash[key]; },
    push: function(key) {
      hash[key] = true;
      return keys.push(key);
    }
  };
}

// Internal helper. Checks `keys` for the presence of keys in IE < 9 that won't
// be iterated by `for key in ...` and thus missed. Extends `keys` in place if
// needed.
function collectNonEnumProps(obj, keys) {
  keys = emulatedSet(keys);
  var nonEnumIdx = nonEnumerableProps.length;
  var constructor = obj.constructor;
  var proto = isFunction$1(constructor) && constructor.prototype || ObjProto;

  // Constructor is a special case.
  var prop = 'constructor';
  if (has(obj, prop) && !keys.contains(prop)) keys.push(prop);

  while (nonEnumIdx--) {
    prop = nonEnumerableProps[nonEnumIdx];
    if (prop in obj && obj[prop] !== proto[prop] && !keys.contains(prop)) {
      keys.push(prop);
    }
  }
}// Retrieve the names of an object's own properties.
// Delegates to **ECMAScript 5**'s native `Object.keys`.
function keys(obj) {
  if (!isObject(obj)) return [];
  if (nativeKeys) return nativeKeys(obj);
  var keys = [];
  for (var key in obj) if (has(obj, key)) keys.push(key);
  // Ahem, IE < 9.
  if (hasEnumBug) collectNonEnumProps(obj, keys);
  return keys;
}// Returns whether an object has a given set of `key:value` pairs.
function isMatch(object, attrs) {
  var _keys = keys(attrs), length = _keys.length;
  if (object == null) return !length;
  var obj = Object(object);
  for (var i = 0; i < length; i++) {
    var key = _keys[i];
    if (attrs[key] !== obj[key] || !(key in obj)) return false;
  }
  return true;
}// If Underscore is called as a function, it returns a wrapped object that can
// be used OO-style. This wrapper holds altered versions of all functions added
// through `_.mixin`. Wrapped objects may be chained.
function _(obj) {
  if (obj instanceof _) return obj;
  if (!(this instanceof _)) return new _(obj);
  this._wrapped = obj;
}

_.VERSION = VERSION;

// Extracts the result from a wrapped and chained object.
_.prototype.value = function() {
  return this._wrapped;
};

// Provide unwrapping proxies for some methods used in engine operations
// such as arithmetic and JSON stringification.
_.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

_.prototype.toString = function() {
  return String(this._wrapped);
};// Retrieve all the enumerable property names of an object.
function allKeys(obj) {
  if (!isObject(obj)) return [];
  var keys = [];
  for (var key in obj) keys.push(key);
  // Ahem, IE < 9.
  if (hasEnumBug) collectNonEnumProps(obj, keys);
  return keys;
}// Since the regular `Object.prototype.toString` type tests don't work for
// some types in IE 11, we use a fingerprinting heuristic instead, based
// on the methods. It's not great, but it's the best we got.
// The fingerprint method lists are defined below.
function ie11fingerprint(methods) {
  var length = getLength(methods);
  return function(obj) {
    if (obj == null) return false;
    // `Map`, `WeakMap` and `Set` have no enumerable keys.
    var keys = allKeys(obj);
    if (getLength(keys)) return false;
    for (var i = 0; i < length; i++) {
      if (!isFunction$1(obj[methods[i]])) return false;
    }
    // If we are testing against `WeakMap`, we need to ensure that
    // `obj` doesn't have a `forEach` method in order to distinguish
    // it from a regular `Map`.
    return methods !== weakMapMethods || !isFunction$1(obj[forEachName]);
  };
}

// In the interest of compact minification, we write
// each string in the fingerprints only once.
var forEachName = 'forEach',
    hasName = 'has',
    commonInit = ['clear', 'delete'],
    mapTail = ['get', hasName, 'set'];

// `Map`, `WeakMap` and `Set` each have slightly different
// combinations of the above sublists.
var mapMethods = commonInit.concat(forEachName, mapTail),
    weakMapMethods = commonInit.concat(mapTail),
    setMethods = ['add'].concat(commonInit, forEachName, hasName);isIE11 ? ie11fingerprint(mapMethods) : tagTester('Map');isIE11 ? ie11fingerprint(weakMapMethods) : tagTester('WeakMap');isIE11 ? ie11fingerprint(setMethods) : tagTester('Set');// Retrieve the values of an object's properties.
function values(obj) {
  var _keys = keys(obj);
  var length = _keys.length;
  var values = Array(length);
  for (var i = 0; i < length; i++) {
    values[i] = obj[_keys[i]];
  }
  return values;
}// Invert the keys and values of an object. The values must be serializable.
function invert(obj) {
  var result = {};
  var _keys = keys(obj);
  for (var i = 0, length = _keys.length; i < length; i++) {
    result[obj[_keys[i]]] = _keys[i];
  }
  return result;
}// An internal function for creating assigner functions.
function createAssigner(keysFunc, defaults) {
  return function(obj) {
    var length = arguments.length;
    if (defaults) obj = Object(obj);
    if (length < 2 || obj == null) return obj;
    for (var index = 1; index < length; index++) {
      var source = arguments[index],
          keys = keysFunc(source),
          l = keys.length;
      for (var i = 0; i < l; i++) {
        var key = keys[i];
        if (!defaults || obj[key] === void 0) obj[key] = source[key];
      }
    }
    return obj;
  };
}// Assigns a given object with all the own properties in the passed-in
// object(s).
// (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
var extendOwn = createAssigner(keys);// Create a naked function reference for surrogate-prototype-swapping.
function ctor() {
  return function(){};
}

// An internal function for creating a new object that inherits from another.
function baseCreate(prototype) {
  if (!isObject(prototype)) return {};
  if (nativeCreate) return nativeCreate(prototype);
  var Ctor = ctor();
  Ctor.prototype = prototype;
  var result = new Ctor;
  Ctor.prototype = null;
  return result;
}// Normalize a (deep) property `path` to array.
// Like `_.iteratee`, this function can be customized.
function toPath(path) {
  return isArray(path) ? path : [path];
}
_.toPath = toPath;// Internal wrapper for `_.toPath` to enable minification.
// Similar to `cb` for `_.iteratee`.
function toPath$1(path) {
  return _.toPath(path);
}// Internal function to obtain a nested property in `obj` along `path`.
function deepGet(obj, path) {
  var length = path.length;
  for (var i = 0; i < length; i++) {
    if (obj == null) return void 0;
    obj = obj[path[i]];
  }
  return length ? obj : void 0;
}// Keep the identity function around for default iteratees.
function identity(value) {
  return value;
}// Returns a predicate for checking whether an object has a given set of
// `key:value` pairs.
function matcher(attrs) {
  attrs = extendOwn({}, attrs);
  return function(obj) {
    return isMatch(obj, attrs);
  };
}// Creates a function that, when passed an object, will traverse that object’s
// properties down the given `path`, specified as an array of keys or indices.
function property(path) {
  path = toPath$1(path);
  return function(obj) {
    return deepGet(obj, path);
  };
}// Internal function that returns an efficient (for current engines) version
// of the passed-in callback, to be repeatedly applied in other Underscore
// functions.
function optimizeCb(func, context, argCount) {
  if (context === void 0) return func;
  switch (argCount == null ? 3 : argCount) {
    case 1: return function(value) {
      return func.call(context, value);
    };
    // The 2-argument case is omitted because we’re not using it.
    case 3: return function(value, index, collection) {
      return func.call(context, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(context, accumulator, value, index, collection);
    };
  }
  return function() {
    return func.apply(context, arguments);
  };
}// An internal function to generate callbacks that can be applied to each
// element in a collection, returning the desired result — either `_.identity`,
// an arbitrary callback, a property matcher, or a property accessor.
function baseIteratee(value, context, argCount) {
  if (value == null) return identity;
  if (isFunction$1(value)) return optimizeCb(value, context, argCount);
  if (isObject(value) && !isArray(value)) return matcher(value);
  return property(value);
}// External wrapper for our callback generator. Users may customize
// `_.iteratee` if they want additional predicate/iteratee shorthand styles.
// This abstraction hides the internal-only `argCount` argument.
function iteratee(value, context) {
  return baseIteratee(value, context, Infinity);
}
_.iteratee = iteratee;// The function we call internally to generate a callback. It invokes
// `_.iteratee` if overridden, otherwise `baseIteratee`.
function cb(value, context, argCount) {
  if (_.iteratee !== iteratee) return _.iteratee(value, context);
  return baseIteratee(value, context, argCount);
}// Internal helper to generate functions for escaping and unescaping strings
// to/from HTML interpolation.
function createEscaper(map) {
  var escaper = function(match) {
    return map[match];
  };
  // Regexes for identifying a key that needs to be escaped.
  var source = '(?:' + keys(map).join('|') + ')';
  var testRegexp = RegExp(source);
  var replaceRegexp = RegExp(source, 'g');
  return function(string) {
    string = string == null ? '' : '' + string;
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
  };
}// Internal list of HTML entities for escaping.
var escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;'
};// Function for escaping strings to HTML interpolation.
createEscaper(escapeMap);// Internal list of HTML entities for unescaping.
var unescapeMap = invert(escapeMap);// Function for unescaping strings from HTML interpolation.
createEscaper(unescapeMap);// By default, Underscore uses ERB-style template delimiters. Change the
// following template settings to use alternative delimiters.
_.templateSettings = {
  evaluate: /<%([\s\S]+?)%>/g,
  interpolate: /<%=([\s\S]+?)%>/g,
  escape: /<%-([\s\S]+?)%>/g
};// Internal function to execute `sourceFunc` bound to `context` with optional
// `args`. Determines whether to execute a function as a constructor or as a
// normal function.
function executeBound(sourceFunc, boundFunc, context, callingContext, args) {
  if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
  var self = baseCreate(sourceFunc.prototype);
  var result = sourceFunc.apply(self, args);
  if (isObject(result)) return result;
  return self;
}// Partially apply a function by creating a version that has had some of its
// arguments pre-filled, without changing its dynamic `this` context. `_` acts
// as a placeholder by default, allowing any combination of arguments to be
// pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
var partial = restArguments(function(func, boundArgs) {
  var placeholder = partial.placeholder;
  var bound = function() {
    var position = 0, length = boundArgs.length;
    var args = Array(length);
    for (var i = 0; i < length; i++) {
      args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
    }
    while (position < arguments.length) args.push(arguments[position++]);
    return executeBound(func, bound, this, this, args);
  };
  return bound;
});

partial.placeholder = _;// Create a function bound to a given object (assigning `this`, and arguments,
// optionally).
var bind = restArguments(function(func, context, args) {
  if (!isFunction$1(func)) throw new TypeError('Bind must be called on a function');
  var bound = restArguments(function(callArgs) {
    return executeBound(func, bound, context, this, args.concat(callArgs));
  });
  return bound;
});// Internal helper for collection methods to determine whether a collection
// should be iterated as an array or as an object.
// Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
// Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
var isArrayLike = createSizePropertyCheck(getLength);// Internal implementation of a recursive `flatten` function.
function flatten(input, depth, strict, output) {
  output = output || [];
  if (!depth && depth !== 0) {
    depth = Infinity;
  } else if (depth <= 0) {
    return output.concat(input);
  }
  var idx = output.length;
  for (var i = 0, length = getLength(input); i < length; i++) {
    var value = input[i];
    if (isArrayLike(value) && (isArray(value) || isArguments$1(value))) {
      // Flatten current level of array or arguments object.
      if (depth > 1) {
        flatten(value, depth - 1, strict, output);
        idx = output.length;
      } else {
        var j = 0, len = value.length;
        while (j < len) output[idx++] = value[j++];
      }
    } else if (!strict) {
      output[idx++] = value;
    }
  }
  return output;
}// Bind a number of an object's methods to that object. Remaining arguments
// are the method names to be bound. Useful for ensuring that all callbacks
// defined on an object belong to it.
restArguments(function(obj, keys) {
  keys = flatten(keys, false, false);
  var index = keys.length;
  if (index < 1) throw new Error('bindAll must be passed function names');
  while (index--) {
    var key = keys[index];
    obj[key] = bind(obj[key], obj);
  }
  return obj;
});// Delays a function for the given number of milliseconds, and then calls
// it with the arguments supplied.
var delay = restArguments(function(func, wait, args) {
  return setTimeout(function() {
    return func.apply(null, args);
  }, wait);
});// Defers a function, scheduling it to run after the current call stack has
// cleared.
partial(delay, _, 1);// Returns a negated version of the passed-in predicate.
function negate(predicate) {
  return function() {
    return !predicate.apply(this, arguments);
  };
}// Returns a function that will only be executed up to (but not including) the
// Nth call.
function before(times, func) {
  var memo;
  return function() {
    if (--times > 0) {
      memo = func.apply(this, arguments);
    }
    if (times <= 1) func = null;
    return memo;
  };
}// Returns a function that will be executed at most one time, no matter how
// often you call it. Useful for lazy initialization.
partial(before, 2);// Internal function to generate `_.findIndex` and `_.findLastIndex`.
function createPredicateIndexFinder(dir) {
  return function(array, predicate, context) {
    predicate = cb(predicate, context);
    var length = getLength(array);
    var index = dir > 0 ? 0 : length - 1;
    for (; index >= 0 && index < length; index += dir) {
      if (predicate(array[index], index, array)) return index;
    }
    return -1;
  };
}// Returns the first index on an array-like that passes a truth test.
var findIndex = createPredicateIndexFinder(1);// Use a comparator function to figure out the smallest index at which
// an object should be inserted so as to maintain order. Uses binary search.
function sortedIndex(array, obj, iteratee, context) {
  iteratee = cb(iteratee, context, 1);
  var value = iteratee(obj);
  var low = 0, high = getLength(array);
  while (low < high) {
    var mid = Math.floor((low + high) / 2);
    if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
  }
  return low;
}// Internal function to generate the `_.indexOf` and `_.lastIndexOf` functions.
function createIndexFinder(dir, predicateFind, sortedIndex) {
  return function(array, item, idx) {
    var i = 0, length = getLength(array);
    if (typeof idx == 'number') {
      if (dir > 0) {
        i = idx >= 0 ? idx : Math.max(idx + length, i);
      } else {
        length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
      }
    } else if (sortedIndex && idx && length) {
      idx = sortedIndex(array, item);
      return array[idx] === item ? idx : -1;
    }
    if (item !== item) {
      idx = predicateFind(slice.call(array, i, length), isNaN$1);
      return idx >= 0 ? idx + i : -1;
    }
    for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
      if (array[idx] === item) return idx;
    }
    return -1;
  };
}// Return the position of the first occurrence of an item in an array,
// or -1 if the item is not included in the array.
// If the array is large and already in sort order, pass `true`
// for **isSorted** to use binary search.
var indexOf = createIndexFinder(1, findIndex, sortedIndex);// The cornerstone for collection functions, an `each`
// implementation, aka `forEach`.
// Handles raw objects in addition to array-likes. Treats all
// sparse array-likes as if they were dense.
function each(obj, iteratee, context) {
  iteratee = optimizeCb(iteratee, context);
  var i, length;
  if (isArrayLike(obj)) {
    for (i = 0, length = obj.length; i < length; i++) {
      iteratee(obj[i], i, obj);
    }
  } else {
    var _keys = keys(obj);
    for (i = 0, length = _keys.length; i < length; i++) {
      iteratee(obj[_keys[i]], _keys[i], obj);
    }
  }
  return obj;
}// Return the results of applying the iteratee to each element.
function map(obj, iteratee, context) {
  iteratee = cb(iteratee, context);
  var _keys = !isArrayLike(obj) && keys(obj),
      length = (_keys || obj).length,
      results = Array(length);
  for (var index = 0; index < length; index++) {
    var currentKey = _keys ? _keys[index] : index;
    results[index] = iteratee(obj[currentKey], currentKey, obj);
  }
  return results;
}// Return all the elements that pass a truth test.
function filter(obj, predicate, context) {
  var results = [];
  predicate = cb(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate(value, index, list)) results.push(value);
  });
  return results;
}// Determine if the array or object contains a given item (using `===`).
function contains(obj, item, fromIndex, guard) {
  if (!isArrayLike(obj)) obj = values(obj);
  if (typeof fromIndex != 'number' || guard) fromIndex = 0;
  return indexOf(obj, item, fromIndex) >= 0;
}// Invoke a method (with arguments) on every item in a collection.
restArguments(function(obj, path, args) {
  var contextPath, func;
  if (isFunction$1(path)) {
    func = path;
  } else {
    path = toPath$1(path);
    contextPath = path.slice(0, -1);
    path = path[path.length - 1];
  }
  return map(obj, function(context) {
    var method = func;
    if (!method) {
      if (contextPath && contextPath.length) {
        context = deepGet(context, contextPath);
      }
      if (context == null) return void 0;
      method = context[path];
    }
    return method == null ? method : method.apply(context, args);
  });
});// Convenience version of a common use case of `_.map`: fetching a property.
function pluck(obj, key) {
  return map(obj, property(key));
}// Return the maximum element (or element-based computation).
function max(obj, iteratee, context) {
  var result = -Infinity, lastComputed = -Infinity,
      value, computed;
  if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
    obj = isArrayLike(obj) ? obj : values(obj);
    for (var i = 0, length = obj.length; i < length; i++) {
      value = obj[i];
      if (value != null && value > result) {
        result = value;
      }
    }
  } else {
    iteratee = cb(iteratee, context);
    each(obj, function(v, index, list) {
      computed = iteratee(v, index, list);
      if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
        result = v;
        lastComputed = computed;
      }
    });
  }
  return result;
}// Internal `_.pick` helper function to determine whether `key` is an enumerable
// property name of `obj`.
function keyInObj(value, key, obj) {
  return key in obj;
}// Return a copy of the object only containing the allowed properties.
var pick = restArguments(function(obj, keys) {
  var result = {}, iteratee = keys[0];
  if (obj == null) return result;
  if (isFunction$1(iteratee)) {
    if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
    keys = allKeys(obj);
  } else {
    iteratee = keyInObj;
    keys = flatten(keys, false, false);
    obj = Object(obj);
  }
  for (var i = 0, length = keys.length; i < length; i++) {
    var key = keys[i];
    var value = obj[key];
    if (iteratee(value, key, obj)) result[key] = value;
  }
  return result;
});// Return a copy of the object without the disallowed properties.
restArguments(function(obj, keys) {
  var iteratee = keys[0], context;
  if (isFunction$1(iteratee)) {
    iteratee = negate(iteratee);
    if (keys.length > 1) context = keys[1];
  } else {
    keys = map(flatten(keys, false, false), String);
    iteratee = function(value, key) {
      return !contains(keys, key);
    };
  }
  return pick(obj, iteratee, context);
});// Flatten out an array, either recursively (by default), or up to `depth`.
// Passing `true` or `false` as `depth` means `1` or `Infinity`, respectively.
function flatten$1(array, depth) {
  return flatten(array, depth, false);
}// Take the difference between one array and a number of other arrays.
// Only the elements present in just the first array will remain.
var difference = restArguments(function(array, rest) {
  rest = flatten(rest, true, true);
  return filter(array, function(value){
    return !contains(rest, value);
  });
});// Return a version of the array that does not contain the specified value(s).
restArguments(function(array, otherArrays) {
  return difference(array, otherArrays);
});// Produce a duplicate-free version of the array. If the array has already
// been sorted, you have the option of using a faster algorithm.
// The faster algorithm will not work with an iteratee if the iteratee
// is not a one-to-one function, so providing an iteratee will disable
// the faster algorithm.
function uniq(array, isSorted, iteratee, context) {
  if (!isBoolean(isSorted)) {
    context = iteratee;
    iteratee = isSorted;
    isSorted = false;
  }
  if (iteratee != null) iteratee = cb(iteratee, context);
  var result = [];
  var seen = [];
  for (var i = 0, length = getLength(array); i < length; i++) {
    var value = array[i],
        computed = iteratee ? iteratee(value, i, array) : value;
    if (isSorted && !iteratee) {
      if (!i || seen !== computed) result.push(value);
      seen = computed;
    } else if (iteratee) {
      if (!contains(seen, computed)) {
        seen.push(computed);
        result.push(value);
      }
    } else if (!contains(result, value)) {
      result.push(value);
    }
  }
  return result;
}// Produce an array that contains the union: each distinct element from all of
// the passed-in arrays.
restArguments(function(arrays) {
  return uniq(flatten(arrays, true, true));
});// Complement of zip. Unzip accepts an array of arrays and groups
// each array's elements on shared indices.
function unzip(array) {
  var length = array && max(array, getLength).length || 0;
  var result = Array(length);

  for (var index = 0; index < length; index++) {
    result[index] = pluck(array, index);
  }
  return result;
}// Zip together multiple lists into a single array -- elements that share
// an index go together.
restArguments(unzip);// Helper function to continue chaining intermediate results.
function chainResult(instance, obj) {
  return instance._chain ? _(obj).chain() : obj;
}// Add all mutator `Array` functions to the wrapper.
each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
  var method = ArrayProto[name];
  _.prototype[name] = function() {
    var obj = this._wrapped;
    if (obj != null) {
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) {
        delete obj[0];
      }
    }
    return chainResult(this, obj);
  };
});

// Add all accessor `Array` functions to the wrapper.
each(['concat', 'join', 'slice'], function(name) {
  var method = ArrayProto[name];
  _.prototype[name] = function() {
    var obj = this._wrapped;
    if (obj != null) obj = method.apply(obj, arguments);
    return chainResult(this, obj);
  };
});/* globals Globalize */

const begin = /^ */.source;
const end = /[*']* *$/.source;
const s0 = /[ \-/.]?/.source; // optional separator
const s1 = /[ \-/.]/.source; // mandatory separator
const s2 = /[ \-/.;,]/.source; // mandatory separator
const s3 = /[ \-|T]/.source; // mandatory separator
const sM = /[ \-/.m]/.source; // mandatory separator
const rx = {
    YY: { parse: /['’‘]?(\d{2})/ },
    YYYY: { test: /([12]\d{3})/, parse: /(\d{4})/ },
    YYYY2: { test: /(?:1[7-9]|20)\d{2}/, parse: /(\d{4})/ },
    H: { parse: /h([12])/ },
    Q: { parse: /q([1234])/ },
    W: { parse: /w([0-5]?[0-9])/ },
    MM: { test: /(0?[1-9]|1[0-2])/, parse: /(0?[1-9]|1[0-2])/ },
    DD: { parse: /(0?[1-9]|[1-2][0-9]|3[01])/ },
    DOW: { parse: /([0-7])/ },
    HHMM: { parse: /(0?\d|1\d|2[0-3]):([0-5]\d)(?::([0-5]\d))? *(am|pm)?/ }
};

const MONTHS = {
    // feel free to add more localized month names
    0: [
        'jan',
        'january',
        'januar',
        'jänner',
        'jän',
        'janv',
        'janvier',
        'ene',
        'enero',
        'gen',
        'gennaio',
        'janeiro'
    ],
    1: [
        'feb',
        'february',
        'febr',
        'februar',
        'fév',
        'févr',
        'février',
        'febrero',
        'febbraio',
        'fev',
        'fevereiro'
    ],
    2: ['mar', 'mär', 'march', 'mrz', 'märz', 'mars', 'mars', 'marzo', 'marzo', 'março'],
    3: ['apr', 'april', 'apr', 'april', 'avr', 'avril', 'abr', 'abril', 'aprile'],
    4: ['may', 'mai', 'mayo', 'mag', 'maggio', 'maio', 'maj'],
    5: ['jun', 'june', 'juni', 'juin', 'junio', 'giu', 'giugno', 'junho'],
    6: ['jul', 'july', 'juli', 'juil', 'juillet', 'julio', 'lug', 'luglio', 'julho'],
    7: ['aug', 'august', 'août', 'ago', 'agosto'],
    8: ['sep', 'september', 'sept', 'septembre', 'septiembre', 'set', 'settembre', 'setembro'],
    9: [
        'oct',
        'october',
        'okt',
        'oktober',
        'octobre',
        'octubre',
        'ott',
        'ottobre',
        'out',
        'outubro'
    ],
    10: ['nov', 'november', 'november', 'novembre', 'noviembre', 'novembre', 'novembro'],
    11: [
        'dec',
        'december',
        'dez',
        'des',
        'dezember',
        'déc',
        'décembre',
        'dic',
        'diciembre',
        'dicembre',
        'desember',
        'dezembro'
    ]
};

each(MONTHS, function(abbr, m) {
    each(abbr, function(a) {
    });
});

rx.MMM = { parse: new RegExp('(' + flatten$1(values(MONTHS)).join('|') + ')') };

each(rx, function(r) {
    r.parse = r.parse.source;
    if (isRegExp(r.test)) r.test = r.test.source;
    else r.test = r.parse;
});

var knownFormats = {
    // each format has two regex, a strict one for format guessing
    // based on a sample and a lazy one for parsing
    YYYY: {
        test: reg(rx.YYYY2.test),
        parse: reg(rx.YYYY2.parse),
        precision: 'year'
    },
    'YYYY-H': {
        test: reg(rx.YYYY.test, s0, rx.H.test),
        parse: reg(rx.YYYY.parse, s0, rx.H.parse),
        precision: 'half'
    },
    'H-YYYY': {
        test: reg(rx.H.test, s1, rx.YYYY.test),
        parse: reg(rx.H.parse, s1, rx.YYYY.parse),
        precision: 'half'
    },
    'YYYY-Q': {
        test: reg(rx.YYYY.test, s0, rx.Q.test),
        parse: reg(rx.YYYY.parse, s0, rx.Q.parse),
        precision: 'quarter'
    },
    'Q-YYYY': {
        test: reg(rx.Q.test, s1, rx.YYYY.test),
        parse: reg(rx.Q.parse, s1, rx.YYYY.parse),
        precision: 'quarter'
    },
    'YYYY-M': {
        test: reg(rx.YYYY.test, sM, rx.MM.test),
        parse: reg(rx.YYYY.parse, sM, rx.MM.parse),
        precision: 'month'
    },
    'M-YYYY': {
        test: reg(rx.MM.test, s1, rx.YYYY.test),
        parse: reg(rx.MM.parse, s1, rx.YYYY.parse),
        precision: 'month'
    },
    'YYYY-MMM': {
        test: reg(rx.YYYY.test, s1, rx.MMM.parse),
        parse: reg(rx.YYYY.parse, s1, rx.MMM.parse),
        precision: 'month'
    },
    'MMM-YYYY': {
        test: reg(rx.MMM.parse, s1, rx.YYYY.test),
        parse: reg(rx.MMM.parse, s1, rx.YYYY.parse),
        precision: 'month'
    },
    'MMM-YY': {
        test: reg(rx.MMM.parse, s1, rx.YY.test),
        parse: reg(rx.MMM.parse, s1, rx.YY.parse),
        precision: 'month'
    },
    MMM: {
        test: reg(rx.MMM.parse),
        parse: reg(rx.MMM.parse),
        precision: 'month'
    },
    'YYYY-WW': {
        test: reg(rx.YYYY.test, s0, rx.W.test),
        parse: reg(rx.YYYY.parse, s0, rx.W.parse),
        precision: 'week'
    },
    'WW-YYYY': {
        test: reg(rx.W.test, s1, rx.YYYY.test),
        parse: reg(rx.W.parse, s1, rx.YYYY.parse),
        precision: 'week'
    },
    'MM/DD/YYYY': {
        test: reg(rx.MM.test, '([\\-\\/])', rx.DD.test, '\\2', rx.YYYY.test),
        parse: reg(rx.MM.parse, '([\\-\\/])', rx.DD.parse, '\\2', rx.YYYY.parse),
        precision: 'day'
    },
    'MM/DD/YY': {
        test: reg(rx.MM.test, '([\\-\\/])', rx.DD.test, '\\2', rx.YY.test),
        parse: reg(rx.MM.parse, '([\\-\\/])', rx.DD.parse, '\\2', rx.YY.parse),
        precision: 'day'
    },
    'DD/MM/YY': {
        test: reg(rx.DD.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.YY.test),
        parse: reg(rx.DD.parse, '([\\-\\.\\/ ?])', rx.MM.parse, '\\2', rx.YY.parse),
        precision: 'day'
    },
    'DD/MM/YYYY': {
        test: reg(rx.DD.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.YYYY.test),
        parse: reg(rx.DD.parse, '([\\-\\.\\/ ?])', rx.MM.parse, '\\2', rx.YYYY.parse),
        precision: 'day'
    },
    'DD/MMM/YYYY': {
        test: reg(rx.DD.test, '([\\-\\.\\/ ?])', rx.MMM.test, '\\2', rx.YYYY.test),
        parse: reg(rx.DD.parse, '([\\-\\.\\/ ?])', rx.MMM.parse, '\\2', rx.YYYY.parse),
        precision: 'day'
    },
    'DD/MMM/YY': {
        test: reg(rx.DD.test, '([\\-\\.\\/ ?])', rx.MMM.test, '\\2', rx.YY.test),
        parse: reg(rx.DD.parse, '([\\-\\.\\/ ?])', rx.MMM.parse, '\\2', rx.YY.parse),
        precision: 'day'
    },
    'YYYY-MM-DD': {
        test: reg(rx.YYYY.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.DD.test),
        parse: reg(rx.YYYY.parse, '([\\-\\.\\/ ?])', rx.MM.parse, '\\2', rx.DD.parse),
        precision: 'day'
    },

    'MMM-DD-YYYY': {
        test: reg(rx.MMM.test, s1, rx.DD.test, s2, rx.YYYY.test),
        parse: reg(rx.MMM.parse, s1, rx.DD.parse, s2, rx.YYYY.parse),
        precision: 'day'
    },

    'YYYY-WW-d': {
        // year + ISO week + [day]
        test: reg(rx.YYYY.test, s0, rx.W.test, s1, rx.DOW.test),
        parse: reg(rx.YYYY.parse, s0, rx.W.parse, s1, rx.DOW.parse),
        precision: 'day'
    },

    // dates with a time
    'MM/DD/YYYY HH:MM': {
        test: reg(rx.MM.test, '([\\-\\/])', rx.DD.test, '\\2', rx.YYYY.test, s3, rx.HHMM.test),
        parse: reg(rx.MM.parse, '([\\-\\/])', rx.DD.parse, '\\2', rx.YYYY.parse, s3, rx.HHMM.parse),
        precision: 'day-minutes'
    },
    'DD.MM.YYYY HH:MM': {
        test: reg(rx.DD.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.YYYY.test, s3, rx.HHMM.test),
        parse: reg(
            rx.DD.parse,
            '([\\-\\.\\/ ?])',
            rx.MM.parse,
            '\\2',
            rx.YYYY.parse,
            s3,
            rx.HHMM.parse
        ),
        precision: 'day-minutes'
    },
    'YYYY-MM-DD HH:MM': {
        test: reg(rx.YYYY.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.DD.test, s3, rx.HHMM.test),
        parse: reg(
            rx.YYYY.parse,
            '([\\-\\.\\/ ?])',
            rx.MM.parse,
            '\\2',
            rx.DD.parse,
            s3,
            rx.HHMM.parse
        ),
        precision: 'day-minutes'
    },
    ISO8601: {
        test: /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)/,
        parse: function(str) {
            return str;
        },
        precision: 'day-seconds'
    }
};

function reg() {
    return new RegExp(begin + Array.prototype.slice.call(arguments).join(' *') + end, 'i');
}var TEOF = 'TEOF';
var TOP = 'TOP';
var TNUMBER = 'TNUMBER';
var TSTRING = 'TSTRING';
var TPAREN = 'TPAREN';
var TBRACKET = 'TBRACKET';
var TCOMMA = 'TCOMMA';
var TNAME = 'TNAME';
var TSEMICOLON = 'TSEMICOLON';

function Token(type, value, index) {
  this.type = type;
  this.value = value;
  this.index = index;
}

Token.prototype.toString = function () {
  return this.type + ': ' + this.value;
};function TokenStream(parser, expression) {
  this.pos = 0;
  this.current = null;
  this.unaryOps = parser.unaryOps;
  this.binaryOps = parser.binaryOps;
  this.ternaryOps = parser.ternaryOps;
  this.consts = parser.consts;
  this.expression = expression;
  this.savedPosition = 0;
  this.savedCurrent = null;
  this.options = parser.options;
  this.parser = parser;
}

TokenStream.prototype.newToken = function (type, value, pos) {
  return new Token(type, value, pos != null ? pos : this.pos);
};

TokenStream.prototype.save = function () {
  this.savedPosition = this.pos;
  this.savedCurrent = this.current;
};

TokenStream.prototype.restore = function () {
  this.pos = this.savedPosition;
  this.current = this.savedCurrent;
};

TokenStream.prototype.next = function () {
  if (this.pos >= this.expression.length) {
    return this.newToken(TEOF, 'EOF');
  }

  if (this.isWhitespace() || this.isComment()) {
    return this.next();
  } else if (this.isRadixInteger() ||
      this.isNumber() ||
      this.isOperator() ||
      this.isString() ||
      this.isParen() ||
      this.isBracket() ||
      this.isComma() ||
      this.isSemicolon() ||
      this.isNamedOp() ||
      this.isConst() ||
      this.isName()) {
    return this.current;
  } else {
    this.parseError('Unknown character "' + this.expression.charAt(this.pos) + '"');
  }
};

TokenStream.prototype.isString = function () {
  var r = false;
  var startPos = this.pos;
  var quote = this.expression.charAt(startPos);

  if (quote === '\'' || quote === '"') {
    var index = this.expression.indexOf(quote, startPos + 1);
    while (index >= 0 && this.pos < this.expression.length) {
      this.pos = index + 1;
      if (this.expression.charAt(index - 1) !== '\\') {
        var rawString = this.expression.substring(startPos + 1, index);
        this.current = this.newToken(TSTRING, this.unescape(rawString), startPos);
        r = true;
        break;
      }
      index = this.expression.indexOf(quote, index + 1);
    }
  }
  return r;
};

TokenStream.prototype.isParen = function () {
  var c = this.expression.charAt(this.pos);
  if (c === '(' || c === ')') {
    this.current = this.newToken(TPAREN, c);
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isBracket = function () {
  var c = this.expression.charAt(this.pos);
  if ((c === '[' || c === ']') && this.isOperatorEnabled('[')) {
    this.current = this.newToken(TBRACKET, c);
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isComma = function () {
  var c = this.expression.charAt(this.pos);
  if (c === ',') {
    this.current = this.newToken(TCOMMA, ',');
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isSemicolon = function () {
  var c = this.expression.charAt(this.pos);
  if (c === ';') {
    this.current = this.newToken(TSEMICOLON, ';');
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isConst = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && c !== '.' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (str in this.consts) {
      this.current = this.newToken(TNUMBER, this.consts[str]);
      this.pos += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isNamedOp = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (this.isOperatorEnabled(str) && (str in this.binaryOps || str in this.unaryOps || str in this.ternaryOps)) {
      this.current = this.newToken(TOP, str);
      this.pos += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isName = function () {
  var startPos = this.pos;
  var i = startPos;
  var hasLetter = false;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos && (c === '$' || c === '_')) {
        if (c === '_') {
          hasLetter = true;
        }
        continue;
      } else if (i === this.pos || !hasLetter || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    } else {
      hasLetter = true;
    }
  }
  if (hasLetter) {
    var str = this.expression.substring(startPos, i);
    this.current = this.newToken(TNAME, str);
    this.pos += str.length;
    return true;
  }
  return false;
};

TokenStream.prototype.isWhitespace = function () {
  var r = false;
  var c = this.expression.charAt(this.pos);
  while (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
    r = true;
    this.pos++;
    if (this.pos >= this.expression.length) {
      break;
    }
    c = this.expression.charAt(this.pos);
  }
  return r;
};

var codePointPattern = /^[0-9a-f]{4}$/i;

TokenStream.prototype.unescape = function (v) {
  var index = v.indexOf('\\');
  if (index < 0) {
    return v;
  }

  var buffer = v.substring(0, index);
  while (index >= 0) {
    var c = v.charAt(++index);
    switch (c) {
      case '\'':
        buffer += '\'';
        break;
      case '"':
        buffer += '"';
        break;
      case '\\':
        buffer += '\\';
        break;
      case '/':
        buffer += '/';
        break;
      case 'b':
        buffer += '\b';
        break;
      case 'f':
        buffer += '\f';
        break;
      case 'n':
        buffer += '\n';
        break;
      case 'r':
        buffer += '\r';
        break;
      case 't':
        buffer += '\t';
        break;
      case 'u':
        // interpret the following 4 characters as the hex of the unicode code point
        var codePoint = v.substring(index + 1, index + 5);
        if (!codePointPattern.test(codePoint)) {
          this.parseError('Illegal escape sequence: \\u' + codePoint);
        }
        buffer += String.fromCharCode(parseInt(codePoint, 16));
        index += 4;
        break;
      default:
        throw this.parseError('Illegal escape sequence: "\\' + c + '"');
    }
    ++index;
    var backslash = v.indexOf('\\', index);
    buffer += v.substring(index, backslash < 0 ? v.length : backslash);
    index = backslash;
  }

  return buffer;
};

TokenStream.prototype.isComment = function () {
  var c = this.expression.charAt(this.pos);
  if (c === '/' && this.expression.charAt(this.pos + 1) === '*') {
    this.pos = this.expression.indexOf('*/', this.pos) + 2;
    if (this.pos === 1) {
      this.pos = this.expression.length;
    }
    return true;
  }
  return false;
};

TokenStream.prototype.isRadixInteger = function () {
  var pos = this.pos;

  if (pos >= this.expression.length - 2 || this.expression.charAt(pos) !== '0') {
    return false;
  }
  ++pos;

  var radix;
  var validDigit;
  if (this.expression.charAt(pos) === 'x') {
    radix = 16;
    validDigit = /^[0-9a-f]$/i;
    ++pos;
  } else if (this.expression.charAt(pos) === 'b') {
    radix = 2;
    validDigit = /^[01]$/i;
    ++pos;
  } else {
    return false;
  }

  var valid = false;
  var startPos = pos;

  while (pos < this.expression.length) {
    var c = this.expression.charAt(pos);
    if (validDigit.test(c)) {
      pos++;
      valid = true;
    } else {
      break;
    }
  }

  if (valid) {
    this.current = this.newToken(TNUMBER, parseInt(this.expression.substring(startPos, pos), radix));
    this.pos = pos;
  }
  return valid;
};

TokenStream.prototype.isNumber = function () {
  var valid = false;
  var pos = this.pos;
  var startPos = pos;
  var resetPos = pos;
  var foundDot = false;
  var foundDigits = false;
  var c;

  while (pos < this.expression.length) {
    c = this.expression.charAt(pos);
    if ((c >= '0' && c <= '9') || (!foundDot && c === '.')) {
      if (c === '.') {
        foundDot = true;
      } else {
        foundDigits = true;
      }
      pos++;
      valid = foundDigits;
    } else {
      break;
    }
  }

  if (valid) {
    resetPos = pos;
  }

  if (c === 'e' || c === 'E') {
    pos++;
    var acceptSign = true;
    var validExponent = false;
    while (pos < this.expression.length) {
      c = this.expression.charAt(pos);
      if (acceptSign && (c === '+' || c === '-')) {
        acceptSign = false;
      } else if (c >= '0' && c <= '9') {
        validExponent = true;
        acceptSign = false;
      } else {
        break;
      }
      pos++;
    }

    if (!validExponent) {
      pos = resetPos;
    }
  }

  if (valid) {
    this.current = this.newToken(TNUMBER, parseFloat(this.expression.substring(startPos, pos)));
    this.pos = pos;
  } else {
    this.pos = resetPos;
  }
  return valid;
};

TokenStream.prototype.isOperator = function () {
  var startPos = this.pos;
  var c = this.expression.charAt(this.pos);

  if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '^' || c === '?' || c === ':' || c === '.') {
    this.current = this.newToken(TOP, c);
  } else if (c === '∙' || c === '•') {
    this.current = this.newToken(TOP, '*');
  } else if (c === '>') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '>=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, '>');
    }
  } else if (c === '<') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '<=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, '<');
    }
  } else if (c === '|') {
    if (this.expression.charAt(this.pos + 1) === '|') {
      this.current = this.newToken(TOP, '||');
      this.pos++;
    } else {
      return false;
    }
  } else if (c === '=') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '==');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, c);
    }
  } else if (c === '!') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '!=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, c);
    }
  } else {
    return false;
  }
  this.pos++;

  if (this.isOperatorEnabled(this.current.value)) {
    return true;
  } else {
    this.pos = startPos;
    return false;
  }
};

TokenStream.prototype.isOperatorEnabled = function (op) {
  return this.parser.isOperatorEnabled(op);
};

TokenStream.prototype.getCoordinates = function () {
  var line = 0;
  var column;
  var newline = -1;
  do {
    line++;
    column = this.pos - newline;
    newline = this.expression.indexOf('\n', newline + 1);
  } while (newline >= 0 && newline < this.pos);

  return {
    line: line,
    column: column
  };
};

TokenStream.prototype.parseError = function (msg) {
  var coords = this.getCoordinates();
  throw new Error('parse error [' + coords.line + ':' + coords.column + ']: ' + msg);
};var INUMBER = 'INUMBER';
var IOP1 = 'IOP1';
var IOP2 = 'IOP2';
var IOP3 = 'IOP3';
var IVAR = 'IVAR';
var IVARNAME = 'IVARNAME';
var IFUNCALL = 'IFUNCALL';
var IFUNDEF = 'IFUNDEF';
var IEXPR = 'IEXPR';
var IEXPREVAL = 'IEXPREVAL';
var IMEMBER = 'IMEMBER';
var IENDSTATEMENT = 'IENDSTATEMENT';
var IARRAY = 'IARRAY';

function Instruction(type, value) {
  this.type = type;
  this.value = (value !== undefined && value !== null) ? value : 0;
}

Instruction.prototype.toString = function () {
  switch (this.type) {
    case INUMBER:
    case IOP1:
    case IOP2:
    case IOP3:
    case IVAR:
    case IVARNAME:
    case IENDSTATEMENT:
      return this.value;
    case IFUNCALL:
      return 'CALL ' + this.value;
    case IFUNDEF:
      return 'DEF ' + this.value;
    case IARRAY:
      return 'ARRAY ' + this.value;
    case IMEMBER:
      return '.' + this.value;
    default:
      return 'Invalid Instruction';
  }
};

function unaryInstruction(value) {
  return new Instruction(IOP1, value);
}

function binaryInstruction(value) {
  return new Instruction(IOP2, value);
}

function ternaryInstruction(value) {
  return new Instruction(IOP3, value);
}function contains$1(array, obj) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === obj) {
      return true;
    }
  }
  return false;
}function ParserState(parser, tokenStream, options) {
  this.parser = parser;
  this.tokens = tokenStream;
  this.current = null;
  this.nextToken = null;
  this.next();
  this.savedCurrent = null;
  this.savedNextToken = null;
  this.allowMemberAccess = options.allowMemberAccess !== false;
}

ParserState.prototype.next = function () {
  this.current = this.nextToken;
  return (this.nextToken = this.tokens.next());
};

ParserState.prototype.tokenMatches = function (token, value) {
  if (typeof value === 'undefined') {
    return true;
  } else if (Array.isArray(value)) {
    return contains$1(value, token.value);
  } else if (typeof value === 'function') {
    return value(token);
  } else {
    return token.value === value;
  }
};

ParserState.prototype.save = function () {
  this.savedCurrent = this.current;
  this.savedNextToken = this.nextToken;
  this.tokens.save();
};

ParserState.prototype.restore = function () {
  this.tokens.restore();
  this.current = this.savedCurrent;
  this.nextToken = this.savedNextToken;
};

ParserState.prototype.accept = function (type, value) {
  if (this.nextToken.type === type && this.tokenMatches(this.nextToken, value)) {
    this.next();
    return true;
  }
  return false;
};

ParserState.prototype.expect = function (type, value) {
  if (!this.accept(type, value)) {
    var coords = this.tokens.getCoordinates();
    throw new Error('parse error [' + coords.line + ':' + coords.column + ']: Expected ' + (value || type));
  }
};

ParserState.prototype.parseAtom = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  if (this.accept(TNAME) || this.accept(TOP, isPrefixOperator)) {
    instr.push(new Instruction(IVAR, this.current.value));
  } else if (this.accept(TNUMBER)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TSTRING)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TPAREN, '(')) {
    this.parseExpression(instr);
    this.expect(TPAREN, ')');
  } else if (this.accept(TBRACKET, '[')) {
    if (this.accept(TBRACKET, ']')) {
      instr.push(new Instruction(IARRAY, 0));
    } else {
      var argCount = this.parseArrayList(instr);
      instr.push(new Instruction(IARRAY, argCount));
    }
  } else {
    throw new Error('unexpected ' + this.nextToken);
  }
};

ParserState.prototype.parseExpression = function (instr) {
  var exprInstr = [];
  if (this.parseUntilEndStatement(instr, exprInstr)) {
    return;
  }
  this.parseVariableAssignmentExpression(exprInstr);
  if (this.parseUntilEndStatement(instr, exprInstr)) {
    return;
  }
  this.pushExpression(instr, exprInstr);
};

ParserState.prototype.pushExpression = function (instr, exprInstr) {
  for (var i = 0, len = exprInstr.length; i < len; i++) {
    instr.push(exprInstr[i]);
  }
};

ParserState.prototype.parseUntilEndStatement = function (instr, exprInstr) {
  if (!this.accept(TSEMICOLON)) return false;
  if (this.nextToken && this.nextToken.type !== TEOF && !(this.nextToken.type === TPAREN && this.nextToken.value === ')')) {
    exprInstr.push(new Instruction(IENDSTATEMENT));
  }
  if (this.nextToken.type !== TEOF) {
    this.parseExpression(exprInstr);
  }
  instr.push(new Instruction(IEXPR, exprInstr));
  return true;
};

ParserState.prototype.parseArrayList = function (instr) {
  var argCount = 0;

  while (!this.accept(TBRACKET, ']')) {
    this.parseExpression(instr);
    ++argCount;
    while (this.accept(TCOMMA)) {
      this.parseExpression(instr);
      ++argCount;
    }
  }

  return argCount;
};

ParserState.prototype.parseVariableAssignmentExpression = function (instr) {
  this.parseConditionalExpression(instr);
  while (this.accept(TOP, '=')) {
    var varName = instr.pop();
    var varValue = [];
    var lastInstrIndex = instr.length - 1;
    if (varName.type === IFUNCALL) {
      if (!this.tokens.isOperatorEnabled('()=')) {
        throw new Error('function definition is not permitted');
      }
      for (var i = 0, len = varName.value + 1; i < len; i++) {
        var index = lastInstrIndex - i;
        if (instr[index].type === IVAR) {
          instr[index] = new Instruction(IVARNAME, instr[index].value);
        }
      }
      this.parseVariableAssignmentExpression(varValue);
      instr.push(new Instruction(IEXPR, varValue));
      instr.push(new Instruction(IFUNDEF, varName.value));
      continue;
    }
    if (varName.type !== IVAR && varName.type !== IMEMBER) {
      throw new Error('expected variable for assignment');
    }
    this.parseVariableAssignmentExpression(varValue);
    instr.push(new Instruction(IVARNAME, varName.value));
    instr.push(new Instruction(IEXPR, varValue));
    instr.push(binaryInstruction('='));
  }
};

ParserState.prototype.parseConditionalExpression = function (instr) {
  this.parseOrExpression(instr);
  while (this.accept(TOP, '?')) {
    var trueBranch = [];
    var falseBranch = [];
    this.parseConditionalExpression(trueBranch);
    this.expect(TOP, ':');
    this.parseConditionalExpression(falseBranch);
    instr.push(new Instruction(IEXPR, trueBranch));
    instr.push(new Instruction(IEXPR, falseBranch));
    instr.push(ternaryInstruction('?'));
  }
};

ParserState.prototype.parseOrExpression = function (instr) {
  this.parseAndExpression(instr);
  while (this.accept(TOP, 'or')) {
    var falseBranch = [];
    this.parseAndExpression(falseBranch);
    instr.push(new Instruction(IEXPR, falseBranch));
    instr.push(binaryInstruction('or'));
  }
};

ParserState.prototype.parseAndExpression = function (instr) {
  this.parseComparison(instr);
  while (this.accept(TOP, 'and')) {
    var trueBranch = [];
    this.parseComparison(trueBranch);
    instr.push(new Instruction(IEXPR, trueBranch));
    instr.push(binaryInstruction('and'));
  }
};

var COMPARISON_OPERATORS = ['==', '!=', '<', '<=', '>=', '>', 'in'];

ParserState.prototype.parseComparison = function (instr) {
  this.parseAddSub(instr);
  while (this.accept(TOP, COMPARISON_OPERATORS)) {
    var op = this.current;
    this.parseAddSub(instr);
    instr.push(binaryInstruction(op.value));
  }
};

var ADD_SUB_OPERATORS = ['+', '-', '||'];

ParserState.prototype.parseAddSub = function (instr) {
  this.parseTerm(instr);
  while (this.accept(TOP, ADD_SUB_OPERATORS)) {
    var op = this.current;
    this.parseTerm(instr);
    instr.push(binaryInstruction(op.value));
  }
};

var TERM_OPERATORS = ['*', '/', '%'];

ParserState.prototype.parseTerm = function (instr) {
  this.parseFactor(instr);
  while (this.accept(TOP, TERM_OPERATORS)) {
    var op = this.current;
    this.parseFactor(instr);
    instr.push(binaryInstruction(op.value));
  }
};

ParserState.prototype.parseFactor = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  this.save();
  if (this.accept(TOP, isPrefixOperator)) {
    if (this.current.value !== '-' && this.current.value !== '+') {
      if (this.nextToken.type === TPAREN && this.nextToken.value === '(') {
        this.restore();
        this.parseExponential(instr);
        return;
      } else if (this.nextToken.type === TSEMICOLON || this.nextToken.type === TCOMMA || this.nextToken.type === TEOF || (this.nextToken.type === TPAREN && this.nextToken.value === ')')) {
        this.restore();
        this.parseAtom(instr);
        return;
      }
    }

    var op = this.current;
    this.parseFactor(instr);
    instr.push(unaryInstruction(op.value));
  } else {
    this.parseExponential(instr);
  }
};

ParserState.prototype.parseExponential = function (instr) {
  this.parsePostfixExpression(instr);
  while (this.accept(TOP, '^')) {
    this.parseFactor(instr);
    instr.push(binaryInstruction('^'));
  }
};

ParserState.prototype.parsePostfixExpression = function (instr) {
  this.parseFunctionCall(instr);
  while (this.accept(TOP, '!')) {
    instr.push(unaryInstruction('!'));
  }
};

ParserState.prototype.parseFunctionCall = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  if (this.accept(TOP, isPrefixOperator)) {
    var op = this.current;
    this.parseAtom(instr);
    instr.push(unaryInstruction(op.value));
  } else {
    this.parseMemberExpression(instr);
    while (this.accept(TPAREN, '(')) {
      if (this.accept(TPAREN, ')')) {
        instr.push(new Instruction(IFUNCALL, 0));
      } else {
        var argCount = this.parseArgumentList(instr);
        instr.push(new Instruction(IFUNCALL, argCount));
      }
    }
  }
};

ParserState.prototype.parseArgumentList = function (instr) {
  var argCount = 0;

  while (!this.accept(TPAREN, ')')) {
    this.parseExpression(instr);
    ++argCount;
    while (this.accept(TCOMMA)) {
      this.parseExpression(instr);
      ++argCount;
    }
  }

  return argCount;
};

ParserState.prototype.parseMemberExpression = function (instr) {
  this.parseAtom(instr);
  while (this.accept(TOP, '.') || this.accept(TBRACKET, '[')) {
    var op = this.current;

    if (op.value === '.') {
      if (!this.allowMemberAccess) {
        throw new Error('unexpected ".", member access is not permitted');
      }

      this.expect(TNAME);
      instr.push(new Instruction(IMEMBER, this.current.value));
    } else if (op.value === '[') {
      if (!this.tokens.isOperatorEnabled('[')) {
        throw new Error('unexpected "[]", arrays are disabled');
      }

      this.parseExpression(instr);
      this.expect(TBRACKET, ']');
      instr.push(binaryInstruction('['));
    } else {
      throw new Error('unexpected symbol: ' + op.value);
    }
  }
};function add(a, b) {
  return Number(a) + Number(b);
}

function sub(a, b) {
  return a - b;
}

function mul(a, b) {
  return a * b;
}

function div(a, b) {
  return a / b;
}

function mod(a, b) {
  return a % b;
}

function equal(a, b) {
  return a === b;
}

function notEqual(a, b) {
  return a !== b;
}

function greaterThan(a, b) {
  return a > b;
}

function lessThan(a, b) {
  return a < b;
}

function greaterThanEqual(a, b) {
  return a >= b;
}

function lessThanEqual(a, b) {
  return a <= b;
}

function andOperator(a, b) {
  return Boolean(a && b);
}

function orOperator(a, b) {
  return Boolean(a || b);
}

function log10(a) {
  return Math.log(a) * Math.LOG10E;
}

function neg(a) {
  return -a;
}

function not(a) {
  return !a;
}

function trunc(a) {
  return a < 0 ? Math.ceil(a) : Math.floor(a);
}

function random(a) {
  return Math.random() * (a || 1);
}

function stringOrArrayLength(s) {
  if (Array.isArray(s)) {
    return s.length;
  }
  return String(s).length;
}

function condition(cond, yep, nope) {
  return cond ? yep : nope;
}

/**
* Decimal adjustment of a number.
* From @escopecz.
*
* @param {Number} value The number.
* @param {Integer} exp  The exponent (the 10 logarithm of the adjustment base).
* @return {Number} The adjusted value.
*/
function roundTo(value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math.round(value);
  }
  value = +value;
  exp = -(+exp);
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

function arrayIndex(array, index) {
  return array[index | 0];
}

function max$1(array) {
  if (arguments.length === 1 && Array.isArray(array)) {
    return Math.max.apply(Math, array);
  } else {
    return Math.max.apply(Math, arguments);
  }
}

function min(array) {
  if (arguments.length === 1 && Array.isArray(array)) {
    return Math.min.apply(Math, array);
  } else {
    return Math.min.apply(Math, arguments);
  }
}

function arrayMap(f, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to map is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to map is not an array');
  }
  return a.map(function (x, i) {
    return f(x, i);
  });
}

function arrayFold(f, init, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to fold is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to fold is not an array');
  }
  return a.reduce(function (acc, x, i) {
    return f(acc, x, i);
  }, init);
}

function arrayFilter(f, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to filter is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to filter is not an array');
  }
  return a.filter(function (x, i) {
    return f(x, i);
  });
}

function sign(x) {
  return ((x > 0) - (x < 0)) || +x;
}

function log1p(x) {
  return Math.log(1 + x);
}

function log2(x) {
  return Math.log(x) / Math.LN2;
}

function sum(array) {
  if (!Array.isArray(array)) {
    throw new Error('Sum argument is not an array');
  }

  return array.reduce(function (total, value) {
    return total + Number(value);
  }, 0);
}function evaluate(tokens, expr, values) {
  var nstack = [];
  var n1, n2, n3;
  var f, args, argCount;

  if (isExpressionEvaluator(tokens)) {
    return resolveExpression(tokens, values);
  }

  var numTokens = tokens.length;

  for (var i = 0; i < numTokens; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER || type === IVARNAME) {
      nstack.push(item.value);
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === 'and') {
        nstack.push(n1 ? !!evaluate(n2, expr, values) : false);
      } else if (item.value === 'or') {
        nstack.push(n1 ? true : !!evaluate(n2, expr, values));
      } else if (item.value === '=') {
        f = expr.binaryOps[item.value];
        nstack.push(f(n1, evaluate(n2, expr, values), values));
      } else {
        f = expr.binaryOps[item.value];
        nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values)));
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === '?') {
        nstack.push(evaluate(n1 ? n2 : n3, expr, values));
      } else {
        f = expr.ternaryOps[item.value];
        nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values), resolveExpression(n3, values)));
      }
    } else if (type === IVAR) {
      if (item.value in expr.functions) {
        nstack.push(expr.functions[item.value]);
      } else if (item.value in expr.unaryOps && expr.parser.isOperatorEnabled(item.value)) {
        nstack.push(expr.unaryOps[item.value]);
      } else {
        var v = values[item.value];
        if (v !== undefined) {
          nstack.push(v);
        } else {
          throw new Error('undefined variable: ' + item.value);
        }
      }
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = expr.unaryOps[item.value];
      nstack.push(f(resolveExpression(n1, values)));
    } else if (type === IFUNCALL) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(resolveExpression(nstack.pop(), values));
      }
      f = nstack.pop();
      if (f.apply && f.call) {
        nstack.push(f.apply(undefined, args));
      } else {
        throw new Error(f + ' is not a function');
      }
    } else if (type === IFUNDEF) {
      // Create closure to keep references to arguments and expression
      nstack.push((function () {
        var n2 = nstack.pop();
        var args = [];
        var argCount = item.value;
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        var n1 = nstack.pop();
        var f = function () {
          var scope = Object.assign({}, values);
          for (var i = 0, len = args.length; i < len; i++) {
            scope[args[i]] = arguments[i];
          }
          return evaluate(n2, expr, scope);
        };
        // f.name = n1
        Object.defineProperty(f, 'name', {
          value: n1,
          writable: false
        });
        values[n1] = f;
        return f;
      })());
    } else if (type === IEXPR) {
      nstack.push(createExpressionEvaluator(item, expr));
    } else if (type === IEXPREVAL) {
      nstack.push(item);
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1[item.value]);
    } else if (type === IENDSTATEMENT) {
      nstack.pop();
    } else if (type === IARRAY) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      nstack.push(args);
    } else {
      throw new Error('invalid Expression');
    }
  }
  if (nstack.length > 1) {
    throw new Error('invalid Expression (parity)');
  }
  // Explicitly return zero to avoid test issues caused by -0
  return nstack[0] === 0 ? 0 : resolveExpression(nstack[0], values);
}

function createExpressionEvaluator(token, expr, values) {
  if (isExpressionEvaluator(token)) return token;
  return {
    type: IEXPREVAL,
    value: function (scope) {
      return evaluate(token.value, expr, scope);
    }
  };
}

function isExpressionEvaluator(n) {
  return n && n.type === IEXPREVAL;
}

function resolveExpression(n, values) {
  return isExpressionEvaluator(n) ? n.value(values) : n;
}function Expression(tokens, parser) {
    this.tokens = tokens;
    this.parser = parser;
    this.unaryOps = parser.unaryOps;
    this.binaryOps = parser.binaryOps;
    this.ternaryOps = parser.ternaryOps;
    this.functions = parser.functions;
}

Expression.prototype.evaluate = function(values) {
    values = values || {};
    return evaluate(this.tokens, this, values);
};

Expression.prototype.variables = function() {
    return (this.tokens || []).filter(token => token.type === 'IVAR').map(token => token.value);
};

function trim(s) {
    return s.trim();
}

// parser
function Parser(options) {
    this.options = options || {};
    this.unaryOps = {
        /**
         * Sine (trigonometric function)
         *
         * @method SIN
         * @returns {number}
         * @example
         * SIN PI
         * SIN(PI)
         */
        SIN: Math.sin,
        /**
         * Cosine (trigonometric function)
         *
         * @method COS
         * @returns {number}
         * @example
         * COS PI
         * COS(PI)
         */
        COS: Math.cos,
        /**
         * Tangent (trigonometric function)
         *
         * @method TAN
         * @returns {number}
         * @example
         * TAN PI
         * TAN(PI)
         */
        TAN: Math.tan,
        /**
         * Arcus sine (inverse tigonometric function)
         *
         * @method ASIN
         * @returns {number}
         */
        ASIN: Math.asin,
        /**
         * Arcus cosine (inverse trigonometric function)
         *
         * @method ACOS
         * @returns {number}
         */
        ACOS: Math.acos,
        /**
         * Arcus tangent (inverse trigonometric function)
         *
         * @method ATAN
         * @returns {number}
         */
        ATAN: Math.atan,
        /**
         * Computes the square root
         *
         * @method SQRT
         * @returns {number}
         * @example
         * SQRT 9 // 3
         * SQRT(9) // 3
         */
        SQRT: Math.sqrt,
        /**
         * Returns the natural logarithm (base `e`) of a number
         *
         * @method LOG
         * @returns {number}
         * @example
         * LOG x
         */
        LOG: Math.log,
        /**
         * Returns the base 2 logarithm of a number
         *
         * @method LOG2
         * @returns {number}
         * @example
         * LOG2 8 // 3
         */
        LOG2: Math.log2 || log2,
        /**
         * Alias for {@link LOG}
         * @method LN
         * @returns {number}
         * @alias LOG
         */
        LN: Math.log,
        /**
         * Returns the base 10 logarithm of a number
         *
         * @method LOG10
         * @alias LG
         * @returns {number}
         * @example
         * LOG10 10 // 1
         * LOG10(100) // 2
         * LOG10(1000) // 3
         */
        LOG10: Math.log10 || log10,
        /**
         * Alias for {@link LOG10}
         * @method LG
         * @returns {number}
         * @alias LOG10
         */
        LG: Math.log10 || log10,
        LOG1P: Math.log1p || log1p,
        /**
         * Absolute number
         *
         * @method ABS
         * @example
         * ABS -10 // 10
         * @returns {number}
         */
        ABS: Math.abs,
        /**
         * Round number to next largest integer
         *
         * @method CEIL
         * @example
         * CEIL 2.3 // 3
         * CEIL(2.7) // 3
         * @returns {number}
         * @see {@link FLOOR}, {@link ROUND}, {@link TRUNC}
         */
        CEIL: Math.ceil,
        /**
         * Round number to the next smallest integer
         *
         * @method FLOOR
         * @example
         * FLOOR 2.3 // 2
         * FLOOR 2.7 // 2
         * FLOOR -5.05 // -6
         * @see {@link CEIL}, {@link ROUND}, {@link TRUNC}
         * @returns {number}
         */
        FLOOR: Math.floor,
        /**
         * Checks if an expression is NULL
         *
         * @method ISNULL
         * @example
         * ISNULL 0 // false
         * ISNULL NULL // true*
         * @returns {boolean}
         */
        ISNULL(a) {
            return a === null;
        },
        /**
         * Returns the integer part of a number by removing any fractional digits
         * @method TRUNC
         * @returns {number}
         * @see {@link CEIL}, {@link ROUND}, {@link FLOOR}
         * @example
         * TRUNC 5.05 // 5
         * TRUNC -5.05 // -5
         */
        TRUNC: Math.trunc || trunc,
        '-': neg,
        '+': Number,
        /**
         * Returns `e^x` where `e` is the Euler's number
         * @method EXP
         * @returns {number}
         * @example
         * LOG(EXP(4)) // 4
         */
        EXP: Math.exp,
        /**
         * Negates a boolean expression
         * @method NOT
         * @returns {boolean}
         * @example
         * NOT 3 > 5 // true
         */
        NOT: not,
        /**
         * Returns the length of an array or strng
         * @method LENGTH
         * @returns {number}
         * @example
         * LENGTH 'hello' // 5
         * LENGTH [1,2,3] // 3
         */
        LENGTH: stringOrArrayLength,
        /**
         * Alias for {@link NOT}
         * @method !
         * @alias NOT
         */
        '!': not,
        /**
         * returns either a positive or negative +/- 1, indicating the sign of a number passed
         * @example
         * SIGN 35 // 1
         * SIGN -6 // -1
         * @returns {number}
         */
        SIGN: Math.sign || sign,
        /**
         * Converts a value to a string
         * @method TEXT
         * @returns {string}
         * @example
         * TEXT 12.5 // '12.5'
         * @see {@link NUMBER}
         */
        TEXT(value) {
            if (isDate(value)) {
                return value.toISOString();
            }
            return String(value);
        },
        /**
         * Converts a value to a number
         * @method NUMBER
         * @returns {number}
         * @example
         * NUMBER '12.5' // 12.5
         * @see {@link TEXT}
         */
        NUMBER: Number
    };

    this.binaryOps = {
        '+': add,
        '-': sub,
        '*': mul,
        '/': div,
        '%': mod,
        '^': Math.pow,
        '==': equal,
        '!=': notEqual,
        '>': greaterThan,
        '<': lessThan,
        '>=': greaterThanEqual,
        '<=': lessThanEqual,
        and: andOperator,
        or: orOperator,
        in: (needle, haystack) =>
            Array.isArray(haystack) ? haystack.includes(needle) : String(haystack).includes(needle),
        '[': arrayIndex
    };

    this.ternaryOps = {
        '?': condition
    };

    const isDate = d => d instanceof Date && !isNaN(d);
    const asDate = d => {
        if (isDate(d)) return d;
        try {
            const n = new Date(d);
            if (isDate(n)) return n;
            return null;
        } catch (e) {
            return null;
        }
    };
    function filterNumbers(array) {
        return (arguments.length === 1 && Array.isArray(array) ? array : Array.from(arguments))
            .slice(0)
            .filter(v => !isNaN(v) && Number.isFinite(v));
    }
    // fallback regular expressions for browsers without
    // support for the unicode flag //u
    let PROPER_REGEX = /\w*/g;
    let TITLE_REGEX = /\w\S*/g;
    const ESCAPE_REGEX = /[\\^$*+?.()|[\]{}]/g;

    try {
        PROPER_REGEX = new RegExp('\\p{L}*', 'ug');
        TITLE_REGEX = new RegExp('[\\p{L}\\p{N}]\\S*', 'ug');
    } catch (e) {}

    this.functions = {
        // ---- LOGICAL FUNCTIONS ----

        /**
         * if-else statement
         *
         * @method IF
         *
         * @param boolean condition
         * @param expr  yay   expression to use if condition is `TRUE`
         * @param expr  nay   expression to use if condition is `FALSE`
         * @example IF(temp_diff > 0, "hotter", "colder")
         * // note: you can also use the shorthand ? notaton:
         * temp_diff > 0 ? "hotter" : "colder"
         */
        IF: condition,

        // ---- MATH FUNCTIONS ----

        /**
         * Generate a random real number between 0 and 1 when used without arguments, or between 0 and the passed number
         *
         * @method RANDOM
         * @param number  max value (optional)
         * @example RANDOM()
         * RANDOM(100)
         * @returns {number}
         */
        RANDOM: random,
        // fac: factorial,

        /**
         * Returns the smallest of the given numbers
         *
         * @method MIN
         * @example
         * MIN(1,2,3) // 1
         * MIN([1,2,3]) // 1
         * @returns {number}
         */
        MIN() {
            const v = filterNumbers.apply(this, arguments);
            return min(v);
        },

        /**
         * Returns the largest of the given numbers
         *
         * @method MAX
         * @example
         * MAX(1,2,3) // 3
         * MAX([1,2,3]) // 3
         * @returns {number}
         */
        MAX() {
            return max$1(filterNumbers.apply(this, arguments));
        },

        /**
         * Returns the sum of the given numbers
         *
         * @method SUM
         *
         * @example
         * SUM(1,2,3) // 6
         * SUM([1,2,3]) // 6
         * @returns {number}
         */
        SUM() {
            return sum(filterNumbers.apply(this, arguments));
        },

        /**
         * Returns the average of the given numbers
         *
         * @method MEAN
         * @example
         * MEAN(1,2,4,8) // 3.75
         * MEAN([1,2,4,8]) // 3.75
         * @returns {number}
         * @see {@link MEDIAN}
         */
        MEAN() {
            const v = filterNumbers.apply(this, arguments);
            return sum(v) / v.length;
        },

        /**
         * Returns the median of the given numbers
         *
         * @method MEDIAN
         * @example
         * MEDIAN(1,2,4,8) // 3
         * MEDIAN([1,2,4,8]) // 3
         * @returns {number}
         * @see {@link MEAN}
         */
        MEDIAN() {
            const v = filterNumbers.apply(this, arguments).sort((a, b) => a - b);
            const i = Math.floor(v.length / 2);
            return v.length % 2 === 1 ? v[i] : (v[i - 1] + v[i]) * 0.5;
        },

        /**
         * Computes the power of a number
         *
         * @method POW
         * @example
         * POW(2,3) // 8
         * POW(4,2) // 16
         * @returns {number}
         */
        POW: Math.pow,

        /**
         * Computes the atan2, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2
         *
         * @method ATAN2
         * @example
         * ATAN2(2,3) // 8
         * ATAN2(4,2) // 16
         * @returns {number}
         */
        ATAN2: Math.atan2,

        /**
         * Rounds a number (to a given number of decimals)
         *
         * @method ROUND
         * @example
         * ROUND(3.1415) // 3
         * ROUND(3.1415, 2) // 3.14
         * @returns {number}
         * @see {@link FLOOR}, {@link CEIL}
         */
        ROUND: roundTo,

        // ---- STRING FUNCTIONS ----
        /**
         * Concatenate two or more strings
         *
         * @method CONCAT
         * @example
         * CONCAT("<b>", name, "</b>")
         * @returns {string}
         */
        CONCAT() {
            return Array.from(arguments).join('');
        },
        /**
         * Removes whitespaces at the beginning and end of a string
         *
         * @method TRIM
         * @returns {string}
         * @example
         * TRIM("  hello ") // 'hello'
         */
        TRIM: trim,
        /**
         * Extracts a part of a string
         *
         * @method SUBSTR
         * @param string the input string
         * @param number start
         * @param number end
         * @example
         * SUBSTR("This is fine", 5,7) // 'is'
         * @returns {string}
         */
        SUBSTR(s, start, end) {
            return s.substr(start, end);
        },
        /**
         * Replaces all occurances of a string with another string
         *
         * @method REPLACE
         * @param string the input string
         * @param string the search string
         * @param string the replacement string or function
         * @example
         * REPLACE("hello name", "name", "world") // 'hello world'
         * REPLACE("hello name", "name", TITLE) // 'hello Name'
         * REPLACE("hello name", "name", f(d) = CONCAT("<b>", d, "</b>")) // 'hello <b>name</b>'
         * @returns {string}
         * @see {@link REPLACE_REGEX}
         */
        REPLACE(str, search, replace) {
            return str.replace(
                new RegExp(String(search).replace(ESCAPE_REGEX, '\\$&'), 'g'),
                replace
            );
        },
        /**
         * Like REPLACE, but interprets the search string as regular expression
         *
         * @method REPLACE_REGEX
         * @param string the input string
         * @param string the search regex
         * @param string the replacement string or function
         * @example
         * REPLACE_REGEX("hello 123 world", "[0-9]", '#') // 'hello ### world'
         * REPLACE_REGEX("hello 123 world", "[0-9]+", '#') // 'hello # world'
         * @returns {string}
         * @see {@link REPLACE}
         */
        REPLACE_REGEX(str, regex, replace) {
            return str.replace(new RegExp(regex, 'g'), replace);
        },
        /**
         * Splits a string into an array
         *
         * @method SPLIT
         * @param string the input string
         * @param string the separator string
         * @example
         * SPLIT("hello world", " ") // ['hello', 'world']
         * @returns {array}
         */
        SPLIT(str, sep) {
            return String(str).split(sep);
        },
        /**
         * Lowercase a string
         *
         * @method LOWER
         * @example
         * LOWER("Hello World") // 'hello world'
         * @returns {string}
         * @see {@link UPPER}, {@link TITLE}, {@link PROPER}
         */
        LOWER(str) {
            return String(str).toLowerCase();
        },
        /**
         * Uppercase a string
         *
         * @method UPPER
         * @example
         * UPPER("Hello World") // 'HELLO WORLD'
         * @returns {string}
         * @see {@link LOWER}, {@link TITLE}, {@link PROPER}
         */
        UPPER(str) {
            return String(str).toUpperCase();
        },
        /**
         * Convert a string to title-case. Like `TITLE`, but better for names.
         *
         * @method PROPER
         * @example
         * PROPER("hello WoRLd") // 'Hello World'
         * PROPER("2-WAY STREET") // '2-Way Street'
         * PROPER("baron lloyd-webber") // 'Baron Lloyd-Webber'
         * @returns {string}
         * @see {@link TITLE}
         */
        PROPER(str) {
            return String(str).replace(
                PROPER_REGEX,
                txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },
        /**
         * Convert a string to title-case. Like `PROPER`, but better for headlines.
         *
         * @method TITLE
         * @example
         * TITLE("hello WoRLd") // 'Hello World'
         * TITLE("2-WAY STREET") // '2-way Street'
         * TITLE("baron lloyd-webber") // 'Baron Lloyd-webber'
         * @returns {string}
         * @see {@link PROPER}
         */
        TITLE(str) {
            return String(str).replace(
                TITLE_REGEX,
                txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },

        // ARRAY FUNCTIONS
        /**
         * Sort an array ascending or descending
         *
         * @method SORT
         * @param array the input array
         * @param boolean true for ascending, false for descending
         * @param string key to sort by (optional)
         * @example
         * SORT([5,2,4,1]) // [1,2,4,5]
         * SORT(countries, false, 'population')
         * @returns {array}
         */
        SORT(arr, asc = true, key = null) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to SORT is not an array');
            }
            return arr.slice(0).sort((a, b) => {
                a = typeof key === 'string' ? a[key] : typeof key === 'function' ? key(a) : a;
                b = typeof key === 'string' ? b[key] : typeof key === 'function' ? key(b) : b;
                return (a > b ? 1 : a < b ? -1 : 0) * (asc ? 1 : -1);
            });
        },
        /**
         * Slice an array (extract a part of array)
         *
         * @method SLICE
         * @param array the input array
         * @param number start index
         * @param number end index
         * @example
         * SLICE([1,2,3,4,5], 1) // [2,3,4,5]
         * SLICE([1,2,3,4,5], 1,3) // [2,3]
         * SLICE([1,2,3,4,5], -2) // [4,5]
         * @returns {array}
         */
        SLICE(arr, start, end) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to SLICE is not an array');
            }
            return arr.slice(start, end);
        },
        /**
         * Join array elements into a string
         *
         * @method JOIN
         * @param array the input array
         * @param string the glue string
         * @param string alternative glue string for the last join (optional)
         * @returns {string}
         * @example
         * JOIN(['USA', 'Canada', 'Mexico'], ', ') // 'USA, Canada, Mexico'
         * JOIN(['USA', 'Canada', 'Mexico'], ', ', ', and ') // 'USA, Canada, and Mexico'
         */
        JOIN(arr, sep, sepLast = null) {
            if (!Array.isArray(arr)) {
                throw new Error('First argument to JOIN is not an array');
            }
            return sepLast
                ? [arr.slice(0, arr.length - 1).join(sep), arr[arr.length - 1]].join(sepLast)
                : arr.join(sep);
        },
        /**
         * Evaluate function for each element in an array
         *
         * @method MAP
         * @param function the function to call
         * @param array the input array
         * @returns {array}
         * @example
         * MAP(UPPER, ['USA', 'Canada', 'Mexico']) // ['USA', 'CANADA', 'MEXICO']
         * MAP(f(s) = SUBSTR(s, 0, 2), ['USA', 'Canada', 'Mexico']) // ['US', 'Ca', 'Me']
         */
        MAP: arrayMap,
        /**
         * Fold array into a single value, good for more complex aggregations
         *
         * @method FOLD
         * @param function the function to call
         * @param * intial value
         * @param array the input array
         * @returns {}
         * @example
         * FOLD(f(a,b) = a * b, 1, [1,2,3,4,5]) // 120
         */
        FOLD: arrayFold,
        /**
         * Filter elements of an array using a function
         *
         * @method FILTER
         * @param function the function to test elements
         * @param array the input array
         * @returns {array}
         * @example
         * FILTER(f(x) = x > 2, [1, 2, 0, 3, -1, 5]) // [3, 5]
         * FILTER(f(x) = x >= 2, [1, 2, 0, 3, -1, 5]) // [2, 3, 5]
         */
        FILTER: arrayFilter,
        /**
         * Extract values from an array of objects
         *
         * @method PLUCK
         * @param array the input array of objects
         * @param string the key
         * @returns {array}
         * @example
         * PLUCK(countries, 'name')
         * PLUCK(countries, 'population')
         */
        PLUCK(arr, key) {
            if (!Array.isArray(arr)) throw new Error('First argument to PLUCK is not an array');
            return arr.map(item =>
                Object.prototype.hasOwnProperty.call(item, key) ? item[key] : null
            );
        },
        /**
         * Returns the index of the first occurance of an element in an array (or -1 if it's not in the array)
         *
         * @method INDEXOF
         * @param array the input array of objects
         * @param * target
         * @returns {number}
         * @example
         * INDEXOF(['a', 'b', 'c'], 'b') // 1
         * INDEXOF(['a', 'b', 'c'], 'd') // -1
         * @see {@link FIND}
         */
        INDEXOF(arr, target) {
            if (!Array.isArray(arr)) arr = String(arr);
            return arr.indexOf(target);
        },
        /**
         * Returns the first element of an array for which the test function returns true
         *
         * @method FIND
         * @param array the input array of objects
         * @param function test function
         * @returns {*}
         * @example
         * FIND([1,2,3,4,5,6], f(d) = d > 3) // 4
         * @see {@link INDEXOF}
         */
        FIND(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to FIND is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to FIND is not a function');
            const k = arr.length;
            for (let i = 0; i < k; i++) {
                if (test(arr[i])) return arr[i];
            }
            return null;
        },
        /**
         * Creates an array of numbers
         *
         * @method RANGE
         * @param number start value
         * @param number stop value (not included)
         * @param number step to increment each
         * @returns {array}
         * @example
         * RANGE(0,5) // [0,1,2,3,4]
         * RANGE(0,5,2) // [0,2,4]
         * RANGE(0,1,0.25) // [0,0.25,0.5,0.75]
         */
        RANGE(start, stop, step) {
            // borrowed from https://github.com/jashkenas/underscore/blob/master/modules/range.js
            if (stop == null) {
                stop = start || 0;
                start = 0;
            }
            if (!step) {
                step = stop < start ? -1 : 1;
            }

            var length = Math.max(Math.ceil((stop - start) / step), 0);
            var range = Array(length);

            for (var idx = 0; idx < length; idx++, start += step) {
                range[idx] = start;
            }

            return range;
        },
        /**
         * Returns TRUE if the test function is TRUE for every element in the arrat
         *
         * @method EVERY
         * @param array the input array
         * @param function the test function
         * @returns {boolean}
         * @see {@link SOME}
         * @example
         * EVERY([5,8,4,7,3], f(d) = d > 2) // true
         * EVERY([5,8,4,7,3], f(d) = d < 6) // false
         */
        EVERY(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to EVERY is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to EVERY is not a function');
            const k = arr.length;
            let every = true;
            for (let i = 0; i < k; i++) {
                every = every && test(arr[i]);
                if (!every) return false;
            }
            return true;
        },
        /**
         * Returns `true` if the test function is `true` for at least one element in the arrat
         *
         * @method SOME
         * @param array the input array
         * @param function the test function
         * @returns {boolean}
         * @see {@link EVERY}
         * @example
         * SOME([5,8,4,7,3], f(d) = d > 2) // true
         * SOME([5,8,4,7,3], f(d) = d < 6) // true
         * SOME([5,8,4,7,3], f(d) = d < 2) // false
         */
        SOME(arr, test) {
            if (!Array.isArray(arr)) throw new Error('First argument to SOME is not an array');
            if (typeof test !== 'function')
                throw new Error('Second argument to SOME is not a function');
            const k = arr.length;
            let some = false;
            for (let i = 0; i < k; i++) {
                some = some || test(arr[i]);
                if (some) return true;
            }
            return false;
        },

        // ---- DATE FUNCTIONS ----
        /**
         * Constructs a new date object
         *
         * @method DATE
         * @param number year
         * @param number month
         * @param number day
         * @returns {date}
         * @example
         * DATE(2020, 1, 1) // January 1st, 2020
         */
        DATE() {
            if (arguments.length > 1) {
                // "correct" month argument (1=january, etc)
                arguments[1] = arguments[1] - 1;
            }
            return new Date(...arguments);
        },
        /**
         * Returns the year of a date
         *
         * @method YEAR
         * @param date the input date
         * @returns {number}
         * @see {@link MONTH},{@link DAY}
         * @example
         * YEAR(DATE(2020, 1, 1)) // 2020
         */
        YEAR(d) {
            d = asDate(d);
            return d ? d.getFullYear() : null;
        },
        /**
         * Returns the month of a date (1-12)
         *
         * @method MONTH
         * @param date the input date
         * @returns {number}
         * @see {@link YEAR},{@link DAY}
         * @example
         * MONTH(DATE(2020, 6, 1)) // 6
         */
        MONTH(d) {
            d = asDate(d);
            return d ? d.getMonth() + 1 : null;
        },
        /**
         * Returns the day of a date (1-31)
         *
         * @method DAY
         * @param date the input date
         * @returns {number}
         * @see {@link WEEKDAY},{@link YEAR},{@link MONTH},{@link DAY}
         * @example
         * DAY(DATE(2020, 6, 1)) // 1
         */
        DAY(d) {
            d = asDate(d);
            return d ? d.getDate() : null;
        },
        /**
         * Returns the weekday of a date (0 = Sunday, 1 = Monday, etc)
         *
         * @method WEEKDAY
         * @param date the input date
         * @returns {number}
         * @see {@link DAY}
         * @example
         * WEEKDAY(DATE(2020, 5, 10)) // 0
         */
        WEEKDAY(d) {
            d = asDate(d);
            return d ? d.getDay() : null;
        },
        /**
         * Returns the hours of a date (0-23)
         *
         * @method HOURS
         * @param date the input date
         * @returns {number}
         * @see {@link DAY},{@link MINUTES},{@link SECONDS}
         * @example
         * HOURS(time)
         */
        HOURS(d) {
            d = asDate(d);
            return d ? d.getHours() : null;
        },
        /**
         * Returns the minutes of a date (0-59)
         *
         * @method MINUTES
         * @param date the input date
         * @returns {number}
         * @see {@link HOURS},{@link SECONDS}
         * @example
         * MINUTES(time)
         */
        MINUTES(d) {
            d = asDate(d);
            return d ? d.getMinutes() : null;
        },
        /**
         * Returns the seconds of a date (0-59)
         *
         * @method SECONDS
         * @param date the input date
         * @returns {number}
         * @see {@link HOURS},{@link MINUTES}
         * @example
         * SECONDS(time)
         */
        SECONDS(d) {
            d = asDate(d);
            return d ? d.getSeconds() : null;
        },
        /**
         * Computes the  number of days between two dates
         *
         * @method DATEDIFF
         * @param date the input date 1
         * @param date the input date to substract from
         * @returns {number}
         * @see {@link TIMEDIFF}
         * @example
         * DATEDIFF(date1, date2)
         */
        DATEDIFF(d1, d2) {
            d1 = asDate(d1);
            d2 = asDate(d2);
            return d1 && d2 ? (d2.getTime() - d1.getTime()) / 864e5 : null;
        },
        /**
         * Computes the  number of seconds between two dates
         *
         * @method TIMEDIFF
         * @param date the input date 1
         * @param date the input date to substract from
         * @returns {number}
         * @see {@link DATEDIFF}
         * @example
         * TIMEDIFF(date1, date2)
         */
        TIMEDIFF(d1, d2) {
            d1 = asDate(d1);
            d2 = asDate(d2);
            return d1 && d2 ? (d2.getTime() - d1.getTime()) / 1000 : null;
        }
    };

    this.unaryOps.LOWER = this.functions.LOWER;
    this.unaryOps.UPPER = this.functions.UPPER;
    this.unaryOps.PROPER = this.functions.PROPER;
    this.unaryOps.TITLE = this.functions.TITLE;
    this.unaryOps.TRIM = this.functions.TRIM;
    this.unaryOps.YEAR = this.functions.YEAR;
    this.unaryOps.MONTH = this.functions.MONTH;
    this.unaryOps.DAY = this.functions.DAY;
    this.unaryOps.WEEKDAY = this.functions.WEEKDAY;
    this.unaryOps.HOURS = this.functions.HOURS;
    this.unaryOps.MINUTES = this.functions.MINUTES;
    this.unaryOps.SECONDS = this.functions.SECONDS;

    this.consts = {
        E: Math.E,
        PI: Math.PI,
        TRUE: true,
        FALSE: false,
        NA: Number.NaN,
        NULL: Number.NaN
    };
}

Parser.prototype.parse = function(expr) {
    var instr = [];
    var parserState = new ParserState(this, new TokenStream(this, expr), {
        allowMemberAccess: true
    });

    parserState.parseExpression(instr);
    parserState.expect(TEOF, 'EOF');

    return new Expression(instr, this);
};

Parser.prototype.evaluate = function(expr, variables) {
    return this.parse(expr).evaluate(variables);
};

var sharedParser = new Parser();

Parser.parse = function(expr) {
    return sharedParser.parse(expr);
};

Parser.evaluate = function(expr, variables) {
    return sharedParser.parse(expr).evaluate(variables);
};

Parser.keywords = [
    'ABS',
    'ACOS',
    'ACOSH',
    'and',
    'ASIN',
    'ASINH',
    'ATAN',
    'ATAN2',
    'ATANH',
    'CBRT',
    'CEIL',
    'CONCAT',
    'COS',
    'COSH',
    'DATEDIFF',
    'DAY',
    'E',
    'EVERY',
    'EXP',
    'EXPM1',
    'FIND',
    'FLOOR',
    'HOURS',
    'IF',
    'in',
    'INDEXOF',
    'ISNULL',
    'JOIN',
    'LENGTH',
    'LN',
    'LOG',
    'LOG10',
    'LOG1P',
    'LOG2',
    'LOWER',
    'MAP',
    'MAX',
    'MEAN',
    'MEDIAN',
    'MIN',
    'MINUTES',
    'MONTH',
    'NOT',
    'NOT',
    'or',
    'PI',
    'PLUCK',
    'POW',
    'PROPER',
    'RANDOM',
    'RANGE',
    'REPLACE',
    'REPLACE_REGEX',
    'ROUND',
    'SECONDS',
    'SIGN',
    'SIN',
    'SINH',
    'SLICE',
    'SOME',
    'SORT',
    'SPLIT',
    'SQRT',
    'SUBSTR',
    'SUM',
    'TAN',
    'TANH',
    'TIMEDIFF',
    'TITLE',
    'TRIM',
    'TRUNC',
    'UPPER',
    'WEEKDAY',
    'YEAR'
];

var optionNameMap = {
    '+': 'add',
    '-': 'subtract',
    '*': 'multiply',
    '/': 'divide',
    '%': 'remainder',
    '^': 'power',
    '!': 'factorial',
    '<': 'comparison',
    '>': 'comparison',
    '<=': 'comparison',
    '>=': 'comparison',
    '==': 'comparison',
    '!=': 'comparison',
    '||': 'concatenate',
    AND: 'logical',
    OR: 'logical',
    NOT: 'logical',
    IN: 'logical',
    '?': 'conditional',
    ':': 'conditional',
    '=': 'assignment',
    '[': 'array',
    '()=': 'fndef'
};

function getOptionName(op) {
    return Object.prototype.hasOwnProperty.call(optionNameMap, op) ? optionNameMap[op] : op;
}

Parser.prototype.isOperatorEnabled = function(op) {
    var optionName = getOptionName(op);
    var operators = this.options.operators || {};

    return !(optionName in operators) || !!operators[optionName];
};function domReady(callback) {
    if (/complete|interactive|loaded/.test(document.readyState)) {
        // dom is already loaded
        callback();
    } else {
        // wait for dom to load
        window.addEventListener('DOMContentLoaded', event => {
            callback();
        });
    }
}/**
 * Safely access object properties without throwing nasty
 * `cannot access X of undefined` errors if a property along the
 * way doesn't exist.
 *
 * @exports get
 * @kind function
 *
 *
 * @param object - the object which properties you want to acccess
 * @param {String|String[]} key - path to the property as a dot-separated string or array of strings
 * @param {*} _default - the fallback value to be returned if key doesn't exist
 *
 * @returns the value
 *
 * @example
 * import get from '@datawrapper/shared/get';
 * const someObject = { key: { list: ['a', 'b', 'c']}};
 * get(someObject, 'key.list[2]') // returns 'c'
 * get(someObject, 'missing.key') // returns undefined
 * get(someObject, 'missing.key', false) // returns false
 */
function get(object, key = null, _default = null) {
    if (!key) return object;
    const keys = Array.isArray(key) ? key : key.split('.');
    let pt = object;

    for (let i = 0; i < keys.length; i++) {
        if (pt === null || pt === undefined) break; // break out of the loop
        // move one more level in
        pt = pt[keys[i]];
    }
    return pt === undefined || pt === null ? _default : pt;
}/**
 * Use this function to post event messages out of Datawrapper iframe embeds
 * to the parent website.
 *
 * @exports postEvent
 * @kind function
 *
 * @param {string} chartId - the chart id each message should be signed with
 * @returns {function}
 *
 * @example
 * import genPostEvent from '@datawrapper/shared/postEvent';
 * const postEvent = genPostEvent(chart.get('id'));
 * postEvent('bar:hover', {value: 123});
 */
function postEvent(chartId) {
    return function(event, data) {
        if (window.parent && window.parent.postMessage) {
            const evt = {
                source: 'datawrapper',
                chartId,
                type: event,
                data
            };
            window.parent.postMessage(evt, '*');
        }
    };
}function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}var fontfaceobserver_standalone = createCommonjsModule(function (module) {
/* Font Face Observer v2.1.0 - © Bram Stein. License: BSD-3-Clause */(function(){function l(a,b){document.addEventListener?a.addEventListener("scroll",b,!1):a.attachEvent("scroll",b);}function m(a){document.body?a():document.addEventListener?document.addEventListener("DOMContentLoaded",function c(){document.removeEventListener("DOMContentLoaded",c);a();}):document.attachEvent("onreadystatechange",function k(){if("interactive"==document.readyState||"complete"==document.readyState)document.detachEvent("onreadystatechange",k),a();});}function t(a){this.a=document.createElement("div");this.a.setAttribute("aria-hidden","true");this.a.appendChild(document.createTextNode(a));this.b=document.createElement("span");this.c=document.createElement("span");this.h=document.createElement("span");this.f=document.createElement("span");this.g=-1;this.b.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.c.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
this.f.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.h.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";this.b.appendChild(this.h);this.c.appendChild(this.f);this.a.appendChild(this.b);this.a.appendChild(this.c);}
function u(a,b){a.a.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:"+b+";";}function z(a){var b=a.a.offsetWidth,c=b+100;a.f.style.width=c+"px";a.c.scrollLeft=c;a.b.scrollLeft=a.b.scrollWidth+100;return a.g!==b?(a.g=b,!0):!1}function A(a,b){function c(){var a=k;z(a)&&a.a.parentNode&&b(a.g);}var k=a;l(a.b,c);l(a.c,c);z(a);}function B(a,b){var c=b||{};this.family=a;this.style=c.style||"normal";this.weight=c.weight||"normal";this.stretch=c.stretch||"normal";}var C=null,D=null,E=null,F=null;function G(){if(null===D)if(J()&&/Apple/.test(window.navigator.vendor)){var a=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent);D=!!a&&603>parseInt(a[1],10);}else D=!1;return D}function J(){null===F&&(F=!!document.fonts);return F}
function K(){if(null===E){var a=document.createElement("div");try{a.style.font="condensed 100px sans-serif";}catch(b){}E=""!==a.style.font;}return E}function L(a,b){return [a.style,a.weight,K()?a.stretch:"","100px",b].join(" ")}
B.prototype.load=function(a,b){var c=this,k=a||"BESbswy",r=0,n=b||3E3,H=(new Date).getTime();return new Promise(function(a,b){if(J()&&!G()){var M=new Promise(function(a,b){function e(){(new Date).getTime()-H>=n?b(Error(""+n+"ms timeout exceeded")):document.fonts.load(L(c,'"'+c.family+'"'),k).then(function(c){1<=c.length?a():setTimeout(e,25);},b);}e();}),N=new Promise(function(a,c){r=setTimeout(function(){c(Error(""+n+"ms timeout exceeded"));},n);});Promise.race([N,M]).then(function(){clearTimeout(r);a(c);},
b);}else m(function(){function v(){var b;if(b=-1!=f&&-1!=g||-1!=f&&-1!=h||-1!=g&&-1!=h)(b=f!=g&&f!=h&&g!=h)||(null===C&&(b=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),C=!!b&&(536>parseInt(b[1],10)||536===parseInt(b[1],10)&&11>=parseInt(b[2],10))),b=C&&(f==w&&g==w&&h==w||f==x&&g==x&&h==x||f==y&&g==y&&h==y)),b=!b;b&&(d.parentNode&&d.parentNode.removeChild(d),clearTimeout(r),a(c));}function I(){if((new Date).getTime()-H>=n)d.parentNode&&d.parentNode.removeChild(d),b(Error(""+
n+"ms timeout exceeded"));else {var a=document.hidden;if(!0===a||void 0===a)f=e.a.offsetWidth,g=p.a.offsetWidth,h=q.a.offsetWidth,v();r=setTimeout(I,50);}}var e=new t(k),p=new t(k),q=new t(k),f=-1,g=-1,h=-1,w=-1,x=-1,y=-1,d=document.createElement("div");d.dir="ltr";u(e,L(c,"sans-serif"));u(p,L(c,"serif"));u(q,L(c,"monospace"));d.appendChild(e.a);d.appendChild(p.a);d.appendChild(q.a);document.body.appendChild(d);w=e.a.offsetWidth;x=p.a.offsetWidth;y=q.a.offsetWidth;I();A(e,function(a){f=a;v();});u(e,
L(c,'"'+c.family+'",sans-serif'));A(p,function(a){g=a;v();});u(p,L(c,'"'+c.family+'",serif'));A(q,function(a){h=a;v();});u(q,L(c,'"'+c.family+'",monospace'));});})};module.exports=B;}());
});/**
 * Function that returns a promise, that resolves when all fonts,
 * specified in fontsJSON and typographyJSON have been loaded.
 *
 * @exports observeFonts
 * @kind function
 *
 * @param {Object|Array} fontsJSON
 * @param {Object} typographyJSON
 * @returns {Promise}
 */
function observeFonts(fontsJSON, typographyJSON) {
    /* Render vis again after fonts have been loaded */
    const fonts = new Set(Array.isArray(fontsJSON) ? [] : Object.keys(fontsJSON));

    Object.keys(typographyJSON.fontFamilies || {}).forEach(fontFamily => {
        typographyJSON.fontFamilies[fontFamily].forEach(fontface => {
            /* If this font is being used in a font family */
            if (fonts.has(fontface.name)) {
                /* Remove it form the list of fonts to wait for */
                fonts.delete(fontface.name);
                /* And add it again with theme-defined weight and style */
                fonts.add({
                    family: fontFamily,
                    props: {
                        weight: fontface.weight || 400,
                        style: fontface.style || 'normal'
                    }
                });
            }
        });
    });

    const observers = [];
    fonts.forEach(font => {
        const obs =
            typeof font === 'string'
                ? new fontfaceobserver_standalone(font)
                : new fontfaceobserver_standalone(font.family, font.props);
        observers.push(obs.load(null, 5000));
    });

    return Promise.all(observers);
}/**
 * Download and parse a remote JSON document. Use {@link httpReq} instead
 *
 * @deprecated
 *
 * @param {string} url
 * @param {string} method - HTTP method, either GET, POST or PUT
 * @param {string|undefined} credentials - set to "include" if cookies should be passed along CORS requests
 * @param {string} body
 * @param {function} callback
 *
 * @returns {Promise}
 *
 * @example
 * import { fetchJSON } from '@datawrapper/shared/fetch';
 * fetchJSON('http://api.example.org', 'GET', 'include');
 */

/**
 * injects a `<script>` element to the page to load a new JS script
 *
 * @param {string} src
 * @param {function} callback
 *
 * @example
 * import { loadScript } from '@datawrapper/shared/fetch';
 *
 * loadScript('/static/js/library.js', () => {
 *     console.log('library is loaded');
 * })
 */
function loadScript(src, callback = null) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            if (callback) callback();
            resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

/**
 * @typedef {object} opts
 * @property {string} src - stylesheet URL to load
 * @property {DOMElement} parentElement - DOM element to append style tag to
 */

/**
 * injects a `<link>` element to the page to load a new stylesheet
 *
 * @param {string|opts} src
 * @param {function} callback
 *
 * @example
 * import { loadStylesheet } from '@datawrapper/shared/fetch';
 *
 * loadStylesheet('/static/css/library.css', () => {
 *     console.log('library styles are loaded');
 * })
 */
function loadStylesheet(opts, callback = null) {
    if (typeof opts === 'string') {
        opts = {
            src: opts
        };
    }

    if (!opts.parentElement || typeof opts.parentElement.appendChild !== 'function') {
        opts.parentElement = document.head;
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = opts.src;
        link.onload = () => {
            if (callback) callback();
            resolve();
        };
        link.onerror = reject;
        opts.parentElement.appendChild(link);
    });
}/*

Based off glamor's StyleSheet, thanks Sunil ❤️

high performance StyleSheet for css-in-js systems

- uses multiple style tags behind the scenes for millions of rules
- uses `insertRule` for appending in production for *much* faster performance

// usage

import { StyleSheet } from '@emotion/sheet'

let styleSheet = new StyleSheet({ key: '', container: document.head })

styleSheet.insert('#box { border: 1px solid red; }')
- appends a css rule into the stylesheet

styleSheet.flush()
- empties the stylesheet of all its contents

*/
// $FlowFixMe
function sheetForTag(tag) {
  if (tag.sheet) {
    // $FlowFixMe
    return tag.sheet;
  } // this weirdness brought to you by firefox

  /* istanbul ignore next */


  for (var i = 0; i < document.styleSheets.length; i++) {
    if (document.styleSheets[i].ownerNode === tag) {
      // $FlowFixMe
      return document.styleSheets[i];
    }
  }
}

function createStyleElement(options) {
  var tag = document.createElement('style');
  tag.setAttribute('data-emotion', options.key);

  if (options.nonce !== undefined) {
    tag.setAttribute('nonce', options.nonce);
  }

  tag.appendChild(document.createTextNode(''));
  tag.setAttribute('data-s', '');
  return tag;
}

var StyleSheet = /*#__PURE__*/function () {
  function StyleSheet(options) {
    var _this = this;

    this._insertTag = function (tag) {
      var before;

      if (_this.tags.length === 0) {
        before = _this.prepend ? _this.container.firstChild : _this.before;
      } else {
        before = _this.tags[_this.tags.length - 1].nextSibling;
      }

      _this.container.insertBefore(tag, before);

      _this.tags.push(tag);
    };

    this.isSpeedy = options.speedy === undefined ? "production" === 'production' : options.speedy;
    this.tags = [];
    this.ctr = 0;
    this.nonce = options.nonce; // key is the value of the data-emotion attribute, it's used to identify different sheets

    this.key = options.key;
    this.container = options.container;
    this.prepend = options.prepend;
    this.before = null;
  }

  var _proto = StyleSheet.prototype;

  _proto.hydrate = function hydrate(nodes) {
    nodes.forEach(this._insertTag);
  };

  _proto.insert = function insert(rule) {
    // the max length is how many rules we have per style tag, it's 65000 in speedy mode
    // it's 1 in dev because we insert source maps that map a single rule to a location
    // and you can only have one source map per style tag
    if (this.ctr % (this.isSpeedy ? 65000 : 1) === 0) {
      this._insertTag(createStyleElement(this));
    }

    var tag = this.tags[this.tags.length - 1];

    if (this.isSpeedy) {
      var sheet = sheetForTag(tag);

      try {
        // this is the ultrafast version, works across browsers
        // the big drawback is that the css won't be editable in devtools
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch (e) {
      }
    } else {
      tag.appendChild(document.createTextNode(rule));
    }

    this.ctr++;
  };

  _proto.flush = function flush() {
    // $FlowFixMe
    this.tags.forEach(function (tag) {
      return tag.parentNode.removeChild(tag);
    });
    this.tags = [];
    this.ctr = 0;
  };

  return StyleSheet;
}();var e="-ms-";var r="-moz-";var a="-webkit-";var c="comm";var n="rule";var t="decl";var i="@import";var p="@keyframes";var k=Math.abs;var d=String.fromCharCode;function m(e,r){return (((r<<2^z(e,0))<<2^z(e,1))<<2^z(e,2))<<2^z(e,3)}function g(e){return e.trim()}function x(e,r){return (e=r.exec(e))?e[0]:e}function y(e,r,a){return e.replace(r,a)}function j(e,r){return e.indexOf(r)}function z(e,r){return e.charCodeAt(r)|0}function C(e,r,a){return e.slice(r,a)}function A(e){return e.length}function M(e){return e.length}function O(e,r){return r.push(e),e}function S(e,r){return e.map(r).join("")}var q=1;var B=1;var D=0;var E=0;var F=0;var G="";function H(e,r,a,c,n,t,s){return {value:e,root:r,parent:a,type:c,props:n,children:t,line:q,column:B,length:s,return:""}}function I(e,r,a){return H(e,r.root,r.parent,a,r.props,r.children,0)}function J(){return F}function K(){F=E>0?z(G,--E):0;if(B--,F===10)B=1,q--;return F}function L(){F=E<D?z(G,E++):0;if(B++,F===10)B=1,q++;return F}function N(){return z(G,E)}function P(){return E}function Q(e,r){return C(G,e,r)}function R(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function T(e){return q=B=1,D=A(G=e),E=0,[]}function U(e){return G="",e}function V(e){return g(Q(E-1,_$1(e===91?e+2:e===40?e+1:e)))}function X(e){while(F=N())if(F<33)L();else break;return R(e)>2||R(F)>3?"":" "}function Z(e,r){while(--r&&L())if(F<48||F>102||F>57&&F<65||F>70&&F<97)break;return Q(e,P()+(r<6&&N()==32&&L()==32))}function _$1(e){while(L())switch(F){case e:return E;case 34:case 39:return _$1(e===34||e===39?e:F);case 40:if(e===41)_$1(e);break;case 92:L();break}return E}function ee(e,r){while(L())if(e+F===47+10)break;else if(e+F===42+42&&N()===47)break;return "/*"+Q(r,E-1)+"*"+d(e===47?e:L())}function re(e){while(!R(N()))L();return Q(e,E)}function ae(e){return U(ce("",null,null,null,[""],e=T(e),0,[0],e))}function ce(e,r,a,c,n,t,s,u,i){var f=0;var o=0;var l=s;var v=0;var h=0;var p=0;var b=1;var w=1;var $=1;var k=0;var m="";var g=n;var x=t;var j=c;var z=m;while(w)switch(p=k,k=L()){case 34:case 39:case 91:case 40:z+=V(k);break;case 9:case 10:case 13:case 32:z+=X(p);break;case 92:z+=Z(P()-1,7);continue;case 47:switch(N()){case 42:case 47:O(te(ee(L(),P()),r,a),i);break;default:z+="/";}break;case 123*b:u[f++]=A(z)*$;case 125*b:case 59:case 0:switch(k){case 0:case 125:w=0;case 59+o:if(h>0&&A(z)-l)O(h>32?se(z+";",c,a,l-1):se(y(z," ","")+";",c,a,l-2),i);break;case 59:z+=";";default:O(j=ne(z,r,a,f,o,n,u,m,g=[],x=[],l),t);if(k===123)if(o===0)ce(z,r,j,j,g,t,l,u,x);else switch(v){case 100:case 109:case 115:ce(e,j,j,c&&O(ne(e,j,j,0,0,n,u,m,n,g=[],l),x),n,x,l,u,c?g:x);break;default:ce(z,j,j,j,[""],x,l,u,x);}}f=o=h=0,b=$=1,m=z="",l=s;break;case 58:l=1+A(z),h=p;default:if(b<1)if(k==123)--b;else if(k==125&&b++==0&&K()==125)continue;switch(z+=d(k),k*b){case 38:$=o>0?1:(z+="\f",-1);break;case 44:u[f++]=(A(z)-1)*$,$=1;break;case 64:if(N()===45)z+=V(L());v=N(),o=A(m=z+=re(P())),k++;break;case 45:if(p===45&&A(z)==2)b=0;}}return t}function ne(e,r,a,c,t,s,u,i,f,o,l){var v=t-1;var h=t===0?s:[""];var p=M(h);for(var b=0,w=0,$=0;b<c;++b)for(var d=0,m=C(e,v+1,v=k(w=u[b])),x=e;d<p;++d)if(x=g(w>0?h[d]+" "+m:y(m,/&\f/g,h[d])))f[$++]=x;return H(e,r,a,t===0?n:i,f,o,l)}function te(e,r,a){return H(e,r,a,c,d(J()),C(e,2,-2),0)}function se(e,r,a,c){return H(e,r,a,t,C(e,0,c),C(e,c+1,-1),c)}function ue(c,n){switch(m(c,n)){case 5103:return a+"print-"+c+c;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return a+c+c;case 5349:case 4246:case 4810:case 6968:case 2756:return a+c+r+c+e+c+c;case 6828:case 4268:return a+c+e+c+c;case 6165:return a+c+e+"flex-"+c+c;case 5187:return a+c+y(c,/(\w+).+(:[^]+)/,a+"box-$1$2"+e+"flex-$1$2")+c;case 5443:return a+c+e+"flex-item-"+y(c,/flex-|-self/,"")+c;case 4675:return a+c+e+"flex-line-pack"+y(c,/align-content|flex-|-self/,"")+c;case 5548:return a+c+e+y(c,"shrink","negative")+c;case 5292:return a+c+e+y(c,"basis","preferred-size")+c;case 6060:return a+"box-"+y(c,"-grow","")+a+c+e+y(c,"grow","positive")+c;case 4554:return a+y(c,/([^-])(transform)/g,"$1"+a+"$2")+c;case 6187:return y(y(y(c,/(zoom-|grab)/,a+"$1"),/(image-set)/,a+"$1"),c,"")+c;case 5495:case 3959:return y(c,/(image-set\([^]*)/,a+"$1"+"$`$1");case 4968:return y(y(c,/(.+:)(flex-)?(.*)/,a+"box-pack:$3"+e+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+a+c+c;case 4095:case 3583:case 4068:case 2532:return y(c,/(.+)-inline(.+)/,a+"$1$2")+c;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(A(c)-1-n>6)switch(z(c,n+1)){case 109:if(z(c,n+4)!==45)break;case 102:return y(c,/(.+:)(.+)-([^]+)/,"$1"+a+"$2-$3"+"$1"+r+(z(c,n+3)==108?"$3":"$2-$3"))+c;case 115:return ~j(c,"stretch")?ue(y(c,"stretch","fill-available"),n)+c:c}break;case 4949:if(z(c,n+1)!==115)break;case 6444:switch(z(c,A(c)-3-(~j(c,"!important")&&10))){case 107:return y(c,":",":"+a)+c;case 101:return y(c,/(.+:)([^;!]+)(;|!.+)?/,"$1"+a+(z(c,14)===45?"inline-":"")+"box$3"+"$1"+a+"$2$3"+"$1"+e+"$2box$3")+c}break;case 5936:switch(z(c,n+11)){case 114:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"tb")+c;case 108:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"tb-rl")+c;case 45:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"lr")+c}return a+c+e+c+c}return c}function ie(e,r){var a="";var c=M(e);for(var n=0;n<c;n++)a+=r(e[n],n,e,r)||"";return a}function fe(e,r,a,s){switch(e.type){case i:case t:return e.return=e.return||e.value;case c:return "";case n:e.value=e.props.join(",");}return A(a=ie(e.children,s))?e.return=e.value+"{"+a+"}":""}function oe(e){var r=M(e);return function(a,c,n,t){var s="";for(var u=0;u<r;u++)s+=e[u](a,c,n,t)||"";return s}}function le(e){return function(r){if(!r.root)if(r=r.return)e(r);}}function ve(c,s,u,i){if(!c.return)switch(c.type){case t:c.return=ue(c.value,c.length);break;case p:return ie([I(y(c.value,"@","@"+a),c,"")],i);case n:if(c.length)return S(c.props,(function(n){switch(x(n,/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":return ie([I(y(n,/:(read-\w+)/,":"+r+"$1"),c,"")],i);case"::placeholder":return ie([I(y(n,/:(plac\w+)/,":"+a+"input-$1"),c,""),I(y(n,/:(plac\w+)/,":"+r+"$1"),c,""),I(y(n,/:(plac\w+)/,e+"input-$1"),c,"")],i)}return ""}))}}var weakMemoize = function weakMemoize(func) {
  // $FlowFixMe flow doesn't include all non-primitive types as allowed for weakmaps
  var cache = new WeakMap();
  return function (arg) {
    if (cache.has(arg)) {
      // $FlowFixMe
      return cache.get(arg);
    }

    var ret = func(arg);
    cache.set(arg, ret);
    return ret;
  };
};function memoize(fn) {
  var cache = Object.create(null);
  return function (arg) {
    if (cache[arg] === undefined) cache[arg] = fn(arg);
    return cache[arg];
  };
}var toRules = function toRules(parsed, points) {
  // pretend we've started with a comma
  var index = -1;
  var character = 44;

  do {
    switch (R(character)) {
      case 0:
        // &\f
        if (character === 38 && N() === 12) {
          // this is not 100% correct, we don't account for literal sequences here - like for example quoted strings
          // stylis inserts \f after & to know when & where it should replace this sequence with the context selector
          // and when it should just concatenate the outer and inner selectors
          // it's very unlikely for this sequence to actually appear in a different context, so we just leverage this fact here
          points[index] = 1;
        }

        parsed[index] += re(E - 1);
        break;

      case 2:
        parsed[index] += V(character);
        break;

      case 4:
        // comma
        if (character === 44) {
          // colon
          parsed[++index] = N() === 58 ? '&\f' : '';
          points[index] = parsed[index].length;
          break;
        }

      // fallthrough

      default:
        parsed[index] += d(character);
    }
  } while (character = L());

  return parsed;
};

var getRules = function getRules(value, points) {
  return U(toRules(T(value), points));
}; // WeakSet would be more appropriate, but only WeakMap is supported in IE11


var fixedElements = /* #__PURE__ */new WeakMap();
var compat = function compat(element) {
  if (element.type !== 'rule' || !element.parent || // .length indicates if this rule contains pseudo or not
  !element.length) {
    return;
  }

  var value = element.value,
      parent = element.parent;
  var isImplicitRule = element.column === parent.column && element.line === parent.line;

  while (parent.type !== 'rule') {
    parent = parent.parent;
    if (!parent) return;
  } // short-circuit for the simplest case


  if (element.props.length === 1 && value.charCodeAt(0) !== 58
  /* colon */
  && !fixedElements.get(parent)) {
    return;
  } // if this is an implicitly inserted rule (the one eagerly inserted at the each new nested level)
  // then the props has already been manipulated beforehand as they that array is shared between it and its "rule parent"


  if (isImplicitRule) {
    return;
  }

  fixedElements.set(element, true);
  var points = [];
  var rules = getRules(value, points);
  var parentRules = parent.props;

  for (var i = 0, k = 0; i < rules.length; i++) {
    for (var j = 0; j < parentRules.length; j++, k++) {
      element.props[k] = points[i] ? rules[i].replace(/&\f/g, parentRules[j]) : parentRules[j] + " " + rules[i];
    }
  }
};
var removeLabel = function removeLabel(element) {
  if (element.type === 'decl') {
    var value = element.value;

    if ( // charcode for l
    value.charCodeAt(0) === 108 && // charcode for b
    value.charCodeAt(2) === 98) {
      // this ignores label
      element["return"] = '';
      element.value = '';
    }
  }
};

var isBrowser = typeof document !== 'undefined';
var getServerStylisCache = isBrowser ? undefined : weakMemoize(function () {
  return memoize(function () {
    var cache = {};
    return function (name) {
      return cache[name];
    };
  });
});
var defaultStylisPlugins = [ve];

var createCache = function createCache(options) {
  var key = options.key;

  if (isBrowser && key === 'css') {
    var ssrStyles = document.querySelectorAll("style[data-emotion]:not([data-s])"); // get SSRed styles out of the way of React's hydration
    // document.head is a safe place to move them to

    Array.prototype.forEach.call(ssrStyles, function (node) {
      document.head.appendChild(node);
      node.setAttribute('data-s', '');
    });
  }

  var stylisPlugins = options.stylisPlugins || defaultStylisPlugins;

  var inserted = {}; // $FlowFixMe

  var container;
  var nodesToHydrate = [];

  if (isBrowser) {
    container = options.container || document.head;
    Array.prototype.forEach.call(document.querySelectorAll("style[data-emotion]"), function (node) {
      var attrib = node.getAttribute("data-emotion").split(' ');

      if (attrib[0] !== key) {
        return;
      } // $FlowFixMe


      for (var i = 1; i < attrib.length; i++) {
        inserted[attrib[i]] = true;
      }

      nodesToHydrate.push(node);
    });
  }

  var _insert;

  var omnipresentPlugins = [compat, removeLabel];

  if (isBrowser) {
    var currentSheet;
    var finalizingPlugins = [fe,  le(function (rule) {
      currentSheet.insert(rule);
    })];
    var serializer = oe(omnipresentPlugins.concat(stylisPlugins, finalizingPlugins));

    var stylis = function stylis(styles) {
      return ie(ae(styles), serializer);
    };

    _insert = function insert(selector, serialized, sheet, shouldCache) {
      currentSheet = sheet;

      stylis(selector ? selector + "{" + serialized.styles + "}" : serialized.styles);

      if (shouldCache) {
        cache.inserted[serialized.name] = true;
      }
    };
  } else {
    var _finalizingPlugins = [fe];

    var _serializer = oe(omnipresentPlugins.concat(stylisPlugins, _finalizingPlugins));

    var _stylis = function _stylis(styles) {
      return ie(ae(styles), _serializer);
    }; // $FlowFixMe


    var serverStylisCache = getServerStylisCache(stylisPlugins)(key);

    var getRules = function getRules(selector, serialized) {
      var name = serialized.name;

      if (serverStylisCache[name] === undefined) {
        serverStylisCache[name] = _stylis(selector ? selector + "{" + serialized.styles + "}" : serialized.styles);
      }

      return serverStylisCache[name];
    };

    _insert = function _insert(selector, serialized, sheet, shouldCache) {
      var name = serialized.name;
      var rules = getRules(selector, serialized);

      if (cache.compat === undefined) {
        // in regular mode, we don't set the styles on the inserted cache
        // since we don't need to and that would be wasting memory
        // we return them so that they are rendered in a style tag
        if (shouldCache) {
          cache.inserted[name] = true;
        }

        return rules;
      } else {
        // in compat mode, we put the styles on the inserted cache so
        // that emotion-server can pull out the styles
        // except when we don't want to cache it which was in Global but now
        // is nowhere but we don't want to do a major right now
        // and just in case we're going to leave the case here
        // it's also not affecting client side bundle size
        // so it's really not a big deal
        if (shouldCache) {
          cache.inserted[name] = rules;
        } else {
          return rules;
        }
      }
    };
  }

  var cache = {
    key: key,
    sheet: new StyleSheet({
      key: key,
      container: container,
      nonce: options.nonce,
      speedy: options.speedy,
      prepend: options.prepend
    }),
    nonce: options.nonce,
    inserted: inserted,
    registered: {},
    insert: _insert
  };
  cache.sheet.hydrate(nodesToHydrate);
  return cache;
};/* eslint-disable */
// Inspired by https://github.com/garycourt/murmurhash-js
// Ported from https://github.com/aappleby/smhasher/blob/61a0530f28277f2e850bfc39600ce61d02b518de/src/MurmurHash2.cpp#L37-L86
function murmur2(str) {
  // 'm' and 'r' are mixing constants generated offline.
  // They're not really 'magic', they just happen to work well.
  // const m = 0x5bd1e995;
  // const r = 24;
  // Initialize the hash
  var h = 0; // Mix 4 bytes at a time into the hash

  var k,
      i = 0,
      len = str.length;

  for (; len >= 4; ++i, len -= 4) {
    k = str.charCodeAt(i) & 0xff | (str.charCodeAt(++i) & 0xff) << 8 | (str.charCodeAt(++i) & 0xff) << 16 | (str.charCodeAt(++i) & 0xff) << 24;
    k =
    /* Math.imul(k, m): */
    (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16);
    k ^=
    /* k >>> r: */
    k >>> 24;
    h =
    /* Math.imul(k, m): */
    (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16) ^
    /* Math.imul(h, m): */
    (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  } // Handle the last few bytes of the input array


  switch (len) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 0xff) << 16;

    case 2:
      h ^= (str.charCodeAt(i + 1) & 0xff) << 8;

    case 1:
      h ^= str.charCodeAt(i) & 0xff;
      h =
      /* Math.imul(h, m): */
      (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  } // Do a few final mixes of the hash to ensure the last few
  // bytes are well-incorporated.


  h ^= h >>> 13;
  h =
  /* Math.imul(h, m): */
  (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  return ((h ^ h >>> 15) >>> 0).toString(36);
}var unitlessKeys = {
  animationIterationCount: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
};var hyphenateRegex = /[A-Z]|^ms/g;
var animationRegex = /_EMO_([^_]+?)_([^]*?)_EMO_/g;

var isCustomProperty = function isCustomProperty(property) {
  return property.charCodeAt(1) === 45;
};

var isProcessableValue = function isProcessableValue(value) {
  return value != null && typeof value !== 'boolean';
};

var processStyleName = /* #__PURE__ */memoize(function (styleName) {
  return isCustomProperty(styleName) ? styleName : styleName.replace(hyphenateRegex, '-$&').toLowerCase();
});

var processStyleValue = function processStyleValue(key, value) {
  switch (key) {
    case 'animation':
    case 'animationName':
      {
        if (typeof value === 'string') {
          return value.replace(animationRegex, function (match, p1, p2) {
            cursor = {
              name: p1,
              styles: p2,
              next: cursor
            };
            return p1;
          });
        }
      }
  }

  if (unitlessKeys[key] !== 1 && !isCustomProperty(key) && typeof value === 'number' && value !== 0) {
    return value + 'px';
  }

  return value;
};

function handleInterpolation(mergedProps, registered, interpolation) {
  if (interpolation == null) {
    return '';
  }

  if (interpolation.__emotion_styles !== undefined) {

    return interpolation;
  }

  switch (typeof interpolation) {
    case 'boolean':
      {
        return '';
      }

    case 'object':
      {
        if (interpolation.anim === 1) {
          cursor = {
            name: interpolation.name,
            styles: interpolation.styles,
            next: cursor
          };
          return interpolation.name;
        }

        if (interpolation.styles !== undefined) {
          var next = interpolation.next;

          if (next !== undefined) {
            // not the most efficient thing ever but this is a pretty rare case
            // and there will be very few iterations of this generally
            while (next !== undefined) {
              cursor = {
                name: next.name,
                styles: next.styles,
                next: cursor
              };
              next = next.next;
            }
          }

          var styles = interpolation.styles + ";";

          return styles;
        }

        return createStringFromObject(mergedProps, registered, interpolation);
      }

    case 'function':
      {
        if (mergedProps !== undefined) {
          var previousCursor = cursor;
          var result = interpolation(mergedProps);
          cursor = previousCursor;
          return handleInterpolation(mergedProps, registered, result);
        }

        break;
      }
  } // finalize string values (regular strings and functions interpolated into css calls)


  if (registered == null) {
    return interpolation;
  }

  var cached = registered[interpolation];
  return cached !== undefined ? cached : interpolation;
}

function createStringFromObject(mergedProps, registered, obj) {
  var string = '';

  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      string += handleInterpolation(mergedProps, registered, obj[i]) + ";";
    }
  } else {
    for (var _key in obj) {
      var value = obj[_key];

      if (typeof value !== 'object') {
        if (registered != null && registered[value] !== undefined) {
          string += _key + "{" + registered[value] + "}";
        } else if (isProcessableValue(value)) {
          string += processStyleName(_key) + ":" + processStyleValue(_key, value) + ";";
        }
      } else {
        if (_key === 'NO_COMPONENT_SELECTOR' && "production" !== 'production') {
          throw new Error('Component selectors can only be used in conjunction with @emotion/babel-plugin.');
        }

        if (Array.isArray(value) && typeof value[0] === 'string' && (registered == null || registered[value[0]] === undefined)) {
          for (var _i = 0; _i < value.length; _i++) {
            if (isProcessableValue(value[_i])) {
              string += processStyleName(_key) + ":" + processStyleValue(_key, value[_i]) + ";";
            }
          }
        } else {
          var interpolated = handleInterpolation(mergedProps, registered, value);

          switch (_key) {
            case 'animation':
            case 'animationName':
              {
                string += processStyleName(_key) + ":" + interpolated + ";";
                break;
              }

            default:
              {

                string += _key + "{" + interpolated + "}";
              }
          }
        }
      }
    }
  }

  return string;
}

var labelPattern = /label:\s*([^\s;\n{]+)\s*(;|$)/g;
// keyframes are stored on the SerializedStyles object as a linked list


var cursor;
var serializeStyles = function serializeStyles(args, registered, mergedProps) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && args[0].styles !== undefined) {
    return args[0];
  }

  var stringMode = true;
  var styles = '';
  cursor = undefined;
  var strings = args[0];

  if (strings == null || strings.raw === undefined) {
    stringMode = false;
    styles += handleInterpolation(mergedProps, registered, strings);
  } else {

    styles += strings[0];
  } // we start at 1 since we've already handled the first arg


  for (var i = 1; i < args.length; i++) {
    styles += handleInterpolation(mergedProps, registered, args[i]);

    if (stringMode) {

      styles += strings[i];
    }
  }


  labelPattern.lastIndex = 0;
  var identifierName = '';
  var match; // https://esbench.com/bench/5b809c2cf2949800a0f61fb5

  while ((match = labelPattern.exec(styles)) !== null) {
    identifierName += '-' + // $FlowFixMe we know it's not null
    match[1];
  }

  var name = murmur2(styles) + identifierName;

  return {
    name: name,
    styles: styles,
    next: cursor
  };
};var isBrowser$1 = typeof document !== 'undefined';
function getRegisteredStyles(registered, registeredStyles, classNames) {
  var rawClassName = '';
  classNames.split(' ').forEach(function (className) {
    if (registered[className] !== undefined) {
      registeredStyles.push(registered[className] + ";");
    } else {
      rawClassName += className + " ";
    }
  });
  return rawClassName;
}
var insertStyles = function insertStyles(cache, serialized, isStringTag) {
  var className = cache.key + "-" + serialized.name;

  if ( // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (isStringTag === false || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  isBrowser$1 === false && cache.compat !== undefined) && cache.registered[className] === undefined) {
    cache.registered[className] = serialized.styles;
  }

  if (cache.inserted[serialized.name] === undefined) {
    var stylesForSSR = '';
    var current = serialized;

    do {
      var maybeStyles = cache.insert(serialized === current ? "." + className : '', current, cache.sheet, true);

      if (!isBrowser$1 && maybeStyles !== undefined) {
        stylesForSSR += maybeStyles;
      }

      current = current.next;
    } while (current !== undefined);

    if (!isBrowser$1 && stylesForSSR.length !== 0) {
      return stylesForSSR;
    }
  }
};function insertWithoutScoping(cache, serialized) {
  if (cache.inserted[serialized.name] === undefined) {
    return cache.insert('', serialized, cache.sheet, true);
  }
}

function merge(registered, css, className) {
  var registeredStyles = [];
  var rawClassName = getRegisteredStyles(registered, registeredStyles, className);

  if (registeredStyles.length < 2) {
    return className;
  }

  return rawClassName + css(registeredStyles);
}

var createEmotion = function createEmotion(options) {
  var cache = createCache(options); // $FlowFixMe

  cache.sheet.speedy = function (value) {

    this.isSpeedy = value;
  };

  cache.compat = true;

  var css = function css() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var serialized = serializeStyles(args, cache.registered, undefined);
    insertStyles(cache, serialized, false);
    return cache.key + "-" + serialized.name;
  };

  var keyframes = function keyframes() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    var serialized = serializeStyles(args, cache.registered);
    var animation = "animation-" + serialized.name;
    insertWithoutScoping(cache, {
      name: serialized.name,
      styles: "@keyframes " + animation + "{" + serialized.styles + "}"
    });
    return animation;
  };

  var injectGlobal = function injectGlobal() {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    var serialized = serializeStyles(args, cache.registered);
    insertWithoutScoping(cache, serialized);
  };

  var cx = function cx() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    return merge(cache.registered, css, classnames(args));
  };

  return {
    css: css,
    cx: cx,
    injectGlobal: injectGlobal,
    keyframes: keyframes,
    hydrate: function hydrate(ids) {
      ids.forEach(function (key) {
        cache.inserted[key] = true;
      });
    },
    flush: function flush() {
      cache.registered = {};
      cache.inserted = {};
      cache.sheet.flush();
    },
    // $FlowFixMe
    sheet: cache.sheet,
    cache: cache,
    getRegisteredStyles: getRegisteredStyles.bind(null, cache.registered),
    merge: merge.bind(null, cache.registered, css)
  };
};

var classnames = function classnames(args) {
  var cls = '';

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    if (arg == null) continue;
    var toAdd = void 0;

    switch (typeof arg) {
      case 'boolean':
        break;

      case 'object':
        {
          if (Array.isArray(arg)) {
            toAdd = classnames(arg);
          } else {
            toAdd = '';

            for (var k in arg) {
              if (arg[k] && k) {
                toAdd && (toAdd += ' ');
                toAdd += k;
              }
            }
          }

          break;
        }

      default:
        {
          toAdd = arg;
        }
    }

    if (toAdd) {
      cls && (cls += ' ');
      cls += toAdd;
    }
  }

  return cls;
};/* lib/Visualization.svelte generated by Svelte v3.23.2 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[36] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[36] = list[i];
	child_ctx[43] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[39] = list[i];
	return child_ctx;
}

// (463:0) {#if !isStylePlain}
function create_if_block_7(ctx) {
	let blocksregion;
	let t;
	let if_block_anchor;
	let current;

	blocksregion = new BlocksRegion({
			props: {
				name: "dw-chart-header",
				blocks: /*regions*/ ctx[5].header,
				id: "header"
			}
		});

	let if_block = !/*isStyleStatic*/ ctx[3] && create_if_block_8(ctx);

	return {
		c() {
			create_component(blocksregion.$$.fragment);
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			mount_component(blocksregion, target, anchor);
			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const blocksregion_changes = {};
			if (dirty[0] & /*regions*/ 32) blocksregion_changes.blocks = /*regions*/ ctx[5].header;
			blocksregion.$set(blocksregion_changes);

			if (!/*isStyleStatic*/ ctx[3]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*isStyleStatic*/ 8) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_8(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(blocksregion.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(blocksregion.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			destroy_component(blocksregion, detaching);
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (466:4) {#if !isStyleStatic}
function create_if_block_8(ctx) {
	let menu_1;
	let current;

	menu_1 = new Menu({
			props: {
				name: "dw-chart-menu",
				props: /*menu*/ ctx[6],
				blocks: /*regions*/ ctx[5].menu
			}
		});

	return {
		c() {
			create_component(menu_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(menu_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const menu_1_changes = {};
			if (dirty[0] & /*menu*/ 64) menu_1_changes.props = /*menu*/ ctx[6];
			if (dirty[0] & /*regions*/ 32) menu_1_changes.blocks = /*regions*/ ctx[5].menu;
			menu_1.$set(menu_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(menu_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(menu_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(menu_1, detaching);
		}
	};
}

// (471:0) {#if ariaDescription}
function create_if_block_6(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "sr-only");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			div.innerHTML = /*ariaDescription*/ ctx[8];
		},
		p(ctx, dirty) {
			if (dirty[0] & /*ariaDescription*/ 256) div.innerHTML = /*ariaDescription*/ ctx[8];		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (484:0) {#if get(theme, 'data.template.afterChart')}
function create_if_block_5(ctx) {
	let html_tag;
	let raw_value = /*theme*/ ctx[0].data.template.afterChart + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*theme*/ 1 && raw_value !== (raw_value = /*theme*/ ctx[0].data.template.afterChart + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (488:0) {#if !isStylePlain}
function create_if_block_1$6(ctx) {
	let blocksregion0;
	let t0;
	let div;
	let t1;
	let blocksregion1;
	let current;

	blocksregion0 = new BlocksRegion({
			props: {
				name: "dw-above-footer",
				blocks: /*regions*/ ctx[5].aboveFooter
			}
		});

	let each_value_1 = ["Left", "Center", "Right"];
	let each_blocks = [];

	for (let i = 0; i < 3; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	blocksregion1 = new BlocksRegion({
			props: {
				name: "dw-below-footer",
				blocks: /*regions*/ ctx[5].belowFooter
			}
		});

	return {
		c() {
			create_component(blocksregion0.$$.fragment);
			t0 = space();
			div = element("div");

			for (let i = 0; i < 3; i += 1) {
				each_blocks[i].c();
			}

			t1 = space();
			create_component(blocksregion1.$$.fragment);
			attr(div, "id", "footer");
			attr(div, "class", "dw-chart-footer");
		},
		m(target, anchor) {
			mount_component(blocksregion0, target, anchor);
			insert(target, t0, anchor);
			insert(target, div, anchor);

			for (let i = 0; i < 3; i += 1) {
				each_blocks[i].m(div, null);
			}

			insert(target, t1, anchor);
			mount_component(blocksregion1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const blocksregion0_changes = {};
			if (dirty[0] & /*regions*/ 32) blocksregion0_changes.blocks = /*regions*/ ctx[5].aboveFooter;
			blocksregion0.$set(blocksregion0_changes);

			if (dirty[0] & /*regions*/ 32) {
				each_value_1 = ["Left", "Center", "Right"];
				let i;

				for (i = 0; i < 3; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();

				for (i = 3; i < 3; i += 1) {
					out(i);
				}

				check_outros();
			}

			const blocksregion1_changes = {};
			if (dirty[0] & /*regions*/ 32) blocksregion1_changes.blocks = /*regions*/ ctx[5].belowFooter;
			blocksregion1.$set(blocksregion1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(blocksregion0.$$.fragment, local);

			for (let i = 0; i < 3; i += 1) {
				transition_in(each_blocks[i]);
			}

			transition_in(blocksregion1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(blocksregion0.$$.fragment, local);
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < 3; i += 1) {
				transition_out(each_blocks[i]);
			}

			transition_out(blocksregion1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(blocksregion0, detaching);
			if (detaching) detach(t0);
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
			if (detaching) detach(t1);
			destroy_component(blocksregion1, detaching);
		}
	};
}

// (495:20) {#if i}
function create_if_block_4(ctx) {
	let span;
	let span_class_value;

	return {
		c() {
			span = element("span");
			attr(span, "class", span_class_value = "separator separator-before-" + /*block*/ ctx[36].id);
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*regions*/ 32 && span_class_value !== (span_class_value = "separator separator-before-" + /*block*/ ctx[36].id)) {
				attr(span, "class", span_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (499:24) {#if block.prepend}
function create_if_block_3(ctx) {
	let span;
	let raw_value = clean(/*block*/ ctx[36].prepend) + "";

	return {
		c() {
			span = element("span");
			attr(span, "class", "prepend");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*regions*/ 32 && raw_value !== (raw_value = clean(/*block*/ ctx[36].prepend) + "")) span.innerHTML = raw_value;		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (507:24) {#if block.append}
function create_if_block_2$1(ctx) {
	let span;
	let raw_value = clean(/*block*/ ctx[36].append) + "";

	return {
		c() {
			span = element("span");
			attr(span, "class", "append");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*regions*/ 32 && raw_value !== (raw_value = clean(/*block*/ ctx[36].append) + "")) span.innerHTML = raw_value;		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (494:16) {#each regions['footer' + orientation] as block, i}
function create_each_block_2(ctx) {
	let t0;
	let span1;
	let t1;
	let span0;
	let switch_instance;
	let t2;
	let span1_class_value;
	let current;
	let if_block0 = /*i*/ ctx[43] && create_if_block_4(ctx);
	let if_block1 = /*block*/ ctx[36].prepend && create_if_block_3(ctx);
	var switch_value = /*block*/ ctx[36].component;

	function switch_props(ctx) {
		return {
			props: { props: /*block*/ ctx[36].props }
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props(ctx));
	}

	let if_block2 = /*block*/ ctx[36].append && create_if_block_2$1(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			span1 = element("span");
			if (if_block1) if_block1.c();
			t1 = space();
			span0 = element("span");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			t2 = space();
			if (if_block2) if_block2.c();
			attr(span0, "class", "block-inner");
			attr(span1, "class", span1_class_value = "footer-block " + /*block*/ ctx[36].id + "-block");
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, span1, anchor);
			if (if_block1) if_block1.m(span1, null);
			append(span1, t1);
			append(span1, span0);

			if (switch_instance) {
				mount_component(switch_instance, span0, null);
			}

			append(span1, t2);
			if (if_block2) if_block2.m(span1, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*i*/ ctx[43]) if_block0.p(ctx, dirty);

			if (/*block*/ ctx[36].prepend) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3(ctx);
					if_block1.c();
					if_block1.m(span1, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			const switch_instance_changes = {};
			if (dirty[0] & /*regions*/ 32) switch_instance_changes.props = /*block*/ ctx[36].props;

			if (switch_value !== (switch_value = /*block*/ ctx[36].component)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, span0, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			if (/*block*/ ctx[36].append) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_2$1(ctx);
					if_block2.c();
					if_block2.m(span1, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (!current || dirty[0] & /*regions*/ 32 && span1_class_value !== (span1_class_value = "footer-block " + /*block*/ ctx[36].id + "-block")) {
				attr(span1, "class", span1_class_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(span1);
			if (if_block1) if_block1.d();
			if (switch_instance) destroy_component(switch_instance);
			if (if_block2) if_block2.d();
		}
	};
}

// (492:8) {#each ['Left', 'Center', 'Right'] as orientation}
function create_each_block_1(ctx) {
	let div;
	let t;
	let div_class_value;
	let current;
	let each_value_2 = /*regions*/ ctx[5]["footer" + /*orientation*/ ctx[39]];
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(div, "class", div_class_value = "footer-" + /*orientation*/ ctx[39].toLowerCase());
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			append(div, t);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*regions*/ 32) {
				each_value_2 = /*regions*/ ctx[5]["footer" + /*orientation*/ ctx[39]];
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_2(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, t);
					}
				}

				group_outros();

				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_2.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (522:4) {#each regions.afterBody as block}
function create_each_block$1(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*block*/ ctx[36].component;

	function switch_props(ctx) {
		return {
			props: { props: /*block*/ ctx[36].props }
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty[0] & /*regions*/ 32) switch_instance_changes.props = /*block*/ ctx[36].props;

			if (switch_value !== (switch_value = /*block*/ ctx[36].component)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (527:0) {#if chartAfterBodyHTML}
function create_if_block$9(ctx) {
	let html_tag;

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(/*chartAfterBodyHTML*/ ctx[1], target, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*chartAfterBodyHTML*/ 2) html_tag.p(/*chartAfterBodyHTML*/ ctx[1]);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

function create_fragment$g(ctx) {
	let t0;
	let t1;
	let div0;
	let div0_aria_hidden_value;
	let t2;
	let show_if = get(/*theme*/ ctx[0], "data.template.afterChart");
	let t3;
	let t4;
	let div1;
	let t5;
	let if_block4_anchor;
	let current;
	let if_block0 = !/*isStylePlain*/ ctx[2] && create_if_block_7(ctx);
	let if_block1 = /*ariaDescription*/ ctx[8] && create_if_block_6(ctx);
	let if_block2 = show_if && create_if_block_5(ctx);
	let if_block3 = !/*isStylePlain*/ ctx[2] && create_if_block_1$6(ctx);
	let each_value = /*regions*/ ctx[5].afterBody;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	let if_block4 = /*chartAfterBodyHTML*/ ctx[1] && create_if_block$9(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			div0 = element("div");
			t2 = space();
			if (if_block2) if_block2.c();
			t3 = space();
			if (if_block3) if_block3.c();
			t4 = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			if (if_block4) if_block4.c();
			if_block4_anchor = empty();
			attr(div0, "id", "chart");
			attr(div0, "aria-hidden", div0_aria_hidden_value = !!/*ariaDescription*/ ctx[8]);
			attr(div0, "class", "dw-chart-body");
			toggle_class(div0, "content-below-chart", /*contentBelowChart*/ ctx[7]);
			attr(div1, "class", "dw-after-body");
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, t1, anchor);
			insert(target, div0, anchor);
			/*div0_binding*/ ctx[21](div0);
			insert(target, t2, anchor);
			if (if_block2) if_block2.m(target, anchor);
			insert(target, t3, anchor);
			if (if_block3) if_block3.m(target, anchor);
			insert(target, t4, anchor);
			insert(target, div1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			insert(target, t5, anchor);
			if (if_block4) if_block4.m(target, anchor);
			insert(target, if_block4_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (!/*isStylePlain*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*isStylePlain*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_7(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*ariaDescription*/ ctx[8]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_6(ctx);
					if_block1.c();
					if_block1.m(t1.parentNode, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (!current || dirty[0] & /*ariaDescription*/ 256 && div0_aria_hidden_value !== (div0_aria_hidden_value = !!/*ariaDescription*/ ctx[8])) {
				attr(div0, "aria-hidden", div0_aria_hidden_value);
			}

			if (dirty[0] & /*contentBelowChart*/ 128) {
				toggle_class(div0, "content-below-chart", /*contentBelowChart*/ ctx[7]);
			}

			if (dirty[0] & /*theme*/ 1) show_if = get(/*theme*/ ctx[0], "data.template.afterChart");

			if (show_if) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_5(ctx);
					if_block2.c();
					if_block2.m(t3.parentNode, t3);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (!/*isStylePlain*/ ctx[2]) {
				if (if_block3) {
					if_block3.p(ctx, dirty);

					if (dirty[0] & /*isStylePlain*/ 4) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block_1$6(ctx);
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(t4.parentNode, t4);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (dirty[0] & /*regions*/ 32) {
				each_value = /*regions*/ ctx[5].afterBody;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div1, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (/*chartAfterBodyHTML*/ ctx[1]) {
				if (if_block4) {
					if_block4.p(ctx, dirty);
				} else {
					if_block4 = create_if_block$9(ctx);
					if_block4.c();
					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
				}
			} else if (if_block4) {
				if_block4.d(1);
				if_block4 = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block3);

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block3);
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t0);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(t1);
			if (detaching) detach(div0);
			/*div0_binding*/ ctx[21](null);
			if (detaching) detach(t2);
			if (if_block2) if_block2.d(detaching);
			if (detaching) detach(t3);
			if (if_block3) if_block3.d(detaching);
			if (detaching) detach(t4);
			if (detaching) detach(div1);
			destroy_each(each_blocks, detaching);
			if (detaching) detach(t5);
			if (if_block4) if_block4.d(detaching);
			if (detaching) detach(if_block4_anchor);
		}
	};
}

function byPriority(a, b) {
	return (a.priority !== undefined ? a.priority : 999) - (b.priority !== undefined ? b.priority : 999);
}

function getCaption(id) {
	if (id === "d3-maps-choropleth" || id === "d3-maps-symbols" || id === "locator-map") return "map"; else if (id === "tables") return "table";
	return "chart";
}

function instance$g($$self, $$props, $$invalidate) {
	let { data = "" } = $$props;
	let { chart } = $$props;
	let { visualization = {} } = $$props;
	let { theme = {} } = $$props;
	let { locales = {} } = $$props;
	let { translations } = $$props;
	let { blocks = {} } = $$props;
	let { chartAfterBodyHTML = "" } = $$props;
	let { isIframe } = $$props;
	let { isPreview } = $$props;
	let { assets } = $$props;
	let { fonts = {} } = $$props;
	let { styleHolder } = $$props;
	let { origin } = $$props;
	let { isStylePlain = false } = $$props;
	let { isStyleStatic = false } = $$props;

	// .dw-chart-body
	let target, dwChart, vis;

	const coreBlocks = [
		{
			id: "headline",
			tag: "h1",
			region: "header",
			priority: 10,
			test: ({ chart }) => chart.title && !get(chart, "metadata.describe.hide-title"),
			component: Headline
		},
		{
			id: "description",
			tag: "p",
			region: "header",
			priority: 20,
			test: ({ chart }) => get(chart, "metadata.describe.intro"),
			component: Description
		},
		{
			id: "notes",
			region: "aboveFooter",
			priority: 10,
			test: ({ chart }) => get(chart, "metadata.annotate.notes"),
			component: Notes
		},
		{
			id: "byline",
			region: "footerLeft",
			test: ({ chart }) => get(chart, "metadata.describe.byline", false) || chart.basedOnByline,
			priority: 10,
			component: Byline
		},
		{
			id: "source",
			region: "footerLeft",
			test: ({ chart }) => get(chart, "metadata.describe.source-name"),
			priority: 20,
			component: Source
		},
		{
			id: "get-the-data",
			region: "footerLeft",
			test: ({ theme, isStyleStatic }) => get(theme, "data.options.footer.getTheData.enabled") && !isStyleStatic,
			priority: 30,
			component: GetTheData
		},
		{
			id: "embed",
			region: "footerLeft",
			test: ({ theme, isStyleStatic }) => get(theme, "data.options.footer.embed.enabled") && !isStyleStatic,
			priority: 40,
			component: Embed
		},
		{
			id: "logo",
			region: "footerRight",
			test: ({ theme }) => get(theme, "data.options.footer.logo.enabled"),
			priority: 10,
			component: Logo
		},
		{
			id: "rectangle",
			region: "header",
			test: ({ theme }) => !!get(theme, "data.options.blocks.rectangle"),
			priority: 1,
			component: Rectangle
		},
		{
			id: "watermark",
			region: "afterBody",
			test: ({ theme }) => {
				const field = get(theme, "data.options.watermark.custom-field");

				return get(theme, "data.options.watermark")
				? field
					? get(chart, `metadata.custom.${field}`, "")
					: get(theme, "data.options.watermark.text", "CONFIDENTIAL")
				: false;
			},
			priority: 1,
			component: Watermark
		},
		hr(0, "hr"),
		hr(1, "hr"),
		hr(2, "hr"),
		hr(0, "svg-rule"),
		hr(1, "svg-rule"),
		hr(2, "svg-rule")
	];

	function hr(index, type) {
		const id = `${type}${index ? index : ""}`;

		return {
			id,
			region: "header",
			test: ({ theme }) => !!get(theme, `data.options.blocks.${id}`),
			priority: 0,
			component: type === "hr" ? HorizontalRule : SvgRule
		};
	}

	let pluginBlocks = [];

	async function loadBlocks(blocks) {
		if (blocks.length) {
			function url(src) {
				return origin && src.indexOf("http") !== 0
				? `${origin}/${src}`
				: src;
			}

			await Promise.all(blocks.map(d => {
				return new Promise((resolve, reject) => {
						const p = [loadScript(url(d.source.js))];

						if (d.source.css) {
							p.push(loadStylesheet({
								src: url(d.source.css),
								parentElement: styleHolder
							}));
						}

						Promise.all(p).then(resolve).catch(err => {
							// log error
							const url = err.target
							? err.target.getAttribute("src") || err.target.getAttribute("href")
							: null;

							if (url) console.warn("could not load ", url); else console.error("Unknown error", err);

							// but resolve anyway
							resolve();
						});
					});
			}));

			// all scripts are loaded
			blocks.forEach(d => {
				d.blocks.forEach(block => {
					if (!dw.block.has(block.component)) {
						return console.warn(`component ${block.component} from chart block ${block.id} not found`);
					}

					pluginBlocks.push({
						...block,
						component: dw.block(block.component)
					});
				});
			});

			// trigger svelte update after modifying array
			$$invalidate(24, pluginBlocks);
		}
	}

	function getBlocks(allBlocks, region, props) {
		return allBlocks.filter(d => d.region === region).filter(d => !d.test || d.test({ ...d.props, ...props })).filter(d => d.visible !== undefined ? d.visible : true).sort(byPriority);
	}

	function applyThemeBlockConfig(blocks, theme, blockProps) {
		return blocks.map(block => {
			block.props = {
				...block.data || {},
				...blockProps,
				id: block.id
			};

			if (block.component.test) {
				block.test = block.component.test;
			}

			const options = get(theme, "data.options.blocks", {})[block.id];
			if (!options) return block;
			return { ...block, ...options };
		});
	}

	let regions;
	let menu;
	const caption = getCaption(visualization.id);

	function __(key, ...args) {
		if (typeof key !== "string") {
			key = "";

			console.error(new TypeError(`function __ called without required 'key' parameter!
Please make sure you called __(key) with a key of type "string".
`));
		}

		key = key.trim();
		let translation = locales[key] || key;

		if (args.length) {
			translation = translation.replace(/\$(\d)/g, (m, i) => {
				i = +i;
				return args[i] || m;
			});
		}

		return translation;
	}

	async function run() {
		if (typeof dw === "undefined") return;

		// register theme
		dw.theme.register(theme.id, theme.data);

		// register locales
		Object.keys(locales).forEach(vendor => {
			// eslint-disable-next-line
			$$invalidate(9, locales[vendor] = eval(locales[vendor]), locales);
		});

		// initialize dw.chart object
		$$invalidate(22, dwChart = dw.chart(chart).locale((chart.language || "en-US").substr(0, 2)).translations(translations).theme(dw.theme(chart.theme)));

		// register chart assets
		for (var id in assets) {
			dwChart.asset(id, assets[id]);
		}

		// initialize dw.vis object
		$$invalidate(23, vis = dw.visualization(visualization.id, target));

		$$invalidate(23, vis.meta = visualization, vis);
		$$invalidate(23, vis.lang = chart.language || "en-US", vis);

		// load chart data
		await dwChart.load(data || "", isPreview ? undefined : chart.externalData);

		$$invalidate(22, dwChart.locales = locales, dwChart);
		dwChart.vis(vis);

		// load & register blocks (but don't await them, because they
		// are not needed for initial chart rendering
		loadBlocks(blocks);

		// initialize emotion instance
		if (!dwChart.emotion) {
			$$invalidate(
				22,
				dwChart.emotion = createEmotion({
					key: `datawrapper-${chart.id}`,
					container: isIframe ? document.head : styleHolder
				}),
				dwChart
			);
		}

		// render chart
		dwChart.render(isIframe, isPreview);

		// await necessary reload triggers
		observeFonts(fonts, theme.data.typography).then(() => dwChart.render(isIframe, isPreview)).catch(() => dwChart.render(isIframe, isPreview));

		// iPhone/iPad fix
		if ((/iP(hone|od|ad)/).test(navigator.platform)) {
			window.onload = dwChart.render(isIframe, isPreview);
		}
	}

	onMount(async () => {
		run();

		if (isIframe) {
			// set some classes - still needed?
			document.body.classList.toggle("plain", isStylePlain);

			document.body.classList.toggle("static", isStyleStatic);
			document.body.classList.toggle("png-export", isStyleStatic);

			if (isStyleStatic) {
				document.body.style["pointer-events"] = "none";
			}

			// fire events on hashchange
			domReady(() => {
				const postEvent$1 = postEvent(chart.id);

				window.addEventListener("hashchange", () => {
					postEvent$1("hash.change", { hash: window.location.hash });
				});
			});

			// watch for height changes - still needed?
			let currentHeight = document.body.offsetHeight;

			afterUpdate(() => {
				const newHeight = document.body.offsetHeight;

				if (currentHeight !== newHeight && typeof render === "function") {
					render();
					currentHeight = newHeight;
				}
			});

			// provide external APIs
			if (isIframe) {
				window.__dw = window.__dw || {};
				window.__dw.params = { data };
				window.__dw.vis = vis;

				window.__dw.render = () => {
					dwChart.render(isIframe, isPreview);
				};
			}
		}
	});

	let contentBelowChart;

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			target = $$value;
			$$invalidate(4, target);
		});
	}

	$$self.$set = $$props => {
		if ("data" in $$props) $$invalidate(10, data = $$props.data);
		if ("chart" in $$props) $$invalidate(11, chart = $$props.chart);
		if ("visualization" in $$props) $$invalidate(12, visualization = $$props.visualization);
		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
		if ("locales" in $$props) $$invalidate(9, locales = $$props.locales);
		if ("translations" in $$props) $$invalidate(13, translations = $$props.translations);
		if ("blocks" in $$props) $$invalidate(14, blocks = $$props.blocks);
		if ("chartAfterBodyHTML" in $$props) $$invalidate(1, chartAfterBodyHTML = $$props.chartAfterBodyHTML);
		if ("isIframe" in $$props) $$invalidate(15, isIframe = $$props.isIframe);
		if ("isPreview" in $$props) $$invalidate(16, isPreview = $$props.isPreview);
		if ("assets" in $$props) $$invalidate(17, assets = $$props.assets);
		if ("fonts" in $$props) $$invalidate(18, fonts = $$props.fonts);
		if ("styleHolder" in $$props) $$invalidate(19, styleHolder = $$props.styleHolder);
		if ("origin" in $$props) $$invalidate(20, origin = $$props.origin);
		if ("isStylePlain" in $$props) $$invalidate(2, isStylePlain = $$props.isStylePlain);
		if ("isStyleStatic" in $$props) $$invalidate(3, isStyleStatic = $$props.isStyleStatic);
	};

	let ariaDescription;
	let customCSS;
	let allBlocks;
	let blockProps;

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*chart*/ 2048) {
			 $$invalidate(8, ariaDescription = purifyHTML(get(chart, "metadata.describe.aria-description", ""), "<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>"));
		}

		if ($$self.$$.dirty[0] & /*chart*/ 2048) {
			 customCSS = purifyHTML(get(chart, "metadata.publish.custom-css", ""), "");
		}

		if ($$self.$$.dirty[0] & /*theme, data, chart, dwChart, vis*/ 12585985) {
			 $$invalidate(27, blockProps = {
				__,
				purifyHtml: clean,
				get,
				theme,
				data,
				chart,
				dwChart,
				vis,
				caption
			});
		}

		if ($$self.$$.dirty[0] & /*pluginBlocks, theme, blockProps*/ 150994945) {
			 $$invalidate(26, allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps));
		}

		if ($$self.$$.dirty[0] & /*allBlocks, chart, data, theme, isStyleStatic*/ 67111945) {
			 {
				// build all the region
				$$invalidate(5, regions = {
					header: getBlocks(allBlocks, "header", { chart, data, theme, isStyleStatic }),
					aboveFooter: getBlocks(allBlocks, "aboveFooter", { chart, data, theme, isStyleStatic }),
					footerLeft: getBlocks(allBlocks, "footerLeft", { chart, data, theme, isStyleStatic }),
					footerCenter: getBlocks(allBlocks, "footerCenter", { chart, data, theme, isStyleStatic }),
					footerRight: getBlocks(allBlocks, "footerRight", { chart, data, theme, isStyleStatic }),
					belowFooter: getBlocks(allBlocks, "belowFooter", { chart, data, theme, isStyleStatic }),
					afterBody: getBlocks(allBlocks, "afterBody", { chart, data, theme, isStyleStatic }),
					menu: getBlocks(allBlocks, "menu", { chart, data, theme, isStyleStatic })
				});
			}
		}

		if ($$self.$$.dirty[0] & /*theme*/ 1) {
			 {
				$$invalidate(6, menu = get(theme, "data.options.menu", {}));
			}
		}

		if ($$self.$$.dirty[0] & /*regions*/ 32) {
			 $$invalidate(7, contentBelowChart = regions.aboveFooter.length || regions.footerLeft.length || regions.footerCenter.length || regions.footerRight.length || regions.belowFooter.length || regions.afterBody.length);
		}
	};

	return [
		theme,
		chartAfterBodyHTML,
		isStylePlain,
		isStyleStatic,
		target,
		regions,
		menu,
		contentBelowChart,
		ariaDescription,
		locales,
		data,
		chart,
		visualization,
		translations,
		blocks,
		isIframe,
		isPreview,
		assets,
		fonts,
		styleHolder,
		origin,
		div0_binding
	];
}

class Visualization extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$g,
			create_fragment$g,
			safe_not_equal,
			{
				data: 10,
				chart: 11,
				visualization: 12,
				theme: 0,
				locales: 9,
				translations: 13,
				blocks: 14,
				chartAfterBodyHTML: 1,
				isIframe: 15,
				isPreview: 16,
				assets: 17,
				fonts: 18,
				styleHolder: 19,
				origin: 20,
				isStylePlain: 2,
				isStyleStatic: 3
			},
			[-1, -1]
		);
	}
}/* lib/VisualizationWebComponent.wc.svelte generated by Svelte v3.23.2 */

function create_if_block$a(ctx) {
	let div;
	let visualization_1;
	let current;

	visualization_1 = new Visualization({
			props: {
				data: /*data*/ ctx[0],
				chart: /*chart*/ ctx[1],
				visualization: /*visualization*/ ctx[2],
				theme: /*theme*/ ctx[3],
				locales: /*locales*/ ctx[4],
				translations: /*translations*/ ctx[5],
				blocks: /*blocks*/ ctx[6],
				chartAfterBodyHTML: /*chartAfterBodyHTML*/ ctx[7],
				isIframe: false,
				isPreview: /*isPreview*/ ctx[8],
				assets: /*assets*/ ctx[9],
				origin: /*origin*/ ctx[10],
				fonts: /*fonts*/ ctx[11],
				styleHolder: /*styleHolder*/ ctx[15],
				isStylePlain: /*isStylePlain*/ ctx[12],
				isStyleStatic: /*isStyleStatic*/ ctx[13]
			}
		});

	return {
		c() {
			div = element("div");
			create_component(visualization_1.$$.fragment);
			attr(div, "class", "chart dw-chart");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(visualization_1, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const visualization_1_changes = {};
			if (dirty & /*data*/ 1) visualization_1_changes.data = /*data*/ ctx[0];
			if (dirty & /*chart*/ 2) visualization_1_changes.chart = /*chart*/ ctx[1];
			if (dirty & /*visualization*/ 4) visualization_1_changes.visualization = /*visualization*/ ctx[2];
			if (dirty & /*theme*/ 8) visualization_1_changes.theme = /*theme*/ ctx[3];
			if (dirty & /*locales*/ 16) visualization_1_changes.locales = /*locales*/ ctx[4];
			if (dirty & /*translations*/ 32) visualization_1_changes.translations = /*translations*/ ctx[5];
			if (dirty & /*blocks*/ 64) visualization_1_changes.blocks = /*blocks*/ ctx[6];
			if (dirty & /*chartAfterBodyHTML*/ 128) visualization_1_changes.chartAfterBodyHTML = /*chartAfterBodyHTML*/ ctx[7];
			if (dirty & /*isPreview*/ 256) visualization_1_changes.isPreview = /*isPreview*/ ctx[8];
			if (dirty & /*assets*/ 512) visualization_1_changes.assets = /*assets*/ ctx[9];
			if (dirty & /*origin*/ 1024) visualization_1_changes.origin = /*origin*/ ctx[10];
			if (dirty & /*fonts*/ 2048) visualization_1_changes.fonts = /*fonts*/ ctx[11];
			if (dirty & /*styleHolder*/ 32768) visualization_1_changes.styleHolder = /*styleHolder*/ ctx[15];
			if (dirty & /*isStylePlain*/ 4096) visualization_1_changes.isStylePlain = /*isStylePlain*/ ctx[12];
			if (dirty & /*isStyleStatic*/ 8192) visualization_1_changes.isStyleStatic = /*isStyleStatic*/ ctx[13];
			visualization_1.$set(visualization_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(visualization_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(visualization_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(visualization_1);
		}
	};
}

function create_fragment$h(ctx) {
	let div;
	let t;
	let if_block_anchor;
	let current;
	let if_block = /*stylesLoaded*/ ctx[14] && create_if_block$a(ctx);

	return {
		c() {
			div = element("div");
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, div, anchor);
			/*div_binding*/ ctx[17](div);
			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*stylesLoaded*/ ctx[14]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*stylesLoaded*/ 16384) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$a(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[17](null);
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
	let { data = "" } = $$props;
	let { chart = {} } = $$props;
	let { visualization = {} } = $$props;
	let { theme = {} } = $$props;
	let { locales = {} } = $$props;
	let { translations } = $$props;
	let { blocks = {} } = $$props;
	let { chartAfterBodyHTML = "" } = $$props;
	let { isPreview } = $$props;
	let { assets } = $$props;
	let { styles } = $$props;
	let { origin } = $$props;
	let { fonts = {} } = $$props;
	let { isStylePlain = false } = $$props;
	let { isStyleStatic = false } = $$props;
	let stylesLoaded = false;
	let styleHolder;

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			styleHolder = $$value;
			$$invalidate(15, styleHolder);
		});
	}

	$$self.$set = $$props => {
		if ("data" in $$props) $$invalidate(0, data = $$props.data);
		if ("chart" in $$props) $$invalidate(1, chart = $$props.chart);
		if ("visualization" in $$props) $$invalidate(2, visualization = $$props.visualization);
		if ("theme" in $$props) $$invalidate(3, theme = $$props.theme);
		if ("locales" in $$props) $$invalidate(4, locales = $$props.locales);
		if ("translations" in $$props) $$invalidate(5, translations = $$props.translations);
		if ("blocks" in $$props) $$invalidate(6, blocks = $$props.blocks);
		if ("chartAfterBodyHTML" in $$props) $$invalidate(7, chartAfterBodyHTML = $$props.chartAfterBodyHTML);
		if ("isPreview" in $$props) $$invalidate(8, isPreview = $$props.isPreview);
		if ("assets" in $$props) $$invalidate(9, assets = $$props.assets);
		if ("styles" in $$props) $$invalidate(16, styles = $$props.styles);
		if ("origin" in $$props) $$invalidate(10, origin = $$props.origin);
		if ("fonts" in $$props) $$invalidate(11, fonts = $$props.fonts);
		if ("isStylePlain" in $$props) $$invalidate(12, isStylePlain = $$props.isStylePlain);
		if ("isStyleStatic" in $$props) $$invalidate(13, isStyleStatic = $$props.isStyleStatic);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*stylesLoaded, styleHolder, styles*/ 114688) {
			// ensure styles are loaded before the vis is rendered to prevent flickering
			 {
				if (!stylesLoaded && styleHolder && styles) {
					const style = document.createElement("style");
					style.type = "text/css";
					style.innerHTML = styles.css;
					styleHolder.appendChild(style);
					$$invalidate(14, stylesLoaded = true);
				}
			}
		}
	};

	return [
		data,
		chart,
		visualization,
		theme,
		locales,
		translations,
		blocks,
		chartAfterBodyHTML,
		isPreview,
		assets,
		origin,
		fonts,
		isStylePlain,
		isStyleStatic,
		stylesLoaded,
		styleHolder,
		styles,
		div_binding
	];
}

class VisualizationWebComponent_wc extends SvelteElement {
	constructor(options) {
		super();

		init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, {
			data: 0,
			chart: 1,
			visualization: 2,
			theme: 3,
			locales: 4,
			translations: 5,
			blocks: 6,
			chartAfterBodyHTML: 7,
			isPreview: 8,
			assets: 9,
			styles: 16,
			origin: 10,
			fonts: 11,
			isStylePlain: 12,
			isStyleStatic: 13
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return [
			"data",
			"chart",
			"visualization",
			"theme",
			"locales",
			"translations",
			"blocks",
			"chartAfterBodyHTML",
			"isPreview",
			"assets",
			"styles",
			"origin",
			"fonts",
			"isStylePlain",
			"isStyleStatic"
		];
	}

	get data() {
		return this.$$.ctx[0];
	}

	set data(data) {
		this.$set({ data });
		flush();
	}

	get chart() {
		return this.$$.ctx[1];
	}

	set chart(chart) {
		this.$set({ chart });
		flush();
	}

	get visualization() {
		return this.$$.ctx[2];
	}

	set visualization(visualization) {
		this.$set({ visualization });
		flush();
	}

	get theme() {
		return this.$$.ctx[3];
	}

	set theme(theme) {
		this.$set({ theme });
		flush();
	}

	get locales() {
		return this.$$.ctx[4];
	}

	set locales(locales) {
		this.$set({ locales });
		flush();
	}

	get translations() {
		return this.$$.ctx[5];
	}

	set translations(translations) {
		this.$set({ translations });
		flush();
	}

	get blocks() {
		return this.$$.ctx[6];
	}

	set blocks(blocks) {
		this.$set({ blocks });
		flush();
	}

	get chartAfterBodyHTML() {
		return this.$$.ctx[7];
	}

	set chartAfterBodyHTML(chartAfterBodyHTML) {
		this.$set({ chartAfterBodyHTML });
		flush();
	}

	get isPreview() {
		return this.$$.ctx[8];
	}

	set isPreview(isPreview) {
		this.$set({ isPreview });
		flush();
	}

	get assets() {
		return this.$$.ctx[9];
	}

	set assets(assets) {
		this.$set({ assets });
		flush();
	}

	get styles() {
		return this.$$.ctx[16];
	}

	set styles(styles) {
		this.$set({ styles });
		flush();
	}

	get origin() {
		return this.$$.ctx[10];
	}

	set origin(origin) {
		this.$set({ origin });
		flush();
	}

	get fonts() {
		return this.$$.ctx[11];
	}

	set fonts(fonts) {
		this.$set({ fonts });
		flush();
	}

	get isStylePlain() {
		return this.$$.ctx[12];
	}

	set isStylePlain(isStylePlain) {
		this.$set({ isStylePlain });
		flush();
	}

	get isStyleStatic() {
		return this.$$.ctx[13];
	}

	set isStyleStatic(isStyleStatic) {
		this.$set({ isStyleStatic });
		flush();
	}
}if (typeof window.__dw === 'undefined') {
    const callbacks = [];

    window.__dw = {
        onDependencyCompleted: function(cb) {
            callbacks.push(cb);
        },
        dependencyCompleted: function() {
            for (let cb of callbacks) {
                cb();
            }
        },
        dependencies: {},
        render: async function(data) {
            const elementId = `datawrapper-chart-${data.chart.id}`;
            document.write(`<div id="${elementId}"></div>`);

            // slightly hacky way to determine the script origin
            const scripts = document.getElementsByTagName('script');
            data.origin = scripts[scripts.length - 1]
                .getAttribute('src')
                .split('/')
                .slice(0, -1)
                .join('/');

            // fonts need to be appended globally, and can then be used in every WebComponent
            const styleId = `datawrapper-${data.chart.theme}`;
            if (!document.head.querySelector(`#${styleId}`)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.type = 'text/css';
                style.innerHTML = data.styles.fonts;
                document.head.appendChild(style);
            }

            loadDependency(data.dependencies[0]);

            async function loadDependency(script) {
                if (!__dw.dependencies[script]) {
                    __dw.dependencies[script] = 'loading';
                    await loadScript(
                        script.indexOf('http') === 0 ? script : `${data.origin}/${script}`
                    );
                    __dw.dependencies[script] = 'finished';
                }

                if (__dw.dependencies[script] === 'finished') {
                    __dw.dependencyCompleted();
                }
            }

            __dw.onDependencyCompleted(function() {
                for (let script of data.dependencies) {
                    if (__dw.dependencies[script] !== 'finished') {
                        if (!__dw.dependencies[script]) {
                            loadDependency(script);
                        }

                        return;
                    }
                }

                render();
            });

            let rendered = false;
            function render() {
                if (rendered) return;

                const props = {
                    target: document.getElementById(elementId),
                    props: data,
                    hydrate: false
                };

                if (!customElements.get('datawrapper-visualization')) {
                    customElements.define('datawrapper-visualization', VisualizationWebComponent_wc);
                    new VisualizationWebComponent_wc(props);
                } else {
                    const WebComponent = customElements.get('datawrapper-visualization');
                    new WebComponent(props);
                }

                rendered = true;
            }
        }
    };
}}());
=======
(function(){"use strict";function _typeof(t){return(_typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function _classCallCheck(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function _defineProperties(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function _createClass(t,e,n){return e&&_defineProperties(t.prototype,e),n&&_defineProperties(t,n),t}function _defineProperty(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function ownKeys(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,r)}return n}function _objectSpread2(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?ownKeys(Object(n),!0).forEach((function(e){_defineProperty(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):ownKeys(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function _inherits(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&_setPrototypeOf(t,e)}function _getPrototypeOf(t){return(_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function _setPrototypeOf(t,e){return(_setPrototypeOf=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function _isNativeReflectConstruct(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}function _construct(t,e,n){return(_construct=_isNativeReflectConstruct()?Reflect.construct:function(t,e,n){var r=[null];r.push.apply(r,e);var o=new(Function.bind.apply(t,r));return n&&_setPrototypeOf(o,n.prototype),o}).apply(null,arguments)}function _isNativeFunction(t){return-1!==Function.toString.call(t).indexOf("[native code]")}function _wrapNativeSuper(t){var e="function"==typeof Map?new Map:void 0;return(_wrapNativeSuper=function(t){if(null===t||!_isNativeFunction(t))return t;if("function"!=typeof t)throw new TypeError("Super expression must either be null or a function");if(void 0!==e){if(e.has(t))return e.get(t);e.set(t,n)}function n(){return _construct(t,arguments,_getPrototypeOf(this).constructor)}return n.prototype=Object.create(t.prototype,{constructor:{value:n,enumerable:!1,writable:!0,configurable:!0}}),_setPrototypeOf(n,t)})(t)}function _assertThisInitialized(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function _possibleConstructorReturn(t,e){return!e||"object"!=typeof e&&"function"!=typeof e?_assertThisInitialized(t):e}function _createSuper(t){var e=_isNativeReflectConstruct();return function(){var n,r=_getPrototypeOf(t);if(e){var o=_getPrototypeOf(this).constructor;n=Reflect.construct(r,arguments,o)}else n=r.apply(this,arguments);return _possibleConstructorReturn(this,n)}}function _slicedToArray(t,e){return _arrayWithHoles(t)||_iterableToArrayLimit(t,e)||_unsupportedIterableToArray(t,e)||_nonIterableRest()}function _toConsumableArray(t){return _arrayWithoutHoles(t)||_iterableToArray(t)||_unsupportedIterableToArray(t)||_nonIterableSpread()}function _arrayWithoutHoles(t){if(Array.isArray(t))return _arrayLikeToArray(t)}function _arrayWithHoles(t){if(Array.isArray(t))return t}function _iterableToArray(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)}function _iterableToArrayLimit(t,e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t)){var n=[],r=!0,o=!1,i=void 0;try{for(var a,s=t[Symbol.iterator]();!(r=(a=s.next()).done)&&(n.push(a.value),!e||n.length!==e);r=!0);}catch(t){o=!0,i=t}finally{try{r||null==s.return||s.return()}finally{if(o)throw i}}return n}}function _unsupportedIterableToArray(t,e){if(t){if("string"==typeof t)return _arrayLikeToArray(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?_arrayLikeToArray(t,e):void 0}}function _arrayLikeToArray(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function _createForOfIteratorHelper(t,e){var n;if("undefined"==typeof Symbol||null==t[Symbol.iterator]){if(Array.isArray(t)||(n=_unsupportedIterableToArray(t))||e&&t&&"number"==typeof t.length){n&&(t=n);var r=0,o=function(){};return{s:o,n:function(){return r>=t.length?{done:!0}:{done:!1,value:t[r++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,a=!0,s=!1;return{s:function(){n=t[Symbol.iterator]()},n:function(){var t=n.next();return a=t.done,t},e:function(t){s=!0,i=t},f:function(){try{a||null==n.return||n.return()}finally{if(s)throw i}}}}function noop(){}function run(t){return t()}function blank_object(){return Object.create(null)}function run_all(t){t.forEach(run)}function is_function(t){return"function"==typeof t}function safe_not_equal(t,e){return t!=t?e==e:t!==e||t&&"object"===_typeof(t)||"function"==typeof t}function append(t,e){t.appendChild(e)}function insert(t,e,n){t.insertBefore(e,n||null)}function detach(t){t.parentNode.removeChild(t)}function destroy_each(t,e){for(var n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function element(t){return document.createElement(t)}function svg_element(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function text(t){return document.createTextNode(t)}function space(){return text(" ")}function empty(){return text("")}function listen(t,e,n,r){return t.addEventListener(e,n,r),function(){return t.removeEventListener(e,n,r)}}function stop_propagation(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function attr(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function children(t){return Array.from(t.childNodes)}function set_data(t,e){e=""+e,t.data!==e&&(t.data=e)}function set_style(t,e,n,r){t.style.setProperty(e,n,r?"important":"")}function toggle_class(t,e,n){t.classList[n?"add":"remove"](e)}var HtmlTag=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null;_classCallCheck(this,t),this.a=e,this.e=this.n=null}return _createClass(t,[{key:"m",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;this.e||(this.e=element(e.nodeName),this.t=e,this.h(t)),this.i(n)}},{key:"h",value:function(t){this.e.innerHTML=t,this.n=Array.from(this.e.childNodes)}},{key:"i",value:function(t){for(var e=0;e<this.n.length;e+=1)insert(this.t,this.n[e],t)}},{key:"p",value:function(t){this.d(),this.h(t),this.i(this.a)}},{key:"d",value:function(){this.n.forEach(detach)}}]),t}(),current_component;function set_current_component(t){current_component=t}function get_current_component(){if(!current_component)throw new Error("Function called outside component initialization");return current_component}function onMount(t){get_current_component().$$.on_mount.push(t)}function afterUpdate(t){get_current_component().$$.after_update.push(t)}function bubble(t,e){var n=t.$$.callbacks[e.type];n&&n.slice().forEach((function(t){return t(e)}))}var dirty_components=[],binding_callbacks=[],render_callbacks=[],flush_callbacks=[],resolved_promise=Promise.resolve(),update_scheduled=!1;function schedule_update(){update_scheduled||(update_scheduled=!0,resolved_promise.then(flush))}function add_render_callback(t){render_callbacks.push(t)}var flushing=!1,seen_callbacks=new Set;function flush(){if(!flushing){flushing=!0;do{for(var t=0;t<dirty_components.length;t+=1){var e=dirty_components[t];set_current_component(e),update(e.$$)}for(dirty_components.length=0;binding_callbacks.length;)binding_callbacks.pop()();for(var n=0;n<render_callbacks.length;n+=1){var r=render_callbacks[n];seen_callbacks.has(r)||(seen_callbacks.add(r),r())}render_callbacks.length=0}while(dirty_components.length);for(;flush_callbacks.length;)flush_callbacks.pop()();update_scheduled=!1,flushing=!1,seen_callbacks.clear()}}function update(t){if(null!==t.fragment){t.update(),run_all(t.before_update);var e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(add_render_callback)}}var outroing=new Set,outros,SvelteElement;function group_outros(){outros={r:0,c:[],p:outros}}function check_outros(){outros.r||run_all(outros.c),outros=outros.p}function transition_in(t,e){t&&t.i&&(outroing.delete(t),t.i(e))}function transition_out(t,e,n,r){if(t&&t.o){if(outroing.has(t))return;outroing.add(t),outros.c.push((function(){outroing.delete(t),r&&(n&&t.d(1),r())})),t.o(e)}}function create_component(t){t&&t.c()}function mount_component(t,e,n){var r=t.$$,o=r.fragment,i=r.on_mount,a=r.on_destroy,s=r.after_update;o&&o.m(e,n),add_render_callback((function(){var e=i.map(run).filter(is_function);a?a.push.apply(a,_toConsumableArray(e)):run_all(e),t.$$.on_mount=[]})),s.forEach(add_render_callback)}function destroy_component(t,e){var n=t.$$;null!==n.fragment&&(run_all(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function make_dirty(t,e){-1===t.$$.dirty[0]&&(dirty_components.push(t),schedule_update(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function init(t,e,n,r,o,i){var a=arguments.length>6&&void 0!==arguments[6]?arguments[6]:[-1],s=current_component;set_current_component(t);var c=e.props||{},u=t.$$={fragment:null,ctx:null,props:i,update:noop,not_equal:o,bound:blank_object(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(s?s.$$.context:[]),callbacks:blank_object(),dirty:a},l=!1;if(u.ctx=n?n(t,c,(function(e,n){var r=!(arguments.length<=2)&&arguments.length-2?arguments.length<=2?void 0:arguments[2]:n;return u.ctx&&o(u.ctx[e],u.ctx[e]=r)&&(u.bound[e]&&u.bound[e](r),l&&make_dirty(t,e)),n})):[],u.update(),l=!0,run_all(u.before_update),u.fragment=!!r&&r(u.ctx),e.target){if(e.hydrate){var p=children(e.target);u.fragment&&u.fragment.l(p),p.forEach(detach)}else u.fragment&&u.fragment.c();e.intro&&transition_in(t.$$.fragment),mount_component(t,e.target,e.anchor),flush()}set_current_component(s)}"function"==typeof HTMLElement&&(SvelteElement=function(t){_inherits(n,t);var e=_createSuper(n);function n(){var t;return _classCallCheck(this,n),(t=e.call(this)).attachShadow({mode:"open"}),t}return _createClass(n,[{key:"connectedCallback",value:function(){for(var t in this.$$.slotted)this.appendChild(this.$$.slotted[t])}},{key:"attributeChangedCallback",value:function(t,e,n){this[t]=n}},{key:"$destroy",value:function(){destroy_component(this,1),this.$destroy=noop}},{key:"$on",value:function(t,e){var n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),function(){var t=n.indexOf(e);-1!==t&&n.splice(t,1)}}},{key:"$set",value:function(){}}]),n}(_wrapNativeSuper(HTMLElement)));var SvelteComponent=function(){function t(){_classCallCheck(this,t)}return _createClass(t,[{key:"$destroy",value:function(){destroy_component(this,1),this.$destroy=noop}},{key:"$on",value:function(t,e){var n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),function(){var t=n.indexOf(e);-1!==t&&n.splice(t,1)}}},{key:"$set",value:function(){}}]),t}(),TAGS=/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,COMMENTS_AND_PHP_TAGS=/<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi,defaultAllowed="<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>";function purifyHTML(t,e){if(null===t)return null;if(void 0!==t){if((t=String(t)).indexOf("<")<0||t.indexOf(">")<0)return t;if(t=stripTags(t,e),"undefined"==typeof document)return t;var n=document.createElement("div");n.innerHTML=t;for(var r=n.querySelectorAll("*"),o=0;o<r.length;o++){"a"===r[o].nodeName.toLowerCase()&&("_self"!==r[o].getAttribute("target")&&r[o].setAttribute("target","_blank"),r[o].setAttribute("rel","nofollow noopener noreferrer"),r[o].getAttribute("href")&&r[o].getAttribute("href").trim().replace(/[^a-zA-Z0-9 -:]/g,"").startsWith("javascript:")&&r[o].setAttribute("href",""));for(var i=[],a=0;a<r[o].attributes.length;a++){var s=r[o].attributes[a];s.specified&&"on"===s.name.substr(0,2)&&i.push(s.name)}i.forEach((function(t){return r[o].removeAttribute(t)}))}return n.innerHTML}}function stripTags(t,e){e=(((void 0!==e?e||"":defaultAllowed)+"").toLowerCase().match(/<[a-z][a-z0-9]*>/g)||[]).join("");for(var n=t,r=t;;)if(r=(n=r).replace(COMMENTS_AND_PHP_TAGS,"").replace(TAGS,(function(t,n){return e.indexOf("<"+n.toLowerCase()+">")>-1?t:""})),n===r)return r}function clean(t){return purifyHTML(t,"<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>")}function create_if_block_1(t){var e,n=clean(t[0].prepend)+"";return{c:function(){attr(e=element("span"),"class","prepend")},m:function(t,r){insert(t,e,r),e.innerHTML=n},p:function(t,r){1&r&&n!==(n=clean(t[0].prepend)+"")&&(e.innerHTML=n)},d:function(t){t&&detach(e)}}}function create_if_block(t){var e,n=clean(t[0].append)+"";return{c:function(){attr(e=element("span"),"class","append")},m:function(t,r){insert(t,e,r),e.innerHTML=n},p:function(t,r){1&r&&n!==(n=clean(t[0].append)+"")&&(e.innerHTML=n)},d:function(t){t&&detach(e)}}}function create_fragment(t){var e,n,r,o,i,a,s=t[0].prepend&&create_if_block_1(t),c=t[0].component;function u(t){return{props:{props:t[0].props}}}c&&(r=new c(u(t)));var l=t[0].append&&create_if_block(t);return{c:function(){s&&s.c(),e=space(),n=element("span"),r&&create_component(r.$$.fragment),o=space(),l&&l.c(),i=empty(),attr(n,"class","block-inner")},m:function(t,c){s&&s.m(t,c),insert(t,e,c),insert(t,n,c),r&&mount_component(r,n,null),insert(t,o,c),l&&l.m(t,c),insert(t,i,c),a=!0},p:function(t,o){var a=_slicedToArray(o,1)[0];t[0].prepend?s?s.p(t,a):((s=create_if_block_1(t)).c(),s.m(e.parentNode,e)):s&&(s.d(1),s=null);var p={};if(1&a&&(p.props=t[0].props),c!==(c=t[0].component)){if(r){group_outros();var f=r;transition_out(f.$$.fragment,1,0,(function(){destroy_component(f,1)})),check_outros()}c?(create_component((r=new c(u(t))).$$.fragment),transition_in(r.$$.fragment,1),mount_component(r,n,null)):r=null}else c&&r.$set(p);t[0].append?l?l.p(t,a):((l=create_if_block(t)).c(),l.m(i.parentNode,i)):l&&(l.d(1),l=null)},i:function(t){a||(r&&transition_in(r.$$.fragment,t),a=!0)},o:function(t){r&&transition_out(r.$$.fragment,t),a=!1},d:function(t){s&&s.d(t),t&&detach(e),t&&detach(n),r&&destroy_component(r),t&&detach(o),l&&l.d(t),t&&detach(i)}}}function instance(t,e,n){var r=e.block;return t.$set=function(t){"block"in t&&n(0,r=t.block)},[r]}var Block=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance,create_fragment,safe_not_equal,{block:0}),r}return n}(SvelteComponent);function get_each_context(t,e,n){var r=t.slice();return r[3]=e[n],r}function create_if_block$1(t){for(var e,n,r=t[2],o=[],i=0;i<r.length;i+=1)o[i]=create_each_block(get_each_context(t,r,i));var a=function(t){return transition_out(o[t],1,1,(function(){o[t]=null}))};return{c:function(){e=element("div");for(var n=0;n<o.length;n+=1)o[n].c();attr(e,"id",t[0]),attr(e,"class",t[1])},m:function(t,r){insert(t,e,r);for(var i=0;i<o.length;i+=1)o[i].m(e,null);n=!0},p:function(t,i){if(4&i){var s;for(r=t[2],s=0;s<r.length;s+=1){var c=get_each_context(t,r,s);o[s]?(o[s].p(c,i),transition_in(o[s],1)):(o[s]=create_each_block(c),o[s].c(),transition_in(o[s],1),o[s].m(e,null))}for(group_outros(),s=r.length;s<o.length;s+=1)a(s);check_outros()}(!n||1&i)&&attr(e,"id",t[0]),(!n||2&i)&&attr(e,"class",t[1])},i:function(t){if(!n){for(var e=0;e<r.length;e+=1)transition_in(o[e]);n=!0}},o:function(t){o=o.filter(Boolean);for(var e=0;e<o.length;e+=1)transition_out(o[e]);n=!1},d:function(t){t&&detach(e),destroy_each(o,t)}}}function create_else_block(t){var e,n,r,o,i,a;return n=new Block({props:{block:t[3]}}),{c:function(){e=element("div"),create_component(n.$$.fragment),r=space(),attr(e,"class",o="block "+t[3].id+"-block"),attr(e,"style",i=t[3].id.includes("svg-rule")?"font-size:0px;":"")},m:function(t,o){insert(t,e,o),mount_component(n,e,null),append(e,r),a=!0},p:function(t,r){var s={};4&r&&(s.block=t[3]),n.$set(s),(!a||4&r&&o!==(o="block "+t[3].id+"-block"))&&attr(e,"class",o),(!a||4&r&&i!==(i=t[3].id.includes("svg-rule")?"font-size:0px;":""))&&attr(e,"style",i)},i:function(t){a||(transition_in(n.$$.fragment,t),a=!0)},o:function(t){transition_out(n.$$.fragment,t),a=!1},d:function(t){t&&detach(e),destroy_component(n)}}}function create_if_block_2(t){var e,n,r,o,i;return n=new Block({props:{block:t[3]}}),{c:function(){e=element("p"),create_component(n.$$.fragment),r=space(),attr(e,"class",o="block "+t[3].id+"-block")},m:function(t,o){insert(t,e,o),mount_component(n,e,null),append(e,r),i=!0},p:function(t,r){var a={};4&r&&(a.block=t[3]),n.$set(a),(!i||4&r&&o!==(o="block "+t[3].id+"-block"))&&attr(e,"class",o)},i:function(t){i||(transition_in(n.$$.fragment,t),i=!0)},o:function(t){transition_out(n.$$.fragment,t),i=!1},d:function(t){t&&detach(e),destroy_component(n)}}}function create_if_block_1$1(t){var e,n,r,o,i;return n=new Block({props:{block:t[3]}}),{c:function(){e=element("h1"),create_component(n.$$.fragment),r=space(),attr(e,"class",o="block "+t[3].id+"-block")},m:function(t,o){insert(t,e,o),mount_component(n,e,null),append(e,r),i=!0},p:function(t,r){var a={};4&r&&(a.block=t[3]),n.$set(a),(!i||4&r&&o!==(o="block "+t[3].id+"-block"))&&attr(e,"class",o)},i:function(t){i||(transition_in(n.$$.fragment,t),i=!0)},o:function(t){transition_out(n.$$.fragment,t),i=!1},d:function(t){t&&detach(e),destroy_component(n)}}}function create_each_block(t){var e,n,r,o,i=[create_if_block_1$1,create_if_block_2,create_else_block],a=[];function s(t,e){return"h1"===t[3].tag?0:"p"===t[3].tag?1:2}return e=s(t),n=a[e]=i[e](t),{c:function(){n.c(),r=empty()},m:function(t,n){a[e].m(t,n),insert(t,r,n),o=!0},p:function(t,o){var c=e;(e=s(t))===c?a[e].p(t,o):(group_outros(),transition_out(a[c],1,1,(function(){a[c]=null})),check_outros(),(n=a[e])||(n=a[e]=i[e](t)).c(),transition_in(n,1),n.m(r.parentNode,r))},i:function(t){o||(transition_in(n),o=!0)},o:function(t){transition_out(n),o=!1},d:function(t){a[e].d(t),t&&detach(r)}}}function create_fragment$1(t){var e,n,r=t[2].length&&create_if_block$1(t);return{c:function(){r&&r.c(),e=empty()},m:function(t,o){r&&r.m(t,o),insert(t,e,o),n=!0},p:function(t,n){var o=_slicedToArray(n,1)[0];t[2].length?r?(r.p(t,o),4&o&&transition_in(r,1)):((r=create_if_block$1(t)).c(),transition_in(r,1),r.m(e.parentNode,e)):r&&(group_outros(),transition_out(r,1,1,(function(){r=null})),check_outros())},i:function(t){n||(transition_in(r),n=!0)},o:function(t){transition_out(r),n=!1},d:function(t){r&&r.d(t),t&&detach(e)}}}function instance$1(t,e,n){var r=e.id,o=e.name,i=e.blocks;return t.$set=function(t){"id"in t&&n(0,r=t.id),"name"in t&&n(1,o=t.name),"blocks"in t&&n(2,i=t.blocks)},[r,o,i]}var BlocksRegion=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$1,create_fragment$1,safe_not_equal,{id:0,name:1,blocks:2}),r}return n}(SvelteComponent);function create_if_block$2(t){var e,n,r,o,i,a,s;function c(t,e){return t[3].icon?create_if_block_1$2:create_else_block$1}var u=c(t),l=u(t);return o=new BlocksRegion({props:{id:t[0],name:t[1],blocks:t[2]}}),{c:function(){e=element("div"),l.c(),n=space(),r=element("div"),create_component(o.$$.fragment),attr(e,"class","menu container svelte-1lt126s"),toggle_class(e,"ha-menu",!t[3].icon),attr(r,"class","menu-content container svelte-1lt126s"),toggle_class(r,"hidden",!t[4])},m:function(c,u){insert(c,e,u),l.m(e,null),insert(c,n,u),insert(c,r,u),mount_component(o,r,null),i=!0,a||(s=[listen(e,"click",stop_propagation(t[5])),listen(r,"click",stop_propagation(t[7]))],a=!0)},p:function(t,n){u===(u=c(t))&&l?l.p(t,n):(l.d(1),(l=u(t))&&(l.c(),l.m(e,null))),8&n&&toggle_class(e,"ha-menu",!t[3].icon);var i={};1&n&&(i.id=t[0]),2&n&&(i.name=t[1]),4&n&&(i.blocks=t[2]),o.$set(i),16&n&&toggle_class(r,"hidden",!t[4])},i:function(t){i||(transition_in(o.$$.fragment,t),i=!0)},o:function(t){transition_out(o.$$.fragment,t),i=!1},d:function(t){t&&detach(e),l.d(),t&&detach(n),t&&detach(r),destroy_component(o),a=!1,run_all(s)}}}function create_else_block$1(t){var e;return{c:function(){attr(e=element("div"),"class","svelte-1lt126s")},m:function(t,n){insert(t,e,n)},p:noop,d:function(t){t&&detach(e)}}}function create_if_block_1$2(t){var e,n=t[3].icon+"";return{c:function(){e=new HtmlTag(null)},m:function(t,r){e.m(n,t,r)},p:function(t,r){8&r&&n!==(n=t[3].icon+"")&&e.p(n)},d:function(t){t&&e.d()}}}function create_fragment$2(t){var e,n,r,o,i=t[2].length&&create_if_block$2(t);return{c:function(){i&&i.c(),e=empty()},m:function(a,s){i&&i.m(a,s),insert(a,e,s),n=!0,r||(o=listen(window,"click",t[6]),r=!0)},p:function(t,n){var r=_slicedToArray(n,1)[0];t[2].length?i?(i.p(t,r),4&r&&transition_in(i,1)):((i=create_if_block$2(t)).c(),transition_in(i,1),i.m(e.parentNode,e)):i&&(group_outros(),transition_out(i,1,1,(function(){i=null})),check_outros())},i:function(t){n||(transition_in(i),n=!0)},o:function(t){transition_out(i),n=!1},d:function(t){i&&i.d(t),t&&detach(e),r=!1,o()}}}function instance$2(t,e,n){var r=e.id,o=e.name,i=e.blocks,a=e.props,s=!1;return t.$set=function(t){"id"in t&&n(0,r=t.id),"name"in t&&n(1,o=t.name),"blocks"in t&&n(2,i=t.blocks),"props"in t&&n(3,a=t.props)},[r,o,i,a,s,function(){n(4,s=!s)},function(){n(4,s=!1)},function(e){bubble(t,e)}]}var Menu=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$2,create_fragment$2,safe_not_equal,{id:0,name:1,blocks:2,props:3}),r}return n}(SvelteComponent);function create_fragment$3(t){var e;return{c:function(){e=new HtmlTag(null)},m:function(n,r){e.m(t[0],n,r)},p:function(t,n){1&_slicedToArray(n,1)[0]&&e.p(t[0])},i:noop,o:noop,d:function(t){t&&e.d()}}}function instance$3(t,e,n){var r,o,i=e.props,a=i.purifyHtml;return t.$set=function(t){"props"in t&&n(1,i=t.props)},t.$$.update=function(){2&t.$$.dirty&&n(2,r=i.chart),4&t.$$.dirty&&n(0,o=a(r.title))},[o,i]}var Headline=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$3,create_fragment$3,safe_not_equal,{props:1}),r}return n}(SvelteComponent);function create_fragment$4(t){var e;return{c:function(){e=new HtmlTag(null)},m:function(n,r){e.m(t[0],n,r)},p:function(t,n){1&_slicedToArray(n,1)[0]&&e.p(t[0])},i:noop,o:noop,d:function(t){t&&e.d()}}}var allowedTags="<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>";function instance$4(t,e,n){var r,o,i=e.props,a=i,s=a.get,c=a.purifyHtml;return t.$set=function(t){"props"in t&&n(1,i=t.props)},t.$$.update=function(){2&t.$$.dirty&&n(2,r=i.chart),4&t.$$.dirty&&n(0,o=c(s(r,"metadata.describe.intro"),allowedTags))},[o,i]}var Description=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$4,create_fragment$4,safe_not_equal,{props:1}),r}return n}(SvelteComponent);function create_if_block$3(t){var e,n,r,o,i,a=t[3](t[0].sourceCaption)+"";function s(t,e){return t[2]?create_if_block_1$3:create_else_block$2}var c=s(t),u=c(t);return{c:function(){e=element("span"),n=text(a),r=text(":"),o=space(),u.c(),i=empty(),attr(e,"class","source-caption")},m:function(t,a){insert(t,e,a),append(e,n),append(e,r),insert(t,o,a),u.m(t,a),insert(t,i,a)},p:function(t,e){1&e&&a!==(a=t[3](t[0].sourceCaption)+"")&&set_data(n,a),c===(c=s(t))&&u?u.p(t,e):(u.d(1),(u=c(t))&&(u.c(),u.m(i.parentNode,i)))},d:function(t){t&&detach(e),t&&detach(o),u.d(t),t&&detach(i)}}}function create_else_block$2(t){var e;return{c:function(){attr(e=element("span"),"class","source")},m:function(n,r){insert(n,e,r),e.innerHTML=t[1]},p:function(t,n){2&n&&(e.innerHTML=t[1])},d:function(t){t&&detach(e)}}}function create_if_block_1$3(t){var e;return{c:function(){attr(e=element("a"),"class","source"),attr(e,"target","_blank"),attr(e,"rel","noopener noreferrer"),attr(e,"href",t[2])},m:function(n,r){insert(n,e,r),e.innerHTML=t[1]},p:function(t,n){2&n&&(e.innerHTML=t[1]),4&n&&attr(e,"href",t[2])},d:function(t){t&&detach(e)}}}function create_fragment$5(t){var e,n=t[1]&&create_if_block$3(t);return{c:function(){n&&n.c(),e=empty()},m:function(t,r){n&&n.m(t,r),insert(t,e,r)},p:function(t,r){var o=_slicedToArray(r,1)[0];t[1]?n?n.p(t,o):((n=create_if_block$3(t)).c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},i:noop,o:noop,d:function(t){n&&n.d(t),t&&detach(e)}}}function instance$5(t,e,n){var r,o,i,a,s,c=e.props,u=c,l=u.__,p=u.get,f=u.purifyHtml;return t.$set=function(t){"props"in t&&n(4,c=t.props)},t.$$.update=function(){var e;16&t.$$.dirty&&n(5,(r=(e=c).chart,o=e.theme,e),r,(n(6,o),n(4,c)));64&t.$$.dirty&&n(0,i=p(o,"data.options.footer")),32&t.$$.dirty&&n(1,a=f(p(r,"metadata.describe.source-name"))),32&t.$$.dirty&&n(2,s=p(r,"metadata.describe.source-url"))},[i,a,s,l,c]}var Source=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$5,create_fragment$5,safe_not_equal,{props:4}),r}return n}(SvelteComponent);function create_if_block$4(t){var e,n=t[4](t[3])+"";return{c:function(){e=new HtmlTag(null)},m:function(t,r){e.m(n,t,r)},p:function(t,r){8&r&&n!==(n=t[4](t[3])+"")&&e.p(n)},d:function(t){t&&e.d()}}}function create_fragment$6(t){var e,n,r,o,i,a,s=t[5](t[1])+"",c=t[0].basedOnByline&&create_if_block$4(t);return{c:function(){e=element("span"),n=text(s),r=space(),o=text(t[2]),i=space(),c&&c.c(),a=empty(),attr(e,"class","byline-caption")},m:function(t,s){insert(t,e,s),append(e,n),insert(t,r,s),insert(t,o,s),insert(t,i,s),c&&c.m(t,s),insert(t,a,s)},p:function(t,e){var r=_slicedToArray(e,1)[0];2&r&&s!==(s=t[5](t[1])+"")&&set_data(n,s),4&r&&set_data(o,t[2]),t[0].basedOnByline?c?c.p(t,r):((c=create_if_block$4(t)).c(),c.m(a.parentNode,a)):c&&(c.d(1),c=null)},i:noop,o:noop,d:function(t){t&&detach(e),t&&detach(r),t&&detach(o),t&&detach(i),c&&c.d(t),t&&detach(a)}}}function instance$6(t,e,n){var r,o,i,a,s,c,u,l,p=e.props,f=p,h=f.get,d=f.purifyHtml,m=f.__;return t.$set=function(t){"props"in t&&n(6,p=t.props)},t.$$.update=function(){64&t.$$.dirty&&n(0,r=p.chart),64&t.$$.dirty&&n(7,o=p.theme),64&t.$$.dirty&&n(8,i=p.caption),384&t.$$.dirty&&n(1,a="map"===i?h(o,"data.options.footer.mapCaption","Map:"):"table"===i?h(o,"data.options.footer.tableCaption","Table:"):h(o,"data.options.footer.chartCaption","Chart:")),1&t.$$.dirty&&n(2,s=h(r,"metadata.describe.byline",!1)),128&t.$$.dirty&&n(9,c=h(o,"data.options.footer.forkCaption","footer / based-on")),5&t.$$.dirty&&n(10,u=r.basedOnByline&&s),1537&t.$$.dirty&&n(3,l=(u?"(":"")+m(c)+" "+d(r.basedOnByline)+(u?")":""))},[r,a,s,l,d,m,p]}var Byline=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$6,create_fragment$6,safe_not_equal,{props:6}),r}return n}(SvelteComponent);function create_fragment$7(t){var e,n=t[2](t[1](t[0],"metadata.annotate.notes"))+"";return{c:function(){e=new HtmlTag(null)},m:function(t,r){e.m(n,t,r)},p:function(t,r){1&_slicedToArray(r,1)[0]&&n!==(n=t[2](t[1](t[0],"metadata.annotate.notes"))+"")&&e.p(n)},i:noop,o:noop,d:function(t){t&&e.d()}}}function instance$7(t,e,n){var r,o=e.props,i=o,a=i.get,s=i.purifyHtml;return t.$set=function(t){"props"in t&&n(3,o=t.props)},t.$$.update=function(){8&t.$$.dirty&&n(0,r=o.chart)},[r,a,s,o]}var Notes=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$7,create_fragment$7,safe_not_equal,{props:3}),r}return n}(SvelteComponent);function create_if_block$5(t){var e,n,r,o,i,a=t[5](t[3].caption)+"";return{c:function(){e=element("a"),n=text(a),attr(e,"this","dataLink"),attr(e,"class","dw-data-link"),attr(e,"aria-label",r=t[5](t[3].caption)+": "+t[6](t[2].title,"")),attr(e,"download",t[1]),attr(e,"target",o=t[4]?"_blank":"_self"),attr(e,"href",i=t[4]||"data")},m:function(t,r){insert(t,e,r),append(e,n)},p:function(t,s){8&s&&a!==(a=t[5](t[3].caption)+"")&&set_data(n,a),12&s&&r!==(r=t[5](t[3].caption)+": "+t[6](t[2].title,""))&&attr(e,"aria-label",r),2&s&&attr(e,"download",t[1]),16&s&&o!==(o=t[4]?"_blank":"_self")&&attr(e,"target",o),16&s&&i!==(i=t[4]||"data")&&attr(e,"href",i)},d:function(t){t&&detach(e)}}}function create_fragment$8(t){var e,n=t[3].enabled&&!t[0]&&create_if_block$5(t);return{c:function(){n&&n.c(),e=empty()},m:function(t,r){n&&n.m(t,r),insert(t,e,r)},p:function(t,r){var o=_slicedToArray(r,1)[0];t[3].enabled&&!t[0]?n?n.p(t,o):((n=create_if_block$5(t)).c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},i:noop,o:noop,d:function(t){n&&n.d(t),t&&detach(e)}}}function instance$8(t,e,n){var r,o,i,a,s,c=e.props,u=c,l=u.get,p=u.__,f=u.purifyHtml,h=!1,d="";return t.$set=function(t){"props"in t&&n(7,c=t.props)},t.$$.update=function(){var e;128&t.$$.dirty&&n(2,(r=(e=c).chart,o=e.dwChart,e.data,i=e.theme,e),r,(n(9,o),n(7,c)),(n(11,i),n(7,c)));if(2048&t.$$.dirty&&n(3,a=l(i,"data.options.footer.getTheData",{enabled:!1})),516&t.$$.dirty&&o&&o.dataset()){var u=o.dataset().toCSV&&o.dataset().toCSV();if(!u||u&&u.trim&&"X.1"===u.trim())n(0,h=!0);else if(window.navigator.msSaveOrOpenBlob){var p=new Blob([u]);undefined.addEventListener("click",(function(t){return window.navigator.msSaveOrOpenBlob(p,"data-"+r.id+".csv"),t.preventDefault(),!1}))}else n(1,d="data-"+r.id+".csv")}512&t.$$.dirty&&n(4,s=l(o,"externalData"))},[h,d,r,a,s,p,f,c]}var GetTheData=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$8,create_fragment$8,safe_not_equal,{props:7}),r}return n}(SvelteComponent);function create_if_block$6(t){var e,n,r,o,i,a,s=t[3](t[1].caption)+"",c=!t[0]&&create_if_block_1$4(t);return{c:function(){e=element("a"),n=text(s),r=space(),c&&c.c(),o=empty(),attr(e,"href","#embed"),attr(e,"class","chart-action-embed")},m:function(s,u){insert(s,e,u),append(e,n),insert(s,r,u),c&&c.m(s,u),insert(s,o,u),i||(a=listen(e,"click",t[4]),i=!0)},p:function(t,e){2&e&&s!==(s=t[3](t[1].caption)+"")&&set_data(n,s),t[0]?c&&(c.d(1),c=null):c?c.p(t,e):((c=create_if_block_1$4(t)).c(),c.m(o.parentNode,o))},d:function(t){t&&detach(e),t&&detach(r),c&&c.d(t),t&&detach(o),i=!1,a()}}}function create_if_block_1$4(t){var e,n,r,o,i,a,s,c,u,l=(t[1].text||"Please use the following HTML code to embed this chart:")+"";return{c:function(){e=element("div"),(n=element("div")).textContent="×",r=space(),o=element("div"),i=text(l),a=space(),s=element("textarea"),attr(n,"class","close"),s.readOnly=!0,s.value=t[2],attr(e,"class","embed-code")},m:function(l,p){insert(l,e,p),append(e,n),append(e,r),append(e,o),append(o,i),append(e,a),append(e,s),c||(u=[listen(n,"click",t[4]),listen(s,"click",handleTextareaClick)],c=!0)},p:function(t,e){2&e&&l!==(l=(t[1].text||"Please use the following HTML code to embed this chart:")+"")&&set_data(i,l),4&e&&(s.value=t[2])},d:function(t){t&&detach(e),c=!1,run_all(u)}}}function create_fragment$9(t){var e,n=t[1].enabled&&create_if_block$6(t);return{c:function(){n&&n.c(),e=empty()},m:function(t,r){n&&n.m(t,r),insert(t,e,r)},p:function(t,r){var o=_slicedToArray(r,1)[0];t[1].enabled?n?n.p(t,o):((n=create_if_block$6(t)).c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},i:noop,o:noop,d:function(t){n&&n.d(t),t&&detach(e)}}}function handleTextareaClick(t){t.target.focus(),t.target.select()}function instance$9(t,e,n){var r,o,i,a,s=e.props,c=s,u=c.get,l=c.__,p=!0;return t.$set=function(t){"props"in t&&n(5,s=t.props)},t.$$.update=function(){var e;32&t.$$.dirty&&n(6,(r=(e=s).chart,o=e.theme,e),r,(n(7,o),n(5,s)));128&t.$$.dirty&&n(1,i=u(o,"data.options.footer.embed",{enabled:!1})),64&t.$$.dirty&&n(2,a=u(r,"metadata.publish.embed-codes.embed-method-iframe","\x3c!-- embed code will be here after publishing --\x3e"))},[p,i,a,l,function(t){t.preventDefault(),n(0,p=!p)},s]}var Embed=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$9,create_fragment$9,safe_not_equal,{props:5}),r}return n}(SvelteComponent);function create_if_block_1$5(t){var e,n,r,o;return{c:function(){attr(e=element("img"),"height",n=t[1].height),e.src!==(r=t[1].url)&&attr(e,"src",r),attr(e,"alt",o=t[2].title)},m:function(t,n){insert(t,e,n)},p:function(t,i){2&i&&n!==(n=t[1].height)&&attr(e,"height",n),2&i&&e.src!==(r=t[1].url)&&attr(e,"src",r),4&i&&o!==(o=t[2].title)&&attr(e,"alt",o)},d:function(t){t&&detach(e)}}}function create_if_block$7(t){var e,n=t[0](t[1].text)+"";return{c:function(){attr(e=element("span"),"class","logo-text")},m:function(t,r){insert(t,e,r),e.innerHTML=n},p:function(t,r){3&r&&n!==(n=t[0](t[1].text)+"")&&(e.innerHTML=n)},d:function(t){t&&detach(e)}}}function create_fragment$a(t){var e,n,r=t[1].url&&create_if_block_1$5(t),o=t[1].text&&create_if_block$7(t);return{c:function(){r&&r.c(),e=space(),o&&o.c(),n=empty()},m:function(t,i){r&&r.m(t,i),insert(t,e,i),o&&o.m(t,i),insert(t,n,i)},p:function(t,i){var a=_slicedToArray(i,1)[0];t[1].url?r?r.p(t,a):((r=create_if_block_1$5(t)).c(),r.m(e.parentNode,e)):r&&(r.d(1),r=null),t[1].text?o?o.p(t,a):((o=create_if_block$7(t)).c(),o.m(n.parentNode,n)):o&&(o.d(1),o=null)},i:noop,o:noop,d:function(t){r&&r.d(t),t&&detach(e),o&&o.d(t),t&&detach(n)}}}function instance$a(t,e,n){var r=e.purifyHtml,o=e.logo,i=e.theme;return t.$set=function(t){"purifyHtml"in t&&n(0,r=t.purifyHtml),"logo"in t&&n(1,o=t.logo),"theme"in t&&n(2,i=t.theme)},[r,o,i]}var LogoInner=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$a,create_fragment$a,safe_not_equal,{purifyHtml:0,logo:1,theme:2}),r}return n}(SvelteComponent);function create_else_block$3(t){var e,n;return e=new LogoInner({props:{logo:t[1],purifyHtml:t[2],theme:t[0]}}),{c:function(){create_component(e.$$.fragment)},m:function(t,r){mount_component(e,t,r),n=!0},p:function(t,n){var r={};2&n&&(r.logo=t[1]),1&n&&(r.theme=t[0]),e.$set(r)},i:function(t){n||(transition_in(e.$$.fragment,t),n=!0)},o:function(t){transition_out(e.$$.fragment,t),n=!1},d:function(t){destroy_component(e,t)}}}function create_if_block$8(t){var e,n,r,o;return n=new LogoInner({props:{logo:t[1],purifyHtml:t[2],theme:t[0]}}),{c:function(){e=element("a"),create_component(n.$$.fragment),attr(e,"href",r=t[1].link),attr(e,"target","_blank"),attr(e,"rel","noopener noreferrer")},m:function(t,r){insert(t,e,r),mount_component(n,e,null),o=!0},p:function(t,i){var a={};2&i&&(a.logo=t[1]),1&i&&(a.theme=t[0]),n.$set(a),(!o||2&i&&r!==(r=t[1].link))&&attr(e,"href",r)},i:function(t){o||(transition_in(n.$$.fragment,t),o=!0)},o:function(t){transition_out(n.$$.fragment,t),o=!1},d:function(t){t&&detach(e),destroy_component(n)}}}function create_fragment$b(t){var e,n,r,o,i=[create_if_block$8,create_else_block$3],a=[];function s(t,e){return t[1].link?0:1}return e=s(t),n=a[e]=i[e](t),{c:function(){n.c(),r=empty()},m:function(t,n){a[e].m(t,n),insert(t,r,n),o=!0},p:function(t,o){var c=_slicedToArray(o,1)[0],u=e;(e=s(t))===u?a[e].p(t,c):(group_outros(),transition_out(a[u],1,1,(function(){a[u]=null})),check_outros(),(n=a[e])||(n=a[e]=i[e](t)).c(),transition_in(n,1),n.m(r.parentNode,r))},i:function(t){o||(transition_in(n),o=!0)},o:function(t){transition_out(n),o=!1},d:function(t){a[e].d(t),t&&detach(r)}}}function instance$b(t,e,n){var r,o,i=e.props,a=i,s=a.get,c=a.purifyHtml;return t.$set=function(t){"props"in t&&n(3,i=t.props)},t.$$.update=function(){8&t.$$.dirty&&n(0,r=i.theme),1&t.$$.dirty&&n(1,o=s(r,"data.options.footer.logo"))},[r,o,c,i]}var Logo=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$b,create_fragment$b,safe_not_equal,{props:3}),r}return n}(SvelteComponent);function create_fragment$c(t){var e;return{c:function(){attr(e=element("div"),"class","export-rect"),set_style(e,"width",px(t[0])),set_style(e,"height",px(t[1])),set_style(e,"background",t[2])},m:function(t,n){insert(t,e,n)},p:function(t,n){var r=_slicedToArray(n,1)[0];1&r&&set_style(e,"width",px(t[0])),2&r&&set_style(e,"height",px(t[1])),4&r&&set_style(e,"background",t[2])},i:noop,o:noop,d:function(t){t&&detach(e)}}}function px(t){return"string"==typeof t?t:t+"px"}function instance$c(t,e,n){var r,o,i,a,s,c=e.props,u=c,l=u.get;u.purifyHtml;return t.$set=function(t){"props"in t&&n(3,c=t.props)},t.$$.update=function(){8&t.$$.dirty&&n(4,r=c.theme),16&t.$$.dirty&&n(5,o=l(r,"data.options.blocks.rectangle.data",{})),32&t.$$.dirty&&n(0,i=l(o,"width",50)),32&t.$$.dirty&&n(1,a=l(o,"height",5)),32&t.$$.dirty&&n(2,s=l(o,"background","red"))},[i,a,s,c]}var Rectangle=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$c,create_fragment$c,safe_not_equal,{props:3}),r}return n}(SvelteComponent);function estimateTextWidth(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:14,n=e/14;return t.split("").reduce((function(t,e){return t+(CHAR_W[e]||CHAR_W.a)}),0)*n}var CHAR_W={a:9,A:10,b:9,B:10,c:8,C:10,d:9,D:11,e:9,E:9,f:5,F:8,g:9,G:11,h:9,H:11,i:4,I:4,j:4,J:4,k:8,K:9,l:4,L:8,m:14,M:12,n:9,N:10,o:9,O:11,p:9,P:8,q:9,Q:11,r:6,R:10,s:7,S:9,t:5,T:9,u:9,U:10,v:8,V:10,w:11,W:14,x:8,X:10,y:8,Y:9,z:7,Z:10,".":4,"!":4,"|":4,",":4,":":5,";":5,"-":5,"+":12," ":4};function create_fragment$d(t){var e,n,r,o,i=t[6](t[2])+"";return add_render_callback(t[8]),{c:function(){e=element("div"),n=element("span"),attr(e,"class","watermark noscript svelte-111z7el"),set_style(e,"transform","rotate("+t[3]+"rad)"),set_style(e,"font-size",t[5]),attr(e,"data-rotate",t[4])},m:function(a,s){insert(a,e,s),append(e,n),n.innerHTML=i,r||(o=listen(window,"resize",t[8]),r=!0)},p:function(t,r){var o=_slicedToArray(r,1)[0];4&o&&i!==(i=t[6](t[2])+"")&&(n.innerHTML=i),8&o&&set_style(e,"transform","rotate("+t[3]+"rad)"),32&o&&set_style(e,"font-size",t[5]),16&o&&attr(e,"data-rotate",t[4])},i:noop,o:noop,d:function(t){t&&detach(e),r=!1,o()}}}function instance$d(t,e,n){var r,o,i,a,s,c,u,l,p,f,h,d,m=e.props,y=m,v=y.get,g=y.purifyHtml;return t.$set=function(t){"props"in t&&n(7,m=t.props)},t.$$.update=function(){var e;128&t.$$.dirty&&n(9,(i=(e=m).chart,a=e.theme,e),i,(n(10,a),n(7,m)));1024&t.$$.dirty&&n(11,s=v(a,"data.options.watermark.monospace",!1)),1024&t.$$.dirty&&n(12,c=v(a,"data.options.watermark.custom-field")),5632&t.$$.dirty&&n(2,u=!!v(a,"data.options.watermark")&&(c?v(i,"metadata.custom.".concat(c),""):v(a,"data.options.watermark.text","CONFIDENTIAL"))),3&t.$$.dirty&&n(3,l=-Math.atan(o/r)),8&t.$$.dirty&&n(4,p=180*l/Math.PI),3&t.$$.dirty&&n(13,f=Math.sqrt(r*r+o*o)),2052&t.$$.dirty&&n(14,h=s?20*u.length:estimateTextWidth(u,20)),24576&t.$$.dirty&&n(5,d="".concat(Math.round(.75*f/h*20),"px"))},[r,o,u,l,p,d,g,m,function(){n(0,r=window.innerWidth),n(1,o=window.innerHeight)}]}var Watermark=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$d,create_fragment$d,safe_not_equal,{props:7}),r}return n}(SvelteComponent);function create_fragment$e(t){var e;return{c:function(){attr(e=element("hr"),"class","dw-line"),set_style(e,"border","0"),set_style(e,"border-bottom",t[0]),set_style(e,"margin",t[1])},m:function(t,n){insert(t,e,n)},p:function(t,n){var r=_slicedToArray(n,1)[0];1&r&&set_style(e,"border-bottom",t[0]),2&r&&set_style(e,"margin",t[1])},i:noop,o:noop,d:function(t){t&&detach(e)}}}function instance$e(t,e,n){var r,o,i,a,s=e.props,c=s.get;return t.$set=function(t){"props"in t&&n(2,s=t.props)},t.$$.update=function(){4&t.$$.dirty&&n(3,r=s.theme),12&t.$$.dirty&&n(4,o=c(r,"data.options.blocks.".concat(s.id,".data"),{})),16&t.$$.dirty&&n(0,i=c(o,"border","1px solid #cccccc")),16&t.$$.dirty&&n(1,a=c(o,"margin","0px"))},[i,a,s]}var HorizontalRule=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$e,create_fragment$e,safe_not_equal,{props:2}),r}return n}(SvelteComponent);function create_fragment$f(t){var e,n,r,o;return{c:function(){e=svg_element("svg"),set_style(n=svg_element("line"),"stroke",t[3]),set_style(n,"stroke-width",t[4]),set_style(n,"stroke-dasharray",t[5]),set_style(n,"stroke-linecap",t[6]),attr(n,"x1","0"),attr(n,"y1",r=t[4]/2),attr(n,"x2",t[1]),attr(n,"y2",o=t[4]/2),set_style(e,"height",Math.max(t[4],1)+"px"),set_style(e,"margin",t[2]),attr(e,"class","svelte-eczzvz")},m:function(r,o){insert(r,e,o),append(e,n),t[8](e)},p:function(t,i){var a=_slicedToArray(i,1)[0];8&a&&set_style(n,"stroke",t[3]),16&a&&set_style(n,"stroke-width",t[4]),32&a&&set_style(n,"stroke-dasharray",t[5]),64&a&&set_style(n,"stroke-linecap",t[6]),16&a&&r!==(r=t[4]/2)&&attr(n,"y1",r),2&a&&attr(n,"x2",t[1]),16&a&&o!==(o=t[4]/2)&&attr(n,"y2",o),16&a&&set_style(e,"height",Math.max(t[4],1)+"px"),4&a&&set_style(e,"margin",t[2])},i:noop,o:noop,d:function(n){n&&detach(e),t[8](null)}}}function instance$f(t,e,n){var r,o,i,a,s,c,u,l,p=e.props,f=p.get,h=0;return onMount((function(){n(1,h=r.getBoundingClientRect().width)})),"undefined"!=typeof window&&window.addEventListener("resize",(function(){n(1,h=r.getBoundingClientRect().width)})),t.$set=function(t){"props"in t&&n(7,p=t.props)},t.$$.update=function(){128&t.$$.dirty&&n(9,o=p.theme),640&t.$$.dirty&&n(10,i=f(o,"data.options.blocks.".concat(p.id,".data"),{})),1024&t.$$.dirty&&n(2,a=f(i,"margin","0px")),1024&t.$$.dirty&&n(3,s=f(i,"color","#000000")),1024&t.$$.dirty&&n(4,c=f(i,"width",1)),1024&t.$$.dirty&&n(5,u=f(i,"strokeDasharray","none")),1024&t.$$.dirty&&n(6,l=f(i,"strokeLinecap","butt"))},[r,h,a,s,c,u,l,p,function(t){binding_callbacks[t?"unshift":"push"]((function(){n(0,r=t)}))}]}var SvgRule=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$f,create_fragment$f,safe_not_equal,{props:7}),r}return n}(SvelteComponent),VERSION="1.12.1",root="object"==typeof self&&self.self===self&&self||"object"==typeof global&&global.global===global&&global||Function("return this")()||{},ArrayProto=Array.prototype,ObjProto=Object.prototype,slice=ArrayProto.slice,toString=ObjProto.toString,hasOwnProperty=ObjProto.hasOwnProperty,supportsDataView="undefined"!=typeof DataView,nativeIsArray=Array.isArray,nativeKeys=Object.keys,nativeCreate=Object.create,_isNaN=isNaN,hasEnumBug=!{toString:null}.propertyIsEnumerable("toString"),nonEnumerableProps=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"],MAX_ARRAY_INDEX=Math.pow(2,53)-1;function restArguments(t,e){return e=null==e?t.length-1:+e,function(){for(var n=Math.max(arguments.length-e,0),r=Array(n),o=0;o<n;o++)r[o]=arguments[o+e];switch(e){case 0:return t.call(this,r);case 1:return t.call(this,arguments[0],r);case 2:return t.call(this,arguments[0],arguments[1],r)}var i=Array(e+1);for(o=0;o<e;o++)i[o]=arguments[o];return i[e]=r,t.apply(this,i)}}function isObject(t){var e=typeof t;return"function"===e||"object"===e&&!!t}function isBoolean(t){return!0===t||!1===t||"[object Boolean]"===toString.call(t)}function tagTester(t){var e="[object "+t+"]";return function(t){return toString.call(t)===e}}var isNumber=tagTester("Number"),isRegExp=tagTester("RegExp"),isFunction=tagTester("Function"),nodelist=root.document&&root.document.childNodes;"function"!=typeof/./&&"object"!=typeof Int8Array&&"function"!=typeof nodelist&&(isFunction=function(t){return"function"==typeof t||!1});var isFunction$1=isFunction,hasObjectTag=tagTester("Object"),hasStringTagBug=supportsDataView&&hasObjectTag(new DataView(new ArrayBuffer(8))),isIE11="undefined"!=typeof Map&&hasObjectTag(new Map),isArray=nativeIsArray||tagTester("Array");function has(t,e){return null!=t&&hasOwnProperty.call(t,e)}var isArguments=tagTester("Arguments");!function(){isArguments(arguments)||(isArguments=function(t){return has(t,"callee")})}();var isArguments$1=isArguments;function isNaN$1(t){return isNumber(t)&&_isNaN(t)}function createSizePropertyCheck(t){return function(e){var n=t(e);return"number"==typeof n&&n>=0&&n<=MAX_ARRAY_INDEX}}function shallowProperty(t){return function(e){return null==e?void 0:e[t]}}var getLength=shallowProperty("length");function emulatedSet(t){for(var e={},n=t.length,r=0;r<n;++r)e[t[r]]=!0;return{contains:function(t){return e[t]},push:function(n){return e[n]=!0,t.push(n)}}}function collectNonEnumProps(t,e){e=emulatedSet(e);var n=nonEnumerableProps.length,r=t.constructor,o=isFunction$1(r)&&r.prototype||ObjProto,i="constructor";for(has(t,i)&&!e.contains(i)&&e.push(i);n--;)(i=nonEnumerableProps[n])in t&&t[i]!==o[i]&&!e.contains(i)&&e.push(i)}function keys(t){if(!isObject(t))return[];if(nativeKeys)return nativeKeys(t);var e=[];for(var n in t)has(t,n)&&e.push(n);return hasEnumBug&&collectNonEnumProps(t,e),e}function isMatch(t,e){var n=keys(e),r=n.length;if(null==t)return!r;for(var o=Object(t),i=0;i<r;i++){var a=n[i];if(e[a]!==o[a]||!(a in o))return!1}return!0}function _(t){return t instanceof _?t:this instanceof _?void(this._wrapped=t):new _(t)}function allKeys(t){if(!isObject(t))return[];var e=[];for(var n in t)e.push(n);return hasEnumBug&&collectNonEnumProps(t,e),e}function ie11fingerprint(t){var e=getLength(t);return function(n){if(null==n)return!1;var r=allKeys(n);if(getLength(r))return!1;for(var o=0;o<e;o++)if(!isFunction$1(n[t[o]]))return!1;return t!==weakMapMethods||!isFunction$1(n[forEachName])}}_.VERSION=VERSION,_.prototype.value=function(){return this._wrapped},_.prototype.valueOf=_.prototype.toJSON=_.prototype.value,_.prototype.toString=function(){return String(this._wrapped)};var forEachName="forEach",hasName="has",commonInit=["clear","delete"],mapTail=["get",hasName,"set"],mapMethods=commonInit.concat(forEachName,mapTail),weakMapMethods=commonInit.concat(mapTail),setMethods=["add"].concat(commonInit,forEachName,hasName);function values(t){for(var e=keys(t),n=e.length,r=Array(n),o=0;o<n;o++)r[o]=t[e[o]];return r}function invert(t){for(var e={},n=keys(t),r=0,o=n.length;r<o;r++)e[t[n[r]]]=n[r];return e}function createAssigner(t,e){return function(n){var r=arguments.length;if(e&&(n=Object(n)),r<2||null==n)return n;for(var o=1;o<r;o++)for(var i=arguments[o],a=t(i),s=a.length,c=0;c<s;c++){var u=a[c];e&&void 0!==n[u]||(n[u]=i[u])}return n}}isIE11?ie11fingerprint(mapMethods):tagTester("Map"),isIE11?ie11fingerprint(weakMapMethods):tagTester("WeakMap"),isIE11?ie11fingerprint(setMethods):tagTester("Set");var extendOwn=createAssigner(keys);function ctor(){return function(){}}function baseCreate(t){if(!isObject(t))return{};if(nativeCreate)return nativeCreate(t);var e=ctor();e.prototype=t;var n=new e;return e.prototype=null,n}function toPath(t){return isArray(t)?t:[t]}function toPath$1(t){return _.toPath(t)}function deepGet(t,e){for(var n=e.length,r=0;r<n;r++){if(null==t)return;t=t[e[r]]}return n?t:void 0}function identity(t){return t}function matcher(t){return t=extendOwn({},t),function(e){return isMatch(e,t)}}function property(t){return t=toPath$1(t),function(e){return deepGet(e,t)}}function optimizeCb(t,e,n){if(void 0===e)return t;switch(null==n?3:n){case 1:return function(n){return t.call(e,n)};case 3:return function(n,r,o){return t.call(e,n,r,o)};case 4:return function(n,r,o,i){return t.call(e,n,r,o,i)}}return function(){return t.apply(e,arguments)}}function baseIteratee(t,e,n){return null==t?identity:isFunction$1(t)?optimizeCb(t,e,n):isObject(t)&&!isArray(t)?matcher(t):property(t)}function iteratee(t,e){return baseIteratee(t,e,1/0)}function cb(t,e,n){return _.iteratee!==iteratee?_.iteratee(t,e):baseIteratee(t,e,n)}function createEscaper(t){var e=function(e){return t[e]},n="(?:"+keys(t).join("|")+")",r=RegExp(n),o=RegExp(n,"g");return function(t){return t=null==t?"":""+t,r.test(t)?t.replace(o,e):t}}_.toPath=toPath,_.iteratee=iteratee;var escapeMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"};createEscaper(escapeMap);var unescapeMap=invert(escapeMap);function executeBound(t,e,n,r,o){if(!(r instanceof e))return t.apply(n,o);var i=baseCreate(t.prototype),a=t.apply(i,o);return isObject(a)?a:i}createEscaper(unescapeMap),_.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var partial=restArguments((function(t,e){var n=partial.placeholder,r=function(){for(var o=0,i=e.length,a=Array(i),s=0;s<i;s++)a[s]=e[s]===n?arguments[o++]:e[s];for(;o<arguments.length;)a.push(arguments[o++]);return executeBound(t,r,this,this,a)};return r}));partial.placeholder=_;var bind=restArguments((function(t,e,n){if(!isFunction$1(t))throw new TypeError("Bind must be called on a function");var r=restArguments((function(o){return executeBound(t,r,e,this,n.concat(o))}));return r})),isArrayLike=createSizePropertyCheck(getLength);function flatten(t,e,n,r){if(r=r||[],e||0===e){if(e<=0)return r.concat(t)}else e=1/0;for(var o=r.length,i=0,a=getLength(t);i<a;i++){var s=t[i];if(isArrayLike(s)&&(isArray(s)||isArguments$1(s)))if(e>1)flatten(s,e-1,n,r),o=r.length;else for(var c=0,u=s.length;c<u;)r[o++]=s[c++];else n||(r[o++]=s)}return r}restArguments((function(t,e){var n=(e=flatten(e,!1,!1)).length;if(n<1)throw new Error("bindAll must be passed function names");for(;n--;){var r=e[n];t[r]=bind(t[r],t)}return t}));var delay=restArguments((function(t,e,n){return setTimeout((function(){return t.apply(null,n)}),e)}));function negate(t){return function(){return!t.apply(this,arguments)}}function before(t,e){var n;return function(){return--t>0&&(n=e.apply(this,arguments)),t<=1&&(e=null),n}}function createPredicateIndexFinder(t){return function(e,n,r){n=cb(n,r);for(var o=getLength(e),i=t>0?0:o-1;i>=0&&i<o;i+=t)if(n(e[i],i,e))return i;return-1}}partial(delay,_,1),partial(before,2);var findIndex=createPredicateIndexFinder(1);function sortedIndex(t,e,n,r){for(var o=(n=cb(n,r,1))(e),i=0,a=getLength(t);i<a;){var s=Math.floor((i+a)/2);n(t[s])<o?i=s+1:a=s}return i}function createIndexFinder(t,e,n){return function(r,o,i){var a=0,s=getLength(r);if("number"==typeof i)t>0?a=i>=0?i:Math.max(i+s,a):s=i>=0?Math.min(i+1,s):i+s+1;else if(n&&i&&s)return r[i=n(r,o)]===o?i:-1;if(o!=o)return(i=e(slice.call(r,a,s),isNaN$1))>=0?i+a:-1;for(i=t>0?a:s-1;i>=0&&i<s;i+=t)if(r[i]===o)return i;return-1}}var indexOf=createIndexFinder(1,findIndex,sortedIndex);function each(t,e,n){var r,o;if(e=optimizeCb(e,n),isArrayLike(t))for(r=0,o=t.length;r<o;r++)e(t[r],r,t);else{var i=keys(t);for(r=0,o=i.length;r<o;r++)e(t[i[r]],i[r],t)}return t}function map(t,e,n){e=cb(e,n);for(var r=!isArrayLike(t)&&keys(t),o=(r||t).length,i=Array(o),a=0;a<o;a++){var s=r?r[a]:a;i[a]=e(t[s],s,t)}return i}function filter(t,e,n){var r=[];return e=cb(e,n),each(t,(function(t,n,o){e(t,n,o)&&r.push(t)})),r}function contains(t,e,n,r){return isArrayLike(t)||(t=values(t)),("number"!=typeof n||r)&&(n=0),indexOf(t,e,n)>=0}function pluck(t,e){return map(t,property(e))}function max(t,e,n){var r,o,i=-1/0,a=-1/0;if(null==e||"number"==typeof e&&"object"!=typeof t[0]&&null!=t)for(var s=0,c=(t=isArrayLike(t)?t:values(t)).length;s<c;s++)null!=(r=t[s])&&r>i&&(i=r);else e=cb(e,n),each(t,(function(t,n,r){((o=e(t,n,r))>a||o===-1/0&&i===-1/0)&&(i=t,a=o)}));return i}function keyInObj(t,e,n){return e in n}restArguments((function(t,e,n){var r,o;return isFunction$1(e)?o=e:(e=toPath$1(e),r=e.slice(0,-1),e=e[e.length-1]),map(t,(function(t){var i=o;if(!i){if(r&&r.length&&(t=deepGet(t,r)),null==t)return;i=t[e]}return null==i?i:i.apply(t,n)}))}));var pick=restArguments((function(t,e){var n={},r=e[0];if(null==t)return n;isFunction$1(r)?(e.length>1&&(r=optimizeCb(r,e[1])),e=allKeys(t)):(r=keyInObj,e=flatten(e,!1,!1),t=Object(t));for(var o=0,i=e.length;o<i;o++){var a=e[o],s=t[a];r(s,a,t)&&(n[a]=s)}return n}));function flatten$1(t,e){return flatten(t,e,!1)}restArguments((function(t,e){var n,r=e[0];return isFunction$1(r)?(r=negate(r),e.length>1&&(n=e[1])):(e=map(flatten(e,!1,!1),String),r=function(t,n){return!contains(e,n)}),pick(t,r,n)}));var difference=restArguments((function(t,e){return e=flatten(e,!0,!0),filter(t,(function(t){return!contains(e,t)}))}));function uniq(t,e,n,r){isBoolean(e)||(r=n,n=e,e=!1),null!=n&&(n=cb(n,r));for(var o=[],i=[],a=0,s=getLength(t);a<s;a++){var c=t[a],u=n?n(c,a,t):c;e&&!n?(a&&i===u||o.push(c),i=u):n?contains(i,u)||(i.push(u),o.push(c)):contains(o,c)||o.push(c)}return o}function unzip(t){for(var e=t&&max(t,getLength).length||0,n=Array(e),r=0;r<e;r++)n[r]=pluck(t,r);return n}function chainResult(t,e){return t._chain?_(e).chain():e}restArguments((function(t,e){return difference(t,e)})),restArguments((function(t){return uniq(flatten(t,!0,!0))})),restArguments(unzip),each(["pop","push","reverse","shift","sort","splice","unshift"],(function(t){var e=ArrayProto[t];_.prototype[t]=function(){var n=this._wrapped;return null!=n&&(e.apply(n,arguments),"shift"!==t&&"splice"!==t||0!==n.length||delete n[0]),chainResult(this,n)}})),each(["concat","join","slice"],(function(t){var e=ArrayProto[t];_.prototype[t]=function(){var t=this._wrapped;return null!=t&&(t=e.apply(t,arguments)),chainResult(this,t)}}));var begin=/^ */.source,end=/[*']* *$/.source,s0=/[ \-/.]?/.source,s1=/[ \-/.]/.source,s2=/[ \-/.;,]/.source,s3=/[ \-|T]/.source,sM=/[ \-/.m]/.source,rx={YY:{parse:/['’‘]?(\d{2})/},YYYY:{test:/([12]\d{3})/,parse:/(\d{4})/},YYYY2:{test:/(?:1[7-9]|20)\d{2}/,parse:/(\d{4})/},H:{parse:/h([12])/},Q:{parse:/q([1234])/},W:{parse:/w([0-5]?[0-9])/},MM:{test:/(0?[1-9]|1[0-2])/,parse:/(0?[1-9]|1[0-2])/},DD:{parse:/(0?[1-9]|[1-2][0-9]|3[01])/},DOW:{parse:/([0-7])/},HHMM:{parse:/(0?\d|1\d|2[0-3]):([0-5]\d)(?::([0-5]\d))? *(am|pm)?/}},MONTHS={0:["jan","january","januar","jänner","jän","janv","janvier","ene","enero","gen","gennaio","janeiro"],1:["feb","february","febr","februar","fév","févr","février","febrero","febbraio","fev","fevereiro"],2:["mar","mär","march","mrz","märz","mars","mars","marzo","marzo","março"],3:["apr","april","apr","april","avr","avril","abr","abril","aprile"],4:["may","mai","mayo","mag","maggio","maio","maj"],5:["jun","june","juni","juin","junio","giu","giugno","junho"],6:["jul","july","juli","juil","juillet","julio","lug","luglio","julho"],7:["aug","august","août","ago","agosto"],8:["sep","september","sept","septembre","septiembre","set","settembre","setembro"],9:["oct","october","okt","oktober","octobre","octubre","ott","ottobre","out","outubro"],10:["nov","november","november","novembre","noviembre","novembre","novembro"],11:["dec","december","dez","des","dezember","déc","décembre","dic","diciembre","dicembre","desember","dezembro"]};each(MONTHS,(function(t,e){each(t,(function(t){}))})),rx.MMM={parse:new RegExp("("+flatten$1(values(MONTHS)).join("|")+")")},each(rx,(function(t){t.parse=t.parse.source,isRegExp(t.test)?t.test=t.test.source:t.test=t.parse}));var knownFormats={YYYY:{test:reg(rx.YYYY2.test),parse:reg(rx.YYYY2.parse),precision:"year"},"YYYY-H":{test:reg(rx.YYYY.test,s0,rx.H.test),parse:reg(rx.YYYY.parse,s0,rx.H.parse),precision:"half"},"H-YYYY":{test:reg(rx.H.test,s1,rx.YYYY.test),parse:reg(rx.H.parse,s1,rx.YYYY.parse),precision:"half"},"YYYY-Q":{test:reg(rx.YYYY.test,s0,rx.Q.test),parse:reg(rx.YYYY.parse,s0,rx.Q.parse),precision:"quarter"},"Q-YYYY":{test:reg(rx.Q.test,s1,rx.YYYY.test),parse:reg(rx.Q.parse,s1,rx.YYYY.parse),precision:"quarter"},"YYYY-M":{test:reg(rx.YYYY.test,sM,rx.MM.test),parse:reg(rx.YYYY.parse,sM,rx.MM.parse),precision:"month"},"M-YYYY":{test:reg(rx.MM.test,s1,rx.YYYY.test),parse:reg(rx.MM.parse,s1,rx.YYYY.parse),precision:"month"},"YYYY-MMM":{test:reg(rx.YYYY.test,s1,rx.MMM.parse),parse:reg(rx.YYYY.parse,s1,rx.MMM.parse),precision:"month"},"MMM-YYYY":{test:reg(rx.MMM.parse,s1,rx.YYYY.test),parse:reg(rx.MMM.parse,s1,rx.YYYY.parse),precision:"month"},"MMM-YY":{test:reg(rx.MMM.parse,s1,rx.YY.test),parse:reg(rx.MMM.parse,s1,rx.YY.parse),precision:"month"},MMM:{test:reg(rx.MMM.parse),parse:reg(rx.MMM.parse),precision:"month"},"YYYY-WW":{test:reg(rx.YYYY.test,s0,rx.W.test),parse:reg(rx.YYYY.parse,s0,rx.W.parse),precision:"week"},"WW-YYYY":{test:reg(rx.W.test,s1,rx.YYYY.test),parse:reg(rx.W.parse,s1,rx.YYYY.parse),precision:"week"},"MM/DD/YYYY":{test:reg(rx.MM.test,"([\\-\\/])",rx.DD.test,"\\2",rx.YYYY.test),parse:reg(rx.MM.parse,"([\\-\\/])",rx.DD.parse,"\\2",rx.YYYY.parse),precision:"day"},"MM/DD/YY":{test:reg(rx.MM.test,"([\\-\\/])",rx.DD.test,"\\2",rx.YY.test),parse:reg(rx.MM.parse,"([\\-\\/])",rx.DD.parse,"\\2",rx.YY.parse),precision:"day"},"DD/MM/YY":{test:reg(rx.DD.test,"([\\-\\.\\/ ?])",rx.MM.test,"\\2",rx.YY.test),parse:reg(rx.DD.parse,"([\\-\\.\\/ ?])",rx.MM.parse,"\\2",rx.YY.parse),precision:"day"},"DD/MM/YYYY":{test:reg(rx.DD.test,"([\\-\\.\\/ ?])",rx.MM.test,"\\2",rx.YYYY.test),parse:reg(rx.DD.parse,"([\\-\\.\\/ ?])",rx.MM.parse,"\\2",rx.YYYY.parse),precision:"day"},"DD/MMM/YYYY":{test:reg(rx.DD.test,"([\\-\\.\\/ ?])",rx.MMM.test,"\\2",rx.YYYY.test),parse:reg(rx.DD.parse,"([\\-\\.\\/ ?])",rx.MMM.parse,"\\2",rx.YYYY.parse),precision:"day"},"DD/MMM/YY":{test:reg(rx.DD.test,"([\\-\\.\\/ ?])",rx.MMM.test,"\\2",rx.YY.test),parse:reg(rx.DD.parse,"([\\-\\.\\/ ?])",rx.MMM.parse,"\\2",rx.YY.parse),precision:"day"},"YYYY-MM-DD":{test:reg(rx.YYYY.test,"([\\-\\.\\/ ?])",rx.MM.test,"\\2",rx.DD.test),parse:reg(rx.YYYY.parse,"([\\-\\.\\/ ?])",rx.MM.parse,"\\2",rx.DD.parse),precision:"day"},"MMM-DD-YYYY":{test:reg(rx.MMM.test,s1,rx.DD.test,s2,rx.YYYY.test),parse:reg(rx.MMM.parse,s1,rx.DD.parse,s2,rx.YYYY.parse),precision:"day"},"YYYY-WW-d":{test:reg(rx.YYYY.test,s0,rx.W.test,s1,rx.DOW.test),parse:reg(rx.YYYY.parse,s0,rx.W.parse,s1,rx.DOW.parse),precision:"day"},"MM/DD/YYYY HH:MM":{test:reg(rx.MM.test,"([\\-\\/])",rx.DD.test,"\\2",rx.YYYY.test,s3,rx.HHMM.test),parse:reg(rx.MM.parse,"([\\-\\/])",rx.DD.parse,"\\2",rx.YYYY.parse,s3,rx.HHMM.parse),precision:"day-minutes"},"DD.MM.YYYY HH:MM":{test:reg(rx.DD.test,"([\\-\\.\\/ ?])",rx.MM.test,"\\2",rx.YYYY.test,s3,rx.HHMM.test),parse:reg(rx.DD.parse,"([\\-\\.\\/ ?])",rx.MM.parse,"\\2",rx.YYYY.parse,s3,rx.HHMM.parse),precision:"day-minutes"},"YYYY-MM-DD HH:MM":{test:reg(rx.YYYY.test,"([\\-\\.\\/ ?])",rx.MM.test,"\\2",rx.DD.test,s3,rx.HHMM.test),parse:reg(rx.YYYY.parse,"([\\-\\.\\/ ?])",rx.MM.parse,"\\2",rx.DD.parse,s3,rx.HHMM.parse),precision:"day-minutes"},ISO8601:{test:/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)/,parse:function(t){return t},precision:"day-seconds"}};function reg(){return new RegExp(begin+Array.prototype.slice.call(arguments).join(" *")+end,"i")}var TEOF="TEOF",TOP="TOP",TNUMBER="TNUMBER",TSTRING="TSTRING",TPAREN="TPAREN",TBRACKET="TBRACKET",TCOMMA="TCOMMA",TNAME="TNAME",TSEMICOLON="TSEMICOLON";function Token(t,e,n){this.type=t,this.value=e,this.index=n}function TokenStream(t,e){this.pos=0,this.current=null,this.unaryOps=t.unaryOps,this.binaryOps=t.binaryOps,this.ternaryOps=t.ternaryOps,this.consts=t.consts,this.expression=e,this.savedPosition=0,this.savedCurrent=null,this.options=t.options,this.parser=t}Token.prototype.toString=function(){return this.type+": "+this.value},TokenStream.prototype.newToken=function(t,e,n){return new Token(t,e,null!=n?n:this.pos)},TokenStream.prototype.save=function(){this.savedPosition=this.pos,this.savedCurrent=this.current},TokenStream.prototype.restore=function(){this.pos=this.savedPosition,this.current=this.savedCurrent},TokenStream.prototype.next=function(){return this.pos>=this.expression.length?this.newToken(TEOF,"EOF"):this.isWhitespace()||this.isComment()?this.next():this.isRadixInteger()||this.isNumber()||this.isOperator()||this.isString()||this.isParen()||this.isBracket()||this.isComma()||this.isSemicolon()||this.isNamedOp()||this.isConst()||this.isName()?this.current:void this.parseError('Unknown character "'+this.expression.charAt(this.pos)+'"')},TokenStream.prototype.isString=function(){var t=!1,e=this.pos,n=this.expression.charAt(e);if("'"===n||'"'===n)for(var r=this.expression.indexOf(n,e+1);r>=0&&this.pos<this.expression.length;){if(this.pos=r+1,"\\"!==this.expression.charAt(r-1)){var o=this.expression.substring(e+1,r);this.current=this.newToken(TSTRING,this.unescape(o),e),t=!0;break}r=this.expression.indexOf(n,r+1)}return t},TokenStream.prototype.isParen=function(){var t=this.expression.charAt(this.pos);return("("===t||")"===t)&&(this.current=this.newToken(TPAREN,t),this.pos++,!0)},TokenStream.prototype.isBracket=function(){var t=this.expression.charAt(this.pos);return!("["!==t&&"]"!==t||!this.isOperatorEnabled("["))&&(this.current=this.newToken(TBRACKET,t),this.pos++,!0)},TokenStream.prototype.isComma=function(){return","===this.expression.charAt(this.pos)&&(this.current=this.newToken(TCOMMA,","),this.pos++,!0)},TokenStream.prototype.isSemicolon=function(){return";"===this.expression.charAt(this.pos)&&(this.current=this.newToken(TSEMICOLON,";"),this.pos++,!0)},TokenStream.prototype.isConst=function(){for(var t=this.pos,e=t;e<this.expression.length;e++){var n=this.expression.charAt(e);if(n.toUpperCase()===n.toLowerCase()&&(e===this.pos||"_"!==n&&"."!==n&&(n<"0"||n>"9")))break}if(e>t){var r=this.expression.substring(t,e);if(r in this.consts)return this.current=this.newToken(TNUMBER,this.consts[r]),this.pos+=r.length,!0}return!1},TokenStream.prototype.isNamedOp=function(){for(var t=this.pos,e=t;e<this.expression.length;e++){var n=this.expression.charAt(e);if(n.toUpperCase()===n.toLowerCase()&&(e===this.pos||"_"!==n&&(n<"0"||n>"9")))break}if(e>t){var r=this.expression.substring(t,e);if(this.isOperatorEnabled(r)&&(r in this.binaryOps||r in this.unaryOps||r in this.ternaryOps))return this.current=this.newToken(TOP,r),this.pos+=r.length,!0}return!1},TokenStream.prototype.isName=function(){for(var t=this.pos,e=t,n=!1;e<this.expression.length;e++){var r=this.expression.charAt(e);if(r.toUpperCase()===r.toLowerCase()){if(e===this.pos&&("$"===r||"_"===r)){"_"===r&&(n=!0);continue}if(e===this.pos||!n||"_"!==r&&(r<"0"||r>"9"))break}else n=!0}if(n){var o=this.expression.substring(t,e);return this.current=this.newToken(TNAME,o),this.pos+=o.length,!0}return!1},TokenStream.prototype.isWhitespace=function(){for(var t=!1,e=this.expression.charAt(this.pos);!(" "!==e&&"\t"!==e&&"\n"!==e&&"\r"!==e||(t=!0,this.pos++,this.pos>=this.expression.length));)e=this.expression.charAt(this.pos);return t};var codePointPattern=/^[0-9a-f]{4}$/i;TokenStream.prototype.unescape=function(t){var e=t.indexOf("\\");if(e<0)return t;for(var n=t.substring(0,e);e>=0;){var r=t.charAt(++e);switch(r){case"'":n+="'";break;case'"':n+='"';break;case"\\":n+="\\";break;case"/":n+="/";break;case"b":n+="\b";break;case"f":n+="\f";break;case"n":n+="\n";break;case"r":n+="\r";break;case"t":n+="\t";break;case"u":var o=t.substring(e+1,e+5);codePointPattern.test(o)||this.parseError("Illegal escape sequence: \\u"+o),n+=String.fromCharCode(parseInt(o,16)),e+=4;break;default:throw this.parseError('Illegal escape sequence: "\\'+r+'"')}++e;var i=t.indexOf("\\",e);n+=t.substring(e,i<0?t.length:i),e=i}return n},TokenStream.prototype.isComment=function(){return"/"===this.expression.charAt(this.pos)&&"*"===this.expression.charAt(this.pos+1)&&(this.pos=this.expression.indexOf("*/",this.pos)+2,1===this.pos&&(this.pos=this.expression.length),!0)},TokenStream.prototype.isRadixInteger=function(){var t,e,n=this.pos;if(n>=this.expression.length-2||"0"!==this.expression.charAt(n))return!1;if(++n,"x"===this.expression.charAt(n))t=16,e=/^[0-9a-f]$/i,++n;else{if("b"!==this.expression.charAt(n))return!1;t=2,e=/^[01]$/i,++n}for(var r=!1,o=n;n<this.expression.length;){var i=this.expression.charAt(n);if(!e.test(i))break;n++,r=!0}return r&&(this.current=this.newToken(TNUMBER,parseInt(this.expression.substring(o,n),t)),this.pos=n),r},TokenStream.prototype.isNumber=function(){for(var t,e=!1,n=this.pos,r=n,o=n,i=!1,a=!1;n<this.expression.length&&((t=this.expression.charAt(n))>="0"&&t<="9"||!i&&"."===t);)"."===t?i=!0:a=!0,n++,e=a;if(e&&(o=n),"e"===t||"E"===t){n++;for(var s=!0,c=!1;n<this.expression.length;){if(t=this.expression.charAt(n),!s||"+"!==t&&"-"!==t){if(!(t>="0"&&t<="9"))break;c=!0,s=!1}else s=!1;n++}c||(n=o)}return e?(this.current=this.newToken(TNUMBER,parseFloat(this.expression.substring(r,n))),this.pos=n):this.pos=o,e},TokenStream.prototype.isOperator=function(){var t=this.pos,e=this.expression.charAt(this.pos);if("+"===e||"-"===e||"*"===e||"/"===e||"%"===e||"^"===e||"?"===e||":"===e||"."===e)this.current=this.newToken(TOP,e);else if("∙"===e||"•"===e)this.current=this.newToken(TOP,"*");else if(">"===e)"="===this.expression.charAt(this.pos+1)?(this.current=this.newToken(TOP,">="),this.pos++):this.current=this.newToken(TOP,">");else if("<"===e)"="===this.expression.charAt(this.pos+1)?(this.current=this.newToken(TOP,"<="),this.pos++):this.current=this.newToken(TOP,"<");else if("|"===e){if("|"!==this.expression.charAt(this.pos+1))return!1;this.current=this.newToken(TOP,"||"),this.pos++}else if("="===e)"="===this.expression.charAt(this.pos+1)?(this.current=this.newToken(TOP,"=="),this.pos++):this.current=this.newToken(TOP,e);else{if("!"!==e)return!1;"="===this.expression.charAt(this.pos+1)?(this.current=this.newToken(TOP,"!="),this.pos++):this.current=this.newToken(TOP,e)}return this.pos++,!!this.isOperatorEnabled(this.current.value)||(this.pos=t,!1)},TokenStream.prototype.isOperatorEnabled=function(t){return this.parser.isOperatorEnabled(t)},TokenStream.prototype.getCoordinates=function(){var t,e=0,n=-1;do{e++,t=this.pos-n,n=this.expression.indexOf("\n",n+1)}while(n>=0&&n<this.pos);return{line:e,column:t}},TokenStream.prototype.parseError=function(t){var e=this.getCoordinates();throw new Error("parse error ["+e.line+":"+e.column+"]: "+t)};var INUMBER="INUMBER",IOP1="IOP1",IOP2="IOP2",IOP3="IOP3",IVAR="IVAR",IVARNAME="IVARNAME",IFUNCALL="IFUNCALL",IFUNDEF="IFUNDEF",IEXPR="IEXPR",IEXPREVAL="IEXPREVAL",IMEMBER="IMEMBER",IENDSTATEMENT="IENDSTATEMENT",IARRAY="IARRAY";function Instruction(t,e){this.type=t,this.value=null!=e?e:0}function unaryInstruction(t){return new Instruction(IOP1,t)}function binaryInstruction(t){return new Instruction(IOP2,t)}function ternaryInstruction(t){return new Instruction(IOP3,t)}function contains$1(t,e){for(var n=0;n<t.length;n++)if(t[n]===e)return!0;return!1}function ParserState(t,e,n){this.parser=t,this.tokens=e,this.current=null,this.nextToken=null,this.next(),this.savedCurrent=null,this.savedNextToken=null,this.allowMemberAccess=!1!==n.allowMemberAccess}Instruction.prototype.toString=function(){switch(this.type){case INUMBER:case IOP1:case IOP2:case IOP3:case IVAR:case IVARNAME:case IENDSTATEMENT:return this.value;case IFUNCALL:return"CALL "+this.value;case IFUNDEF:return"DEF "+this.value;case IARRAY:return"ARRAY "+this.value;case IMEMBER:return"."+this.value;default:return"Invalid Instruction"}},ParserState.prototype.next=function(){return this.current=this.nextToken,this.nextToken=this.tokens.next()},ParserState.prototype.tokenMatches=function(t,e){return void 0===e||(Array.isArray(e)?contains$1(e,t.value):"function"==typeof e?e(t):t.value===e)},ParserState.prototype.save=function(){this.savedCurrent=this.current,this.savedNextToken=this.nextToken,this.tokens.save()},ParserState.prototype.restore=function(){this.tokens.restore(),this.current=this.savedCurrent,this.nextToken=this.savedNextToken},ParserState.prototype.accept=function(t,e){return!(this.nextToken.type!==t||!this.tokenMatches(this.nextToken,e))&&(this.next(),!0)},ParserState.prototype.expect=function(t,e){if(!this.accept(t,e)){var n=this.tokens.getCoordinates();throw new Error("parse error ["+n.line+":"+n.column+"]: Expected "+(e||t))}},ParserState.prototype.parseAtom=function(t){var e=this.tokens.unaryOps;if(this.accept(TNAME)||this.accept(TOP,(function(t){return t.value in e})))t.push(new Instruction(IVAR,this.current.value));else if(this.accept(TNUMBER))t.push(new Instruction(INUMBER,this.current.value));else if(this.accept(TSTRING))t.push(new Instruction(INUMBER,this.current.value));else if(this.accept(TPAREN,"("))this.parseExpression(t),this.expect(TPAREN,")");else{if(!this.accept(TBRACKET,"["))throw new Error("unexpected "+this.nextToken);if(this.accept(TBRACKET,"]"))t.push(new Instruction(IARRAY,0));else{var n=this.parseArrayList(t);t.push(new Instruction(IARRAY,n))}}},ParserState.prototype.parseExpression=function(t){var e=[];this.parseUntilEndStatement(t,e)||(this.parseVariableAssignmentExpression(e),this.parseUntilEndStatement(t,e)||this.pushExpression(t,e))},ParserState.prototype.pushExpression=function(t,e){for(var n=0,r=e.length;n<r;n++)t.push(e[n])},ParserState.prototype.parseUntilEndStatement=function(t,e){return!!this.accept(TSEMICOLON)&&(!this.nextToken||this.nextToken.type===TEOF||this.nextToken.type===TPAREN&&")"===this.nextToken.value||e.push(new Instruction(IENDSTATEMENT)),this.nextToken.type!==TEOF&&this.parseExpression(e),t.push(new Instruction(IEXPR,e)),!0)},ParserState.prototype.parseArrayList=function(t){for(var e=0;!this.accept(TBRACKET,"]");)for(this.parseExpression(t),++e;this.accept(TCOMMA);)this.parseExpression(t),++e;return e},ParserState.prototype.parseVariableAssignmentExpression=function(t){for(this.parseConditionalExpression(t);this.accept(TOP,"=");){var e=t.pop(),n=[],r=t.length-1;if(e.type!==IFUNCALL){if(e.type!==IVAR&&e.type!==IMEMBER)throw new Error("expected variable for assignment");this.parseVariableAssignmentExpression(n),t.push(new Instruction(IVARNAME,e.value)),t.push(new Instruction(IEXPR,n)),t.push(binaryInstruction("="))}else{if(!this.tokens.isOperatorEnabled("()="))throw new Error("function definition is not permitted");for(var o=0,i=e.value+1;o<i;o++){var a=r-o;t[a].type===IVAR&&(t[a]=new Instruction(IVARNAME,t[a].value))}this.parseVariableAssignmentExpression(n),t.push(new Instruction(IEXPR,n)),t.push(new Instruction(IFUNDEF,e.value))}}},ParserState.prototype.parseConditionalExpression=function(t){for(this.parseOrExpression(t);this.accept(TOP,"?");){var e=[],n=[];this.parseConditionalExpression(e),this.expect(TOP,":"),this.parseConditionalExpression(n),t.push(new Instruction(IEXPR,e)),t.push(new Instruction(IEXPR,n)),t.push(ternaryInstruction("?"))}},ParserState.prototype.parseOrExpression=function(t){for(this.parseAndExpression(t);this.accept(TOP,"or");){var e=[];this.parseAndExpression(e),t.push(new Instruction(IEXPR,e)),t.push(binaryInstruction("or"))}},ParserState.prototype.parseAndExpression=function(t){for(this.parseComparison(t);this.accept(TOP,"and");){var e=[];this.parseComparison(e),t.push(new Instruction(IEXPR,e)),t.push(binaryInstruction("and"))}};var COMPARISON_OPERATORS=["==","!=","<","<=",">=",">","in"];ParserState.prototype.parseComparison=function(t){for(this.parseAddSub(t);this.accept(TOP,COMPARISON_OPERATORS);){var e=this.current;this.parseAddSub(t),t.push(binaryInstruction(e.value))}};var ADD_SUB_OPERATORS=["+","-","||"];ParserState.prototype.parseAddSub=function(t){for(this.parseTerm(t);this.accept(TOP,ADD_SUB_OPERATORS);){var e=this.current;this.parseTerm(t),t.push(binaryInstruction(e.value))}};var TERM_OPERATORS=["*","/","%"];function add(t,e){return Number(t)+Number(e)}function sub(t,e){return t-e}function mul(t,e){return t*e}function div(t,e){return t/e}function mod(t,e){return t%e}function equal(t,e){return t===e}function notEqual(t,e){return t!==e}function greaterThan(t,e){return t>e}function lessThan(t,e){return t<e}function greaterThanEqual(t,e){return t>=e}function lessThanEqual(t,e){return t<=e}function andOperator(t,e){return Boolean(t&&e)}function orOperator(t,e){return Boolean(t||e)}function log10(t){return Math.log(t)*Math.LOG10E}function neg(t){return-t}function not(t){return!t}function trunc(t){return t<0?Math.ceil(t):Math.floor(t)}function random(t){return Math.random()*(t||1)}function stringOrArrayLength(t){return Array.isArray(t)?t.length:String(t).length}function condition(t,e,n){return t?e:n}function roundTo(t,e){return void 0===e||0==+e?Math.round(t):(t=+t,e=-+e,isNaN(t)||"number"!=typeof e||e%1!=0?NaN:(t=t.toString().split("e"),+((t=(t=Math.round(+(t[0]+"e"+(t[1]?+t[1]-e:-e)))).toString().split("e"))[0]+"e"+(t[1]?+t[1]+e:e))))}function arrayIndex(t,e){return t[0|e]}function max$1(t){return 1===arguments.length&&Array.isArray(t)?Math.max.apply(Math,t):Math.max.apply(Math,arguments)}function min(t){return 1===arguments.length&&Array.isArray(t)?Math.min.apply(Math,t):Math.min.apply(Math,arguments)}function arrayMap(t,e){if("function"!=typeof t)throw new Error("First argument to map is not a function");if(!Array.isArray(e))throw new Error("Second argument to map is not an array");return e.map((function(e,n){return t(e,n)}))}function arrayFold(t,e,n){if("function"!=typeof t)throw new Error("First argument to fold is not a function");if(!Array.isArray(n))throw new Error("Second argument to fold is not an array");return n.reduce((function(e,n,r){return t(e,n,r)}),e)}function arrayFilter(t,e){if("function"!=typeof t)throw new Error("First argument to filter is not a function");if(!Array.isArray(e))throw new Error("Second argument to filter is not an array");return e.filter((function(e,n){return t(e,n)}))}function sign(t){return(t>0)-(t<0)||+t}function log1p(t){return Math.log(1+t)}function log2(t){return Math.log(t)/Math.LN2}function sum(t){if(!Array.isArray(t))throw new Error("Sum argument is not an array");return t.reduce((function(t,e){return t+Number(e)}),0)}function evaluate(t,e,n){var r,o,i,a,s,c,u=[];if(isExpressionEvaluator(t))return resolveExpression(t,n);for(var l=t.length,p=0;p<l;p++){var f=t[p],h=f.type;if(h===INUMBER||h===IVARNAME)u.push(f.value);else if(h===IOP2)o=u.pop(),r=u.pop(),"and"===f.value?u.push(!!r&&!!evaluate(o,e,n)):"or"===f.value?u.push(!!r||!!evaluate(o,e,n)):"="===f.value?(a=e.binaryOps[f.value],u.push(a(r,evaluate(o,e,n),n))):(a=e.binaryOps[f.value],u.push(a(resolveExpression(r,n),resolveExpression(o,n))));else if(h===IOP3)i=u.pop(),o=u.pop(),r=u.pop(),"?"===f.value?u.push(evaluate(r?o:i,e,n)):(a=e.ternaryOps[f.value],u.push(a(resolveExpression(r,n),resolveExpression(o,n),resolveExpression(i,n))));else if(h===IVAR)if(f.value in e.functions)u.push(e.functions[f.value]);else if(f.value in e.unaryOps&&e.parser.isOperatorEnabled(f.value))u.push(e.unaryOps[f.value]);else{var d=n[f.value];if(void 0===d)throw new Error("undefined variable: "+f.value);u.push(d)}else if(h===IOP1)r=u.pop(),a=e.unaryOps[f.value],u.push(a(resolveExpression(r,n)));else if(h===IFUNCALL){for(c=f.value,s=[];c-- >0;)s.unshift(resolveExpression(u.pop(),n));if(!(a=u.pop()).apply||!a.call)throw new Error(a+" is not a function");u.push(a.apply(void 0,s))}else if(h===IFUNDEF)u.push(function(){for(var t=u.pop(),r=[],o=f.value;o-- >0;)r.unshift(u.pop());var i=u.pop(),a=function(){for(var o=Object.assign({},n),i=0,a=r.length;i<a;i++)o[r[i]]=arguments[i];return evaluate(t,e,o)};return Object.defineProperty(a,"name",{value:i,writable:!1}),n[i]=a,a}());else if(h===IEXPR)u.push(createExpressionEvaluator(f,e));else if(h===IEXPREVAL)u.push(f);else if(h===IMEMBER)r=u.pop(),u.push(r[f.value]);else if(h===IENDSTATEMENT)u.pop();else{if(h!==IARRAY)throw new Error("invalid Expression");for(c=f.value,s=[];c-- >0;)s.unshift(u.pop());u.push(s)}}if(u.length>1)throw new Error("invalid Expression (parity)");return 0===u[0]?0:resolveExpression(u[0],n)}function createExpressionEvaluator(t,e,n){return isExpressionEvaluator(t)?t:{type:IEXPREVAL,value:function(n){return evaluate(t.value,e,n)}}}function isExpressionEvaluator(t){return t&&t.type===IEXPREVAL}function resolveExpression(t,e){return isExpressionEvaluator(t)?t.value(e):t}function Expression(t,e){this.tokens=t,this.parser=e,this.unaryOps=e.unaryOps,this.binaryOps=e.binaryOps,this.ternaryOps=e.ternaryOps,this.functions=e.functions}function trim(t){return t.trim()}function Parser(t){this.options=t||{},this.unaryOps={SIN:Math.sin,COS:Math.cos,TAN:Math.tan,ASIN:Math.asin,ACOS:Math.acos,ATAN:Math.atan,SQRT:Math.sqrt,LOG:Math.log,LOG2:Math.log2||log2,LN:Math.log,LOG10:Math.log10||log10,LG:Math.log10||log10,LOG1P:Math.log1p||log1p,ABS:Math.abs,CEIL:Math.ceil,FLOOR:Math.floor,ISNULL:function(t){return null===t},TRUNC:Math.trunc||trunc,"-":neg,"+":Number,EXP:Math.exp,NOT:not,LENGTH:stringOrArrayLength,"!":not,SIGN:Math.sign||sign,TEXT:function(t){return e(t)?t.toISOString():String(t)},NUMBER:Number},this.binaryOps={"+":add,"-":sub,"*":mul,"/":div,"%":mod,"^":Math.pow,"==":equal,"!=":notEqual,">":greaterThan,"<":lessThan,">=":greaterThanEqual,"<=":lessThanEqual,and:andOperator,or:orOperator,in:function(t,e){return Array.isArray(e)?e.includes(t):String(e).includes(t)},"[":arrayIndex},this.ternaryOps={"?":condition};var e=function(t){return t instanceof Date&&!isNaN(t)},n=function(t){if(e(t))return t;try{var n=new Date(t);return e(n)?n:null}catch(t){return null}};function r(t){return(1===arguments.length&&Array.isArray(t)?t:Array.from(arguments)).slice(0).filter((function(t){return!isNaN(t)&&Number.isFinite(t)}))}var o=/\w*/g,i=/\w\S*/g,a=/[\\^$*+?.()|[\]{}]/g;try{o=new RegExp("\\p{L}*","ug"),i=new RegExp("[\\p{L}\\p{N}]\\S*","ug")}catch(t){}this.functions={IF:condition,RANDOM:random,MIN:function(){var t=r.apply(this,arguments);return min(t)},MAX:function(){return max$1(r.apply(this,arguments))},SUM:function(){return sum(r.apply(this,arguments))},MEAN:function(){var t=r.apply(this,arguments);return sum(t)/t.length},MEDIAN:function(){var t=r.apply(this,arguments).sort((function(t,e){return t-e})),e=Math.floor(t.length/2);return t.length%2==1?t[e]:.5*(t[e-1]+t[e])},POW:Math.pow,ATAN2:Math.atan2,ROUND:roundTo,CONCAT:function(){return Array.from(arguments).join("")},TRIM:trim,SUBSTR:function(t,e,n){return t.substr(e,n)},REPLACE:function(t,e,n){return t.replace(new RegExp(String(e).replace(a,"\\$&"),"g"),n)},REPLACE_REGEX:function(t,e,n){return t.replace(new RegExp(e,"g"),n)},SPLIT:function(t,e){return String(t).split(e)},LOWER:function(t){return String(t).toLowerCase()},UPPER:function(t){return String(t).toUpperCase()},PROPER:function(t){return String(t).replace(o,(function(t){return t.charAt(0).toUpperCase()+t.substr(1).toLowerCase()}))},TITLE:function(t){return String(t).replace(i,(function(t){return t.charAt(0).toUpperCase()+t.substr(1).toLowerCase()}))},SORT:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;if(!Array.isArray(t))throw new Error("First argument to SORT is not an array");return t.slice(0).sort((function(t,r){return((t="string"==typeof n?t[n]:"function"==typeof n?n(t):t)>(r="string"==typeof n?r[n]:"function"==typeof n?n(r):r)?1:t<r?-1:0)*(e?1:-1)}))},SLICE:function(t,e,n){if(!Array.isArray(t))throw new Error("First argument to SLICE is not an array");return t.slice(e,n)},JOIN:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;if(!Array.isArray(t))throw new Error("First argument to JOIN is not an array");return n?[t.slice(0,t.length-1).join(e),t[t.length-1]].join(n):t.join(e)},MAP:arrayMap,FOLD:arrayFold,FILTER:arrayFilter,PLUCK:function(t,e){if(!Array.isArray(t))throw new Error("First argument to PLUCK is not an array");return t.map((function(t){return Object.prototype.hasOwnProperty.call(t,e)?t[e]:null}))},INDEXOF:function(t,e){return Array.isArray(t)||(t=String(t)),t.indexOf(e)},FIND:function(t,e){if(!Array.isArray(t))throw new Error("First argument to FIND is not an array");if("function"!=typeof e)throw new Error("Second argument to FIND is not a function");for(var n=t.length,r=0;r<n;r++)if(e(t[r]))return t[r];return null},RANGE:function(t,e,n){null==e&&(e=t||0,t=0),n||(n=e<t?-1:1);for(var r=Math.max(Math.ceil((e-t)/n),0),o=Array(r),i=0;i<r;i++,t+=n)o[i]=t;return o},EVERY:function(t,e){if(!Array.isArray(t))throw new Error("First argument to EVERY is not an array");if("function"!=typeof e)throw new Error("Second argument to EVERY is not a function");for(var n=t.length,r=!0,o=0;o<n;o++)if(!(r=r&&e(t[o])))return!1;return!0},SOME:function(t,e){if(!Array.isArray(t))throw new Error("First argument to SOME is not an array");if("function"!=typeof e)throw new Error("Second argument to SOME is not a function");for(var n=t.length,r=!1,o=0;o<n;o++)if(r=r||e(t[o]))return!0;return!1},DATE:function(){return arguments.length>1&&(arguments[1]=arguments[1]-1),_construct(Date,Array.prototype.slice.call(arguments))},YEAR:function(t){return(t=n(t))?t.getFullYear():null},MONTH:function(t){return(t=n(t))?t.getMonth()+1:null},DAY:function(t){return(t=n(t))?t.getDate():null},WEEKDAY:function(t){return(t=n(t))?t.getDay():null},HOURS:function(t){return(t=n(t))?t.getHours():null},MINUTES:function(t){return(t=n(t))?t.getMinutes():null},SECONDS:function(t){return(t=n(t))?t.getSeconds():null},DATEDIFF:function(t,e){return t=n(t),e=n(e),t&&e?(e.getTime()-t.getTime())/864e5:null},TIMEDIFF:function(t,e){return t=n(t),e=n(e),t&&e?(e.getTime()-t.getTime())/1e3:null}},this.unaryOps.LOWER=this.functions.LOWER,this.unaryOps.UPPER=this.functions.UPPER,this.unaryOps.PROPER=this.functions.PROPER,this.unaryOps.TITLE=this.functions.TITLE,this.unaryOps.TRIM=this.functions.TRIM,this.unaryOps.YEAR=this.functions.YEAR,this.unaryOps.MONTH=this.functions.MONTH,this.unaryOps.DAY=this.functions.DAY,this.unaryOps.WEEKDAY=this.functions.WEEKDAY,this.unaryOps.HOURS=this.functions.HOURS,this.unaryOps.MINUTES=this.functions.MINUTES,this.unaryOps.SECONDS=this.functions.SECONDS,this.consts={E:Math.E,PI:Math.PI,TRUE:!0,FALSE:!1,NA:Number.NaN,NULL:Number.NaN}}ParserState.prototype.parseTerm=function(t){for(this.parseFactor(t);this.accept(TOP,TERM_OPERATORS);){var e=this.current;this.parseFactor(t),t.push(binaryInstruction(e.value))}},ParserState.prototype.parseFactor=function(t){var e=this.tokens.unaryOps;if(this.save(),this.accept(TOP,(function(t){return t.value in e}))){if("-"!==this.current.value&&"+"!==this.current.value){if(this.nextToken.type===TPAREN&&"("===this.nextToken.value)return this.restore(),void this.parseExponential(t);if(this.nextToken.type===TSEMICOLON||this.nextToken.type===TCOMMA||this.nextToken.type===TEOF||this.nextToken.type===TPAREN&&")"===this.nextToken.value)return this.restore(),void this.parseAtom(t)}var n=this.current;this.parseFactor(t),t.push(unaryInstruction(n.value))}else this.parseExponential(t)},ParserState.prototype.parseExponential=function(t){for(this.parsePostfixExpression(t);this.accept(TOP,"^");)this.parseFactor(t),t.push(binaryInstruction("^"))},ParserState.prototype.parsePostfixExpression=function(t){for(this.parseFunctionCall(t);this.accept(TOP,"!");)t.push(unaryInstruction("!"))},ParserState.prototype.parseFunctionCall=function(t){var e=this.tokens.unaryOps;if(this.accept(TOP,(function(t){return t.value in e}))){var n=this.current;this.parseAtom(t),t.push(unaryInstruction(n.value))}else for(this.parseMemberExpression(t);this.accept(TPAREN,"(");)if(this.accept(TPAREN,")"))t.push(new Instruction(IFUNCALL,0));else{var r=this.parseArgumentList(t);t.push(new Instruction(IFUNCALL,r))}},ParserState.prototype.parseArgumentList=function(t){for(var e=0;!this.accept(TPAREN,")");)for(this.parseExpression(t),++e;this.accept(TCOMMA);)this.parseExpression(t),++e;return e},ParserState.prototype.parseMemberExpression=function(t){for(this.parseAtom(t);this.accept(TOP,".")||this.accept(TBRACKET,"[");){var e=this.current;if("."===e.value){if(!this.allowMemberAccess)throw new Error('unexpected ".", member access is not permitted');this.expect(TNAME),t.push(new Instruction(IMEMBER,this.current.value))}else{if("["!==e.value)throw new Error("unexpected symbol: "+e.value);if(!this.tokens.isOperatorEnabled("["))throw new Error('unexpected "[]", arrays are disabled');this.parseExpression(t),this.expect(TBRACKET,"]"),t.push(binaryInstruction("["))}}},Expression.prototype.evaluate=function(t){return t=t||{},evaluate(this.tokens,this,t)},Expression.prototype.variables=function(){return(this.tokens||[]).filter((function(t){return"IVAR"===t.type})).map((function(t){return t.value}))},Parser.prototype.parse=function(t){var e=[],n=new ParserState(this,new TokenStream(this,t),{allowMemberAccess:!0});return n.parseExpression(e),n.expect(TEOF,"EOF"),new Expression(e,this)},Parser.prototype.evaluate=function(t,e){return this.parse(t).evaluate(e)};var sharedParser=new Parser;Parser.parse=function(t){return sharedParser.parse(t)},Parser.evaluate=function(t,e){return sharedParser.parse(t).evaluate(e)},Parser.keywords=["ABS","ACOS","ACOSH","and","ASIN","ASINH","ATAN","ATAN2","ATANH","CBRT","CEIL","CONCAT","COS","COSH","DATEDIFF","DAY","E","EVERY","EXP","EXPM1","FIND","FLOOR","HOURS","IF","in","INDEXOF","ISNULL","JOIN","LENGTH","LN","LOG","LOG10","LOG1P","LOG2","LOWER","MAP","MAX","MEAN","MEDIAN","MIN","MINUTES","MONTH","NOT","NOT","or","PI","PLUCK","POW","PROPER","RANDOM","RANGE","REPLACE","REPLACE_REGEX","ROUND","SECONDS","SIGN","SIN","SINH","SLICE","SOME","SORT","SPLIT","SQRT","SUBSTR","SUM","TAN","TANH","TIMEDIFF","TITLE","TRIM","TRUNC","UPPER","WEEKDAY","YEAR"];var optionNameMap={"+":"add","-":"subtract","*":"multiply","/":"divide","%":"remainder","^":"power","!":"factorial","<":"comparison",">":"comparison","<=":"comparison",">=":"comparison","==":"comparison","!=":"comparison","||":"concatenate",AND:"logical",OR:"logical",NOT:"logical",IN:"logical","?":"conditional",":":"conditional","=":"assignment","[":"array","()=":"fndef"};function getOptionName(t){return Object.prototype.hasOwnProperty.call(optionNameMap,t)?optionNameMap[t]:t}function domReady(t){/complete|interactive|loaded/.test(document.readyState)?t():window.addEventListener("DOMContentLoaded",(function(e){t()}))}function get(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;if(!e)return t;for(var r=e.split("."),o=t,i=0;i<r.length&&null!=o;i++)o=o[r[i]];return null==o?n:o}function postEvent(t){return function(e,n){if(window.parent&&window.parent.postMessage){var r={source:"datawrapper",chartId:t,type:e,data:n};window.parent.postMessage(r,"*")}}}function createCommonjsModule(t,e){return t(e={exports:{}},e.exports),e.exports}Parser.prototype.isOperatorEnabled=function(t){var e=getOptionName(t),n=this.options.operators||{};return!(e in n)||!!n[e]};var fontfaceobserver_standalone=createCommonjsModule((function(t){!function(){function e(t,e){document.addEventListener?t.addEventListener("scroll",e,!1):t.attachEvent("scroll",e)}function n(t){this.a=document.createElement("div"),this.a.setAttribute("aria-hidden","true"),this.a.appendChild(document.createTextNode(t)),this.b=document.createElement("span"),this.c=document.createElement("span"),this.h=document.createElement("span"),this.f=document.createElement("span"),this.g=-1,this.b.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;",this.c.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;",this.f.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;",this.h.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;",this.b.appendChild(this.h),this.c.appendChild(this.f),this.a.appendChild(this.b),this.a.appendChild(this.c)}function r(t,e){t.a.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:"+e+";"}function o(t){var e=t.a.offsetWidth,n=e+100;return t.f.style.width=n+"px",t.c.scrollLeft=n,t.b.scrollLeft=t.b.scrollWidth+100,t.g!==e&&(t.g=e,!0)}function i(t,n){function r(){var t=i;o(t)&&t.a.parentNode&&n(t.g)}var i=t;e(t.b,r),e(t.c,r),o(t)}function a(t,e){var n=e||{};this.family=t,this.style=n.style||"normal",this.weight=n.weight||"normal",this.stretch=n.stretch||"normal"}var s=null,c=null,u=null,l=null;function p(){return null===l&&(l=!!document.fonts),l}function f(){if(null===u){var t=document.createElement("div");try{t.style.font="condensed 100px sans-serif"}catch(t){}u=""!==t.style.font}return u}function h(t,e){return[t.style,t.weight,f()?t.stretch:"","100px",e].join(" ")}a.prototype.load=function(t,e){var o=this,a=t||"BESbswy",u=0,l=e||3e3,f=(new Date).getTime();return new Promise((function(t,e){if(p()&&!function(){if(null===c)if(p()&&/Apple/.test(window.navigator.vendor)){var t=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent);c=!!t&&603>parseInt(t[1],10)}else c=!1;return c}()){var d=new Promise((function(t,e){!function n(){(new Date).getTime()-f>=l?e(Error(l+"ms timeout exceeded")):document.fonts.load(h(o,'"'+o.family+'"'),a).then((function(e){1<=e.length?t():setTimeout(n,25)}),e)}()})),m=new Promise((function(t,e){u=setTimeout((function(){e(Error(l+"ms timeout exceeded"))}),l)}));Promise.race([m,d]).then((function(){clearTimeout(u),t(o)}),e)}else!function(t){document.body?t():document.addEventListener?document.addEventListener("DOMContentLoaded",(function e(){document.removeEventListener("DOMContentLoaded",e),t()})):document.attachEvent("onreadystatechange",(function e(){"interactive"!=document.readyState&&"complete"!=document.readyState||(document.detachEvent("onreadystatechange",e),t())}))}((function(){function c(){var e;(e=-1!=y&&-1!=v||-1!=y&&-1!=g||-1!=v&&-1!=g)&&((e=y!=v&&y!=g&&v!=g)||(null===s&&(e=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),s=!!e&&(536>parseInt(e[1],10)||536===parseInt(e[1],10)&&11>=parseInt(e[2],10))),e=s&&(y==_&&v==_&&g==_||y==b&&v==b&&g==b||y==$&&v==$&&g==$)),e=!e),e&&(k.parentNode&&k.parentNode.removeChild(k),clearTimeout(u),t(o))}var p=new n(a),d=new n(a),m=new n(a),y=-1,v=-1,g=-1,_=-1,b=-1,$=-1,k=document.createElement("div");k.dir="ltr",r(p,h(o,"sans-serif")),r(d,h(o,"serif")),r(m,h(o,"monospace")),k.appendChild(p.a),k.appendChild(d.a),k.appendChild(m.a),document.body.appendChild(k),_=p.a.offsetWidth,b=d.a.offsetWidth,$=m.a.offsetWidth,function t(){if((new Date).getTime()-f>=l)k.parentNode&&k.parentNode.removeChild(k),e(Error(l+"ms timeout exceeded"));else{var n=document.hidden;!0!==n&&void 0!==n||(y=p.a.offsetWidth,v=d.a.offsetWidth,g=m.a.offsetWidth,c()),u=setTimeout(t,50)}}(),i(p,(function(t){y=t,c()})),r(p,h(o,'"'+o.family+'",sans-serif')),i(d,(function(t){v=t,c()})),r(d,h(o,'"'+o.family+'",serif')),i(m,(function(t){g=t,c()})),r(m,h(o,'"'+o.family+'",monospace'))}))}))},t.exports=a}()}));function observeFonts(t,e){var n=Array.isArray(t)?[]:Object.keys(t),r=new Set(n);Object.keys(e).forEach((function(t){var n=e[t].typeface;n&&n.split(",").map((function(t){return t.trim()})).forEach((function(t){return r.add(t)}))}));var o=[];return r.forEach((function(t){var e=new fontfaceobserver_standalone(t);o.push(e.load(null,5e3))})),Promise.all(o)}function loadScript(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;return new Promise((function(n,r){var o=document.createElement("script");o.src=t,o.onload=function(){e&&e(),n()},o.onerror=r,document.body.appendChild(o)}))}function loadStylesheet(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;return"string"==typeof t&&(t={src:t}),t.parentElement&&"function"==typeof t.parentElement.appendChild||(t.parentElement=document.head),new Promise((function(n,r){var o=document.createElement("link");o.rel="stylesheet",o.href=t.src,o.onload=function(){e&&e(),n()},o.onerror=r,t.parentElement.appendChild(o)}))}function sheetForTag(t){if(t.sheet)return t.sheet;for(var e=0;e<document.styleSheets.length;e++)if(document.styleSheets[e].ownerNode===t)return document.styleSheets[e]}function createStyleElement(t){var e=document.createElement("style");return e.setAttribute("data-emotion",t.key),void 0!==t.nonce&&e.setAttribute("nonce",t.nonce),e.appendChild(document.createTextNode("")),e.setAttribute("data-s",""),e}var StyleSheet=function(){function t(t){var e=this;this._insertTag=function(t){var n;n=0===e.tags.length?e.prepend?e.container.firstChild:e.before:e.tags[e.tags.length-1].nextSibling,e.container.insertBefore(t,n),e.tags.push(t)},this.isSpeedy=void 0===t.speedy||t.speedy,this.tags=[],this.ctr=0,this.nonce=t.nonce,this.key=t.key,this.container=t.container,this.prepend=t.prepend,this.before=null}var e=t.prototype;return e.hydrate=function(t){t.forEach(this._insertTag)},e.insert=function(t){this.ctr%(this.isSpeedy?65e3:1)==0&&this._insertTag(createStyleElement(this));var e=this.tags[this.tags.length-1];if(this.isSpeedy){var n=sheetForTag(e);try{n.insertRule(t,n.cssRules.length)}catch(t){}}else e.appendChild(document.createTextNode(t));this.ctr++},e.flush=function(){this.tags.forEach((function(t){return t.parentNode.removeChild(t)})),this.tags=[],this.ctr=0},t}(),e="-ms-",r="-moz-",a="-webkit-",c="comm",n="rule",t="decl",i="@import",p="@keyframes",k=Math.abs,d=String.fromCharCode;function m(t,e){return(((e<<2^z(t,0))<<2^z(t,1))<<2^z(t,2))<<2^z(t,3)}function g(t){return t.trim()}function x(t,e){return(t=e.exec(t))?t[0]:t}function y(t,e,n){return t.replace(e,n)}function j(t,e){return t.indexOf(e)}function z(t,e){return 0|t.charCodeAt(e)}function C(t,e,n){return t.slice(e,n)}function A(t){return t.length}function M(t){return t.length}function O(t,e){return e.push(t),t}function S(t,e){return t.map(e).join("")}var q=1,B=1,D=0,E=0,F=0,G="";function H(t,e,n,r,o,i,a){return{value:t,root:e,parent:n,type:r,props:o,children:i,line:q,column:B,length:a,return:""}}function I(t,e,n){return H(t,e.root,e.parent,n,e.props,e.children,0)}function J(){return F}function K(){return F=E>0?z(G,--E):0,B--,10===F&&(B=1,q--),F}function L(){return F=E<D?z(G,E++):0,B++,10===F&&(B=1,q++),F}function N(){return z(G,E)}function P(){return E}function Q(t,e){return C(G,t,e)}function R(t){switch(t){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function T(t){return q=B=1,D=A(G=t),E=0,[]}function U(t){return G="",t}function V(t){return g(Q(E-1,_$1(91===t?t+2:40===t?t+1:t)))}function X(t){for(;(F=N())&&F<33;)L();return R(t)>2||R(F)>3?"":" "}function Z(t,e){for(;--e&&L()&&!(F<48||F>102||F>57&&F<65||F>70&&F<97););return Q(t,P()+(e<6&&32==N()&&32==L()))}function _$1(t){for(;L();)switch(F){case t:return E;case 34:case 39:return _$1(34===t||39===t?t:F);case 40:41===t&&_$1(t);break;case 92:L()}return E}function ee(t,e){for(;L()&&t+F!==57&&(t+F!==84||47!==N()););return"/*"+Q(e,E-1)+"*"+d(47===t?t:L())}function re(t){for(;!R(N());)L();return Q(t,E)}function ae(t){return U(ce("",null,null,null,[""],t=T(t),0,[0],t))}function ce(t,e,n,r,o,i,a,s,c){for(var u=0,l=0,p=a,f=0,h=0,m=0,v=1,g=1,_=1,b=0,$="",k=o,w=i,x=r,E=$;g;)switch(m=b,b=L()){case 34:case 39:case 91:case 40:E+=V(b);break;case 9:case 10:case 13:case 32:E+=X(m);break;case 92:E+=Z(P()-1,7);continue;case 47:switch(N()){case 42:case 47:O(te(ee(L(),P()),e,n),c);break;default:E+="/"}break;case 123*v:s[u++]=A(E)*_;case 125*v:case 59:case 0:switch(b){case 0:case 125:g=0;case 59+l:h>0&&A(E)-p&&O(h>32?se(E+";",r,n,p-1):se(y(E," ","")+";",r,n,p-2),c);break;case 59:E+=";";default:if(O(x=ne(E,e,n,u,l,o,s,$,k=[],w=[],p),i),123===b)if(0===l)ce(E,e,x,x,k,i,p,s,w);else switch(f){case 100:case 109:case 115:ce(t,x,x,r&&O(ne(t,x,x,0,0,o,s,$,o,k=[],p),w),o,w,p,s,r?k:w);break;default:ce(E,x,x,x,[""],w,p,s,w)}}u=l=h=0,v=_=1,$=E="",p=a;break;case 58:p=1+A(E),h=m;default:if(v<1)if(123==b)--v;else if(125==b&&0==v++&&125==K())continue;switch(E+=d(b),b*v){case 38:_=l>0?1:(E+="\f",-1);break;case 44:s[u++]=(A(E)-1)*_,_=1;break;case 64:45===N()&&(E+=V(L())),f=N(),l=A($=E+=re(P())),b++;break;case 45:45===m&&2==A(E)&&(v=0)}}return i}function ne(t,e,r,o,i,a,s,c,u,l,p){for(var f=i-1,h=0===i?a:[""],d=M(h),m=0,v=0,_=0;m<o;++m)for(var b=0,$=C(t,f+1,f=k(v=s[m])),w=t;b<d;++b)(w=g(v>0?h[b]+" "+$:y($,/&\f/g,h[b])))&&(u[_++]=w);return H(t,e,r,0===i?n:c,u,l,p)}function te(t,e,n){return H(t,e,n,c,d(J()),C(t,2,-2),0)}function se(e,n,r,o){return H(e,n,r,t,C(e,0,o),C(e,o+1,-1),o)}function ue(t,n){switch(m(t,n)){case 5103:return a+"print-"+t+t;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return a+t+t;case 5349:case 4246:case 4810:case 6968:case 2756:return a+t+r+t+e+t+t;case 6828:case 4268:return a+t+e+t+t;case 6165:return a+t+e+"flex-"+t+t;case 5187:return a+t+y(t,/(\w+).+(:[^]+)/,a+"box-$1$2"+e+"flex-$1$2")+t;case 5443:return a+t+e+"flex-item-"+y(t,/flex-|-self/,"")+t;case 4675:return a+t+e+"flex-line-pack"+y(t,/align-content|flex-|-self/,"")+t;case 5548:return a+t+e+y(t,"shrink","negative")+t;case 5292:return a+t+e+y(t,"basis","preferred-size")+t;case 6060:return a+"box-"+y(t,"-grow","")+a+t+e+y(t,"grow","positive")+t;case 4554:return a+y(t,/([^-])(transform)/g,"$1"+a+"$2")+t;case 6187:return y(y(y(t,/(zoom-|grab)/,a+"$1"),/(image-set)/,a+"$1"),t,"")+t;case 5495:case 3959:return y(t,/(image-set\([^]*)/,a+"$1$`$1");case 4968:return y(y(t,/(.+:)(flex-)?(.*)/,a+"box-pack:$3"+e+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+a+t+t;case 4095:case 3583:case 4068:case 2532:return y(t,/(.+)-inline(.+)/,a+"$1$2")+t;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(A(t)-1-n>6)switch(z(t,n+1)){case 109:if(45!==z(t,n+4))break;case 102:return y(t,/(.+:)(.+)-([^]+)/,"$1"+a+"$2-$3$1"+r+(108==z(t,n+3)?"$3":"$2-$3"))+t;case 115:return~j(t,"stretch")?ue(y(t,"stretch","fill-available"),n)+t:t}break;case 4949:if(115!==z(t,n+1))break;case 6444:switch(z(t,A(t)-3-(~j(t,"!important")&&10))){case 107:return y(t,":",":"+a)+t;case 101:return y(t,/(.+:)([^;!]+)(;|!.+)?/,"$1"+a+(45===z(t,14)?"inline-":"")+"box$3$1"+a+"$2$3$1"+e+"$2box$3")+t}break;case 5936:switch(z(t,n+11)){case 114:return a+t+e+y(t,/[svh]\w+-[tblr]{2}/,"tb")+t;case 108:return a+t+e+y(t,/[svh]\w+-[tblr]{2}/,"tb-rl")+t;case 45:return a+t+e+y(t,/[svh]\w+-[tblr]{2}/,"lr")+t}return a+t+e+t+t}return t}function ie(t,e){for(var n="",r=M(t),o=0;o<r;o++)n+=e(t[o],o,t,e)||"";return n}function fe(e,r,o,a){switch(e.type){case i:case t:return e.return=e.return||e.value;case c:return"";case n:e.value=e.props.join(",")}return A(o=ie(e.children,a))?e.return=e.value+"{"+o+"}":""}function oe(t){var e=M(t);return function(n,r,o,i){for(var a="",s=0;s<e;s++)a+=t[s](n,r,o,i)||"";return a}}function le(t){return function(e){e.root||(e=e.return)&&t(e)}}function ve(o,i,s,c){if(!o.return)switch(o.type){case t:o.return=ue(o.value,o.length);break;case p:return ie([I(y(o.value,"@","@"+a),o,"")],c);case n:if(o.length)return S(o.props,(function(t){switch(x(t,/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":return ie([I(y(t,/:(read-\w+)/,":"+r+"$1"),o,"")],c);case"::placeholder":return ie([I(y(t,/:(plac\w+)/,":"+a+"input-$1"),o,""),I(y(t,/:(plac\w+)/,":"+r+"$1"),o,""),I(y(t,/:(plac\w+)/,e+"input-$1"),o,"")],c)}return""}))}}var weakMemoize=function(t){var e=new WeakMap;return function(n){if(e.has(n))return e.get(n);var r=t(n);return e.set(n,r),r}};function memoize(t){var e=Object.create(null);return function(n){return void 0===e[n]&&(e[n]=t(n)),e[n]}}var toRules=function(t,e){var n=-1,r=44;do{switch(R(r)){case 0:38===r&&12===N()&&(e[n]=1),t[n]+=re(E-1);break;case 2:t[n]+=V(r);break;case 4:if(44===r){t[++n]=58===N()?"&\f":"",e[n]=t[n].length;break}default:t[n]+=d(r)}}while(r=L());return t},getRules=function(t,e){return U(toRules(T(t),e))},fixedElements=new WeakMap,compat=function(t){if("rule"===t.type&&t.parent&&t.length){for(var e=t.value,n=t.parent,r=t.column===n.column&&t.line===n.line;"rule"!==n.type;)if(!(n=n.parent))return;if((1!==t.props.length||58===e.charCodeAt(0)||fixedElements.get(n))&&!r){fixedElements.set(t,!0);for(var o=[],i=getRules(e,o),a=n.props,s=0,c=0;s<i.length;s++)for(var u=0;u<a.length;u++,c++)t.props[c]=o[s]?i[s].replace(/&\f/g,a[u]):a[u]+" "+i[s]}}},removeLabel=function(t){if("decl"===t.type){var e=t.value;108===e.charCodeAt(0)&&98===e.charCodeAt(2)&&(t.return="",t.value="")}},isBrowser="undefined"!=typeof document,getServerStylisCache=isBrowser?void 0:weakMemoize((function(){return memoize((function(){var t={};return function(e){return t[e]}}))})),defaultStylisPlugins=[ve],createCache=function(t){var e=t.key;if(isBrowser&&"css"===e){var n=document.querySelectorAll("style[data-emotion]:not([data-s])");Array.prototype.forEach.call(n,(function(t){document.head.appendChild(t),t.setAttribute("data-s","")}))}var r,o,i=t.stylisPlugins||defaultStylisPlugins,a={},s=[];isBrowser&&(r=t.container||document.head,Array.prototype.forEach.call(document.querySelectorAll("style[data-emotion]"),(function(t){var n=t.getAttribute("data-emotion").split(" ");if(n[0]===e){for(var r=1;r<n.length;r++)a[n[r]]=!0;s.push(t)}})));var c=[compat,removeLabel];if(isBrowser){var u,l=[fe,le((function(t){u.insert(t)}))],p=oe(c.concat(i,l));o=function(t,e,n,r){u=n,ie(ae(t?t+"{"+e.styles+"}":e.styles),p),r&&(y.inserted[e.name]=!0)}}else{var f=[fe],h=oe(c.concat(i,f)),d=getServerStylisCache(i)(e),m=function(t,e){var n=e.name;return void 0===d[n]&&(d[n]=ie(ae(t?t+"{"+e.styles+"}":e.styles),h)),d[n]};o=function(t,e,n,r){var o=e.name,i=m(t,e);return void 0===y.compat?(r&&(y.inserted[o]=!0),i):r?void(y.inserted[o]=i):i}}var y={key:e,sheet:new StyleSheet({key:e,container:r,nonce:t.nonce,speedy:t.speedy,prepend:t.prepend}),nonce:t.nonce,inserted:a,registered:{},insert:o};return y.sheet.hydrate(s),y};function murmur2(t){for(var e,n=0,r=0,o=t.length;o>=4;++r,o-=4)e=1540483477*(65535&(e=255&t.charCodeAt(r)|(255&t.charCodeAt(++r))<<8|(255&t.charCodeAt(++r))<<16|(255&t.charCodeAt(++r))<<24))+(59797*(e>>>16)<<16),n=1540483477*(65535&(e^=e>>>24))+(59797*(e>>>16)<<16)^1540483477*(65535&n)+(59797*(n>>>16)<<16);switch(o){case 3:n^=(255&t.charCodeAt(r+2))<<16;case 2:n^=(255&t.charCodeAt(r+1))<<8;case 1:n=1540483477*(65535&(n^=255&t.charCodeAt(r)))+(59797*(n>>>16)<<16)}return(((n=1540483477*(65535&(n^=n>>>13))+(59797*(n>>>16)<<16))^n>>>15)>>>0).toString(36)}var unitlessKeys={animationIterationCount:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1},hyphenateRegex=/[A-Z]|^ms/g,animationRegex=/_EMO_([^_]+?)_([^]*?)_EMO_/g,isCustomProperty=function(t){return 45===t.charCodeAt(1)},isProcessableValue=function(t){return null!=t&&"boolean"!=typeof t},processStyleName=memoize((function(t){return isCustomProperty(t)?t:t.replace(hyphenateRegex,"-$&").toLowerCase()})),processStyleValue=function(t,e){switch(t){case"animation":case"animationName":if("string"==typeof e)return e.replace(animationRegex,(function(t,e,n){return cursor={name:e,styles:n,next:cursor},e}))}return 1===unitlessKeys[t]||isCustomProperty(t)||"number"!=typeof e||0===e?e:e+"px"};function handleInterpolation(t,e,n){if(null==n)return"";if(void 0!==n.__emotion_styles)return n;switch(typeof n){case"boolean":return"";case"object":if(1===n.anim)return cursor={name:n.name,styles:n.styles,next:cursor},n.name;if(void 0!==n.styles){var r=n.next;if(void 0!==r)for(;void 0!==r;)cursor={name:r.name,styles:r.styles,next:cursor},r=r.next;return n.styles+";"}return createStringFromObject(t,e,n);case"function":if(void 0!==t){var o=cursor,i=n(t);return cursor=o,handleInterpolation(t,e,i)}}if(null==e)return n;var a=e[n];return void 0!==a?a:n}function createStringFromObject(t,e,n){var r="";if(Array.isArray(n))for(var o=0;o<n.length;o++)r+=handleInterpolation(t,e,n[o])+";";else for(var i in n){var a=n[i];if("object"!=typeof a)null!=e&&void 0!==e[a]?r+=i+"{"+e[a]+"}":isProcessableValue(a)&&(r+=processStyleName(i)+":"+processStyleValue(i,a)+";");else if(!Array.isArray(a)||"string"!=typeof a[0]||null!=e&&void 0!==e[a[0]]){var s=handleInterpolation(t,e,a);switch(i){case"animation":case"animationName":r+=processStyleName(i)+":"+s+";";break;default:r+=i+"{"+s+"}"}}else for(var c=0;c<a.length;c++)isProcessableValue(a[c])&&(r+=processStyleName(i)+":"+processStyleValue(i,a[c])+";")}return r}var labelPattern=/label:\s*([^\s;\n{]+)\s*(;|$)/g,cursor,serializeStyles=function(t,e,n){if(1===t.length&&"object"==typeof t[0]&&null!==t[0]&&void 0!==t[0].styles)return t[0];var r=!0,o="";cursor=void 0;var i=t[0];null==i||void 0===i.raw?(r=!1,o+=handleInterpolation(n,e,i)):o+=i[0];for(var a=1;a<t.length;a++)o+=handleInterpolation(n,e,t[a]),r&&(o+=i[a]);labelPattern.lastIndex=0;for(var s,c="";null!==(s=labelPattern.exec(o));)c+="-"+s[1];return{name:murmur2(o)+c,styles:o,next:cursor}},isBrowser$1="undefined"!=typeof document;function getRegisteredStyles(t,e,n){var r="";return n.split(" ").forEach((function(n){void 0!==t[n]?e.push(t[n]+";"):r+=n+" "})),r}var insertStyles=function(t,e,n){var r=t.key+"-"+e.name;if((!1===n||!1===isBrowser$1&&void 0!==t.compat)&&void 0===t.registered[r]&&(t.registered[r]=e.styles),void 0===t.inserted[e.name]){var o="",i=e;do{var a=t.insert(e===i?"."+r:"",i,t.sheet,!0);isBrowser$1||void 0===a||(o+=a),i=i.next}while(void 0!==i);if(!isBrowser$1&&0!==o.length)return o}};function insertWithoutScoping(t,e){if(void 0===t.inserted[e.name])return t.insert("",e,t.sheet,!0)}function merge(t,e,n){var r=[],o=getRegisteredStyles(t,r,n);return r.length<2?n:o+e(r)}var createEmotion=function(t){var e=createCache(t);e.sheet.speedy=function(t){this.isSpeedy=t},e.compat=!0;var n=function(){for(var t=arguments.length,n=new Array(t),r=0;r<t;r++)n[r]=arguments[r];var o=serializeStyles(n,e.registered,void 0);return insertStyles(e,o,!1),e.key+"-"+o.name};return{css:n,cx:function(){for(var t=arguments.length,r=new Array(t),o=0;o<t;o++)r[o]=arguments[o];return merge(e.registered,n,classnames(r))},injectGlobal:function(){for(var t=arguments.length,n=new Array(t),r=0;r<t;r++)n[r]=arguments[r];var o=serializeStyles(n,e.registered);insertWithoutScoping(e,o)},keyframes:function(){for(var t=arguments.length,n=new Array(t),r=0;r<t;r++)n[r]=arguments[r];var o=serializeStyles(n,e.registered),i="animation-"+o.name;return insertWithoutScoping(e,{name:o.name,styles:"@keyframes "+i+"{"+o.styles+"}"}),i},hydrate:function(t){t.forEach((function(t){e.inserted[t]=!0}))},flush:function(){e.registered={},e.inserted={},e.sheet.flush()},sheet:e.sheet,cache:e,getRegisteredStyles:getRegisteredStyles.bind(null,e.registered),merge:merge.bind(null,e.registered,n)}},classnames=function t(e){for(var n="",r=0;r<e.length;r++){var o=e[r];if(null!=o){var i=void 0;switch(typeof o){case"boolean":break;case"object":if(Array.isArray(o))i=t(o);else for(var a in i="",o)o[a]&&a&&(i&&(i+=" "),i+=a);break;default:i=o}i&&(n&&(n+=" "),n+=i)}}return n};function _await(t,e,n){return n?e?e(t):t:(t&&t.then||(t=Promise.resolve(t)),e?t.then(e):t)}function _async(t){return function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];try{return Promise.resolve(t.apply(this,e))}catch(t){return Promise.reject(t)}}}function _empty(){}function _invokeIgnored(t){var e=t();if(e&&e.then)return e.then(_empty)}function get_each_context$1(t,e,n){var r=t.slice();return r[36]=e[n],r}function get_each_context_2(t,e,n){var r=t.slice();return r[36]=e[n],r[43]=n,r}function get_each_context_1(t,e,n){var r=t.slice();return r[39]=e[n],r}function create_if_block_7(t){var e,n,r,o;e=new BlocksRegion({props:{name:"dw-chart-header",blocks:t[5].header,id:"header"}});var i=!t[3]&&create_if_block_8(t);return{c:function(){create_component(e.$$.fragment),n=space(),i&&i.c(),r=empty()},m:function(t,a){mount_component(e,t,a),insert(t,n,a),i&&i.m(t,a),insert(t,r,a),o=!0},p:function(t,n){var o={};32&n[0]&&(o.blocks=t[5].header),e.$set(o),t[3]?i&&(group_outros(),transition_out(i,1,1,(function(){i=null})),check_outros()):i?(i.p(t,n),8&n[0]&&transition_in(i,1)):((i=create_if_block_8(t)).c(),transition_in(i,1),i.m(r.parentNode,r))},i:function(t){o||(transition_in(e.$$.fragment,t),transition_in(i),o=!0)},o:function(t){transition_out(e.$$.fragment,t),transition_out(i),o=!1},d:function(t){destroy_component(e,t),t&&detach(n),i&&i.d(t),t&&detach(r)}}}function create_if_block_8(t){var e,n;return e=new Menu({props:{name:"dw-chart-menu",props:t[6],blocks:t[5].menu}}),{c:function(){create_component(e.$$.fragment)},m:function(t,r){mount_component(e,t,r),n=!0},p:function(t,n){var r={};64&n[0]&&(r.props=t[6]),32&n[0]&&(r.blocks=t[5].menu),e.$set(r)},i:function(t){n||(transition_in(e.$$.fragment,t),n=!0)},o:function(t){transition_out(e.$$.fragment,t),n=!1},d:function(t){destroy_component(e,t)}}}function create_if_block_6(t){var e;return{c:function(){attr(e=element("div"),"class","sr-only")},m:function(n,r){insert(n,e,r),e.innerHTML=t[8]},p:function(t,n){256&n[0]&&(e.innerHTML=t[8])},d:function(t){t&&detach(e)}}}function create_if_block_5(t){var e,n=t[0].data.template.afterChart+"";return{c:function(){e=new HtmlTag(null)},m:function(t,r){e.m(n,t,r)},p:function(t,r){1&r[0]&&n!==(n=t[0].data.template.afterChart+"")&&e.p(n)},d:function(t){t&&e.d()}}}function create_if_block_1$6(t){var e,n,r,o,i,a;e=new BlocksRegion({props:{name:"dw-above-footer",blocks:t[5].aboveFooter}});for(var s=["Left","Center","Right"],c=[],u=0;u<3;u+=1)c[u]=create_each_block_1(get_each_context_1(t,s,u));var l=function(t){return transition_out(c[t],1,1,(function(){c[t]=null}))};return i=new BlocksRegion({props:{name:"dw-below-footer",blocks:t[5].belowFooter}}),{c:function(){create_component(e.$$.fragment),n=space(),r=element("div");for(var t=0;t<3;t+=1)c[t].c();o=space(),create_component(i.$$.fragment),attr(r,"id","footer"),attr(r,"class","dw-chart-footer")},m:function(t,s){mount_component(e,t,s),insert(t,n,s),insert(t,r,s);for(var u=0;u<3;u+=1)c[u].m(r,null);insert(t,o,s),mount_component(i,t,s),a=!0},p:function(t,n){var o={};if(32&n[0]&&(o.blocks=t[5].aboveFooter),e.$set(o),32&n[0]){var a;for(s=["Left","Center","Right"],a=0;a<3;a+=1){var u=get_each_context_1(t,s,a);c[a]?(c[a].p(u,n),transition_in(c[a],1)):(c[a]=create_each_block_1(u),c[a].c(),transition_in(c[a],1),c[a].m(r,null))}for(group_outros(),a=3;a<3;a+=1)l(a);check_outros()}var p={};32&n[0]&&(p.blocks=t[5].belowFooter),i.$set(p)},i:function(t){if(!a){transition_in(e.$$.fragment,t);for(var n=0;n<3;n+=1)transition_in(c[n]);transition_in(i.$$.fragment,t),a=!0}},o:function(t){transition_out(e.$$.fragment,t),c=c.filter(Boolean);for(var n=0;n<3;n+=1)transition_out(c[n]);transition_out(i.$$.fragment,t),a=!1},d:function(t){destroy_component(e,t),t&&detach(n),t&&detach(r),destroy_each(c,t),t&&detach(o),destroy_component(i,t)}}}function create_if_block_4(t){var e,n;return{c:function(){attr(e=element("span"),"class",n="separator separator-before-"+t[36].id)},m:function(t,n){insert(t,e,n)},p:function(t,r){32&r[0]&&n!==(n="separator separator-before-"+t[36].id)&&attr(e,"class",n)},d:function(t){t&&detach(e)}}}function create_if_block_3(t){var e,n=clean(t[36].prepend)+"";return{c:function(){attr(e=element("span"),"class","prepend")},m:function(t,r){insert(t,e,r),e.innerHTML=n},p:function(t,r){32&r[0]&&n!==(n=clean(t[36].prepend)+"")&&(e.innerHTML=n)},d:function(t){t&&detach(e)}}}function create_if_block_2$1(t){var e,n=clean(t[36].append)+"";return{c:function(){attr(e=element("span"),"class","append")},m:function(t,r){insert(t,e,r),e.innerHTML=n},p:function(t,r){32&r[0]&&n!==(n=clean(t[36].append)+"")&&(e.innerHTML=n)},d:function(t){t&&detach(e)}}}function create_each_block_2(t){var e,n,r,o,i,a,s,c,u=t[43]&&create_if_block_4(t),l=t[36].prepend&&create_if_block_3(t),p=t[36].component;function f(t){return{props:{props:t[36].props}}}p&&(i=new p(f(t)));var h=t[36].append&&create_if_block_2$1(t);return{c:function(){u&&u.c(),e=space(),n=element("span"),l&&l.c(),r=space(),o=element("span"),i&&create_component(i.$$.fragment),a=space(),h&&h.c(),attr(o,"class","block-inner"),attr(n,"class",s="footer-block "+t[36].id+"-block")},m:function(t,s){u&&u.m(t,s),insert(t,e,s),insert(t,n,s),l&&l.m(n,null),append(n,r),append(n,o),i&&mount_component(i,o,null),append(n,a),h&&h.m(n,null),c=!0},p:function(t,e){t[43]&&u.p(t,e),t[36].prepend?l?l.p(t,e):((l=create_if_block_3(t)).c(),l.m(n,r)):l&&(l.d(1),l=null);var a={};if(32&e[0]&&(a.props=t[36].props),p!==(p=t[36].component)){if(i){group_outros();var d=i;transition_out(d.$$.fragment,1,0,(function(){destroy_component(d,1)})),check_outros()}p?(create_component((i=new p(f(t))).$$.fragment),transition_in(i.$$.fragment,1),mount_component(i,o,null)):i=null}else p&&i.$set(a);t[36].append?h?h.p(t,e):((h=create_if_block_2$1(t)).c(),h.m(n,null)):h&&(h.d(1),h=null),(!c||32&e[0]&&s!==(s="footer-block "+t[36].id+"-block"))&&attr(n,"class",s)},i:function(t){c||(i&&transition_in(i.$$.fragment,t),c=!0)},o:function(t){i&&transition_out(i.$$.fragment,t),c=!1},d:function(t){u&&u.d(t),t&&detach(e),t&&detach(n),l&&l.d(),i&&destroy_component(i),h&&h.d()}}}function create_each_block_1(t){for(var e,n,r,o=t[5]["footer"+t[39]],i=[],a=0;a<o.length;a+=1)i[a]=create_each_block_2(get_each_context_2(t,o,a));var s=function(t){return transition_out(i[t],1,1,(function(){i[t]=null}))};return{c:function(){e=element("div");for(var r=0;r<i.length;r+=1)i[r].c();n=space(),attr(e,"class","footer-"+t[39].toLowerCase())},m:function(t,o){insert(t,e,o);for(var a=0;a<i.length;a+=1)i[a].m(e,null);append(e,n),r=!0},p:function(t,r){if(32&r[0]){var a;for(o=t[5]["footer"+t[39]],a=0;a<o.length;a+=1){var c=get_each_context_2(t,o,a);i[a]?(i[a].p(c,r),transition_in(i[a],1)):(i[a]=create_each_block_2(c),i[a].c(),transition_in(i[a],1),i[a].m(e,n))}for(group_outros(),a=o.length;a<i.length;a+=1)s(a);check_outros()}},i:function(t){if(!r){for(var e=0;e<o.length;e+=1)transition_in(i[e]);r=!0}},o:function(t){i=i.filter(Boolean);for(var e=0;e<i.length;e+=1)transition_out(i[e]);r=!1},d:function(t){t&&detach(e),destroy_each(i,t)}}}function create_each_block$1(t){var e,n,r,o=t[36].component;function i(t){return{props:{props:t[36].props}}}return o&&(e=new o(i(t))),{c:function(){e&&create_component(e.$$.fragment),n=empty()},m:function(t,o){e&&mount_component(e,t,o),insert(t,n,o),r=!0},p:function(t,r){var a={};if(32&r[0]&&(a.props=t[36].props),o!==(o=t[36].component)){if(e){group_outros();var s=e;transition_out(s.$$.fragment,1,0,(function(){destroy_component(s,1)})),check_outros()}o?(create_component((e=new o(i(t))).$$.fragment),transition_in(e.$$.fragment,1),mount_component(e,n.parentNode,n)):e=null}else o&&e.$set(a)},i:function(t){r||(e&&transition_in(e.$$.fragment,t),r=!0)},o:function(t){e&&transition_out(e.$$.fragment,t),r=!1},d:function(t){t&&detach(n),e&&destroy_component(e,t)}}}function create_if_block$9(t){var e;return{c:function(){e=new HtmlTag(null)},m:function(n,r){e.m(t[1],n,r)},p:function(t,n){2&n[0]&&e.p(t[1])},d:function(t){t&&e.d()}}}function create_fragment$g(t){for(var e,n,r,o,i,a,s,c,u,l,p,f=get(t[0],"data.template.afterChart"),h=!t[2]&&create_if_block_7(t),d=t[8]&&create_if_block_6(t),m=f&&create_if_block_5(t),y=!t[2]&&create_if_block_1$6(t),v=t[5].afterBody,g=[],_=0;_<v.length;_+=1)g[_]=create_each_block$1(get_each_context$1(t,v,_));var b=function(t){return transition_out(g[t],1,1,(function(){g[t]=null}))},$=t[1]&&create_if_block$9(t);return{c:function(){h&&h.c(),e=space(),d&&d.c(),n=space(),r=element("div"),i=space(),m&&m.c(),a=space(),y&&y.c(),s=space(),c=element("div");for(var p=0;p<g.length;p+=1)g[p].c();u=space(),$&&$.c(),l=empty(),attr(r,"id","chart"),attr(r,"aria-hidden",o=!!t[8]),attr(r,"class","dw-chart-body"),toggle_class(r,"content-below-chart",t[7]),attr(c,"class","dw-after-body")},m:function(o,f){h&&h.m(o,f),insert(o,e,f),d&&d.m(o,f),insert(o,n,f),insert(o,r,f),t[21](r),insert(o,i,f),m&&m.m(o,f),insert(o,a,f),y&&y.m(o,f),insert(o,s,f),insert(o,c,f);for(var v=0;v<g.length;v+=1)g[v].m(c,null);insert(o,u,f),$&&$.m(o,f),insert(o,l,f),p=!0},p:function(t,i){if(t[2]?h&&(group_outros(),transition_out(h,1,1,(function(){h=null})),check_outros()):h?(h.p(t,i),4&i[0]&&transition_in(h,1)):((h=create_if_block_7(t)).c(),transition_in(h,1),h.m(e.parentNode,e)),t[8]?d?d.p(t,i):((d=create_if_block_6(t)).c(),d.m(n.parentNode,n)):d&&(d.d(1),d=null),(!p||256&i[0]&&o!==(o=!!t[8]))&&attr(r,"aria-hidden",o),128&i[0]&&toggle_class(r,"content-below-chart",t[7]),1&i[0]&&(f=get(t[0],"data.template.afterChart")),f?m?m.p(t,i):((m=create_if_block_5(t)).c(),m.m(a.parentNode,a)):m&&(m.d(1),m=null),t[2]?y&&(group_outros(),transition_out(y,1,1,(function(){y=null})),check_outros()):y?(y.p(t,i),4&i[0]&&transition_in(y,1)):((y=create_if_block_1$6(t)).c(),transition_in(y,1),y.m(s.parentNode,s)),32&i[0]){var u;for(v=t[5].afterBody,u=0;u<v.length;u+=1){var _=get_each_context$1(t,v,u);g[u]?(g[u].p(_,i),transition_in(g[u],1)):(g[u]=create_each_block$1(_),g[u].c(),transition_in(g[u],1),g[u].m(c,null))}for(group_outros(),u=v.length;u<g.length;u+=1)b(u);check_outros()}t[1]?$?$.p(t,i):(($=create_if_block$9(t)).c(),$.m(l.parentNode,l)):$&&($.d(1),$=null)},i:function(t){if(!p){transition_in(h),transition_in(y);for(var e=0;e<v.length;e+=1)transition_in(g[e]);p=!0}},o:function(t){transition_out(h),transition_out(y),g=g.filter(Boolean);for(var e=0;e<g.length;e+=1)transition_out(g[e]);p=!1},d:function(o){h&&h.d(o),o&&detach(e),d&&d.d(o),o&&detach(n),o&&detach(r),t[21](null),o&&detach(i),m&&m.d(o),o&&detach(a),y&&y.d(o),o&&detach(s),o&&detach(c),destroy_each(g,o),o&&detach(u),$&&$.d(o),o&&detach(l)}}}function byPriority(t,e){return(void 0!==t.priority?t.priority:999)-(void 0!==e.priority?e.priority:999)}function getCaption(t){return"d3-maps-choropleth"===t||"d3-maps-symbols"===t||"locator-map"===t?"map":"tables"===t?"table":"chart"}function instance$g($$self,$$props,$$invalidate){var run=_async((function(){if("undefined"!=typeof dw){for(var id in dw.theme.register(theme.id,theme.data),Object.keys(locales).forEach((function(vendor){$$invalidate(9,locales[vendor]=eval(locales[vendor]),locales)})),$$invalidate(22,dwChart=dw.chart(chart).locale((chart.language||"en-US").substr(0,2)).translations(translations).theme(dw.theme(chart.theme))),assets)dwChart.asset(id,assets[id]);return $$invalidate(23,vis=dw.visualization(visualization.id,target)),$$invalidate(23,vis.meta=visualization,vis),$$invalidate(23,vis.lang=chart.language||"en-US",vis),_await(dwChart.load(data||"",isPreview?void 0:chart.externalData),(function(){$$invalidate(22,dwChart.locales=locales,dwChart),dwChart.vis(vis),loadBlocks(blocks),dwChart.emotion||$$invalidate(22,dwChart.emotion=createEmotion({key:"datawrapper-".concat(chart.id),container:isIframe?document.head:styleHolder}),dwChart),dwChart.render(isIframe,isPreview),observeFonts(fonts,theme.data.typography).then((function(){return dwChart.render(isIframe,isPreview)})).catch((function(){return dwChart.render(isIframe,isPreview)})),/iP(hone|od|ad)/.test(navigator.platform)&&(window.onload=dwChart.render(isIframe,isPreview))}))}})),loadBlocks=_async((function(t){return _invokeIgnored((function(){if(t.length){function e(t){return origin&&0!==t.indexOf("http")?"".concat(origin,"/").concat(t):t}return _await(Promise.all(t.map((function(t){return new Promise((function(n,r){var o=[loadScript(e(t.source.js))];t.source.css&&o.push(loadStylesheet({src:e(t.source.css),parentElement:styleHolder})),Promise.all(o).then(n).catch((function(t){var e=t.target?t.target.getAttribute("src")||t.target.getAttribute("href"):null;e?console.warn("could not load ",e):console.error("Unknown error",t),n()}))}))}))),(function(){t.forEach((function(t){t.blocks.forEach((function(t){if(!dw.block.has(t.component))return console.warn("component ".concat(t.component," from chart block ").concat(t.id," not found"));pluginBlocks.push(_objectSpread2(_objectSpread2({},t),{},{component:dw.block(t.component)}))}))})),$$invalidate(24,pluginBlocks)}))}}))})),_$$props$data=$$props.data,data=void 0===_$$props$data?"":_$$props$data,chart=$$props.chart,_$$props$visualizatio=$$props.visualization,visualization=void 0===_$$props$visualizatio?{}:_$$props$visualizatio,_$$props$theme=$$props.theme,theme=void 0===_$$props$theme?{}:_$$props$theme,_$$props$locales=$$props.locales,locales=void 0===_$$props$locales?{}:_$$props$locales,translations=$$props.translations,_$$props$blocks=$$props.blocks,blocks=void 0===_$$props$blocks?{}:_$$props$blocks,_$$props$chartAfterBo=$$props.chartAfterBodyHTML,chartAfterBodyHTML=void 0===_$$props$chartAfterBo?"":_$$props$chartAfterBo,isIframe=$$props.isIframe,isPreview=$$props.isPreview,assets=$$props.assets,_$$props$fonts=$$props.fonts,fonts=void 0===_$$props$fonts?{}:_$$props$fonts,styleHolder=$$props.styleHolder,origin=$$props.origin,_$$props$isStylePlain=$$props.isStylePlain,isStylePlain=void 0!==_$$props$isStylePlain&&_$$props$isStylePlain,_$$props$isStyleStati=$$props.isStyleStatic,isStyleStatic=void 0!==_$$props$isStyleStati&&_$$props$isStyleStati,target,dwChart,vis,coreBlocks=[{id:"headline",tag:"h1",region:"header",priority:10,test:function(t){var e=t.chart;return e.title&&!get(e,"metadata.describe.hide-title")},component:Headline},{id:"description",tag:"p",region:"header",priority:20,test:function(t){return get(t.chart,"metadata.describe.intro")},component:Description},{id:"notes",region:"aboveFooter",priority:10,test:function(t){return get(t.chart,"metadata.annotate.notes")},component:Notes},{id:"byline",region:"footerLeft",test:function(t){var e=t.chart;return get(e,"metadata.describe.byline",!1)||e.basedOnByline},priority:10,component:Byline},{id:"source",region:"footerLeft",test:function(t){return get(t.chart,"metadata.describe.source-name")},priority:20,component:Source},{id:"get-the-data",region:"footerLeft",test:function(t){var e=t.theme,n=t.isStyleStatic;return get(e,"data.options.footer.getTheData.enabled")&&!n},priority:30,component:GetTheData},{id:"embed",region:"footerLeft",test:function(t){var e=t.theme,n=t.isStyleStatic;return get(e,"data.options.footer.embed.enabled")&&!n},priority:40,component:Embed},{id:"logo",region:"footerRight",test:function(t){return get(t.theme,"data.options.footer.logo.enabled")},priority:10,component:Logo},{id:"rectangle",region:"header",test:function(t){return!!get(t.theme,"data.options.blocks.rectangle")},priority:1,component:Rectangle},{id:"watermark",region:"afterBody",test:function(t){var e=t.theme,n=get(e,"data.options.watermark.custom-field");return!!get(e,"data.options.watermark")&&(n?get(chart,"metadata.custom.".concat(n),""):get(e,"data.options.watermark.text","CONFIDENTIAL"))},priority:1,component:Watermark},hr(0,"hr"),hr(1,"hr"),hr(2,"hr"),hr(0,"svg-rule"),hr(1,"svg-rule"),hr(2,"svg-rule")];function hr(t,e){var n="".concat(e).concat(t||"");return{id:n,region:"header",test:function(t){return!!get(t.theme,"data.options.blocks.".concat(n))},priority:0,component:"hr"===e?HorizontalRule:SvgRule}}var pluginBlocks=[],regions,menu;function getBlocks(t,e,n){return t.filter((function(t){return t.region===e})).filter((function(t){return!t.test||t.test(_objectSpread2(_objectSpread2({},t.props),n))})).filter((function(t){return void 0===t.visible||t.visible})).sort(byPriority)}function applyThemeBlockConfig(t,e,n){return t.map((function(t){t.props=_objectSpread2(_objectSpread2(_objectSpread2({},t.data||{}),n),{},{id:t.id}),t.component.test&&(t.test=t.component.test);var r=get(e,"data.options.blocks",{})[t.id];return r?_objectSpread2(_objectSpread2({},t),r):t}))}var caption=getCaption(visualization.id),contentBelowChart,ariaDescription,customCSS,allBlocks,blockProps;function __(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];"string"!=typeof t&&(t="",console.error(new TypeError("function __ called without required 'key' parameter!\nPlease make sure you called __(key) with a key of type \"string\".\n"))),t=t.trim();var o=locales[t]||t;return n.length&&(o=o.replace(/\$(\d)/g,(function(t,e){return n[e=+e]||t}))),o}function div0_binding(t){binding_callbacks[t?"unshift":"push"]((function(){$$invalidate(4,target=t)}))}return onMount(_async((function(){if(run(),isIframe){document.body.classList.toggle("plain",isStylePlain),document.body.classList.toggle("static",isStyleStatic),document.body.classList.toggle("png-export",isStyleStatic),isStyleStatic&&(document.body.style["pointer-events"]="none"),domReady((function(){var t=postEvent(chart.id);window.addEventListener("hashchange",(function(){t("hash.change",{hash:window.location.hash})}))}));var t=document.body.offsetHeight;afterUpdate((function(){var e=document.body.offsetHeight;t!==e&&"function"==typeof render&&(render(),t=e)})),isIframe&&(window.__dw=window.__dw||{},window.__dw.params={data:data},window.__dw.vis=vis,window.__dw.render=function(){dwChart.render(isIframe,isPreview)})}return _await()}))),$$self.$set=function(t){"data"in t&&$$invalidate(10,data=t.data),"chart"in t&&$$invalidate(11,chart=t.chart),"visualization"in t&&$$invalidate(12,visualization=t.visualization),"theme"in t&&$$invalidate(0,theme=t.theme),"locales"in t&&$$invalidate(9,locales=t.locales),"translations"in t&&$$invalidate(13,translations=t.translations),"blocks"in t&&$$invalidate(14,blocks=t.blocks),"chartAfterBodyHTML"in t&&$$invalidate(1,chartAfterBodyHTML=t.chartAfterBodyHTML),"isIframe"in t&&$$invalidate(15,isIframe=t.isIframe),"isPreview"in t&&$$invalidate(16,isPreview=t.isPreview),"assets"in t&&$$invalidate(17,assets=t.assets),"fonts"in t&&$$invalidate(18,fonts=t.fonts),"styleHolder"in t&&$$invalidate(19,styleHolder=t.styleHolder),"origin"in t&&$$invalidate(20,origin=t.origin),"isStylePlain"in t&&$$invalidate(2,isStylePlain=t.isStylePlain),"isStyleStatic"in t&&$$invalidate(3,isStyleStatic=t.isStyleStatic)},$$self.$$.update=function(){2048&$$self.$$.dirty[0]&&$$invalidate(8,ariaDescription=purifyHTML(get(chart,"metadata.describe.aria-description",""),"<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>")),2048&$$self.$$.dirty[0]&&(customCSS=purifyHTML(get(chart,"metadata.publish.custom-css",""),"")),12585985&$$self.$$.dirty[0]&&$$invalidate(27,blockProps={__:__,purifyHtml:clean,get:get,theme:theme,data:data,chart:chart,dwChart:dwChart,vis:vis,caption:caption}),150994945&$$self.$$.dirty[0]&&$$invalidate(26,allBlocks=applyThemeBlockConfig([].concat(coreBlocks,pluginBlocks),theme,blockProps)),67111945&$$self.$$.dirty[0]&&$$invalidate(5,regions={header:getBlocks(allBlocks,"header",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),aboveFooter:getBlocks(allBlocks,"aboveFooter",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),footerLeft:getBlocks(allBlocks,"footerLeft",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),footerCenter:getBlocks(allBlocks,"footerCenter",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),footerRight:getBlocks(allBlocks,"footerRight",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),belowFooter:getBlocks(allBlocks,"belowFooter",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),afterBody:getBlocks(allBlocks,"afterBody",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic}),menu:getBlocks(allBlocks,"menu",{chart:chart,data:data,theme:theme,isStyleStatic:isStyleStatic})}),1&$$self.$$.dirty[0]&&$$invalidate(6,menu=get(theme,"data.options.menu",{})),32&$$self.$$.dirty[0]&&$$invalidate(7,contentBelowChart=regions.aboveFooter.length||regions.footerLeft.length||regions.footerCenter.length||regions.footerRight.length||regions.belowFooter.length||regions.afterBody.length)},[theme,chartAfterBodyHTML,isStylePlain,isStyleStatic,target,regions,menu,contentBelowChart,ariaDescription,locales,data,chart,visualization,translations,blocks,isIframe,isPreview,assets,fonts,styleHolder,origin,div0_binding]}var Visualization=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),t,instance$g,create_fragment$g,safe_not_equal,{data:10,chart:11,visualization:12,theme:0,locales:9,translations:13,blocks:14,chartAfterBodyHTML:1,isIframe:15,isPreview:16,assets:17,fonts:18,styleHolder:19,origin:20,isStylePlain:2,isStyleStatic:3},[-1,-1]),r}return n}(SvelteComponent);function create_if_block$a(t){var e,n,r;return n=new Visualization({props:{data:t[0],chart:t[1],visualization:t[2],theme:t[3],locales:t[4],translations:t[5],blocks:t[6],chartAfterBodyHTML:t[7],isIframe:!1,isPreview:t[8],assets:t[9],origin:t[10],fonts:t[11],styleHolder:t[15],isStylePlain:t[12],isStyleStatic:t[13]}}),{c:function(){e=element("div"),create_component(n.$$.fragment),attr(e,"class","chart dw-chart")},m:function(t,o){insert(t,e,o),mount_component(n,e,null),r=!0},p:function(t,e){var r={};1&e&&(r.data=t[0]),2&e&&(r.chart=t[1]),4&e&&(r.visualization=t[2]),8&e&&(r.theme=t[3]),16&e&&(r.locales=t[4]),32&e&&(r.translations=t[5]),64&e&&(r.blocks=t[6]),128&e&&(r.chartAfterBodyHTML=t[7]),256&e&&(r.isPreview=t[8]),512&e&&(r.assets=t[9]),1024&e&&(r.origin=t[10]),2048&e&&(r.fonts=t[11]),32768&e&&(r.styleHolder=t[15]),4096&e&&(r.isStylePlain=t[12]),8192&e&&(r.isStyleStatic=t[13]),n.$set(r)},i:function(t){r||(transition_in(n.$$.fragment,t),r=!0)},o:function(t){transition_out(n.$$.fragment,t),r=!1},d:function(t){t&&detach(e),destroy_component(n)}}}function create_fragment$h(t){var e,n,r,o,i=t[14]&&create_if_block$a(t);return{c:function(){e=element("div"),n=space(),i&&i.c(),r=empty(),this.c=noop},m:function(a,s){insert(a,e,s),t[17](e),insert(a,n,s),i&&i.m(a,s),insert(a,r,s),o=!0},p:function(t,e){var n=_slicedToArray(e,1)[0];t[14]?i?(i.p(t,n),16384&n&&transition_in(i,1)):((i=create_if_block$a(t)).c(),transition_in(i,1),i.m(r.parentNode,r)):i&&(group_outros(),transition_out(i,1,1,(function(){i=null})),check_outros())},i:function(t){o||(transition_in(i),o=!0)},o:function(t){transition_out(i),o=!1},d:function(o){o&&detach(e),t[17](null),o&&detach(n),i&&i.d(o),o&&detach(r)}}}function instance$h(t,e,n){var r,o=e.data,i=void 0===o?"":o,a=e.chart,s=void 0===a?{}:a,c=e.visualization,u=void 0===c?{}:c,l=e.theme,p=void 0===l?{}:l,f=e.locales,h=void 0===f?{}:f,d=e.translations,m=e.blocks,y=void 0===m?{}:m,v=e.chartAfterBodyHTML,g=void 0===v?"":v,_=e.isPreview,b=e.assets,$=e.styles,k=e.origin,w=e.fonts,x=void 0===w?{}:w,E=e.isStylePlain,S=void 0!==E&&E,T=e.isStyleStatic,A=void 0!==T&&T,M=!1;return t.$set=function(t){"data"in t&&n(0,i=t.data),"chart"in t&&n(1,s=t.chart),"visualization"in t&&n(2,u=t.visualization),"theme"in t&&n(3,p=t.theme),"locales"in t&&n(4,h=t.locales),"translations"in t&&n(5,d=t.translations),"blocks"in t&&n(6,y=t.blocks),"chartAfterBodyHTML"in t&&n(7,g=t.chartAfterBodyHTML),"isPreview"in t&&n(8,_=t.isPreview),"assets"in t&&n(9,b=t.assets),"styles"in t&&n(16,$=t.styles),"origin"in t&&n(10,k=t.origin),"fonts"in t&&n(11,x=t.fonts),"isStylePlain"in t&&n(12,S=t.isStylePlain),"isStyleStatic"in t&&n(13,A=t.isStyleStatic)},t.$$.update=function(){if(114688&t.$$.dirty&&!M&&r&&$){var e=document.createElement("style");e.type="text/css",e.innerHTML=$.css,r.appendChild(e),n(14,M=!0)}},[i,s,u,p,h,d,y,g,_,b,k,x,S,A,M,r,$,function(t){binding_callbacks[t?"unshift":"push"]((function(){n(15,r=t)}))}]}var VisualizationWebComponent_wc=function(t){_inherits(n,t);var e=_createSuper(n);function n(t){var r;return _classCallCheck(this,n),init(_assertThisInitialized(r=e.call(this)),{target:r.shadowRoot},instance$h,create_fragment$h,safe_not_equal,{data:0,chart:1,visualization:2,theme:3,locales:4,translations:5,blocks:6,chartAfterBodyHTML:7,isPreview:8,assets:9,styles:16,origin:10,fonts:11,isStylePlain:12,isStyleStatic:13}),t&&(t.target&&insert(t.target,_assertThisInitialized(r),t.anchor),t.props&&(r.$set(t.props),flush())),r}return _createClass(n,[{key:"data",get:function(){return this.$$.ctx[0]},set:function(t){this.$set({data:t}),flush()}},{key:"chart",get:function(){return this.$$.ctx[1]},set:function(t){this.$set({chart:t}),flush()}},{key:"visualization",get:function(){return this.$$.ctx[2]},set:function(t){this.$set({visualization:t}),flush()}},{key:"theme",get:function(){return this.$$.ctx[3]},set:function(t){this.$set({theme:t}),flush()}},{key:"locales",get:function(){return this.$$.ctx[4]},set:function(t){this.$set({locales:t}),flush()}},{key:"translations",get:function(){return this.$$.ctx[5]},set:function(t){this.$set({translations:t}),flush()}},{key:"blocks",get:function(){return this.$$.ctx[6]},set:function(t){this.$set({blocks:t}),flush()}},{key:"chartAfterBodyHTML",get:function(){return this.$$.ctx[7]},set:function(t){this.$set({chartAfterBodyHTML:t}),flush()}},{key:"isPreview",get:function(){return this.$$.ctx[8]},set:function(t){this.$set({isPreview:t}),flush()}},{key:"assets",get:function(){return this.$$.ctx[9]},set:function(t){this.$set({assets:t}),flush()}},{key:"styles",get:function(){return this.$$.ctx[16]},set:function(t){this.$set({styles:t}),flush()}},{key:"origin",get:function(){return this.$$.ctx[10]},set:function(t){this.$set({origin:t}),flush()}},{key:"fonts",get:function(){return this.$$.ctx[11]},set:function(t){this.$set({fonts:t}),flush()}},{key:"isStylePlain",get:function(){return this.$$.ctx[12]},set:function(t){this.$set({isStylePlain:t}),flush()}},{key:"isStyleStatic",get:function(){return this.$$.ctx[13]},set:function(t){this.$set({isStyleStatic:t}),flush()}}],[{key:"observedAttributes",get:function(){return["data","chart","visualization","theme","locales","translations","blocks","chartAfterBodyHTML","isPreview","assets","styles","origin","fonts","isStylePlain","isStyleStatic"]}}]),n}(SvelteElement);function _await$1(t,e,n){return n?e?e(t):t:(t&&t.then||(t=Promise.resolve(t)),e?t.then(e):t)}function _invoke(t,e){var n=t();return n&&n.then?n.then(e):e(n)}function _async$1(t){return function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];try{return Promise.resolve(t.apply(this,e))}catch(t){return Promise.reject(t)}}}if(void 0===window.__dw){var callbacks=[];window.__dw={onDependencyCompleted:function(t){callbacks.push(t)},dependencyCompleted:function(){var t,e=_createForOfIteratorHelper(callbacks);try{for(e.s();!(t=e.n()).done;){(0,t.value)()}}catch(t){e.e(t)}finally{e.f()}},dependencies:{},render:function(t){try{var e=_async$1((function(e){return _invoke((function(){if(!__dw.dependencies[e])return __dw.dependencies[e]="loading",_await$1(loadScript(0===e.indexOf("http")?e:"".concat(t.origin,"/").concat(e)),(function(){__dw.dependencies[e]="finished"}))}),(function(){"finished"===__dw.dependencies[e]&&__dw.dependencyCompleted()}))})),n="datawrapper-chart-".concat(t.chart.id);document.write('<div id="'.concat(n,'"></div>'));var r=document.getElementsByTagName("script");t.origin=r[r.length-1].getAttribute("src").split("/").slice(0,-1).join("/");var o="datawrapper-".concat(t.chart.theme);if(!document.head.querySelector("#".concat(o))){var i=document.createElement("style");i.id=o,i.type="text/css",i.innerHTML=t.styles.fonts,document.head.appendChild(i)}function a(){if(!s){var e={target:document.getElementById(n),props:t,hydrate:!1};if(customElements.get("datawrapper-visualization"))new(customElements.get("datawrapper-visualization"))(e);else customElements.define("datawrapper-visualization",VisualizationWebComponent_wc),new VisualizationWebComponent_wc(e);s=!0}}e(t.dependencies[0]),__dw.onDependencyCompleted((function(){var n,r=_createForOfIteratorHelper(t.dependencies);try{for(r.s();!(n=r.n()).done;){var o=n.value;if("finished"!==__dw.dependencies[o])return void(__dw.dependencies[o]||e(o))}}catch(t){r.e(t)}finally{r.f()}a()}));var s=!1;return _await$1()}catch(t){return Promise.reject(t)}}}}})();
>>>>>>> master
