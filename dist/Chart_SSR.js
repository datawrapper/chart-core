(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?module.exports=f(require('underscore')):typeof define==='function'&&define.amd?define(['underscore'],f):(g=g||self,g.chart=f(g._));}(this,(function(_){'use strict';_=_&&Object.prototype.hasOwnProperty.call(_,'default')?_['default']:_;function run(fn) {
  return fn();
}

function blank_object() {
  return Object.create(null);
}

function run_all(fns) {
  fns.forEach(run);
}

let current_component;

function set_current_component(component) {
  current_component = component;
}

function get_current_component() {
  if (!current_component) throw new Error(`Function called outside component initialization`);
  return current_component;
}

function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}

function afterUpdate(fn) {
  get_current_component().$$.after_update.push(fn);
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

function tick() {
  schedule_update();
  return resolved_promise;
}

function add_render_callback(fn) {
  render_callbacks.push(fn);
}

let flushing = false;
const seen_callbacks = new Set();

function flush() {
  if (flushing) return;
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

    while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
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

const escaped = {
  '"': '&quot;',
  "'": '&#39;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function escape(html) {
  return String(html).replace(/["'&<>]/g, match => escaped[match]);
}

function each(items, fn) {
  let str = '';

  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }

  return str;
}

const missing_component = {
  $$render: () => ''
};

function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === 'svelte:component') name += ' this={...}';
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }

  return component;
}

let on_destroy;

function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : []),
      // these will be immediately discarded
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({
      $$
    });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }

  return {
    render: (props = {}, options = {}) => {
      on_destroy = [];
      const result = {
        title: '',
        head: '',
        css: new Set()
      };
      const html = $$render(result, props, {}, options);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map(css => css.code).join('\n'),
          map: null // TODO

        },
        head: result.title + result.head
      };
    },
    $$render
  };
}

function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value) return '';
  return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
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
  input = String(input); // strip tags

  if (input.indexOf('<') < 0 || input.indexOf('>') < 0) {
    return input;
  }

  input = stripTags(input, allowed); // remove all event attributes

  if (typeof document === 'undefined') return input;
  var d = document.createElement('div');
  d.innerHTML = input;
  var sel = d.querySelectorAll('*');

  for (var i = 0; i < sel.length; i++) {
    if (sel[i].nodeName.toLowerCase() === 'a') {
      // special treatment for <a> elements
      if (sel[i].getAttribute('target') !== '_self') sel[i].setAttribute('target', '_blank');
      sel[i].setAttribute('rel', 'nofollow noopener noreferrer');

      if (sel[i].getAttribute('href') && sel[i].getAttribute('href').trim().startsWith('javascript:')) {
        // remove entire href to be safe
        sel[i].setAttribute('href', '');
      }
    }

    for (var j = 0; j < sel[i].attributes.length; j++) {
      var attrib = sel[i].attributes[j];

      if (attrib.specified) {
        if (attrib.name.substr(0, 2) === 'on') sel[i].removeAttribute(attrib.name);
      }
    }
  }

  return d.innerHTML;
}

function stripTags(input, allowed) {
  // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
  allowed = (((allowed !== undefined ? allowed || '' : defaultAllowed) + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
  var before = input;
  var after = input; // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')

  while (true) {
    before = after;
    after = before.replace(COMMENTS_AND_PHP_TAGS, '').replace(TAGS, function ($0, $1) {
      return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    }); // return once no more tags are removed

    if (before === after) {
      return after;
    }
  }
}function clean(s) {
  return purifyHTML(s, '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>');
}/* lib/Block.svelte generated by Svelte v3.23.2 */
const Block = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    block
  } = $$props;
  if ($$props.block === void 0 && $$bindings.block && block !== void 0) $$bindings.block(block);
  return `${block.prepend ? `<span class="${"prepend"}">${clean(block.prepend)}</span>` : ``}
<span class="${"block-inner"}">${validate_component(block.component || missing_component, "svelte:component").$$render($$result, {
    props: block.props
  }, {}, {})}</span>
${block.append ? `<span class="${"append"}">${clean(block.append)}</span>` : ``}`;
});/* lib/BlocksRegion.svelte generated by Svelte v3.23.2 */
const BlocksRegion = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    id
  } = $$props;
  let {
    name
  } = $$props;
  let {
    blocks
  } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0) $$bindings.name(name);
  if ($$props.blocks === void 0 && $$bindings.blocks && blocks !== void 0) $$bindings.blocks(blocks);
  return `${blocks.length ? `<div${add_attribute("id", id, 0)}${add_attribute("class", name, 0)}>${each(blocks, block => `${block.tag === "h1" ? `<h1 class="${"block " + escape(block.id) + "-block"}">${validate_component(Block, "Block").$$render($$result, {
    block
  }, {}, {})}
                </h1>` : `${block.tag === "p" ? `<p class="${"block " + escape(block.id) + "-block"}">${validate_component(Block, "Block").$$render($$result, {
    block
  }, {}, {})}
                </p>` : `<div class="${"block " + escape(block.id) + "-block"}">${validate_component(Block, "Block").$$render($$result, {
    block
  }, {}, {})}
                </div>`}`}`)}</div>` : ``}`;
});/* lib/blocks/Headline.svelte generated by Svelte v3.23.2 */
const Headline = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let chart = props.chart;
  let headline = purifyHtml(chart.title);
  return `${headline}`;
});/* lib/blocks/Description.svelte generated by Svelte v3.23.2 */
const Description = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let chart = props.chart;
  let description = purifyHtml(get(chart, "metadata.describe.intro"));
  return `${description}`;
});/* lib/blocks/Source.svelte generated by Svelte v3.23.2 */
const Source = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    __,
    get,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let {
    chart,
    theme
  } = props;
  let footer = get(theme, "data.options.footer");
  let sourceName = purifyHtml(get(chart, "metadata.describe.source-name"));
  let sourceUrl = get(chart, "metadata.describe.source-url");
  return `${sourceName ? `<span class="${"source-caption"}">${escape(__(footer.sourceCaption))}:</span>
    ${sourceUrl ? `<a class="${"source"}" target="${"_blank"}" rel="${"noopener noreferrer"}"${add_attribute("href", sourceUrl, 0)}>${sourceName}</a>` : `<span class="${"source"}">${sourceName}</span>`}` : ``}`;
});/* lib/blocks/Byline.svelte generated by Svelte v3.23.2 */

