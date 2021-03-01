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
  code: ".menu.svelte-5ffq6v.svelte-5ffq6v{cursor:pointer;position:absolute;top:0px;right:0px}.ha-menu.svelte-5ffq6v.svelte-5ffq6v{margin:4px 10px 3px 3px;width:18px;padding:3px 0px;border-top:2px solid black;border-bottom:2px solid black}.ha-menu.svelte-5ffq6v div.svelte-5ffq6v{height:2px;width:100%;background:black}.ha-menu.svelte-5ffq6v.svelte-5ffq6v:hover{border-top-color:#ccc;border-bottom-color:#ccc}.ha-menu.svelte-5ffq6v:hover div.svelte-5ffq6v{background:#ccc}.menu-content.svelte-5ffq6v.svelte-5ffq6v{position:absolute;top:30px;right:4px;background:white;border:1px solid #ccc;z-index:1;box-shadow:0px 0px 4px 1px rgba(0, 0, 0, 0.1)}.menu-content > .dw-chart-menu a{padding:10px;display:block;color:initial;border-bottom:1px solid #ccc}.menu-content > .dw-chart-menu a:hover{background:rgba(0, 0, 0, 0.05)}.menu-content > .dw-chart-menu .block:last-child a{border-bottom:none}",
  map: "{\"version\":3,\"file\":\"Menu.svelte\",\"sources\":[\"Menu.svelte\"],\"sourcesContent\":[\"<script>\\n    import BlocksRegion from './BlocksRegion.svelte';\\n\\n    export let id;\\n    export let name;\\n    export let blocks;\\n    export let props;\\n\\n    let open = false;\\n\\n    function toggle() {\\n        open = !open;\\n    }\\n\\n    function hide() {\\n        open = false;\\n    }\\n</script>\\n\\n<style>\\n    .menu {\\n        cursor: pointer;\\n\\n        position: absolute;\\n        top: 0px;\\n        right: 0px;\\n    }\\n\\n    .ha-menu {\\n        margin: 4px 10px 3px 3px;\\n        width: 18px;\\n        padding: 3px 0px;\\n\\n        border-top: 2px solid black;\\n        border-bottom: 2px solid black;\\n    }\\n\\n    .ha-menu div {\\n        height: 2px;\\n        width: 100%;\\n        background: black;\\n    }\\n\\n    .ha-menu:hover {\\n        border-top-color: #ccc;\\n        border-bottom-color: #ccc;\\n    }\\n\\n    .ha-menu:hover div {\\n        background: #ccc;\\n    }\\n\\n    .menu-content {\\n        position: absolute;\\n        top: 30px;\\n        right: 4px;\\n        background: white;\\n        border: 1px solid #ccc;\\n        z-index: 1;\\n        box-shadow: 0px 0px 4px 1px rgba(0, 0, 0, 0.1);\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu a) {\\n        padding: 10px;\\n        display: block;\\n        color: initial;\\n        border-bottom: 1px solid #ccc;\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu a:hover) {\\n        background: rgba(0, 0, 0, 0.05);\\n    }\\n\\n    :global(.menu-content > .dw-chart-menu .block:last-child a) {\\n        border-bottom: none;\\n    }\\n</style>\\n\\n<svelte:window on:click={hide} />\\n\\n{#if blocks.length}\\n    <div class:ha-menu={!props.icon} class=\\\"menu tooltip\\\" on:click|stopPropagation={toggle}>\\n        {#if props.icon}\\n            {@html props.icon}\\n        {:else}\\n            <div />\\n        {/if}\\n    </div>\\n\\n    <div class=\\\"menu-content tooltip\\\" on:click|stopPropagation class:hidden={!open}>\\n        <BlocksRegion {id} {name} {blocks} />\\n    </div>\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAoBI,KAAK,4BAAC,CAAC,AACH,MAAM,CAAE,OAAO,CAEf,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,GAAG,CACR,KAAK,CAAE,GAAG,AACd,CAAC,AAED,QAAQ,4BAAC,CAAC,AACN,MAAM,CAAE,GAAG,CAAC,IAAI,CAAC,GAAG,CAAC,GAAG,CACxB,KAAK,CAAE,IAAI,CACX,OAAO,CAAE,GAAG,CAAC,GAAG,CAEhB,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAC3B,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,AAClC,CAAC,AAED,sBAAQ,CAAC,GAAG,cAAC,CAAC,AACV,MAAM,CAAE,GAAG,CACX,KAAK,CAAE,IAAI,CACX,UAAU,CAAE,KAAK,AACrB,CAAC,AAED,oCAAQ,MAAM,AAAC,CAAC,AACZ,gBAAgB,CAAE,IAAI,CACtB,mBAAmB,CAAE,IAAI,AAC7B,CAAC,AAED,sBAAQ,MAAM,CAAC,GAAG,cAAC,CAAC,AAChB,UAAU,CAAE,IAAI,AACpB,CAAC,AAED,aAAa,4BAAC,CAAC,AACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,IAAI,CACT,KAAK,CAAE,GAAG,CACV,UAAU,CAAE,KAAK,CACjB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,CACtB,OAAO,CAAE,CAAC,CACV,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAClD,CAAC,AAEO,gCAAgC,AAAE,CAAC,AACvC,OAAO,CAAE,IAAI,CACb,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,OAAO,CACd,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,AACjC,CAAC,AAEO,sCAAsC,AAAE,CAAC,AAC7C,UAAU,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,AACnC,CAAC,AAEO,kDAAkD,AAAE,CAAC,AACzD,aAAa,CAAE,IAAI,AACvB,CAAC\"}"
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

