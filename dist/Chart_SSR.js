(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?module.exports=f():typeof define==='function'&&define.amd?define(f):(g=g||self,g.chart=f());}(this,(function(){'use strict';function run(fn) {
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

      if (sel[i].getAttribute('href') && sel[i].getAttribute('href').trim().replace(/[^a-zA-Z0-9 -:]/g, '').startsWith('javascript:')) {
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
                </p>` : `<div class="${"block " + escape(block.id) + "-block"}"${add_attribute("style", block.id.includes("svg-rule") ? "font-size:0px;" : "", 0)}>${validate_component(Block, "Block").$$render($$result, {
    block
  }, {}, {})}
                </div>`}`}`)}</div>` : ``}`;
});/* lib/Menu.svelte generated by Svelte v3.23.2 */
const css = {
  code: ".menu.svelte-1lt126s.svelte-1lt126s{cursor:pointer;position:absolute;top:0px;right:0px;z-index:1}.ha-menu.svelte-1lt126s.svelte-1lt126s{margin:4px 10px 3px 3px;width:18px;padding:3px 0px;border-top:2px solid black;border-bottom:2px solid black}.ha-menu.svelte-1lt126s div.svelte-1lt126s{height:2px;width:100%;background:black}.ha-menu.svelte-1lt126s.svelte-1lt126s:hover{border-top-color:#ccc;border-bottom-color:#ccc}.ha-menu.svelte-1lt126s:hover div.svelte-1lt126s{background:#ccc}.menu-content.svelte-1lt126s.svelte-1lt126s{position:absolute;top:30px;right:4px;background:white;border:1px solid #ccc;z-index:100;box-shadow:0px 0px 4px 1px rgba(0, 0, 0, 0.1)}.menu-content > .dw-chart-menu a{padding:10px;display:block;color:initial;border-bottom:1px solid #ccc}.menu-content > .dw-chart-menu a:hover{background:rgba(0, 0, 0, 0.05)}.menu-content > .dw-chart-menu .block:last-child a{border-bottom:none}",
  map: "{\"version\":3,\"file\":\"Menu.svelte\",\"sources\":[\"Menu.svelte\"],\"sourcesContent\":[\"<script>\\n    import BlocksRegion from './BlocksRegion.svelte';\\n\\n    export let id;\\n    export let name;\\n    export let blocks;\\n    export let props;\\n\\n    let open = false;\\n\\n    function toggle() {\\n        open = !open;\\n    }\\n\\n    function hide() {\\n        open = false;\\n    }\\n</script>\\n\\n<style>\\n    .menu {\\n        cursor: pointer;\\n\\n        position: absolute;\\n        top: 0px;\\n        right: 0px;\\n        z-index: 1;\\n    }\\n\\n    .ha-menu {\\n        margin: 4px 10px 3px 3px;\\n        width: 18px;\\n        padding: 3px 0px;\\n\\n        border-top: 2px solid black;\\n        border-bottom: 2px solid black;\\n    }\\n\\n    .ha-menu div {\\n        height: 2px;\\n        width: 100%;\\n        background: black;\\n    }\\n\\n    .ha-menu:hover {\\n        border-top-color: #ccc;\\n        border-bottom-color: #ccc;\\n    }\\n\\n    .ha-menu:hover div {\\n        background: #ccc;\\n    }\\n\\n    .menu-content {\\n        position: absolute;\\n        top: 30px;\\n        right: 4px;\\n        background: white;\\n        border: 1px solid #ccc;\\n        z-index: 100;\\n        box-shadow: 0px 0px 4px 1px rgba(0, 0, 0, 0.1);\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu a) {\\n        padding: 10px;\\n        display: block;\\n        color: initial;\\n        border-bottom: 1px solid #ccc;\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu a:hover) {\\n        background: rgba(0, 0, 0, 0.05);\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu .block:last-child a) {\\n        border-bottom: none;\\n    }\\n</style>\\n\\n<svelte:window on:click={hide} />\\n\\n{#if blocks.length}\\n    <div class:ha-menu={!props.icon} class=\\\"menu container\\\" on:click|stopPropagation={toggle}>\\n        {#if props.icon}\\n            {@html props.icon}\\n        {:else}\\n            <div />\\n        {/if}\\n    </div>\\n\\n    <div class=\\\"menu-content container\\\" on:click|stopPropagation class:hidden={!open}>\\n        <BlocksRegion {id} {name} {blocks} />\\n    </div>\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAoBI,KAAK,8BAAC,CAAC,AACH,MAAM,CAAE,OAAO,CAEf,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,GAAG,CACR,KAAK,CAAE,GAAG,CACV,OAAO,CAAE,CAAC,AACd,CAAC,AAED,QAAQ,8BAAC,CAAC,AACN,MAAM,CAAE,GAAG,CAAC,IAAI,CAAC,GAAG,CAAC,GAAG,CACxB,KAAK,CAAE,IAAI,CACX,OAAO,CAAE,GAAG,CAAC,GAAG,CAEhB,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAC3B,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,AAClC,CAAC,AAED,uBAAQ,CAAC,GAAG,eAAC,CAAC,AACV,MAAM,CAAE,GAAG,CACX,KAAK,CAAE,IAAI,CACX,UAAU,CAAE,KAAK,AACrB,CAAC,AAED,sCAAQ,MAAM,AAAC,CAAC,AACZ,gBAAgB,CAAE,IAAI,CACtB,mBAAmB,CAAE,IAAI,AAC7B,CAAC,AAED,uBAAQ,MAAM,CAAC,GAAG,eAAC,CAAC,AAChB,UAAU,CAAE,IAAI,AACpB,CAAC,AAED,aAAa,8BAAC,CAAC,AACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,IAAI,CACT,KAAK,CAAE,GAAG,CACV,UAAU,CAAE,KAAK,CACjB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,CACtB,OAAO,CAAE,GAAG,CACZ,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAClD,CAAC,AAEO,gCAAgC,AAAE,CAAC,AACvC,OAAO,CAAE,IAAI,CACb,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,OAAO,CACd,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,AACjC,CAAC,AAEO,sCAAsC,AAAE,CAAC,AAC7C,UAAU,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,AACnC,CAAC,AAEO,kDAAkD,AAAE,CAAC,AACzD,aAAa,CAAE,IAAI,AACvB,CAAC\"}"
};
const Menu = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    id
  } = $$props;
  let {
    name
  } = $$props;
  let {
    blocks
  } = $$props;
  let {
    props
  } = $$props;

  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0) $$bindings.name(name);
  if ($$props.blocks === void 0 && $$bindings.blocks && blocks !== void 0) $$bindings.blocks(blocks);
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  $$result.css.add(css);
  return `

${blocks.length ? `<div class="${["menu container svelte-1lt126s", !props.icon ? "ha-menu" : ""].join(" ").trim()}">${props.icon ? `${props.icon}` : `<div class="${"svelte-1lt126s"}"></div>`}</div>

    <div class="${["menu-content container svelte-1lt126s",  "hidden" ].join(" ").trim()}">${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    id,
    name,
    blocks
  }, {}, {})}</div>` : ``}`;
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
const allowedTags = "<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>";
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
  let description = purifyHtml(get(chart, "metadata.describe.intro"), allowedTags);
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
  let externalData = get(chart, "externalData");
  return `${getTheData.enabled ? `<a class="${"dw-data-link"}" aria-label="${escape(__(getTheData.caption)) + ": " + escape(purifyHtml(chart.title, ""))}"${add_attribute("target", externalData ? "_blank" : "_self", 0)}${add_attribute("href", externalData || "data", 0)}>${escape(__(getTheData.caption))}</a>` : ``}`;
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
const css$1 = {
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
  $$result.css.add(css$1);
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
});/* lib/blocks/svgRule.svelte generated by Svelte v3.23.2 */
const css$2 = {
  code: "svg.svelte-eczzvz{width:100%;overflow-x:hidden}",
  map: "{\"version\":3,\"file\":\"svgRule.svelte\",\"sources\":[\"svgRule.svelte\"],\"sourcesContent\":[\"<script>\\n    import { onMount } from 'svelte';\\n    // external props\\n    export let props;\\n    const { get } = props;\\n    let svg;\\n    let length = 0;\\n\\n    onMount(() => {\\n        length = svg.getBoundingClientRect().width;\\n    });\\n\\n    if (typeof window !== 'undefined') {\\n        window.addEventListener('resize', () => {\\n            length = svg.getBoundingClientRect().width;\\n        });\\n    }\\n\\n    $: theme = props.theme;\\n\\n    $: data = get(theme, `data.options.blocks.${props.id}.data`, {});\\n    $: margin = get(data, 'margin', '0px');\\n    $: color = get(data, 'color', '#000000');\\n    $: width = get(data, 'width', 1);\\n    $: strokeDasharray = get(data, 'strokeDasharray', 'none');\\n    $: strokeLinecap = get(data, 'strokeLinecap', 'butt');\\n</script>\\n\\n<style type=\\\"text/css\\\">\\n    svg {\\n        width: 100%;\\n\\n        /*For IE*/\\n        overflow-x: hidden;\\n    }\\n</style>\\n\\n<svg bind:this={svg} style=\\\"height:{Math.max(width, 1)}px; margin:{margin};\\\">\\n    <line\\n        style=\\\"stroke:{color}; stroke-width:{width}; stroke-dasharray:{strokeDasharray};\\n        stroke-linecap: {strokeLinecap};\\\"\\n        x1=\\\"0\\\"\\n        y1={width / 2}\\n        x2={length}\\n        y2={width / 2} />\\n</svg>\\n\"],\"names\":[],\"mappings\":\"AA6BI,GAAG,cAAC,CAAC,AACD,KAAK,CAAE,IAAI,CAGX,UAAU,CAAE,MAAM,AACtB,CAAC\"}"
};
const SvgRule = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    props
  } = $$props;
  const {
    get
  } = props;
  let svg;
  let length = 0;
  onMount(() => {
    length = svg.getBoundingClientRect().width;
  });

  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => {
      length = svg.getBoundingClientRect().width;
    });
  }

  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  $$result.css.add(css$2);
  let theme = props.theme;
  let data = get(theme, `data.options.blocks.${props.id}.data`, {});
  let margin = get(data, "margin", "0px");
  let color = get(data, "color", "#000000");
  let width = get(data, "width", 1);
  let strokeDasharray = get(data, "strokeDasharray", "none");
  let strokeLinecap = get(data, "strokeLinecap", "butt");
  return `<svg style="${"height:" + escape(Math.max(width, 1)) + "px; margin:" + escape(margin) + ";"}" class="${"svelte-eczzvz"}"${add_attribute("this", svg, 1)}><line style="${"stroke:" + escape(color) + "; stroke-width:" + escape(width) + "; stroke-dasharray:" + escape(strokeDasharray) + ";\n        stroke-linecap: " + escape(strokeLinecap) + ";"}" x1="${"0"}"${add_attribute("y1", width / 2, 0)}${add_attribute("x2", length, 0)}${add_attribute("y2", width / 2, 0)}></line></svg>`;
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
function each$1(obj, iteratee, context) {
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
  each$1(obj, function(value, index, list) {
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
    each$1(obj, function(v, index, list) {
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
each$1(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
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
each$1(['concat', 'join', 'slice'], function(name) {
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
each$1(MONTHS, function (abbr, m) {
  each$1(abbr, function (a) {
  });
});
rx.MMM = {
  parse: new RegExp('(' + flatten$1(values(MONTHS)).join('|') + ')')
};
each$1(rx, function (r) {
  r.parse = r.parse.source;
  if (isRegExp(r.test)) r.test = r.test.source;else r.test = r.parse;
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

    if (tagName !== 'script' && tagName !== 'style' && el.id !== 'chart' && !hasClass(el, 'tooltip') && !hasClass(el, 'vg-tooltip') && !hasClass(el, 'hidden') && !hasClass(el, 'sr-only') && !hasClass(el, 'qtip') && !hasClass(el, 'container') && !hasClass(el, 'noscript') && !hasClass(el, 'hidden') && !hasClass(el, 'filter-ui') && !hasClass(el, 'dw-after-body') && !hasClass(el, 'dw-chart-body')) {
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
  } else if (this.isRadixInteger() || this.isNumber() || this.isOperator() || this.isString() || this.isParen() || this.isBracket() || this.isComma() || this.isSemicolon() || this.isNamedOp() || this.isConst() || this.isName()) {
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
      if (i === this.pos || c !== '_' && c !== '.' && (c < '0' || c > '9')) {
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
      if (i === this.pos || c !== '_' && (c < '0' || c > '9')) {
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
      } else if (i === this.pos || !hasLetter || c !== '_' && (c < '0' || c > '9')) {
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

    if (c >= '0' && c <= '9' || !foundDot && c === '.') {
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
  this.value = value !== undefined && value !== null ? value : 0;
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
  return this.nextToken = this.tokens.next();
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
      } else if (this.nextToken.type === TSEMICOLON || this.nextToken.type === TCOMMA || this.nextToken.type === TEOF || this.nextToken.type === TPAREN && this.nextToken.value === ')') {
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
  exp = -+exp; // If the value is not a number or the exp is not an integer...

  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  } // Shift


  value = value.toString().split('e');
  value = Math.round(+(value[0] + 'e' + (value[1] ? +value[1] - exp : -exp))); // Shift back

  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? +value[1] + exp : exp));
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
  return (x > 0) - (x < 0) || +x;
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
      nstack.push(function () {
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
        }; // f.name = n1


        Object.defineProperty(f, 'name', {
          value: n1,
          writable: false
        });
        values[n1] = f;
        return f;
      }());
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
  } // Explicitly return zero to avoid test issues caused by -0


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

Expression.prototype.evaluate = function (values) {
  values = values || {};
  return evaluate(this.tokens, this, values);
};

Expression.prototype.variables = function () {
  return (this.tokens || []).filter(token => token.type === 'IVAR').map(token => token.value);
};

function trim(s) {
  return s.trim();
} // parser


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
    in: (needle, haystack) => Array.isArray(haystack) ? haystack.includes(needle) : String(haystack).includes(needle),
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
    return (arguments.length === 1 && Array.isArray(array) ? array : Array.from(arguments)).slice(0).filter(v => !isNaN(v) && Number.isFinite(v));
  } // fallback regular expressions for browsers without
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
      return str.replace(new RegExp(String(search).replace(ESCAPE_REGEX, '\\$&'), 'g'), replace);
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
      return String(str).replace(PROPER_REGEX, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
      return String(str).replace(TITLE_REGEX, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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

      return sepLast ? [arr.slice(0, arr.length - 1).join(sep), arr[arr.length - 1]].join(sepLast) : arr.join(sep);
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
      return arr.map(item => Object.prototype.hasOwnProperty.call(item, key) ? item[key] : null);
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
      if (typeof test !== 'function') throw new Error('Second argument to FIND is not a function');
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
      if (typeof test !== 'function') throw new Error('Second argument to EVERY is not a function');
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
      if (typeof test !== 'function') throw new Error('Second argument to SOME is not a function');
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

Parser.prototype.parse = function (expr) {
  var instr = [];
  var parserState = new ParserState(this, new TokenStream(this, expr), {
    allowMemberAccess: true
  });
  parserState.parseExpression(instr);
  parserState.expect(TEOF, 'EOF');
  return new Expression(instr, this);
};

Parser.prototype.evaluate = function (expr, variables) {
  return this.parse(expr).evaluate(variables);
};

var sharedParser = new Parser();

Parser.parse = function (expr) {
  return sharedParser.parse(expr);
};

Parser.evaluate = function (expr, variables) {
  return sharedParser.parse(expr).evaluate(variables);
};

Parser.keywords = ['ABS', 'ACOS', 'ACOSH', 'and', 'ASIN', 'ASINH', 'ATAN', 'ATAN2', 'ATANH', 'CBRT', 'CEIL', 'CONCAT', 'COS', 'COSH', 'DATEDIFF', 'DAY', 'E', 'EVERY', 'EXP', 'EXPM1', 'FIND', 'FLOOR', 'HOURS', 'IF', 'in', 'INDEXOF', 'ISNULL', 'JOIN', 'LENGTH', 'LN', 'LOG', 'LOG10', 'LOG1P', 'LOG2', 'LOWER', 'MAP', 'MAX', 'MEAN', 'MEDIAN', 'MIN', 'MINUTES', 'MONTH', 'NOT', 'NOT', 'or', 'PI', 'PLUCK', 'POW', 'PROPER', 'RANDOM', 'RANGE', 'REPLACE', 'REPLACE_REGEX', 'ROUND', 'SECONDS', 'SIGN', 'SIN', 'SINH', 'SLICE', 'SOME', 'SORT', 'SPLIT', 'SQRT', 'SUBSTR', 'SUM', 'TAN', 'TANH', 'TIMEDIFF', 'TITLE', 'TRIM', 'TRUNC', 'UPPER', 'WEEKDAY', 'YEAR'];
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

Parser.prototype.isOperatorEnabled = function (op) {
  var optionName = getOptionName(op);
  var operators = this.options.operators || {};
  return !(optionName in operators) || !!operators[optionName];
};function getMaxChartHeight() {
  if (window.innerHeight === 0) return 0;
  var maxH = window.innerHeight - 8;
  maxH -= getNonChartHeight();
  return Math.max(maxH, 0);
}
/* globals getComputedStyle */

function height(element) {
  const h = parseFloat(getComputedStyle(element, null).height.replace('px', ''));
  return isNaN(h) ? 0 : h;
}
function width(element) {
  const w = parseFloat(getComputedStyle(element, null).width.replace('px', ''));
  return isNaN(w) ? 0 : w;
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
let chart, $chart, reloadTimer;

function renderChart() {
  if (__dw$1.vis && !__dw$1.vis.supportsSmartRendering()) {
    // a current visualization exists but it is not smart
    // enough to re-render itself properly, so we need to
    // reset and remove it
    __dw$1.vis.reset();
  }

  $chart = document.querySelector('.dw-chart-body');
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

  vis.size(w, h); // update data link to point to edited dataset

  const csv = chart.dataset().toCSV && chart.dataset().toCSV();

  if (!csv || csv && csv.trim && csv.trim() === 'X.1') {
    // hide get the data link
    addClass(document.querySelector('.chart-action-data'), 'hidden');
  } else {
    const dataLink = document.querySelector('a.dw-data-link[href=data]');

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
        dataLink.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv));
      }
    }
  } // only render if iframe has valid dimensions


  if (getHeightMode() === 'fixed' ? w > 0 : w > 0 && h > 0) {
    chart.render($chart);
  }
}

function getHeight(sel) {
  const el = document.querySelector(sel);
  if (!el) return 0;
  return height(el);
}

function getHeightMode() {
  const vis = __dw$1.params.visJSON;
  const theme = dw.theme(__dw$1.params.themeId);
  const themeFitChart = get(theme, 'vis.d3-pies.fitchart', false) && ['d3-pies', 'd3-donuts', 'd3-multiple-pies', 'd3-multiple-donuts'].indexOf(vis.id) > -1;
  const urlParams = new URLSearchParams(window.location.search);
  const urlFitChart = !!urlParams.get('fitchart');
  return themeFitChart || urlFitChart || visJSON.height !== 'fixed' ? 'fit' : 'fixed';
}

async function chartLoaded() {
  const externalJSON = get(__dw$1.params.chartJSON, 'metadata.data.use-datawrapper-cdn') && get(__dw$1.params.chartJSON, 'metadata.data.external-metadata', '').length ? `//${get(__dw$1.params.publishData, 'externalDataUrl', '')}/${__dw$1.params.chartJSON.id}.metadata.json` : get(__dw$1.params.chartJSON, 'metadata.data.external-metadata');

  if (!__dw$1.params.preview && get(__dw$1.params.chartJSON, 'metadata.data.upload-method') === 'external-data' && externalJSON) {
    return new Promise((resolve, reject) => {
      window.fetch(externalJSON).then(res => res.json()).then(obj => {
        if (obj.title) {
          __dw$1.params.chartJSON.title = obj.title;
          delete obj.title;
        }

        Object.assign(__dw$1.params.chartJSON.metadata, obj);

        __dwUpdate({});

        run().then(resolve);
      }).catch(() => {
        run().then(resolve);
      });
    });
  } else {
    return run();
  }

  function run() {
    chart = dw.chart(__dw$1.params.chartJSON).locale(__dw$1.params.chartLocale).metricPrefix(__dw$1.params.metricPrefix).theme(dw.theme(__dw$1.params.themeId));
    return chart.load(__dw$1.params.data || '', __dw$1.params.preview ? undefined : __dw$1.params.chartJSON.externalData);
  }
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
  }, 100);
}