const Byline = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml,
    __
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let chart = props.chart;
  let theme = props.theme;
  let caption = props.caption;
  let bylineCaption = caption === "map" ? get(theme, "data.options.footer.mapCaption", "Map:") : caption === "table" ? get(theme, "data.options.footer.tableCaption", "Table:") : get(theme, "data.options.footer.chartCaption", "Chart:");
  let byline = get(chart, "metadata.describe.byline", false);
  let forkCaption = get(theme, "data.options.footer.forkCaption", "footer / based-on");
  let needBrackets = chart.basedOnByline && byline;
  let basedOnByline = (needBrackets ? "(" : "") + __(forkCaption) + " " + purifyHtml(chart.basedOnByline) + (needBrackets ? ")" : "");
  return `<span class="${"byline-caption"}">${escape(__(bylineCaption))}</span>
${escape(byline)}
${chart.basedOnByline ? `${purifyHtml(basedOnByline)}` : ``}`;
});/* lib/blocks/Notes.svelte generated by Svelte v3.23.2 */
const Notes = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let chart = props.chart;
  return `${purifyHtml(get(chart, "metadata.annotate.notes"))}`;
});/* lib/blocks/GetTheData.svelte generated by Svelte v3.23.2 */
const GetTheData = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    __,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let {
    chart,
    theme
  } = props;
  let getTheData = get(theme, "data.options.footer.getTheData", {
    enabled: false
  });
  return `${getTheData.enabled ? `<a class="${"dw-data-link"}" aria-label="${escape(__(getTheData.caption)) + ": " + escape(purifyHtml(chart.title, ""))}" href="${"data"}">${escape(__(getTheData.caption))}</a>` : ``}`;
});/* lib/blocks/Embed.svelte generated by Svelte v3.23.2 */

const Embed = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    __
  } = props;

  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let {
    chart,
    theme
  } = props;
  let embed = get(theme, "data.options.footer.embed", {
    enabled: false
  });
  let embedCode = get(chart, "metadata.publish.embed-codes.embed-method-iframe", "<!-- embed code will be here after publishing -->");
  return `${embed.enabled ? `<a href="${"#embed"}" class="${"chart-action-embed"}">${escape(__(embed.caption))}</a>
    ${ ``}` : ``}`;
});/* lib/blocks/LogoInner.svelte generated by Svelte v3.23.2 */
const LogoInner = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    purifyHtml
  } = $$props;
  let {
    logo
  } = $$props;
  let {
    theme
  } = $$props;
  if ($$props.purifyHtml === void 0 && $$bindings.purifyHtml && purifyHtml !== void 0) $$bindings.purifyHtml(purifyHtml);
  if ($$props.logo === void 0 && $$bindings.logo && logo !== void 0) $$bindings.logo(logo);
  if ($$props.theme === void 0 && $$bindings.theme && theme !== void 0) $$bindings.theme(theme);
  return `${logo.url ? `<img${add_attribute("height", logo.height, 0)}${add_attribute("src", logo.url, 0)}${add_attribute("alt", theme.title, 0)}>` : ``}
${logo.text ? `<span class="${"logo-text"}">${purifyHtml(logo.text)}</span>` : ``}`;
});/* lib/blocks/Logo.svelte generated by Svelte v3.23.2 */
const Logo = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let theme = props.theme;
  let logo = get(theme, "data.options.footer.logo");
  return `${logo.link ? `<a${add_attribute("href", logo.link, 0)} target="${"_blank"}" rel="${"noopener noreferrer"}">${validate_component(LogoInner, "LogoInner").$$render($$result, {
    logo,
    purifyHtml,
    theme
  }, {}, {})}</a>` : `${validate_component(LogoInner, "LogoInner").$$render($$result, {
    logo,
    purifyHtml,
    theme
  }, {}, {})}`}`;
});/* lib/blocks/Rectangle.svelte generated by Svelte v3.23.2 */