${blocks.length ? `<div class="${["menu tooltip svelte-5ffq6v", !props.icon ? "ha-menu" : ""].join(" ").trim()}">${props.icon ? `${props.icon}` : `<div class="${"svelte-5ffq6v"}"></div>`}</div>

    <div class="${["menu-content tooltip svelte-5ffq6v",  "hidden" ].join(" ").trim()}">${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
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
  let chartAttrs = props.chartAttrs;
  let headline = purifyHtml(chartAttrs.title);
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
  let chartAttrs = props.chartAttrs;
  let description = purifyHtml(get(chartAttrs, "metadata.describe.intro"), allowedTags);
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
    chartAttrs,
    theme
  } = props;
  let footer = get(theme, "data.options.footer");
  let sourceName = purifyHtml(get(chartAttrs, "metadata.describe.source-name"));
  let sourceUrl = get(chartAttrs, "metadata.describe.source-url");
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
  let chartAttrs = props.chartAttrs;
  let theme = props.theme;
  let caption = props.caption;
  let bylineCaption = caption === "map" ? get(theme, "data.options.footer.mapCaption", "Map:") : caption === "table" ? get(theme, "data.options.footer.tableCaption", "Table:") : get(theme, "data.options.footer.chartCaption", "Chart:");
  let byline = get(chartAttrs, "metadata.describe.byline", false);
  let forkCaption = get(theme, "data.options.footer.forkCaption", "footer / based-on");
  let needBrackets = chartAttrs.basedOnByline && byline;
  let basedOnByline = (needBrackets ? "(" : "") + __(forkCaption) + " " + purifyHtml(chartAttrs.basedOnByline) + (needBrackets ? ")" : "");
  return `<span class="${"byline-caption"}">${escape(__(bylineCaption))}</span>
${escape(byline)}
${chartAttrs.basedOnByline ? `${purifyHtml(basedOnByline)}` : ``}`;
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
  let chartAttrs = props.chartAttrs;
  return `${purifyHtml(get(chartAttrs, "metadata.annotate.notes"))}`;
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
  let dataLink;
  let hidden = false;
  let href = "data";
  let download = "";
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  let {
    chartAttrs,
    chart,
    data,
    theme
  } = props;
  let getTheData = get(theme, "data.options.footer.getTheData", {
    enabled: false
  });

   {
    {
      // update data link to point to edited dataset
      if (chart && chart.dataset()) {
        const csv = chart.dataset().toCSV && chart.dataset().toCSV();

        if (!csv || csv && csv.trim && csv.trim() === "X.1") {
          hidden = true;
        } else {
          if (window.navigator.msSaveOrOpenBlob) {
            const blobObject = new Blob([csv]);
            dataLink.addEventListener("click", event => {
              window.navigator.msSaveOrOpenBlob(blobObject, "data-" + chartAttrs.id + ".csv");
              event.preventDefault();
              return false;
            });
          } else {
            download = "data-" + chartAttrs.id + ".csv";
            href = "data:application/octet-stream;charset=utf-8," + encodeURIComponent("﻿" + csv);
          }
        }
      }
    }
  }

  return `${getTheData.enabled && !hidden ? `<a this="${"dataLink"}" class="${"dw-data-link"}" aria-label="${escape(__(getTheData.caption)) + ": " + escape(purifyHtml(chartAttrs.title, ""))}"${add_attribute("download", download, 0)}${add_attribute("href", href, 0)}>${escape(__(getTheData.caption))}</a>` : ``}`;
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
    chartAttrs,
    theme
  } = props;
  let embed = get(theme, "data.options.footer.embed", {
    enabled: false
  });
  let embedCode = get(chartAttrs, "metadata.publish.embed-codes.embed-method-iframe", "<!-- embed code will be here after publishing -->");
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
});// Current version.
var VERSION = '1.11.0';

// Establish the root object, `window` (`self`) in the browser, `global`
// on the server, or `this` in some virtual machines. We use `self`
// instead of `window` for `WebWorker` support.
var root = typeof self == 'object' && self.self === self && self ||
          typeof global == 'object' && global.global === global && global ||
          Function('return this')() ||
          {};

// Save bytes in the minified (but not gzipped) version:
var ArrayProto = Array.prototype, ObjProto = Object.prototype;
var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

// Create quick reference variables for speed access to core prototypes.
var push = ArrayProto.push,
    slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

// Modern feature detection.
var supportsArrayBuffer = typeof ArrayBuffer !== 'undefined';

// All **ECMAScript 5+** native function implementations that we hope to use
// are declared here.
var nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeCreate = Object.create,
    nativeIsView = supportsArrayBuffer && ArrayBuffer.isView;

// Create references to these builtin functions because we override them.
var _isNaN = isNaN,
    _isFinite = isFinite;

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
}// Is a given value equal to null?
function isNull(obj) {
  return obj === null;
}// Is a given variable undefined?
function isUndefined(obj) {
  return obj === void 0;
}// Is a given value a boolean?
function isBoolean(obj) {
  return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
}// Is a given value a DOM element?
function isElement(obj) {
  return !!(obj && obj.nodeType === 1);
}// Internal function for creating a `toString`-based type tester.
function tagTester(name) {
  return function(obj) {
    return toString.call(obj) === '[object ' + name + ']';
  };
}var isString = tagTester('String');var isNumber = tagTester('Number');var isDate = tagTester('Date');var isRegExp = tagTester('RegExp');var isError = tagTester('Error');var isSymbol = tagTester('Symbol');var isMap = tagTester('Map');var isWeakMap = tagTester('WeakMap');var isSet = tagTester('Set');var isWeakSet = tagTester('WeakSet');var isArrayBuffer = tagTester('ArrayBuffer');var isDataView = tagTester('DataView');// Is a given value an array?
// Delegates to ECMA5's native `Array.isArray`.
var isArray = nativeIsArray || tagTester('Array');var isFunction = tagTester('Function');

// Optimize `isFunction` if appropriate. Work around some `typeof` bugs in old
// v8, IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
var nodelist = root.document && root.document.childNodes;
if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
  isFunction = function(obj) {
    return typeof obj == 'function' || false;
  };
}

var isFunction$1 = isFunction;// Internal function to check whether `key` is an own property name of `obj`.
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

var isArguments$1 = isArguments;// Is a given object a finite number?
function isFinite$1(obj) {
  return !isSymbol(obj) && _isFinite(obj) && !isNaN(parseFloat(obj));
}// Is the given value `NaN`?
function isNaN$1(obj) {
  return isNumber(obj) && _isNaN(obj);
}// Predicate-generating function. Often useful outside of Underscore.
function constant(value) {
  return function() {
    return value;
  };
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
}// Internal helper to obtain the `byteLength` property of an object.
var getByteLength = shallowProperty('byteLength');// Internal helper to determine whether we should spend extensive checks against
// `ArrayBuffer` et al.
var isBufferLike = createSizePropertyCheck(getByteLength);// Is a given value a typed array?
var typedArrayPattern = /\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;
function isTypedArray(obj) {
  // `ArrayBuffer.isView` is the most future-proof, so use it when available.
  // Otherwise, fall back on the above regular expression.
  return nativeIsView ? (nativeIsView(obj) && !isDataView(obj)) :
                isBufferLike(obj) && typedArrayPattern.test(toString.call(obj));
}

var isTypedArray$1 = supportsArrayBuffer ? isTypedArray : constant(false);// Internal helper to obtain the `length` property of an object.
var getLength = shallowProperty('length');// Internal helper for collection methods to determine whether a collection
// should be iterated as an array or as an object.
// Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
// Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
var isArrayLike = createSizePropertyCheck(getLength);// Internal helper to create a simple lookup structure.
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
}// Is a given array, string, or object empty?
// An "empty" object has no enumerable own-properties.
function isEmpty(obj) {
  if (obj == null) return true;
  // Skip the more expensive `toString`-based type checks if `obj` has no
  // `.length`.
  if (isArrayLike(obj) && (isArray(obj) || isString(obj) || isArguments$1(obj))) return obj.length === 0;
  return keys(obj).length === 0;
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
};// Internal recursive comparison function for `_.isEqual`.
function eq(a, b, aStack, bStack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the [Harmony `egal` proposal](https://wiki.ecmascript.org/doku.php?id=harmony:egal).
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  // `null` or `undefined` only equal to itself (strict comparison).
  if (a == null || b == null) return false;
  // `NaN`s are equivalent, but non-reflexive.
  if (a !== a) return b !== b;
  // Exhaust primitive checks
  var type = typeof a;
  if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
  return deepEq(a, b, aStack, bStack);
}

// Internal recursive comparison function for `_.isEqual`.
function deepEq(a, b, aStack, bStack) {
  // Unwrap any wrapped objects.
  if (a instanceof _) a = a._wrapped;
  if (b instanceof _) b = b._wrapped;
  // Compare `[[Class]]` names.
  var className = toString.call(a);
  if (className !== toString.call(b)) return false;
  switch (className) {
    // These types are compared by value.
    case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `new String("5")`.
      return '' + a === '' + b;
    case '[object Number]':
      // `NaN`s are equivalent, but non-reflexive.
      // Object(NaN) is equivalent to NaN.
      if (+a !== +a) return +b !== +b;
      // An `egal` comparison is performed for other numeric values.
      return +a === 0 ? 1 / +a === 1 / b : +a === +b;
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a === +b;
    case '[object Symbol]':
      return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
    case '[object ArrayBuffer]':
      // Coerce to `DataView` so we can fall through to the next case.
      return deepEq(new DataView(a), new DataView(b), aStack, bStack);
    case '[object DataView]':
      var byteLength = getByteLength(a);
      if (byteLength !== getByteLength(b)) {
        return false;
      }
      while (byteLength--) {
        if (a.getUint8(byteLength) !== b.getUint8(byteLength)) {
          return false;
        }
      }
      return true;
  }

  if (isTypedArray$1(a)) {
    // Coerce typed arrays to `DataView`.
    return deepEq(new DataView(a.buffer), new DataView(b.buffer), aStack, bStack);
  }

  var areArrays = className === '[object Array]';
  if (!areArrays) {
    if (typeof a != 'object' || typeof b != 'object') return false;

    // Objects with different constructors are not equivalent, but `Object`s or `Array`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(isFunction$1(aCtor) && aCtor instanceof aCtor &&
                             isFunction$1(bCtor) && bCtor instanceof bCtor)
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
  }
  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

  // Initializing stack of traversed objects.
  // It's done here since we only need them for objects and arrays comparison.
  aStack = aStack || [];
  bStack = bStack || [];
  var length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (aStack[length] === a) return bStack[length] === b;
  }

  // Add the first object to the stack of traversed objects.
  aStack.push(a);
  bStack.push(b);

  // Recursively compare objects and arrays.
  if (areArrays) {
    // Compare array lengths to determine if a deep comparison is necessary.
    length = a.length;
    if (length !== b.length) return false;
    // Deep compare the contents, ignoring non-numeric properties.
    while (length--) {
      if (!eq(a[length], b[length], aStack, bStack)) return false;
    }
  } else {
    // Deep compare objects.
    var _keys = keys(a), key;
    length = _keys.length;
    // Ensure that both objects contain the same number of properties before comparing deep equality.
    if (keys(b).length !== length) return false;
    while (length--) {
      // Deep compare each member
      key = _keys[length];
      if (!(has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
    }
  }
  // Remove the first object from the stack of traversed objects.
  aStack.pop();
  bStack.pop();
  return true;
}

// Perform a deep comparison to check if two objects are equal.
function isEqual(a, b) {
  return eq(a, b);
}// Retrieve all the enumerable property names of an object.
function allKeys(obj) {
  if (!isObject(obj)) return [];
  var keys = [];
  for (var key in obj) keys.push(key);
  // Ahem, IE < 9.
  if (hasEnumBug) collectNonEnumProps(obj, keys);
  return keys;
}// Retrieve the values of an object's properties.
function values(obj) {
  var _keys = keys(obj);
  var length = _keys.length;
  var values = Array(length);
  for (var i = 0; i < length; i++) {
    values[i] = obj[_keys[i]];
  }
  return values;
}// Convert an object into a list of `[key, value]` pairs.
// The opposite of `_.object` with one argument.
function pairs(obj) {
  var _keys = keys(obj);
  var length = _keys.length;
  var pairs = Array(length);
  for (var i = 0; i < length; i++) {
    pairs[i] = [_keys[i], obj[_keys[i]]];
  }
  return pairs;
}// Invert the keys and values of an object. The values must be serializable.
function invert(obj) {
  var result = {};
  var _keys = keys(obj);
  for (var i = 0, length = _keys.length; i < length; i++) {
    result[obj[_keys[i]]] = _keys[i];
  }
  return result;
}// Return a sorted list of the function names available on the object.
function functions(obj) {
  var names = [];
  for (var key in obj) {
    if (isFunction$1(obj[key])) names.push(key);
  }
  return names.sort();
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
}// Extend a given object with all the properties in passed-in object(s).
var extend = createAssigner(allKeys);// Assigns a given object with all the own properties in the passed-in
// object(s).
// (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
var extendOwn = createAssigner(keys);// Fill in a given object with default properties.
var defaults = createAssigner(allKeys, true);// Create a naked function reference for surrogate-prototype-swapping.
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
}// Creates an object that inherits from the given prototype object.
// If additional properties are provided then they will be added to the
// created object.
function create(prototype, props) {
  var result = baseCreate(prototype);
  if (props) extendOwn(result, props);
  return result;
}// Create a (shallow-cloned) duplicate of an object.
function clone(obj) {
  if (!isObject(obj)) return obj;
  return isArray(obj) ? obj.slice() : extend({}, obj);
}// Invokes `interceptor` with the `obj` and then returns `obj`.
// The primary purpose of this method is to "tap into" a method chain, in
// order to perform operations on intermediate results within the chain.
function tap(obj, interceptor) {
  interceptor(obj);
  return obj;
}// Shortcut function for checking if an object has a given property directly on
// itself (in other words, not on a prototype). Unlike the internal `has`
// function, this public version can also traverse nested properties.
function has$1(obj, path) {
  if (!isArray(path)) {
    return has(obj, path);
  }
  var length = path.length;
  for (var i = 0; i < length; i++) {
    var key = path[i];
    if (obj == null || !hasOwnProperty.call(obj, key)) {
      return false;
    }
    obj = obj[key];
  }
  return !!length;
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
}// Internal function to obtain a nested property in `obj` along `path`.
function deepGet(obj, path) {
  var length = path.length;
  for (var i = 0; i < length; i++) {
    if (obj == null) return void 0;
    obj = obj[path[i]];
  }
  return length ? obj : void 0;
}// Creates a function that, when passed an object, will traverse that object’s
// properties down the given `path`, specified as an array of keys or indices.
function property(path) {
  if (!isArray(path)) {
    return shallowProperty(path);
  }
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
}// Returns the results of applying the `iteratee` to each element of `obj`.
// In contrast to `_.map` it returns an object.
function mapObject(obj, iteratee, context) {
  iteratee = cb(iteratee, context);
  var _keys = keys(obj),
      length = _keys.length,
      results = {};
  for (var index = 0; index < length; index++) {
    var currentKey = _keys[index];
    results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
  }
  return results;
}// Predicate-generating function. Often useful outside of Underscore.
function noop(){}// Generates a function for a given object that returns a given property.
function propertyOf(obj) {
  if (obj == null) {
    return function(){};
  }
  return function(path) {
    return !isArray(path) ? obj[path] : deepGet(obj, path);
  };
}// Run a function **n** times.
function times(n, iteratee, context) {
  var accum = Array(Math.max(0, n));
  iteratee = optimizeCb(iteratee, context, 1);
  for (var i = 0; i < n; i++) accum[i] = iteratee(i);
  return accum;
}// Return a random integer between `min` and `max` (inclusive).
function random(min, max) {
  if (max == null) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}// A (possibly faster) way to get the current timestamp as an integer.
var now = Date.now || function() {
  return new Date().getTime();
};// Internal helper to generate functions for escaping and unescaping strings
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
var _escape = createEscaper(escapeMap);// Internal list of HTML entities for unescaping.
var unescapeMap = invert(escapeMap);// Function for unescaping strings from HTML interpolation.
var _unescape = createEscaper(unescapeMap);// By default, Underscore uses ERB-style template delimiters. Change the
// following template settings to use alternative delimiters.
var templateSettings = _.templateSettings = {
  evaluate: /<%([\s\S]+?)%>/g,
  interpolate: /<%=([\s\S]+?)%>/g,
  escape: /<%-([\s\S]+?)%>/g
};// When customizing `_.templateSettings`, if you don't want to define an
// interpolation, evaluation or escaping regex, we need one that is
// guaranteed not to match.
var noMatch = /(.)^/;

// Certain characters need to be escaped so that they can be put into a
// string literal.
var escapes = {
  "'": "'",
  '\\': '\\',
  '\r': 'r',
  '\n': 'n',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

function escapeChar(match) {
  return '\\' + escapes[match];
}

// JavaScript micro-templating, similar to John Resig's implementation.
// Underscore templating handles arbitrary delimiters, preserves whitespace,
// and correctly escapes quotes within interpolated code.
// NB: `oldSettings` only exists for backwards compatibility.
function template(text, settings, oldSettings) {
  if (!settings && oldSettings) settings = oldSettings;
  settings = defaults({}, settings, _.templateSettings);

  // Combine delimiters into one regular expression via alternation.
  var matcher = RegExp([
    (settings.escape || noMatch).source,
    (settings.interpolate || noMatch).source,
    (settings.evaluate || noMatch).source
  ].join('|') + '|$', 'g');

  // Compile the template source, escaping string literals appropriately.
  var index = 0;
  var source = "__p+='";
  text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
    source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
    index = offset + match.length;

    if (escape) {
      source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
    } else if (interpolate) {
      source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
    } else if (evaluate) {
      source += "';\n" + evaluate + "\n__p+='";
    }

    // Adobe VMs need the match returned to produce the correct offset.
    return match;
  });
  source += "';\n";

  // If a variable is not specified, place data values in local scope.
  if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

  source = "var __t,__p='',__j=Array.prototype.join," +
    "print=function(){__p+=__j.call(arguments,'');};\n" +
    source + 'return __p;\n';

  var render;
  try {
    render = new Function(settings.variable || 'obj', '_', source);
  } catch (e) {
    e.source = source;
    throw e;
  }

  var template = function(data) {
    return render.call(this, data, _);
  };

  // Provide the compiled source as a convenience for precompilation.
  var argument = settings.variable || 'obj';
  template.source = 'function(' + argument + '){\n' + source + '}';

  return template;
}// Traverses the children of `obj` along `path`. If a child is a function, it
// is invoked with its parent as context. Returns the value of the final
// child, or `fallback` if any child is undefined.
function result(obj, path, fallback) {
  if (!isArray(path)) path = [path];
  var length = path.length;
  if (!length) {
    return isFunction$1(fallback) ? fallback.call(obj) : fallback;
  }
  for (var i = 0; i < length; i++) {
    var prop = obj == null ? void 0 : obj[path[i]];
    if (prop === void 0) {
      prop = fallback;
      i = length; // Ensure we don't continue iterating.
    }
    obj = isFunction$1(prop) ? prop.call(obj) : prop;
  }
  return obj;
}// Generate a unique integer id (unique within the entire client session).
// Useful for temporary DOM ids.
var idCounter = 0;
function uniqueId(prefix) {
  var id = ++idCounter + '';
  return prefix ? prefix + id : id;
}// Start chaining a wrapped Underscore object.
function chain(obj) {
  var instance = _(obj);
  instance._chain = true;
  return instance;
}// Internal function to execute `sourceFunc` bound to `context` with optional
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
});// Internal implementation of a recursive `flatten` function.
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
var bindAll = restArguments(function(obj, keys) {
  keys = flatten(keys, false, false);
  var index = keys.length;
  if (index < 1) throw new Error('bindAll must be passed function names');
  while (index--) {
    var key = keys[index];
    obj[key] = bind(obj[key], obj);
  }
  return obj;
});// Memoize an expensive function by storing its results.
function memoize(func, hasher) {
  var memoize = function(key) {
    var cache = memoize.cache;
    var address = '' + (hasher ? hasher.apply(this, arguments) : key);
    if (!has(cache, address)) cache[address] = func.apply(this, arguments);
    return cache[address];
  };
  memoize.cache = {};
  return memoize;
}// Delays a function for the given number of milliseconds, and then calls
// it with the arguments supplied.
var delay = restArguments(function(func, wait, args) {
  return setTimeout(function() {
    return func.apply(null, args);
  }, wait);
});// Defers a function, scheduling it to run after the current call stack has
// cleared.
var defer = partial(delay, _, 1);// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
function throttle(func, wait, options) {
  var timeout, context, args, result;
  var previous = 0;
  if (!options) options = {};

  var later = function() {
    previous = options.leading === false ? 0 : now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };

  var throttled = function() {
    var _now = now();
    if (!previous && options.leading === false) previous = _now;
    var remaining = wait - (_now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = _now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };

  throttled.cancel = function() {
    clearTimeout(timeout);
    previous = 0;
    timeout = context = args = null;
  };

  return throttled;
}// When a sequence of calls of the returned function ends, the argument
// function is triggered. The end of a sequence is defined by the `wait`
// parameter. If `immediate` is passed, the argument function will be
// triggered at the beginning of the sequence instead of at the end.
function debounce(func, wait, immediate) {
  var timeout, result;

  var later = function(context, args) {
    timeout = null;
    if (args) result = func.apply(context, args);
  };

  var debounced = restArguments(function(args) {
    if (timeout) clearTimeout(timeout);
    if (immediate) {
      var callNow = !timeout;
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(this, args);
    } else {
      timeout = delay(later, wait, this, args);
    }

    return result;
  });

  debounced.cancel = function() {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}// Returns the first function passed as an argument to the second,
// allowing you to adjust arguments, run code before and after, and
// conditionally execute the original function.
function wrap(func, wrapper) {
  return partial(wrapper, func);
}// Returns a negated version of the passed-in predicate.
function negate(predicate) {
  return function() {
    return !predicate.apply(this, arguments);
  };
}// Returns a function that is the composition of a list of functions, each
// consuming the return value of the function that follows.
function compose() {
  var args = arguments;
  var start = args.length - 1;
  return function() {
    var i = start;
    var result = args[start].apply(this, arguments);
    while (i--) result = args[i].call(this, result);
    return result;
  };
}// Returns a function that will only be executed on and after the Nth call.
function after(times, func) {
  return function() {
    if (--times < 1) {
      return func.apply(this, arguments);
    }
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
var once = partial(before, 2);// Returns the first key on an object that passes a truth test.
function findKey(obj, predicate, context) {
  predicate = cb(predicate, context);
  var _keys = keys(obj), key;
  for (var i = 0, length = _keys.length; i < length; i++) {
    key = _keys[i];
    if (predicate(obj[key], key, obj)) return key;
  }
}// Internal function to generate `_.findIndex` and `_.findLastIndex`.
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
var findIndex = createPredicateIndexFinder(1);// Returns the last index on an array-like that passes a truth test.
var findLastIndex = createPredicateIndexFinder(-1);// Use a comparator function to figure out the smallest index at which
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
var indexOf = createIndexFinder(1, findIndex, sortedIndex);// Return the position of the last occurrence of an item in an array,
// or -1 if the item is not included in the array.
var lastIndexOf = createIndexFinder(-1, findLastIndex);// Return the first value which passes a truth test.
function find(obj, predicate, context) {
  var keyFinder = isArrayLike(obj) ? findIndex : findKey;
  var key = keyFinder(obj, predicate, context);
  if (key !== void 0 && key !== -1) return obj[key];
}// Convenience version of a common use case of `_.find`: getting the first
// object containing specific `key:value` pairs.
function findWhere(obj, attrs) {
  return find(obj, matcher(attrs));
}// The cornerstone for collection functions, an `each`
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
}// Internal helper to create a reducing function, iterating left or right.
function createReduce(dir) {
  // Wrap code that reassigns argument variables in a separate function than
  // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
  var reducer = function(obj, iteratee, memo, initial) {
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length,
        index = dir > 0 ? 0 : length - 1;
    if (!initial) {
      memo = obj[_keys ? _keys[index] : index];
      index += dir;
    }
    for (; index >= 0 && index < length; index += dir) {
      var currentKey = _keys ? _keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  return function(obj, iteratee, memo, context) {
    var initial = arguments.length >= 3;
    return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
  };
}// **Reduce** builds up a single result from a list of values, aka `inject`,
// or `foldl`.
var reduce = createReduce(1);// The right-associative version of reduce, also known as `foldr`.
var reduceRight = createReduce(-1);// Return all the elements that pass a truth test.
function filter(obj, predicate, context) {
  var results = [];
  predicate = cb(predicate, context);
  each$1(obj, function(value, index, list) {
    if (predicate(value, index, list)) results.push(value);
  });
  return results;
}// Return all the elements for which a truth test fails.
function reject(obj, predicate, context) {
  return filter(obj, negate(cb(predicate)), context);
}// Determine whether all of the elements pass a truth test.
function every(obj, predicate, context) {
  predicate = cb(predicate, context);
  var _keys = !isArrayLike(obj) && keys(obj),
      length = (_keys || obj).length;
  for (var index = 0; index < length; index++) {
    var currentKey = _keys ? _keys[index] : index;
    if (!predicate(obj[currentKey], currentKey, obj)) return false;
  }
  return true;
}// Determine if at least one element in the object passes a truth test.
function some(obj, predicate, context) {
  predicate = cb(predicate, context);
  var _keys = !isArrayLike(obj) && keys(obj),
      length = (_keys || obj).length;
  for (var index = 0; index < length; index++) {
    var currentKey = _keys ? _keys[index] : index;
    if (predicate(obj[currentKey], currentKey, obj)) return true;
  }
  return false;
}// Determine if the array or object contains a given item (using `===`).
function contains(obj, item, fromIndex, guard) {
  if (!isArrayLike(obj)) obj = values(obj);
  if (typeof fromIndex != 'number' || guard) fromIndex = 0;
  return indexOf(obj, item, fromIndex) >= 0;
}// Invoke a method (with arguments) on every item in a collection.
var invoke = restArguments(function(obj, path, args) {
  var contextPath, func;
  if (isFunction$1(path)) {
    func = path;
  } else if (isArray(path)) {
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
}// Convenience version of a common use case of `_.filter`: selecting only
// objects containing specific `key:value` pairs.
function where(obj, attrs) {
  return filter(obj, matcher(attrs));
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
}// Return the minimum element (or element-based computation).
function min(obj, iteratee, context) {
  var result = Infinity, lastComputed = Infinity,
      value, computed;
  if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
    obj = isArrayLike(obj) ? obj : values(obj);
    for (var i = 0, length = obj.length; i < length; i++) {
      value = obj[i];
      if (value != null && value < result) {
        result = value;
      }
    }
  } else {
    iteratee = cb(iteratee, context);
    each$1(obj, function(v, index, list) {
      computed = iteratee(v, index, list);
      if (computed < lastComputed || computed === Infinity && result === Infinity) {
        result = v;
        lastComputed = computed;
      }
    });
  }
  return result;
}// Sample **n** random values from a collection using the modern version of the
// [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
// If **n** is not specified, returns a single random element.
// The internal `guard` argument allows it to work with `_.map`.
function sample(obj, n, guard) {
  if (n == null || guard) {
    if (!isArrayLike(obj)) obj = values(obj);
    return obj[random(obj.length - 1)];
  }
  var sample = isArrayLike(obj) ? clone(obj) : values(obj);
  var length = getLength(sample);
  n = Math.max(Math.min(n, length), 0);
  var last = length - 1;
  for (var index = 0; index < n; index++) {
    var rand = random(index, last);
    var temp = sample[index];
    sample[index] = sample[rand];
    sample[rand] = temp;
  }
  return sample.slice(0, n);
}// Shuffle a collection.
function shuffle(obj) {
  return sample(obj, Infinity);
}// Sort the object's values by a criterion produced by an iteratee.
function sortBy(obj, iteratee, context) {
  var index = 0;
  iteratee = cb(iteratee, context);
  return pluck(map(obj, function(value, key, list) {
    return {
      value: value,
      index: index++,
      criteria: iteratee(value, key, list)
    };
  }).sort(function(left, right) {
    var a = left.criteria;
    var b = right.criteria;
    if (a !== b) {
      if (a > b || a === void 0) return 1;
      if (a < b || b === void 0) return -1;
    }
    return left.index - right.index;
  }), 'value');
}// An internal function used for aggregate "group by" operations.
function group(behavior, partition) {
  return function(obj, iteratee, context) {
    var result = partition ? [[], []] : {};
    iteratee = cb(iteratee, context);
    each$1(obj, function(value, index) {
      var key = iteratee(value, index, obj);
      behavior(result, value, key);
    });
    return result;
  };
}// Groups the object's values by a criterion. Pass either a string attribute
// to group by, or a function that returns the criterion.
var groupBy = group(function(result, value, key) {
  if (has(result, key)) result[key].push(value); else result[key] = [value];
});// Indexes the object's values by a criterion, similar to `_.groupBy`, but for
// when you know that your index values will be unique.
var indexBy = group(function(result, value, key) {
  result[key] = value;
});// Counts instances of an object that group by a certain criterion. Pass
// either a string attribute to count by, or a function that returns the
// criterion.
var countBy = group(function(result, value, key) {
  if (has(result, key)) result[key]++; else result[key] = 1;
});// Split a collection into two arrays: one whose elements all pass the given
// truth test, and one whose elements all do not pass the truth test.
var partition = group(function(result, value, pass) {
  result[pass ? 0 : 1].push(value);
}, true);// Safely create a real, live array from anything iterable.
var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
function toArray(obj) {
  if (!obj) return [];
  if (isArray(obj)) return slice.call(obj);
  if (isString(obj)) {
    // Keep surrogate pair characters together.
    return obj.match(reStrSymbol);
  }
  if (isArrayLike(obj)) return map(obj, identity);
  return values(obj);
}// Return the number of elements in a collection.
function size(obj) {
  if (obj == null) return 0;
  return isArrayLike(obj) ? obj.length : keys(obj).length;
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
var omit = restArguments(function(obj, keys) {
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
});// Returns everything but the last entry of the array. Especially useful on
// the arguments object. Passing **n** will return all the values in
// the array, excluding the last N.
function initial(array, n, guard) {
  return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
}// Get the first element of an array. Passing **n** will return the first N
// values in the array. The **guard** check allows it to work with `_.map`.
function first(array, n, guard) {
  if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
  if (n == null || guard) return array[0];
  return initial(array, array.length - n);
}// Returns everything but the first entry of the `array`. Especially useful on
// the `arguments` object. Passing an **n** will return the rest N values in the
// `array`.
function rest(array, n, guard) {
  return slice.call(array, n == null || guard ? 1 : n);
}// Get the last element of an array. Passing **n** will return the last N
// values in the array.
function last(array, n, guard) {
  if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
  if (n == null || guard) return array[array.length - 1];
  return rest(array, Math.max(0, array.length - n));
}// Trim out all falsy values from an array.
function compact(array) {
  return filter(array, Boolean);
}// Flatten out an array, either recursively (by default), or up to `depth`.
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
var without = restArguments(function(array, otherArrays) {
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
var union = restArguments(function(arrays) {
  return uniq(flatten(arrays, true, true));
});// Produce an array that contains every item shared between all the
// passed-in arrays.
function intersection(array) {
  var result = [];
  var argsLength = arguments.length;
  for (var i = 0, length = getLength(array); i < length; i++) {
    var item = array[i];
    if (contains(result, item)) continue;
    var j;
    for (j = 1; j < argsLength; j++) {
      if (!contains(arguments[j], item)) break;
    }
    if (j === argsLength) result.push(item);
  }
  return result;
}// Complement of zip. Unzip accepts an array of arrays and groups
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
var zip = restArguments(unzip);// Converts lists into objects. Pass either a single array of `[key, value]`
// pairs, or two parallel arrays of the same length -- one of keys, and one of
// the corresponding values. Passing by pairs is the reverse of `_.pairs`.
function object(list, values) {
  var result = {};
  for (var i = 0, length = getLength(list); i < length; i++) {
    if (values) {
      result[list[i]] = values[i];
    } else {
      result[list[i][0]] = list[i][1];
    }
  }
  return result;
}// Generate an integer Array containing an arithmetic progression. A port of
// the native Python `range()` function. See
// [the Python documentation](https://docs.python.org/library/functions.html#range).
function range(start, stop, step) {
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
}// Chunk a single array into multiple arrays, each containing `count` or fewer
// items.
function chunk(array, count) {
  if (count == null || count < 1) return [];
  var result = [];
  var i = 0, length = array.length;
  while (i < length) {
    result.push(slice.call(array, i, i += count));
  }
  return result;
}// Helper function to continue chaining intermediate results.
function chainResult(instance, obj) {
  return instance._chain ? _(obj).chain() : obj;
}// Add your own custom functions to the Underscore object.
function mixin(obj) {
  each$1(functions(obj), function(name) {
    var func = _[name] = obj[name];
    _.prototype[name] = function() {
      var args = [this._wrapped];
      push.apply(args, arguments);
      return chainResult(this, func.apply(_, args));
    };
  });
  return _;
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
});// Named Exports
var allExports=/*#__PURE__*/Object.freeze({__proto__:null,VERSION: VERSION,restArguments: restArguments,isObject: isObject,isNull: isNull,isUndefined: isUndefined,isBoolean: isBoolean,isElement: isElement,isString: isString,isNumber: isNumber,isDate: isDate,isRegExp: isRegExp,isError: isError,isSymbol: isSymbol,isMap: isMap,isWeakMap: isWeakMap,isSet: isSet,isWeakSet: isWeakSet,isArrayBuffer: isArrayBuffer,isDataView: isDataView,isArray: isArray,isFunction: isFunction$1,isArguments: isArguments$1,isFinite: isFinite$1,isNaN: isNaN$1,isTypedArray: isTypedArray$1,isEmpty: isEmpty,isMatch: isMatch,isEqual: isEqual,keys: keys,allKeys: allKeys,values: values,pairs: pairs,invert: invert,functions: functions,methods: functions,extend: extend,extendOwn: extendOwn,assign: extendOwn,defaults: defaults,create: create,clone: clone,tap: tap,has: has$1,mapObject: mapObject,identity: identity,constant: constant,noop: noop,property: property,propertyOf: propertyOf,matcher: matcher,matches: matcher,times: times,random: random,now: now,escape: _escape,unescape: _unescape,templateSettings: templateSettings,template: template,result: result,uniqueId: uniqueId,chain: chain,iteratee: iteratee,partial: partial,bind: bind,bindAll: bindAll,memoize: memoize,delay: delay,defer: defer,throttle: throttle,debounce: debounce,wrap: wrap,negate: negate,compose: compose,after: after,before: before,once: once,findKey: findKey,findIndex: findIndex,findLastIndex: findLastIndex,sortedIndex: sortedIndex,indexOf: indexOf,lastIndexOf: lastIndexOf,find: find,detect: find,findWhere: findWhere,each: each$1,forEach: each$1,map: map,collect: map,reduce: reduce,foldl: reduce,inject: reduce,reduceRight: reduceRight,foldr: reduceRight,filter: filter,select: filter,reject: reject,every: every,all: every,some: some,any: some,contains: contains,includes: contains,include: contains,invoke: invoke,pluck: pluck,where: where,max: max,min: min,shuffle: shuffle,sample: sample,sortBy: sortBy,groupBy: groupBy,indexBy: indexBy,countBy: countBy,partition: partition,toArray: toArray,size: size,pick: pick,omit: omit,first: first,head: first,take: first,initial: initial,last: last,rest: rest,tail: rest,drop: rest,compact: compact,flatten: flatten$1,without: without,uniq: uniq,unique: uniq,union: union,intersection: intersection,difference: difference,unzip: unzip,transpose: unzip,zip: zip,object: object,range: range,chunk: chunk,mixin: mixin,'default': _});// Default Export

// Add all of the Underscore functions to the wrapper object.
var _$1 = mixin(allExports);
// Legacy Node.js API.
_$1._ = _$1;/* globals Globalize */
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

_$1.each(MONTHS, function (abbr, m) {
  _$1.each(abbr, function (a) {
  });
});

rx.MMM = {
  parse: new RegExp('(' + _$1.flatten(_$1.values(MONTHS)).join('|') + ')')
};

_$1.each(rx, function (r) {
  r.parse = r.parse.source;
  if (_$1.isRegExp(r.test)) r.test = r.test.source;else r.test = r.parse;
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
function random$1(a) {
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
function min$1(array) {
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
    RANDOM: random$1,

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
      return min$1(v);
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
}();var e="-ms-";var r="-moz-";var a="-webkit-";var c="comm";var n="rule";var t="decl";var i="@import";var p="@keyframes";var k=Math.abs;var d=String.fromCharCode;function m(e,r){return (((r<<2^z(e,0))<<2^z(e,1))<<2^z(e,2))<<2^z(e,3)}function g(e){return e.trim()}function x(e,r){return (e=r.exec(e))?e[0]:e}function y(e,r,a){return e.replace(r,a)}function j(e,r){return e.indexOf(r)}function z(e,r){return e.charCodeAt(r)|0}function C(e,r,a){return e.slice(r,a)}function A(e){return e.length}function M(e){return e.length}function O(e,r){return r.push(e),e}function S(e,r){return e.map(r).join("")}var q=1;var B=1;var D=0;var E=0;var F=0;var G="";function H(e,r,a,c,n,t,s){return {value:e,root:r,parent:a,type:c,props:n,children:t,line:q,column:B,length:s,return:""}}function I(e,r,a){return H(e,r.root,r.parent,a,r.props,r.children,0)}function J(){return F}function K(){F=E<D?z(G,E++):0;if(B++,F===10)B=1,q++;return F}function L(){return z(G,E)}function N(){return E}function P(e,r){return C(G,e,r)}function Q(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function R(e){return q=B=1,D=A(G=e),E=0,[]}function T(e){return G="",e}function U(e){return g(P(E-1,Y(e===91?e+2:e===40?e+1:e)))}function W(e){while(F=L())if(F<33)K();else break;return Q(e)>2||Q(F)>3?"":" "}function Y(e){while(K())switch(F){case e:return E;case 34:case 39:return Y(e===34||e===39?e:F);case 40:if(e===41)Y(e);break;case 92:K();break}return E}function Z(e,r){while(K())if(e+F===47+10)break;else if(e+F===42+42&&L()===47)break;return "/*"+P(r,E-1)+"*"+d(e===47?e:K())}function _$2(e){while(!Q(L()))K();return P(e,E)}function ee(e){return T(re("",null,null,null,[""],e=R(e),0,[0],e))}function re(e,r,a,c,n,t,s,u,i){var f=0;var o=0;var l=s;var v=0;var h=0;var p=0;var w=1;var b=1;var $=1;var k=0;var m="";var g=n;var x=t;var j=c;var z=m;while(b)switch(p=k,k=K()){case 34:case 39:case 91:case 40:z+=U(k);break;case 9:case 10:case 13:case 32:z+=W(p);break;case 47:switch(L()){case 42:case 47:O(ce(Z(K(),N()),r,a),i);break;default:z+="/";}break;case 123*w:u[f++]=A(z)*$;case 125*w:case 59:case 0:switch(k){case 0:case 125:b=0;case 59+o:if(h>0)O(h>32?ne(z+";",c,a,l-1):ne(y(z," ","")+";",c,a,l-2),i);break;case 59:z+=";";default:O(j=ae(z,r,a,f,o,n,u,m,g=[],x=[],l),t);if(k===123)if(o===0)re(z,r,j,j,g,t,l,u,x);else switch(v){case 100:case 109:case 115:re(e,j,j,c&&O(ae(e,j,j,0,0,n,u,m,n,g=[],l),x),n,x,l,u,c?g:x);break;default:re(z,j,j,j,[""],x,l,u,x);}}f=o=h=0,w=$=1,m=z="",l=s;break;case 58:l=1+A(z),h=p;default:switch(z+=d(k),k*w){case 38:$=o>0?1:(z+="\f",-1);break;case 44:u[f++]=(A(z)-1)*$,$=1;break;case 64:if(L()===45)z+=U(K());v=L(),o=A(m=z+=_$2(N())),k++;break;case 45:if(p===45&&A(z)==2)w=0;}}return t}function ae(e,r,a,c,t,s,u,i,f,o,l){var v=t-1;var h=t===0?s:[""];var p=M(h);for(var w=0,b=0,$=0;w<c;++w)for(var d=0,m=C(e,v+1,v=k(b=u[w])),x=e;d<p;++d)if(x=g(b>0?h[d]+" "+m:y(m,/&\f/g,h[d])))f[$++]=x;return H(e,r,a,t===0?n:i,f,o,l)}function ce(e,r,a){return H(e,r,a,c,d(J()),C(e,2,-2),0)}function ne(e,r,a,c){return H(e,r,a,t,C(e,0,c),C(e,c+1,-1),c)}function te(c,n){switch(m(c,n)){case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return a+c+c;case 5349:case 4246:case 4810:case 6968:case 2756:return a+c+r+c+e+c+c;case 6828:case 4268:return a+c+e+c+c;case 6165:return a+c+e+"flex-"+c+c;case 5187:return a+c+y(c,/(\w+).+(:[^]+)/,a+"box-$1$2"+e+"flex-$1$2")+c;case 5443:return a+c+e+"flex-item-"+y(c,/flex-|-self/,"")+c;case 4675:return a+c+e+"flex-line-pack"+y(c,/align-content|flex-|-self/,"")+c;case 5548:return a+c+e+y(c,"shrink","negative")+c;case 5292:return a+c+e+y(c,"basis","preferred-size")+c;case 6060:return a+"box-"+y(c,"-grow","")+a+c+e+y(c,"grow","positive")+c;case 4554:return a+y(c,/([^-])(transform)/g,"$1"+a+"$2")+c;case 6187:return y(y(y(c,/(zoom-|grab)/,a+"$1"),/(image-set)/,a+"$1"),c,"")+c;case 5495:case 3959:return y(c,/(image-set\([^]*)/,a+"$1"+"$`$1");case 4968:return y(y(c,/(.+:)(flex-)?(.*)/,a+"box-pack:$3"+e+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+a+c+c;case 4095:case 3583:case 4068:case 2532:return y(c,/(.+)-inline(.+)/,a+"$1$2")+c;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(A(c)-1-n>6)switch(z(c,n+1)){case 102:n=z(c,n+3);case 109:return y(c,/(.+:)(.+)-([^]+)/,"$1"+a+"$2-$3"+"$1"+r+(n==108?"$3":"$2-$3"))+c;case 115:return ~j(c,"stretch")?te(y(c,"stretch","fill-available"),n)+c:c}break;case 4949:if(z(c,n+1)!==115)break;case 6444:switch(z(c,A(c)-3-(~j(c,"!important")&&10))){case 107:case 111:return y(c,c,a+c)+c;case 101:return y(c,/(.+:)([^;!]+)(;|!.+)?/,"$1"+a+(z(c,14)===45?"inline-":"")+"box$3"+"$1"+a+"$2$3"+"$1"+e+"$2box$3")+c}break;case 5936:switch(z(c,n+11)){case 114:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"tb")+c;case 108:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"tb-rl")+c;case 45:return a+c+e+y(c,/[svh]\w+-[tblr]{2}/,"lr")+c}return a+c+e+c+c}return c}function se(e,r){var a="";var c=M(e);for(var n=0;n<c;n++)a+=r(e[n],n,e,r)||"";return a}function ue(e,r,a,s){switch(e.type){case i:case t:return e.return=e.return||e.value;case c:return "";case n:e.value=e.props.join(",");}return A(a=se(e.children,s))?e.return=e.value+"{"+a+"}":""}function ie(e){var r=M(e);return function(a,c,n,t){var s="";for(var u=0;u<r;u++)s+=e[u](a,c,n,t)||"";return s}}function fe(e){return function(r){if(!r.root)if(r=r.return)e(r);}}function oe(c,s,u,i){if(!c.return)switch(c.type){case t:c.return=te(c.value,c.length);break;case p:return se([I(y(c.value,"@","@"+a),c,"")],i);case n:if(c.length)return S(c.props,(function(n){switch(x(n,/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":return se([I(y(n,/:(read-\w+)/,":"+r+"$1"),c,"")],i);case"::placeholder":return se([I(y(n,/:(plac\w+)/,":"+a+"input-$1"),c,""),I(y(n,/:(plac\w+)/,":"+r+"$1"),c,""),I(y(n,/:(plac\w+)/,e+"input-$1"),c,"")],i)}return ""}))}}var weakMemoize = function weakMemoize(func) {
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
};function memoize$1(fn) {
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
    switch (Q(character)) {
      case 0:
        // &\f
        if (character === 38 && L() === 12) {
          // this is not 100% correct, we don't account for literal sequences here - like for example quoted strings
          // stylis inserts \f after & to know when & where it should replace this sequence with the context selector
          // and when it should just concatenate the outer and inner selectors
          // it's very unlikely for this sequence to actually appear in a different context, so we just leverage this fact here
          points[index] = 1;
        }

        parsed[index] += _$2(E - 1);
        break;

      case 2:
        parsed[index] += U(character);
        break;

      case 4:
        // comma
        if (character === 44) {
          // colon
          parsed[++index] = L() === 58 ? '&\f' : '';
          points[index] = parsed[index].length;
          break;
        }

      // fallthrough

      default:
        parsed[index] += d(character);
    }
  } while (character = K());

  return parsed;
};

