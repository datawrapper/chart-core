<script>
    /* globals dw */
    import { onMount, afterUpdate } from 'svelte';
    import BlocksRegion from './BlocksRegion.svelte';
    import Menu from './Menu.svelte';
    import Headline from './blocks/Headline.svelte';
    import Description from './blocks/Description.svelte';
    import Source from './blocks/Source.svelte';
    import Byline from './blocks/Byline.svelte';
    import Notes from './blocks/Notes.svelte';
    import GetTheData from './blocks/GetTheData.svelte';
    import EditInDatawrapper from './blocks/EditInDatawrapper.svelte';
    import Embed from './blocks/Embed.svelte';
    import Logo from './blocks/Logo.svelte';
    import Rectangle from './blocks/Rectangle.svelte';
    import Watermark from './blocks/Watermark.svelte';
    import HorizontalRule from './blocks/HorizontalRule.svelte';
    import svgRule from './blocks/svgRule.svelte';

    import { domReady, width } from './dw/utils/index.mjs';
    import PostEvent from '@datawrapper/shared/postEvent.js';
    import observeFonts from '@datawrapper/shared/observeFonts.js';
    import createEmotion from '@emotion/css/create-instance/dist/emotion-css-create-instance.cjs.js';
    import deepmerge from 'deepmerge';
    import get from '@datawrapper/shared/get.js';
    import set from '@datawrapper/shared/set.js';
    import { loadScript, loadStylesheet } from '@datawrapper/shared/fetch.js';
    import purifyHtml from '@datawrapper/shared/purifyHtml.js';
    import { clean } from './shared.mjs';

    export let chart;
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let translations;
    export let blocks = {};
    export let chartAfterBodyHTML = '';
    export let isIframe;
    export let isPreview;
    export let assets;
    export let styleHolder;
    export let origin;
    export let externalDataUrl;
    export let outerContainer;

    // plain style means no header and footer
    export let isStylePlain = false;
    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    // can be on|off|auto (on/off will overwrite chart setting)
    export let forceLogo = 'auto';

    export let frontendDomain = 'app.datawrapper.de';

    // .dw-chart-body
    let target, dwChart, vis, data;

    $: {
        if (!get(chart, 'metadata.publish.blocks')) {
            // no footer settings found in metadata, apply theme defaults
            set(chart, 'metadata.publish.blocks', get(theme.data, 'metadata.publish.blocks'));
        }
    }

    $: ariaDescription = purifyHtml(
        get(chart, 'metadata.describe.aria-description', ''),
        '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>'
    );

    $: customCSS = purifyHtml(get(chart, 'metadata.publish.custom-css', ''), '');

    const coreBlocks = [
        {
            id: 'headline',
            tag: 'h1',
            region: 'header',
            priority: 10,
            test: ({ chart }) => chart.title && !get(chart, 'metadata.describe.hide-title'),
            component: Headline
        },
        {
            id: 'description',
            tag: 'p',
            region: 'header',
            priority: 20,
            test: ({ chart }) => get(chart, 'metadata.describe.intro'),
            component: Description
        },
        {
            id: 'notes',
            region: 'aboveFooter',
            priority: 10,
            test: ({ chart }) => get(chart, 'metadata.annotate.notes'),
            component: Notes
        },
        {
            id: 'byline',
            region: 'footerLeft',
            test: ({ chart }) =>
                get(chart, 'metadata.describe.byline', false) || chart.basedOnByline,
            priority: 10,
            component: Byline
        },
        {
            id: 'source',
            region: 'footerLeft',
            test: ({ chart }) => get(chart, 'metadata.describe.source-name'),
            priority: 20,
            component: Source
        },
        {
            id: 'get-the-data',
            region: 'footerLeft',
            test: ({ chart, isStyleStatic }) =>
                get(chart, 'metadata.publish.blocks.get-the-data') &&
                !isStyleStatic &&
                chart.type !== 'locator-map',
            priority: 30,
            component: GetTheData
        },
        {
            id: 'edit',
            region: 'footerLeft',
            test: ({ chart, isStyleStatic }) =>
                get(chart, 'forkable') &&
                get(chart, 'metadata.publish.blocks.edit-in-datawrapper', false) &&
                !isStyleStatic,
            priority: 31,
            component: EditInDatawrapper
        },
        {
            id: 'embed',
            region: 'footerLeft',
            test: ({ chart, isStyleStatic }) =>
                get(chart, 'metadata.publish.blocks.embed') && !isStyleStatic,
            priority: 40,
            component: Embed
        },
        {
            id: 'logo',
            region: 'footerRight',
            test: ({ chart, theme }) => {
                const logoData = get(theme, 'data.options.blocks.logo.data', {});
                // theme has no logo
                if (!logoData.imgSrc && !logoData.text) return false;
                if (forceLogo === 'on') return true;
                if (forceLogo === 'off') return false;
                return get(chart, 'metadata.publish.blocks.logo');
            },
            priority: 10,
            component: Logo
        },
        {
            id: 'rectangle',
            region: 'header',
            test: ({ theme }) => !!get(theme, 'data.options.blocks.rectangle'),
            priority: 1,
            component: Rectangle
        },
        {
            id: 'watermark',
            region: 'afterBody',
            test: ({ theme }) => {
                const field = get(theme, 'data.options.watermark.custom-field');
                return get(theme, 'data.options.watermark')
                    ? field
                        ? get(chart, `metadata.custom.${field}`, '')
                        : get(theme, 'data.options.watermark.text', 'CONFIDENTIAL')
                    : false;
            },
            priority: 1,
            component: Watermark
        },
        hr(0, 'hr'),
        hr(1, 'hr'),
        hr(2, 'hr'),
        hr(0, 'svg-rule'),
        hr(1, 'svg-rule'),
        hr(2, 'svg-rule')
    ];

    function hr(index, type) {
        const id = `${type}${index ? index : ''}`;
        return {
            id,
            region: 'header',
            test: ({ theme }) => !!get(theme, `data.options.blocks.${id}`),
            priority: 0,
            component: type === 'hr' ? HorizontalRule : svgRule
        };
    }

    let pluginBlocks = [];

    $: allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps);

    $: blockProps = {
        __,
        purifyHtml: clean,
        get,
        theme,
        data,
        chart,
        dwChart,
        vis,
        caption
    };

    function byPriority(a, b) {
        return (
            (a.priority !== undefined ? a.priority : 999) -
            (b.priority !== undefined ? b.priority : 999)
        );
    }

    async function loadBlocks(blocks) {
        function url(src) {
            return origin && src.indexOf('http') !== 0 ? `${origin}/${src}` : src;
        }

        if (blocks.length) {
            await Promise.all(
                blocks.map(d => {
                    return new Promise(resolve => {
                        const p = [loadScript(url(d.source.js))];

                        if (d.source.css) {
                            p.push(
                                loadStylesheet({
                                    src: url(d.source.css),
                                    parentElement: styleHolder
                                })
                            );
                        }

                        Promise.all(p)
                            .then(resolve)
                            .catch(err => {
                                // log error
                                const url = err.target
                                    ? err.target.getAttribute('src') ||
                                      err.target.getAttribute('href')
                                    : null;
                                if (url) console.warn('could not load ', url);
                                else console.error('Unknown error', err);
                                // but resolve anyway
                                resolve();
                            });
                    });
                })
            );

            // all scripts are loaded
            blocks.forEach(d => {
                d.blocks.forEach(block => {
                    if (!dw.block.has(block.component)) {
                        return console.warn(
                            `component ${block.component} from chart block ${block.id} not found`
                        );
                    }
                    pluginBlocks.push({
                        ...block,
                        component: dw.block(block.component)
                    });
                });
            });

            // trigger svelte update after modifying array
            pluginBlocks = pluginBlocks;
        }
    }

    function getBlocks(allBlocks, region, props) {
        return allBlocks
            .filter(d => d.region === region)
            .filter(d => !d.test || d.test({ ...d.props, ...props }))
            .filter(d => (d.visible !== undefined ? d.visible : true))
            .sort(byPriority);
    }

    function applyThemeBlockConfig(blocks, theme, blockProps) {
        return blocks.map(block => {
            block.props = {
                ...(block.data || {}),
                ...blockProps,
                config: { frontendDomain },
                id: block.id
            };
            if (block.component.test) {
                block.test = block.component.test;
            }
            const options = get(theme, 'data.options.blocks', {})[block.id];
            if (!options) return block;
            return {
                ...block,
                ...options
            };
        });
    }

    let regions;
    $: {
        // build all the region
        regions = {
            header: getBlocks(allBlocks, 'header', { chart, data, theme, isStyleStatic }),
            aboveFooter: getBlocks(allBlocks, 'aboveFooter', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            footerLeft: getBlocks(allBlocks, 'footerLeft', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            footerCenter: getBlocks(allBlocks, 'footerCenter', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            footerRight: getBlocks(allBlocks, 'footerRight', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            belowFooter: getBlocks(allBlocks, 'belowFooter', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            afterBody: getBlocks(allBlocks, 'afterBody', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            menu: getBlocks(allBlocks, 'menu', { chart, data, theme, isStyleStatic })
        };
    }

    let menu;
    $: {
        menu = get(theme, 'data.options.menu', {});
    }

    function getCaption(id) {
        if (id === 'd3-maps-choropleth' || id === 'd3-maps-symbols' || id === 'locator-map')
            return 'map';
        else if (id === 'tables') return 'table';
        return 'chart';
    }

    const caption = getCaption(visualization.id);

    function __(key, ...args) {
        if (typeof key !== 'string') {
            key = '';
            console.error(
                new TypeError(`function __ called without required 'key' parameter!
Please make sure you called __(key) with a key of type "string".
`)
            );
        }
        key = key.trim();

        let translation = translations[key] || key;

        if (args.length) {
            translation = translation.replace(/\$(\d)/g, (m, i) => {
                i = +i;
                return args[i] || m;
            });
        }

        return translation;
    }

    async function run() {
        if (typeof dw === 'undefined') return;

        // register theme
        dw.theme.register(theme.id, theme.data);

        // register locales
        Object.keys(locales).forEach(vendor => {
            if (locales[vendor] === 'null') {
                locales[vendor] = null;
            }
            if (locales[vendor] && locales[vendor].base) {
                // eslint-disable-next-line
                const localeBase = eval(locales[vendor].base);
                locales[vendor] = deepmerge(localeBase, locales[vendor].custom);
            }
        });

        const externalJSON =
            get(chart, 'metadata.data.use-datawrapper-cdn') &&
            get(chart, 'metadata.data.external-metadata', '').length
                ? `//${externalDataUrl}/${chart.id}.metadata.json`
                : get(chart, 'metadata.data.external-metadata');

        if (
            !isPreview &&
            externalJSON &&
            get(chart, 'metadata.data.upload-method') === 'external-data'
        ) {
            const res = await window.fetch(externalJSON);
            const obj = await res.json();

            if (obj.title) {
                chart.title = obj.title;
                delete obj.title;
            }

            Object.assign(chart.metadata, obj);
            chart = chart;
        }

        // initialize dw.chart object
        dwChart = dw
            .chart(chart)
            .locale((chart.language || 'en-US').substr(0, 2))
            .translations(translations)
            .theme(dw.theme(chart.theme));

        // register chart assets
        const assetPromises = [];
        for (var name in assets) {
            if (assets[name].url) {
                const assetName = name;
                assetPromises.push(
                    // eslint-disable-next-line
                    new Promise(async resolve => {
                        const res = await fetch(assets[assetName].url);
                        const text = await res.text();
                        dwChart.asset(assetName, text);
                        resolve();
                    })
                );
            } else {
                dwChart.asset(name, assets[name].value);
            }
        }
        await Promise.all(assetPromises);

        data = dwChart.asset(`dataset.${get(chart.metadata, 'data.json') ? 'json' : 'csv'}`);

        // initialize dw.vis object
        vis = dw.visualization(visualization.id, target);
        vis.meta = visualization;
        vis.lang = chart.language || 'en-US';

        // load chart data and assets
        await dwChart.load(data || '', isPreview ? undefined : chart.externalData);
        dwChart.locales = locales;
        dwChart.vis(vis);

        // load & register blocks
        await loadBlocks(blocks);

        // initialize emotion instance
        if (!dwChart.emotion) {
            dwChart.emotion = createEmotion.default({
                key: `datawrapper-${chart.id}`,
                container: isIframe ? document.head : styleHolder
            });
        }

        // render chart
        dwChart.render(isIframe, outerContainer);

        // await necessary reload triggers
        observeFonts(theme.fonts, theme.data.typography)
            .then(() => dwChart.render(isIframe, outerContainer))
            .catch(() => dwChart.render(isIframe, outerContainer));

        // iPhone/iPad fix
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            window.onload = dwChart.render(isIframe, outerContainer);
        }

        isIframe && initResizeHandler(target);

        function initResizeHandler(container) {
            let reloadTimer;

            function resize() {
                clearTimeout(reloadTimer);
                reloadTimer = setTimeout(function() {
                    dwChart.vis().fire('resize');
                    dwChart.render(isIframe, outerContainer);
                }, 200);
            }

            let currentWidth = width(container);
            const resizeFixed = () => {
                const w = width(container);
                if (currentWidth !== w) {
                    currentWidth = w;
                    resize();
                }
            };

            const fixedHeight = dwChart.getHeightMode() === 'fixed';
            const resizeHandler = fixedHeight ? resizeFixed : resize;

            window.addEventListener('resize', resizeHandler);
        }
    }

    onMount(async () => {
        await run();

        if (isIframe) {
            // set some classes - still needed?
            document.body.classList.toggle('plain', isStylePlain);
            document.body.classList.toggle('static', isStyleStatic);
            document.body.classList.toggle('png-export', isStyleStatic);
            if (isStyleStatic) {
                document.body.style['pointer-events'] = 'none';
            }

            // fire events on hashchange
            domReady(() => {
                const postEvent = PostEvent(chart.id);
                window.addEventListener('hashchange', () => {
                    postEvent('hash.change', { hash: window.location.hash });
                });
            });

            // watch for height changes - still needed?
            let currentHeight = document.body.offsetHeight;
            afterUpdate(() => {
                const newHeight = document.body.offsetHeight;
                if (currentHeight !== newHeight && typeof dwChart.render === 'function') {
                    dwChart.render(isIframe, outerContainer);
                    currentHeight = newHeight;
                }
            });

            // provide external APIs
            window.__dw = window.__dw || {};
            window.__dw.params = { data, visJSON: visualization };
            window.__dw.vis = vis;
            window.__dw.render = () => {
                dwChart.render(isIframe, outerContainer);
            };
            window.fontsJSON = theme.fonts;
        }
    });

    let contentBelowChart;
    $: contentBelowChart =
        regions.aboveFooter.length ||
        regions.footerLeft.length ||
        regions.footerCenter.length ||
        regions.footerRight.length ||
        regions.belowFooter.length ||
        regions.afterBody.length;
</script>

{#if !isStylePlain}
    <BlocksRegion name="dw-chart-header" blocks={regions.header} id="header" />

    {#if !isStyleStatic}
        <Menu name="dw-chart-menu" props={menu} blocks={regions.menu} />
    {/if}
{/if}

{#if ariaDescription}
    <div class="sr-only">
        {@html ariaDescription}
    </div>
{/if}

<div
    id="chart"
    bind:this={target}
    class:content-below-chart={contentBelowChart}
    aria-hidden={!!ariaDescription}
    class="dw-chart-body" />

{#if get(theme, 'data.template.afterChart')}
    {@html theme.data.template.afterChart}
{/if}

{#if !isStylePlain}
    <BlocksRegion name="dw-above-footer" blocks={regions.aboveFooter} />

    <div id="footer" class="dw-chart-footer">
        {#each ['Left', 'Center', 'Right'] as orientation}
            <div class="footer-{orientation.toLowerCase()}">
                {#each regions['footer' + orientation] as block, i}
                    {#if i}
                        <span class="separator separator-before-{block.id}" />
                    {/if}
                    <span class="footer-block {block.id}-block">
                        {#if block.prepend}
                            <span class="prepend">
                                {@html clean(block.prepend)}
                            </span>
                        {/if}
                        <span class="block-inner">
                            <svelte:component this={block.component} props={block.props} />
                        </span>
                        {#if block.append}
                            <span class="append">
                                {@html clean(block.append)}
                            </span>
                        {/if}
                    </span>
                {/each}
            </div>
        {/each}
    </div>

    <BlocksRegion name="dw-below-footer" blocks={regions.belowFooter} />
{/if}

<div class="dw-after-body">
    {#each regions.afterBody as block}
        <svelte:component this={block.component} props={block.props} />
    {/each}
</div>

{#if chartAfterBodyHTML}
    {@html chartAfterBodyHTML}
{/if}