function px(val) {
  return typeof val === "string" ? val : val + "px";
}

const Rectangle = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let theme = props.theme;
  let data = get(theme, "data.options.blocks.rectangle.data", {});
  let width = get(data, "width", 50);
  let height = get(data, "height", 5);
  let background = get(data, "background", "red");
  return `<div class="${"export-rect"}" style="${"width: " + escape(px(width)) + "; height: " + escape(px(height)) + "; background: " + escape(background) + ";"}"></div>`;
});/**
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
const css = {
  code: "div.svelte-111z7el{position:fixed;opacity:0.182;font-weight:700;font-size:0;white-space:nowrap;left:-100px;top:0px;right:-100px;line-height:100vh;bottom:0;text-align:center;pointer-events:none;transform-origin:middle center}",
  map: "{\"version\":3,\"file\":\"Watermark.svelte\",\"sources\":[\"Watermark.svelte\"],\"sourcesContent\":[\"<script>\\n    import estimateTextWidth from '@datawrapper/shared/estimateTextWidth';\\n\\n    export let props;\\n    const { get, purifyHtml } = props;\\n    $: ({ chart, theme } = props);\\n\\n    $: monospace = get(theme, 'data.options.watermark.monospace', false);\\n    $: field = get(theme, 'data.options.watermark.custom-field');\\n    $: text = get(theme, 'data.options.watermark')\\n        ? field\\n            ? get(chart, `metadata.custom.${field}`, '')\\n            : get(theme, 'data.options.watermark.text', 'CONFIDENTIAL')\\n        : false;\\n\\n    let width;\\n    let height;\\n\\n    $: angle = -Math.atan(height / width);\\n    $: angleDeg = (angle * 180) / Math.PI;\\n\\n    $: diagonal = Math.sqrt(width * width + height * height);\\n\\n    // estimateTextWidth works reasonable well for normal fonts\\n    // set theme.data.options.watermark.monospace to true if you\\n    // have a monospace font\\n    $: estWidth = monospace ? text.length * 20 : estimateTextWidth(text, 20);\\n    $: fontSize = `${Math.round(20 * ((diagonal * 0.75) / estWidth))}px`;\\n</script>\\n\\n<style>\\n    div {\\n        position: fixed;\\n        opacity: 0.182;\\n        font-weight: 700;\\n        font-size: 0;\\n        white-space: nowrap;\\n        left: -100px;\\n        top: 0px;\\n        right: -100px;\\n        line-height: 100vh;\\n        bottom: 0;\\n        text-align: center;\\n        pointer-events: none;\\n        transform-origin: middle center;\\n    }\\n</style>\\n\\n<svelte:window bind:innerWidth={width} bind:innerHeight={height} />\\n\\n<div\\n    class=\\\"watermark noscript\\\"\\n    style=\\\"transform:rotate({angle}rad); font-size: {fontSize}\\\"\\n    data-rotate={angleDeg}>\\n    <span>\\n        {@html purifyHtml(text)}\\n    </span>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AA+BI,GAAG,eAAC,CAAC,AACD,QAAQ,CAAE,KAAK,CACf,OAAO,CAAE,KAAK,CACd,WAAW,CAAE,GAAG,CAChB,SAAS,CAAE,CAAC,CACZ,WAAW,CAAE,MAAM,CACnB,IAAI,CAAE,MAAM,CACZ,GAAG,CAAE,GAAG,CACR,KAAK,CAAE,MAAM,CACb,WAAW,CAAE,KAAK,CAClB,MAAM,CAAE,CAAC,CACT,UAAU,CAAE,MAAM,CAClB,cAAc,CAAE,IAAI,CACpB,gBAAgB,CAAE,MAAM,CAAC,MAAM,AACnC,CAAC\"}"
};
const Watermark = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get,
    purifyHtml
  } = props;
  let width;
  let height;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  $$result.css.add(css);
  let {
    chart,
    theme
  } = props;
  let monospace = get(theme, "data.options.watermark.monospace", false);
  let field = get(theme, "data.options.watermark.custom-field");
  let text = get(theme, "data.options.watermark") ? field ? get(chart, `metadata.custom.${field}`, "") : get(theme, "data.options.watermark.text", "CONFIDENTIAL") : false;
  let angle = -Math.atan(height / width);
  let angleDeg = angle * 180 / Math.PI;
  let diagonal = Math.sqrt(width * width + height * height);
  let estWidth = monospace ? text.length * 20 : estimateTextWidth(text, 20);
  let fontSize = `${Math.round(20 * (diagonal * 0.75 / estWidth))}px`;
  return `

<div class="${"watermark noscript svelte-111z7el"}" style="${"transform:rotate(" + escape(angle) + "rad); font-size: " + escape(fontSize)}"${add_attribute("data-rotate", angleDeg, 0)}><span>${purifyHtml(text)}</span></div>`;
});/* lib/blocks/HorizontalRule.svelte generated by Svelte v3.23.2 */
const HorizontalRule = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get
  } = props;
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let theme = props.theme;
  let data = get(theme, `data.options.blocks.${props.id}.data`, {});
  let border = get(data, "border", "1px solid #cccccc");
  let margin = get(data, "margin", "0px");
  return `<hr class="${"dw-line"}" style="${"border: 0; border-bottom: " + escape(border) + "; margin: " + escape(margin) + ";"}">`;
});/**
 * Safely access object properties without throwing nasty
 * `cannot access X of undefined` errors if a property along the
 * way doesn't exist.
 *
 * @exports get
 * @kind function
 *
 *
 * @param object - the object which properties you want to acccess
 * @param {String} key - dot-separated keys aka "path" to the property
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
  if (!key) return object; // expand keys

  const keys = key.split('.');
  let pt = object;

  for (let i = 0; i < keys.length; i++) {
    if (pt === null || pt === undefined) break; // break out of the loop
    // move one more level in

    pt = pt[keys[i]];
  }

  return pt === undefined || pt === null ? _default : pt;
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
 * injects a `<link>` element to the page to load a new stylesheet
 *
 * @param {string} src
 * @param {function} callback
 *
 * @example
 * import { loadStylesheet } from '@datawrapper/shared/fetch';
 *
 * loadStylesheet('/static/css/library.css', () => {
 *     console.log('library styles are loaded');
 * })
 */

