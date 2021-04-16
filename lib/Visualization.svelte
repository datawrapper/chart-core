<script>
    import { onMount, afterUpdate, tick } from 'svelte';
    import BlocksRegion from './BlocksRegion.svelte';
    import Menu from './Menu.svelte';
    import Headline from './blocks/Headline.svelte';
    import Description from './blocks/Description.svelte';
    import Source from './blocks/Source.svelte';
    import Byline from './blocks/Byline.svelte';
    import Notes from './blocks/Notes.svelte';
    import GetTheData from './blocks/GetTheData.svelte';
    import Embed from './blocks/Embed.svelte';
    import Logo from './blocks/Logo.svelte';
    import Rectangle from './blocks/Rectangle.svelte';
    import Watermark from './blocks/Watermark.svelte';
    import HorizontalRule from './blocks/HorizontalRule.svelte';
    import svgRule from './blocks/svgRule.svelte';

    import { domReady } from './dw/utils';
    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import PostEvent from '@datawrapper/shared/postEvent';
    import observeFonts from '@datawrapper/shared/observeFonts';
    import { clean } from './shared';
    import { loadScript, loadStylesheet } from '@datawrapper/shared/fetch';
    import createEmotion from '@emotion/css/create-instance';
    import deepmerge from 'deepmerge';

    export let data = '';
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
    export let fonts = {};
    export let styleHolder;
    export let origin;

    // plain style means no header and footer
    export let isStylePlain = false;
    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    // .dw-chart-body
    let target, dwChart, vis;

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
            test: ({ theme, isStyleStatic }) =>
                get(theme, 'data.options.footer.getTheData.enabled') && !isStyleStatic,
            priority: 30,
            component: GetTheData
        },
        {
            id: 'embed',
            region: 'footerLeft',
            test: ({ theme, isStyleStatic }) =>
                get(theme, 'data.options.footer.embed.enabled') && !isStyleStatic,
            priority: 40,
            component: Embed
        },
        {
            id: 'logo',
            region: 'footerRight',
            test: ({ theme }) => get(theme, 'data.options.footer.logo.enabled'),
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
        if (blocks.length) {
            function url(src) {
                return origin && src.indexOf('http') !== 0 ? `${origin}/${src}` : src;
            }

            await Promise.all(
                blocks.map(d => {
                    return new Promise((resolve, reject) => {
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

        let translation = locales[key] || key;

        if (args.length) {
            translation = translation.replace(/\$(\d)/g, (m, i) => {
                i = +i;
                return args[i] || m;
            });
        }

        return translation;
    }

    let initialized = false;

    async function run() {
        if (typeof dw === 'undefined') return;
        if (initialized) return;

        // register theme
        dw.theme.register(theme.id, theme.data);

        // register locales
        Object.keys(locales).forEach(vendor => {
            if (locales[vendor] === 'null') {
                locales[vendor] = null;
            } else if (locales[vendor].base) {
                // eslint-disable-next-line
                const localeBase = eval(locales[vendor].base);
                locales[vendor] = deepmerge(localeBase, locales[vendor].custom);
            }
        });

        // initialize dw.chart object
        dwChart = dw
            .chart(chart)
            .locale((chart.language || 'en-US').substr(0, 2))
            .translations(translations)
            .theme(dw.theme(chart.theme));

        // register chart assets
        const assetPromises = [];
        for (var name in assets) {
            if (assets[name].cached) {
                assetPromises.push(
                    new Promise(async (resolve, reject) => {
                        const res = await fetch(assets[name].url);
                        const text = await res.text();
                        dwChart.asset(name, text);
                        resolve();
                    })
                );
            } else {
                dwChart.asset(name, assets[name].value);
            }
        }
        await Promise.all(assetPromises);

        // initialize dw.vis object
        vis = dw.visualization(visualization.id, target);
        vis.meta = visualization;
        vis.lang = chart.language || 'en-US';

        // load chart data and assets
        await dwChart.load(data || '', isPreview ? undefined : chart.externalData);
        dwChart.locales = locales;
        dwChart.vis(vis);

        // load & register blocks (but don't await them, because they
        // are not needed for initial chart rendering
        loadBlocks(blocks);

        // initialize emotion instance
        if (!dwChart.emotion) {
            dwChart.emotion = createEmotion({
                key: `datawrapper-${chart.id}`,
                container: isIframe ? document.head : styleHolder
            });
        }

        // render chart
        dwChart.render(isIframe, isPreview);

        // await necessary reload triggers
        observeFonts(fonts, theme.data.typography)
            .then(() => dwChart.render(isIframe, isPreview))
            .catch(() => dwChart.render(isIframe, isPreview));

        // iPhone/iPad fix
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            window.onload = dwChart.render(isIframe, isPreview);
        }
    }

    onMount(async () => {
        run();

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
                if (currentHeight !== newHeight && typeof render === 'function') {
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