var getRules = function getRules(value, points) {
  return T(toRules(R(value), points));
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
  return memoize$1(function () {
    var cache = {};
    return function (name) {
      return cache[name];
    };
  });
});
var defaultStylisPlugins = [oe];

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
    var finalizingPlugins = [ue,  fe(function (rule) {
      currentSheet.insert(rule);
    })];
    var serializer = ie(omnipresentPlugins.concat(stylisPlugins, finalizingPlugins));

    var stylis = function stylis(styles) {
      return se(ee(styles), serializer);
    };

    _insert = function insert(selector, serialized, sheet, shouldCache) {
      currentSheet = sheet;

      stylis(selector ? selector + "{" + serialized.styles + "}" : serialized.styles);

      if (shouldCache) {
        cache.inserted[serialized.name] = true;
      }
    };
  } else {
    var _finalizingPlugins = [ue];

    var _serializer = ie(omnipresentPlugins.concat(stylisPlugins, _finalizingPlugins));

    var _stylis = function _stylis(styles) {
      return se(ee(styles), _serializer);
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

var processStyleName = /* #__PURE__ */memoize$1(function (styleName) {
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

var labelPattern = /label:\s*([^\s;\n{]+)\s*;/g;
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

function byPriority(a, b) {
  return (a.priority !== undefined ? a.priority : 999) - (b.priority !== undefined ? b.priority : 999);
}

function getCaption(id) {
  if (id === "d3-maps-choropleth" || id === "d3-maps-symbols" || id === "locator-map") return "map";else if (id === "tables") return "table";
  return "chart";
}

const Visualization = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
  let {
    data = ""
  } = $$props;
  let {
    chartAttrs
  } = $$props;
  let {
    visualization = {}
  } = $$props;
  let {
    theme = {}
  } = $$props;
  let {
    locales = {}
  } = $$props;
  let {
    translations
  } = $$props;
  let {
    blocks = {}
  } = $$props;
  let {
    chartAfterBodyHTML = ""
  } = $$props;
  let {
    isIframe
  } = $$props;
  let {
    isPreview
  } = $$props;
  let {
    assets
  } = $$props;
  let {
    fonts = {}
  } = $$props;
  let {
    styleHolder
  } = $$props;
  let {
    origin
  } = $$props;
  let {
    isStylePlain = false
  } = $$props;
  let {
    isStyleStatic = false
  } = $$props; // .dw-chart-body

  let target, chart, vis;
  const coreBlocks = [{
    id: "headline",
    tag: "h1",
    region: "header",
    priority: 10,
    test: ({
      chartAttrs
    }) => chartAttrs.title && !get(chartAttrs, "metadata.describe.hide-title"),
    component: Headline
  }, {
    id: "description",
    tag: "p",
    region: "header",
    priority: 20,
    test: ({
      chartAttrs
    }) => get(chartAttrs, "metadata.describe.intro"),
    component: Description
  }, {
    id: "notes",
    region: "aboveFooter",
    priority: 10,
    test: ({
      chartAttrs
    }) => get(chartAttrs, "metadata.annotate.notes"),
    component: Notes
  }, {
    id: "byline",
    region: "footerLeft",
    test: ({
      chartAttrs
    }) => get(chartAttrs, "metadata.describe.byline", false) || chartAttrs.basedOnByline,
    priority: 10,
    component: Byline
  }, {
    id: "source",
    region: "footerLeft",
    test: ({
      chartAttrs
    }) => get(chartAttrs, "metadata.describe.source-name"),
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
      return get(theme, "data.options.watermark") ? field ? get(chartAttrs, `metadata.custom.${field}`, "") : get(theme, "data.options.watermark.text", "CONFIDENTIAL") : false;
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

  async function loadBlocks(blocks) {
    if (blocks.length) {
      function url(src) {
        return origin && src.indexOf("http") !== 0 ? `${origin}/${src}` : src;
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
            const url = err.target ? err.target.getAttribute("src") || err.target.getAttribute("href") : null;
            if (url) console.warn("could not load ", url);else console.error("Unknown error", err); // but resolve anyway

            resolve();
          });
        });
      })); // all scripts are loaded

      blocks.forEach(d => {
        d.blocks.forEach(block => {
          if (!dw.block.has(block.component)) {
            return console.warn(`component ${block.component} from chart block ${block.id} not found`);
          }

          pluginBlocks.push({ ...block,
            component: dw.block(block.component)
          });
        });
      }); // trigger svelte update after modifying array

      pluginBlocks = pluginBlocks;
    }
  }

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

    dw.theme.register(theme.id, theme.data); // register locales

    Object.keys(locales).forEach(vendor => {
      // eslint-disable-next-line
      locales[vendor] = eval(locales[vendor]);
    }); // initialize dw.chart object

    chart = dw.chart(chartAttrs).locale((chartAttrs.language || "en-US").substr(0, 2)).translations(translations).theme(dw.theme(chartAttrs.theme)); // register chart assets

    for (var id in assets) {
      chart.asset(id, assets[id]);
    } // initialize dw.vis object


    vis = dw.visualization(visualization.id);
    vis.meta = visualization;
    vis.lang = chartAttrs.language || "en-US"; // load chart data

    await chart.load(data || "", isPreview ? undefined : chartAttrs.externalData);
    chart.locales = locales;
    chart.vis(vis); // load & register blocks (but don't await them, because they
    // are not needed for initial chart rendering

    loadBlocks(blocks); // initialize emotion instance

    if (!chart.emotion) {
      chart.emotion = createEmotion({
        key: `datawrapper-${chartAttrs.id}`,
        container: isIframe ? document.head : styleHolder
      });
    } // render chart


    chart.render(target, vis, isIframe, isPreview); // await necessary reload triggers

    observeFonts(fonts, theme.data.typography).then(() => chart.render(target, vis, isIframe, isPreview)).catch(() => chart.render(target, vis, isIframe, isPreview)); // iPhone/iPad fix

    if (/iP(hone|od|ad)/.test(navigator.platform)) {
      window.onload = chart.render(target, vis, isIframe, isPreview);
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
      } // fire events on hashchange


      domReady(() => {
        const postEvent$1 = postEvent(chartAttrs.id);
        window.addEventListener("hashchange", () => {
          postEvent$1("hash.change", {
            hash: window.location.hash
          });
        });
      }); // watch for height changes - still needed?

      let currentHeight = document.body.offsetHeight;
      afterUpdate(() => {
        const newHeight = document.body.offsetHeight;

        if (currentHeight !== newHeight && typeof render === "function") {
          render();
          currentHeight = newHeight;
        }
      }); // provide external APIs

      if (isIframe) {
        window.__dw = window.__dw || {};
        window.__dw.params = {
          data
        };
        window.__dw.vis = vis;

        window.__dw.render = () => {
          chart.render(target, vis, isIframe, isPreview);
        };
      }
    }
  });
  let contentBelowChart;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.chartAttrs === void 0 && $$bindings.chartAttrs && chartAttrs !== void 0) $$bindings.chartAttrs(chartAttrs);
  if ($$props.visualization === void 0 && $$bindings.visualization && visualization !== void 0) $$bindings.visualization(visualization);
  if ($$props.theme === void 0 && $$bindings.theme && theme !== void 0) $$bindings.theme(theme);
  if ($$props.locales === void 0 && $$bindings.locales && locales !== void 0) $$bindings.locales(locales);
  if ($$props.translations === void 0 && $$bindings.translations && translations !== void 0) $$bindings.translations(translations);
  if ($$props.blocks === void 0 && $$bindings.blocks && blocks !== void 0) $$bindings.blocks(blocks);
  if ($$props.chartAfterBodyHTML === void 0 && $$bindings.chartAfterBodyHTML && chartAfterBodyHTML !== void 0) $$bindings.chartAfterBodyHTML(chartAfterBodyHTML);
  if ($$props.isIframe === void 0 && $$bindings.isIframe && isIframe !== void 0) $$bindings.isIframe(isIframe);
  if ($$props.isPreview === void 0 && $$bindings.isPreview && isPreview !== void 0) $$bindings.isPreview(isPreview);
  if ($$props.assets === void 0 && $$bindings.assets && assets !== void 0) $$bindings.assets(assets);
  if ($$props.fonts === void 0 && $$bindings.fonts && fonts !== void 0) $$bindings.fonts(fonts);
  if ($$props.styleHolder === void 0 && $$bindings.styleHolder && styleHolder !== void 0) $$bindings.styleHolder(styleHolder);
  if ($$props.origin === void 0 && $$bindings.origin && origin !== void 0) $$bindings.origin(origin);
  if ($$props.isStylePlain === void 0 && $$bindings.isStylePlain && isStylePlain !== void 0) $$bindings.isStylePlain(isStylePlain);
  if ($$props.isStyleStatic === void 0 && $$bindings.isStyleStatic && isStyleStatic !== void 0) $$bindings.isStyleStatic(isStyleStatic);
  let blockProps = {
    __,
    purifyHtml: clean,
    get,
    theme,
    data,
    chartAttrs,
    chart,
    vis,
    caption
  };
  let allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps);

   {
    {
      // build all the region
      regions = {
        header: getBlocks(allBlocks, "header", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        aboveFooter: getBlocks(allBlocks, "aboveFooter", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        footerLeft: getBlocks(allBlocks, "footerLeft", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        footerCenter: getBlocks(allBlocks, "footerCenter", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        footerRight: getBlocks(allBlocks, "footerRight", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        belowFooter: getBlocks(allBlocks, "belowFooter", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        afterBody: getBlocks(allBlocks, "afterBody", {
          chartAttrs,
          data,
          theme,
          isStyleStatic
        }),
        menu: getBlocks(allBlocks, "menu", {
          chartAttrs,
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

  contentBelowChart = regions.aboveFooter.length || regions.footerLeft.length || regions.footerCenter.length || regions.footerRight.length || regions.belowFooter.length || regions.afterBody.length;
  return `${!isStylePlain ? `${validate_component(BlocksRegion, "BlocksRegion").$$render($$result, {
    name: "dw-chart-header",
    blocks: regions.header,
    id: "header"
  }, {}, {})}

    ${!isStyleStatic ? `${validate_component(Menu, "Menu").$$render($$result, {
    name: "dw-chart-menu",
    props: menu,
    blocks: regions.menu
  }, {}, {})}` : ``}` : ``}

<div id="${"chart"}" class="${["dw-chart-body", contentBelowChart ? "content-below-chart" : ""].join(" ").trim()}"${add_attribute("this", target, 1)}></div>

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

${chartAfterBodyHTML ? `${chartAfterBodyHTML}` : ``}`;
});return Visualization;})));