function loadStylesheet(src, callback = null) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = src;

    link.onload = () => {
      if (callback) callback();
      resolve();
    };

    link.onerror = reject;
    document.head.appendChild(link);
  });
}/* globals Globalize */
const begin = /^ */.source;
const end = /[*']* *$/.source;
const s0 = /[ \-/.]?/.source; // optional separator

const s1 = /[ \-/.]/.source; // mandatory separator

const s2 = /[ \-/.;,]/.source; // mandatory separator

const s3 = /[ \-|T]/.source; // mandatory separator

const sM = /[ \-/.m]/.source; // mandatory separator

const rx = {
  YY: {
    parse: /['’‘]?(\d{2})/
  },
  YYYY: {
    test: /([12]\d{3})/,
    parse: /(\d{4})/
  },
  YYYY2: {
    test: /(?:1[7-9]|20)\d{2}/,
    parse: /(\d{4})/
  },
  H: {
    parse: /h([12])/
  },
  Q: {
    parse: /q([1234])/
  },
  W: {
    parse: /w([0-5]?[0-9])/
  },
  MM: {
    test: /(0?[1-9]|1[0-2])/,
    parse: /(0?[1-9]|1[0-2])/
  },
  DD: {
    parse: /(0?[1-9]|[1-2][0-9]|3[01])/
  },
  DOW: {
    parse: /([0-7])/
  },
  HHMM: {
    parse: /(0?\d|1\d|2[0-3]):([0-5]\d)(?::([0-5]\d))? *(am|pm)?/
  }
};
const MONTHS = {
  // feel free to add more localized month names
  0: ['jan', 'january', 'januar', 'jänner', 'jän', 'janv', 'janvier', 'ene', 'enero', 'gen', 'gennaio', 'janeiro'],
  1: ['feb', 'february', 'febr', 'februar', 'fév', 'févr', 'février', 'febrero', 'febbraio', 'fev', 'fevereiro'],
  2: ['mar', 'mär', 'march', 'mrz', 'märz', 'mars', 'mars', 'marzo', 'marzo', 'março'],
  3: ['apr', 'april', 'apr', 'april', 'avr', 'avril', 'abr', 'abril', 'aprile'],
  4: ['may', 'mai', 'mayo', 'mag', 'maggio', 'maio', 'maj'],
  5: ['jun', 'june', 'juni', 'juin', 'junio', 'giu', 'giugno', 'junho'],
  6: ['jul', 'july', 'juli', 'juil', 'juillet', 'julio', 'lug', 'luglio', 'julho'],
  7: ['aug', 'august', 'août', 'ago', 'agosto'],
  8: ['sep', 'september', 'sept', 'septembre', 'septiembre', 'set', 'settembre', 'setembro'],
  9: ['oct', 'october', 'okt', 'oktober', 'octobre', 'octubre', 'ott', 'ottobre', 'out', 'outubro'],
  10: ['nov', 'november', 'november', 'novembre', 'noviembre', 'novembre', 'novembro'],
  11: ['dec', 'december', 'dez', 'des', 'dezember', 'déc', 'décembre', 'dic', 'diciembre', 'dicembre', 'desember', 'dezembro']
};

_.each(MONTHS, function (abbr, m) {
  _.each(abbr, function (a) {
  });
});

rx.MMM = {
  parse: new RegExp('(' + _.flatten(_.values(MONTHS)).join('|') + ')')
};

_.each(rx, function (r) {
  r.parse = r.parse.source;
  if (_.isRegExp(r.test)) r.test = r.test.source;else r.test = r.parse;
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
    parse: reg(rx.DD.parse, '([\\-\\.\\/ ?])', rx.MM.parse, '\\2', rx.YYYY.parse, s3, rx.HHMM.parse),
    precision: 'day-minutes'
  },
  'YYYY-MM-DD HH:MM': {
    test: reg(rx.YYYY.test, '([\\-\\.\\/ ?])', rx.MM.test, '\\2', rx.DD.test, s3, rx.HHMM.test),
    parse: reg(rx.YYYY.parse, '([\\-\\.\\/ ?])', rx.MM.parse, '\\2', rx.DD.parse, s3, rx.HHMM.parse),
    precision: 'day-minutes'
  },
  ISO8601: {
    test: /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)/,
    parse: function (str) {
      return str;
    },
    precision: 'day-seconds'
  }
};

function reg() {
  return new RegExp(begin + Array.prototype.slice.call(arguments).join(' *') + end, 'i');
}function outerHeight(element, withMargin = false) {
  if (!element) return null;
  let height = element.offsetHeight;
  if (!withMargin) return height;
  var style = getComputedStyle(element);
  height += parseInt(style.marginTop) + parseInt(style.marginBottom);
  return height;
}
/* global getComputedStyle */

function getNonChartHeight() {
  let h = 0;
  const chart = document.querySelector('.dw-chart');

  for (let i = 0; i < chart.children.length; i++) {
    const el = chart.children[i];
    const tagName = el.tagName.toLowerCase();

    if (tagName !== 'script' && tagName !== 'style' && el.id !== 'chart' && !el.getAttribute('aria-hidden') && !hasClass(el, 'tooltip') && !hasClass(el, 'vg-tooltip') && !hasClass(el, 'hidden') && !hasClass(el, 'qtip') && !hasClass(el, 'container') && !hasClass(el, 'noscript') && !hasClass(el, 'hidden') && !hasClass(el, 'filter-ui') && !hasClass(el, 'dw-after-body') && !hasClass(el, 'dw-chart-body')) {
      h += Number(outerHeight(el, true));
    }
  }

  function hasClass(el, className) {
    return el.classList.contains(className);
  }

  function getProp(selector, property) {
    return getComputedStyle(document.querySelector(selector))[property].replace('px', '');
  }

  const selectors = ['.dw-chart', '.dw-chart-body'];
  const properties = ['padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'border-top-width', 'border-bottom-width'];
  selectors.forEach(function (sel) {
    properties.forEach(function (prop) {
      h += Number(getProp(sel, prop));
    });
  });
  return h;
}function getMaxChartHeight() {
  var maxH = window.innerHeight - 8;
  maxH -= getNonChartHeight();
  return maxH;
}
/* globals getComputedStyle */

function height(element) {
  return parseFloat(getComputedStyle(element, null).height.replace('px', ''));
}
function width(element) {
  return parseFloat(getComputedStyle(element, null).width.replace('px', ''));
}
function addClass(element, className) {
  if (element) element.classList.add(className);
}
function removeClass(element, className) {
  if (element) element.classList.remove(className);
}
function domReady(callback) {
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
  return function (event, data) {
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
  const loadingFonts = Array.isArray(fontsJSON) ? [] : Object.keys(fontsJSON);
  const fonts = new Set(loadingFonts);
  Object.keys(typographyJSON).forEach(key => {
    const typefaceKey = typographyJSON[key].typeface;

    if (typefaceKey) {
      const typeFaces = typefaceKey.split(',').map(t => t.trim());
      typeFaces.forEach(face => fonts.add(face));
    }
  });
  const observers = [];
  fonts.forEach(font => {
    const obs = new fontfaceobserver_standalone(font);
    observers.push(obs.load(null, 5000));
  });
  return Promise.all(observers);
}/* globals dw, Blob */
let chart, reloadTimer;

function renderChart() {
  if (__dw$1.vis && !__dw$1.vis.supportsSmartRendering()) {
    // a current visualization exists but it is not smart
    // enough to re-render itself properly, so we need to
    // reset and remove it
    __dw$1.vis.reset();
  }

  const $chart = document.querySelector('.dw-chart-body');
  const belowChartHeight = getHeight('.dw-chart-footer') + getHeight('.dw-above-footer') + getHeight('.dw-below-footer');

  if (belowChartHeight > 0) {
    addClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
  } else {
    removeClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
  } // compute chart dimensions


  const w = width($chart);
  const h = getMaxChartHeight();
  let vis;

  if (__dw$1.vis && __dw$1.vis.supportsSmartRendering()) {
    // a current visualization exists and it is smart enough
    // to re-render itself
    vis = __dw$1.vis;
  } else {
    // we have to create a new vis
    vis = __dw$1.vis = getVis();
    chart.vis(vis);
  }

  vis.size(w, h);
  initResizeHandler(vis, $chart); // update data link to point to edited dataset

  const csv = chart.dataset().toCSV && chart.dataset().toCSV();

  if (!csv || csv && csv.trim && csv.trim() === 'X.1') {
    // hide get the data link
    addClass(document.querySelector('.chart-action-data'), 'hidden');
  } else {
    const dataLink = document.querySelector('a.dw-data-link');

    if (dataLink) {
      if (window.navigator.msSaveOrOpenBlob) {
        const blobObject = new Blob([csv]);
        dataLink.addEventListener('click', event => {
          window.navigator.msSaveOrOpenBlob(blobObject, 'data-' + chart.get('id') + '.csv');
          event.preventDefault();
          return false;
        });
      } else {
        dataLink.setAttribute('download', 'data-' + chart.get('id') + '.csv');
        dataLink.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(csv));
      }
    }
  }

  chart.render($chart);
}

function getHeight(sel) {
  const el = document.querySelector(sel);
  if (!el) return 0;
  return height(el);
}

function chartLoaded() {
  chart = dw.chart(__dw$1.params.chartJSON).locale(__dw$1.params.chartLocale).metricPrefix(__dw$1.params.metricPrefix).theme(dw.theme(__dw$1.params.themeId));
  return chart.load(__dw$1.params.data || '', __dw$1.params.preview ? undefined : __dw$1.params.chartJSON.externalData);
}

function getVis() {
  const vis = dw.visualization(__dw$1.params.visId);
  vis.meta = __dw$1.params.visJSON;
  vis.lang = __dw$1.params.lang;
  return vis;
}

function renderLater() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(function () {
    renderChart();
  }, 300);
}

function initResizeHandler(vis, container) {
  const height = vis.meta.height || 'fit';
  const resize = height === 'fixed' ? resizeFixed : renderLater;
  let curWidth = width(container); // IE continuosly reloads the chart for some strange reasons

  if (navigator.userAgent.match(/msie/i) === null) {
    window.onresize = resize;
  }

  function resizeFixed() {
    const w = width(container);

    if (curWidth !== w) {
      curWidth = w;
      renderLater();
    }
  }
}

let initialized = false;
const __dw$1 = {
  init: function (params) {
    if (initialized) return;
    initialized = true;
    __dw$1.params = params;
    __dw$1.old_attrs = params.chartJSON;
    domReady(() => {
      const postEvent$1 = postEvent(params.chartJSON.id);
      window.addEventListener('hashchange', () => {
        postEvent$1('hash.change', {
          hash: window.location.hash
        });
      });
      chartLoaded().then(renderChart);
    });
  },
  render: renderLater,
  renderNow: renderChart
};
function render({
  visJSON,
  chartJSON,
  publishData,
  chartData,
  isPreview,
  chartLocale,
  metricPrefix,
  themeId,
  fontsJSON,
  typographyJSON,
  locales
}) {
  window.visJSON = visJSON;
  window.__dw = __dw$1; // evaluate locales

  Object.keys(locales).forEach(vendor => {
    // eslint-disable-next-line
    locales[vendor] = eval(locales[vendor]);
  });
  run();

  function run() {
    __dw$1.init(Object.assign({
      visJSON,
      chartJSON,
      publishData,
      data: chartData,
      preview: isPreview,
      chartLocale,
      locales,
      themeId: themeId,
      visId: chartJSON.type,
      lang: chartLocale.substr(0, 2),
      metricPrefix
    }, window.__dwParams || {}));

    observeFonts(fontsJSON, typographyJSON).then(() => __dw$1.render()).catch(() => __dw$1.render()); // iPhone/iPad fix

    if (/iP(hone|od|ad)/.test(navigator.platform)) {
      window.onload = __dw$1.render();
    }

    let themeFitChart = false;
    const visType = visJSON.id;
    const theme = dw.theme(themeId);

    if (theme && visType) {
      const isPies = visType === 'd3-pies' || visType === 'd3-donuts' || visType === 'd3-multiple-pies' || visType === 'd3-multiple-donuts';

      if (isPies) {
        themeFitChart = get(theme, 'vis.d3-pies.fitchart', 0);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isFitChart = urlParams.get('fitchart') === '1' || themeFitChart === 1 || themeFitChart === true;
    setInterval(function () {
      let desiredHeight;

      if (visJSON.height === 'fixed' && !isFitChart) {
        desiredHeight = outerHeight(document.querySelector('html'), true);
      } else {
        if (__dw$1.params.preview || !__dw$1.vis.chart().get('metadata.publish.chart-height')) {
          return;
        }

        desiredHeight = getNonChartHeight() + __dw$1.vis.chart().get('metadata.publish.chart-height');
      } // datawrapper responsive embed


      window.parent.postMessage({
        'datawrapper-height': {
          [chartJSON.id]: desiredHeight
        }
      }, '*'); // Google AMP

      window.parent.postMessage({
        sentinel: 'amp',
        type: 'embed-size',
        height: desiredHeight
      }, '*'); // Medium

      window.parent.postMessage(JSON.stringify({
        src: window.location.toString(),
        context: 'iframe.resize',
        height: desiredHeight
      }), '*');

      if (typeof window.datawrapperHeightCallback === 'function') {
        window.datawrapperHeightCallback(desiredHeight);
      }
    }, 1000);
  }
}/* lib/Chart.svelte generated by Svelte v3.23.2 */

function byPriority(a, b) {
  return (a.priority !== undefined ? a.priority : 999) - (b.priority !== undefined ? b.priority : 999);
}

function getCaption(id) {
  if (id === "d3-maps-choropleth" || id === "d3-maps-symbols" || id === "locator-map") return "map";else if (id === "tables") return "table";
  return "chart";
}

const Chart = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    data = {}
  } = $$props;
  let {
    theme = {}
  } = $$props;
  const coreBlocks = [{
    id: "headline",
    tag: "h1",
    region: "header",
    priority: 10,
    test: ({
      chart
    }) => chart.title && !get(chart, "metadata.describe.hide-title"),
    component: Headline
  }, {
    id: "description",
    tag: "p",
    region: "header",
    priority: 20,
    test: ({
      chart
    }) => get(chart, "metadata.describe.intro"),
    component: Description
  }, {
    id: "notes",
    region: "aboveFooter",
    priority: 10,
    test: ({
      chart
    }) => get(chart, "metadata.annotate.notes"),
    component: Notes
  }, {
    id: "byline",
    region: "footerLeft",
    test: ({
      chart
    }) => get(chart, "metadata.describe.byline", false) || chart.basedOnByline,
    priority: 10,
    component: Byline
  }, {
    id: "source",
    region: "footerLeft",
    test: ({
      chart
    }) => get(chart, "metadata.describe.source-name"),
    priority: 20,
    component: Source
  }, {
    id: "get-the-data",
    region: "footerLeft",
    test: ({
      theme,
      isStyleStatic
    }) => get(theme, "data.options.footer.getTheData.enabled") && !isStyleStatic,
    priority: 30,
    component: GetTheData
  }, {
    id: "embed",
    region: "footerLeft",
    test: ({
      theme,
      isStyleStatic
    }) => get(theme, "data.options.footer.embed.enabled") && !isStyleStatic,
    priority: 40,
    component: Embed
  }, {
    id: "logo",
    region: "footerRight",
    test: ({
      theme
    }) => get(theme, "data.options.footer.logo.enabled"),
    priority: 10,
    component: Logo
  }, {
    id: "rectangle",
    region: "header",
    test: ({
      theme
    }) => !!get(theme, "data.options.blocks.rectangle"),
    priority: 1,
    component: Rectangle
  }, {
    id: "watermark",
    region: "afterBody",
    test: ({
      theme
    }) => {
      const field = get(theme, "data.options.watermark.custom-field");
      return get(theme, "data.options.watermark") ? field ? get(chart, `metadata.custom.${field}`, "") : get(theme, "data.options.watermark.text", "CONFIDENTIAL") : false;
    },
    priority: 1,
    component: Watermark
  }, hr(0), hr(1), hr(2)];

  function hr(index) {
    const id = `hr${index ? index : ""}`;
    return {
      id,
      region: "header",
      test: ({
        theme
      }) => !!get(theme, `data.options.blocks.${id}`),
      priority: 0,
      component: HorizontalRule
    };
  }

  let pluginBlocks = [];

  function getBlocks(allBlocks, region, props) {
    return allBlocks.filter(d => d.region === region).filter(d => !d.test || d.test({ ...d.props,
      ...props
    })).filter(d => d.visible !== undefined ? d.visible : true).sort(byPriority);
  }

  function applyThemeBlockConfig(blocks, theme, blockProps) {
    return blocks.map(block => {
      block.props = { ...(block.data || {}),
        ...blockProps,
        id: block.id
      };

      if (block.component.test) {
        block.test = block.component.test;
      }

      const options = get(theme, "data.options.blocks", {})[block.id];
      if (!options) return block;
      return { ...block,
        ...options
      };
    });
  }

  let regions;
  let {
    isStylePlain = false
  } = $$props;
  let {
    isStyleStatic = false
  } = $$props;
  const caption = getCaption(data.visJSON.id);

  function __(key, ...args) {
    if (typeof key !== "string") {
      key = "";
      console.error(new TypeError(`function __ called without required 'key' parameter!
Please make sure you called __(key) with a key of type "string".
`));
    }

    key = key.trim();
    let translation = locale[key] || key;

    if (args.length) {
      translation = translation.replace(/\$(\d)/g, (m, i) => {
        i = +i;
        return args[i] || m;
      });
    }

    return translation;
  }

  onMount(async () => {
    document.body.classList.toggle("plain", isStylePlain);
    document.body.classList.toggle("static", isStyleStatic); // the body class "png-export" kept for backwards compatibility

    document.body.classList.toggle("png-export", isStyleStatic);

    if (isStyleStatic) {
      document.body.style["pointer-events"] = "none";
    }

    dw.theme.register(theme.id, theme.data);
    const {
      basemap,
      minimap,
      highlight
    } = publishData;
    window.__dwParams = {};

    if (basemap) {
      basemap.content = JSON.parse(basemap.content);
      window.__dwParams.d3maps_basemap = {
        [basemap.__id]: basemap
      };
    }

    if (minimap || highlight) {
      window.__dwParams.locatorMap = {
        minimapGeom: minimap,
        highlightGeom: highlight
      };
    }

    render(data); // load & execute plugins

    window.__dwBlocks = {};

    if (publishData.blocks.length) {
      await Promise.all(publishData.blocks.map(d => {
        return new Promise((resolve, reject) => {
          const p = [loadScript(d.source.js)];
          if (d.source.css) p.push(loadStylesheet(d.source.css));
          Promise.all(p).then(resolve).catch(err => {
            // log error
            const url = err.target ? err.target.getAttribute("src") || err.target.getAttribute("href") : null;
            if (url) console.warn("could not load ", url);else console.error("Unknown error", err); // but resolve anyway

            resolve();
          });
        });
      })); // all plugins are loaded

      publishData.blocks.forEach(d => {
        d.blocks.forEach(block => {
          if (!window.__dwBlocks[block.component]) {
            return console.warn(`component ${block.component} from chart block ${block.id} not found`);
          }

          pluginBlocks.push({ ...block,
            component: window.__dwBlocks[block.component]
          });
        });
      }); // trigger svelte update after modifying array

      pluginBlocks = pluginBlocks; // re-render chart after loading blocks

      await tick();
      render(data);
    }
  });

  async function checkHeightAndRender() {
    if (window && window.__dw && window.__dw.vis) {
      const currentHeight = __dw.vis.size()[1];

      await tick();
      /* check after tick to get the new values after browser had time for layout and paint */

      const newHeight = getMaxChartHeight(document.querySelector(".dw-chart-body"));

      if (currentHeight !== newHeight) {
        __dw.render();
      }
    }
  }

  afterUpdate(checkHeightAndRender);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.theme === void 0 && $$bindings.theme && theme !== void 0) $$bindings.theme(theme);
  if ($$props.isStylePlain === void 0 && $$bindings.isStylePlain && isStylePlain !== void 0) $$bindings.isStylePlain(isStylePlain);
  if ($$props.isStyleStatic === void 0 && $$bindings.isStyleStatic && isStyleStatic !== void 0) $$bindings.isStyleStatic(isStyleStatic);
  let chart = data.chartJSON;
  let publishData = data.publishData;
  let locale = data.visJSON.locale;
  let customCSS = purifyHTML(get(chart, "metadata.publish.custom-css", ""), "");
  let blockProps = {
    __,
    purifyHtml: clean,
    get,
    theme,
    data,
    chart,
    caption
  };
  let allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps);

   {
    {
      // build all the region
      regions = {
        header: getBlocks(allBlocks, "header", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        aboveFooter: getBlocks(allBlocks, "aboveFooter", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        footerLeft: getBlocks(allBlocks, "footerLeft", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        footerCenter: getBlocks(allBlocks, "footerCenter", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        footerRight: getBlocks(allBlocks, "footerRight", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        belowFooter: getBlocks(allBlocks, "belowFooter", {
          chart,
          data,
          theme,
          isStyleStatic
        }),
        afterBody: getBlocks(allBlocks, "afterBody", {
          chart,
          data,
          theme,
          isStyleStatic
        })
      };
    }
  }

  return `${($$result.head += `${($$result.title = `<title>${escape(chart.title)}</title>`, "")}<meta name="${"description"}"${add_attribute("content", get(chart, "metadata.describe.intro"), 0)} data-svelte="svelte-1drir4l">${`<${"style"}>${customCSS}</style>`}${publishData.chartAfterHeadHTML ? `${publishData.chartAfterHeadHTML}` : ``}`, "")}

${!isStylePlain ? `${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    name: "dw-chart-header",
    blocks: regions.header,
    id: "header"
  }, {}, {})}` : ``}

<div id="${"chart"}" class="${"dw-chart-body"}"></div>

${get(theme, "data.template.afterChart") ? `${theme.data.template.afterChart}` : ``}

${!isStylePlain ? `${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    name: "dw-above-footer",
    blocks: regions.aboveFooter
  }, {}, {})}

    <div id="${"footer"}" class="${"dw-chart-footer"}">${each(["Left", "Center", "Right"], orientation => `<div class="${"footer-" + escape(orientation.toLowerCase())}">${each(regions["footer" + orientation], (block, i) => `${i ? `<span class="${"separator separator-before-" + escape(block.id)}"></span>` : ``}
                    <span class="${"footer-block " + escape(block.id) + "-block"}">${block.prepend ? `<span class="${"prepend"}">${clean(block.prepend)}
                            </span>` : ``}
                        <span class="${"block-inner"}">${validate_component(block.component || missing_component, "svelte:component").$$render($$result, {
    props: block.props
  }, {}, {})}</span>
                        ${block.append ? `<span class="${"append"}">${clean(block.append)}
                            </span>` : ``}
                    </span>`)}
            </div>`)}</div>

    ${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    name: "dw-below-footer",
    blocks: regions.belowFooter
  }, {}, {})}` : ``}

<div class="${"dw-after-body"}">${each(regions.afterBody, block => `${validate_component(block.component || missing_component, "svelte:component").$$render($$result, {
    props: block.props
  }, {}, {})}`)}</div>

${publishData.chartAfterBodyHTML ? `${publishData.chartAfterBodyHTML}` : ``}`;
});return Chart;})));