function initResizeHandler() {
  let currentWidth = width($chart);

  const resize = () => {
    chart.vis().fire('resize');
    renderLater();
  };

  const resizeFixed = () => {
    const w = width($chart);

    if (currentWidth !== w) {
      currentWidth = w;
      resize();
    }
  };

  const fixedHeight = getHeightMode() === 'fixed';
  const resizeHandler = fixedHeight ? resizeFixed : resize;
  window.addEventListener('resize', resizeHandler);
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
      chartLoaded().then(() => {
        renderChart();
        initResizeHandler();
      });
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

    setInterval(function () {
      let desiredHeight;

      if (getHeightMode() === 'fixed') {
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

  if (typeof window !== "undefined") {
    window.__dwUpdate = ({
      chart
    }) => {
      Object.assign(data.chartJSON, chart);
      data = data; // to force re-rendering
    };
  }

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
  }, hr(0, "hr"), hr(1, "hr"), hr(2, "hr"), hr(0, "svg-rule"), hr(1, "svg-rule"), hr(2, "svg-rule")];

  function hr(index, type) {
    const id = `${type}${index ? index : ""}`;
    return {
      id,
      region: "header",
      test: ({
        theme
      }) => !!get(theme, `data.options.blocks.${id}`),
      priority: 0,
      component: type === "hr" ? HorizontalRule : SvgRule
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
  let menu;
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
          if (!dw.block.has(block.component)) {
            return console.warn(`component ${block.component} from chart block ${block.id} not found`);
          }

          pluginBlocks.push({ ...block,
            component: dw.block(block.component)
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
  let ariaDescription = purifyHTML(get(chart, "metadata.describe.aria-description", ""), "<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>");
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
        }),
        menu: getBlocks(allBlocks, "menu", {
          chart,
          data,
          theme,
          isStyleStatic
        })
      };
    }
  }

   {
    {
      menu = get(theme, "data.options.menu", {});
    }
  }

  return `${($$result.head += `${($$result.title = `<title>${escape(purifyHTML(chart.title, ""))}</title>`, "")}<meta name="${"description"}"${add_attribute("content", get(chart, "metadata.describe.intro"), 0)} data-svelte="svelte-6em4fw">${`<${"style"}>${customCSS}</style>`}${publishData.chartAfterHeadHTML ? `${publishData.chartAfterHeadHTML}` : ``}`, "")}

${!isStylePlain ? `${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    name: "dw-chart-header",
    blocks: regions.header,
    id: "header"
  }, {}, {})}

    ${!isStyleStatic ? `${validate_component(Menu, "Menu").$$render($$result, {
    name: "dw-chart-menu",
    props: menu,
    blocks: regions.menu
  }, {}, {})}` : ``}` : ``}

${ariaDescription ? `<div class="${"sr-only"}">${ariaDescription}</div>` : ``}
<div id="${"chart"}" class="${"dw-chart-body"}"${add_attribute("aria-hidden", !!ariaDescription, 0)}></div>

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