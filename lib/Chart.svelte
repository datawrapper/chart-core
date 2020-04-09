<script>
    import { onMount, tick } from 'svelte';
    import Headline from './blocks/Headline.svelte';
    import Description from './blocks/Description.svelte';
    import Source from './blocks/Source.svelte';
    import Byline from './blocks/Byline.svelte';
    import Notes from './blocks/Notes.svelte';
    import GetTheData from './blocks/GetTheData.svelte';
    import Embed from './blocks/Embed.svelte';
    import Logo from './blocks/Logo.svelte';
    import Rectangle from './blocks/Rectangle.svelte';

    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import { loadScript, loadStylesheet } from '@datawrapper/shared/fetch';
    import render from './render.js';

    export let data = {};
    export let theme = {};

    $: chart = data.chartJSON;
    $: publishData = data.publishData;
    $: locale = data.visJSON.locale;

    $: customCSS = purifyHtml(get(chart, 'metadata.publish.custom-css', ''), '');

    const clean = s => purifyHtml(s, '<a><span><b>');

    const coreBlocks = [
        {
            id: 'headline',
            region: 'header',
            priority: 10,
            test: ({ chart }) => chart.title && !get(chart, 'metadata.describe.hide-title'),
            component: Headline
        },
        {
            id: 'description',
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
            test: ({ theme }) => get(theme, 'data.options.footer.getTheData.enabled'),
            priority: 30,
            component: GetTheData
        },
        {
            id: 'embed',
            region: 'footerLeft',
            test: ({ theme }) => get(theme, 'data.options.footer.embed.enabled'),
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
            test: ({ theme }) => true, //!!get(theme, 'data.options.blocks.rectangle'),
            priority: 1,
            component: Rectangle
        }
    ];

    let pluginBlocks = [];

    $: allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps);

    $: blockProps = {
        __,
        purifyHtml,
        get,
        theme,
        data,
        chart,
        caption
    };

    function byPriority(a, b) {
        return (
            (a.priority !== undefined ? a.priority : 999) -
            (b.priority !== undefined ? b.priority : 999)
        );
    }

    function getBlocks(allBlocks, region, props) {
        return allBlocks
            .filter(d => d.region === region)
            .filter(d => !d.test || d.test(props))
            .filter(d => (d.visible !== undefined ? d.visible : true))
            .sort(byPriority);
    }

    function applyThemeBlockConfig(blocks, theme, blockProps) {
        return blocks.map(block => {
            block.props = {
                ...(block.data || {}),
                ...blockProps
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
            header: getBlocks(allBlocks, 'header', { chart, data, theme }),
            aboveFooter: getBlocks(allBlocks, 'aboveFooter', { chart, data, theme }),
            footerLeft: getBlocks(allBlocks, 'footerLeft', { chart, data, theme }),
            footerCenter: getBlocks(allBlocks, 'footerCenter', { chart, data, theme }),
            footerRight: getBlocks(allBlocks, 'footerRight', { chart, data, theme }),
            afterBody: getBlocks(allBlocks, 'afterBody', { chart, data, theme })
        };
    }

    export let isStylePlain = false;
    export let isStyleNoPointer = false;
    export let isStyleFullscreen = false;

    function getCaption(id) {
        if (id === 'd3-maps-choropleth' || id === 'd3-maps-symbols' || id === 'locator-map')
            return 'map';
        else if (id === 'tables') return 'table';
        return 'chart';
    }

    const caption = getCaption(data.visJSON.id);

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

        let translation = locale[key] || key;

        if (!locale[key]) {
            console.warn(`No translation available for key "${key}"`);
        }

        if (args.length) {
            translation = translation.replace(/\$(\d)/g, (m, i) => {
                i = +i;
                return args[i] || m;
            });
        }

        return translation;
    }

    onMount(async () => {
        document.body.classList.toggle('fullscreen', isStyleFullscreen);
        document.body.classList.toggle('plain', isStylePlain);

        if (isStyleNoPointer) {
            document.body.style['pointer-events'] = 'none';
        }

        dw.theme.register(theme.id, theme.data);

        const { basemap, minimap, highlight } = publishData;
        window.__dwParams = {};
        if (basemap) {
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

        render(data);

        // load & execute plugins
        window.__dwBlocks = {};
        if (publishData.blocks.length) {
            await Promise.all(
                publishData.blocks.map(d => {
                    const p = [loadScript(d.source.js)];
                    if (d.source.css) p.push(loadStylesheet(d.source.css));
                    return Promise.all(p);
                })
            );
            // all plugins are loaded
            publishData.blocks.forEach(d => {
                d.blocks.forEach(block => {
                    if (!window.__dwBlocks[block.component]) {
                        return console.warn(
                            `component ${block.component} for chart block ${block.id} not found`
                        );
                    }
                    pluginBlocks.push({
                        ...block,
                        component: window.__dwBlocks[block.component]
                    });
                });
            });
            // trigger svelte update after modifying array
            pluginBlocks = pluginBlocks;

            // re-render chart after loading blocks
            await tick();
            render(data);
        }
    });
</script>

<style>
    .separator {
        display: inline-block;
        font-style: initial;
    }
    .separator:before {
        content: '•';
        padding-left: 0.5ex;
        display: inline-block;
    }
</style>

<svelte:head>
    <title>{chart.title}</title>
    <meta name="description" content={get(chart, 'metadata.describe.intro')} />
    {@html `<${'style'}>${customCSS}</style>`}
</svelte:head>

{#if !isStylePlain}
    <div id="header" class="dw-chart-header">
        {#each regions.header as block}
            <div class="block block-{block.id}">
                {#if block.prepend}
                    <span class="prepend">
                        {@html clean(block.prepend)}
                    </span>
                {/if}
                <svelte:component this={block.component} props={block.props} />
                {#if block.append}
                    <span class="append">
                        {@html clean(block.append)}
                    </span>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<div id="chart" class="dw-chart-body" />

{#if get(theme, 'data.template.afterChart')}
    {@html theme.data.template.afterChart}
{/if}

{#if !isStylePlain}
    <div class="dw-chart-above-footer">
        {#each regions.aboveFooter as block}
            <div class="block block-{block.id}">
                {#if block.prepend}
                    <span class="prepend">
                        {@html clean(block.prepend)}
                    </span>
                {/if}
                <svelte:component this={block.component} props={block.props} />
                {#if block.append}
                    <span class="append">
                        {@html clean(block.append)}
                    </span>
                {/if}
            </div>
        {/each}
    </div>

    <div id="footer" class="dw-chart-footer">
        {#each ['Left', 'Center', 'Right'] as orientation}
            <div class="footer-{orientation.toLowerCase()}">
                {#each regions['footer' + orientation] as block, i}
                    {#if i}
                        <span class="separator" />
                    {/if}
                    <span class="footer-block {block.id}-block">
                        {#if block.prepend}
                            <span class="prepend">
                                {@html clean(block.prepend)}
                            </span>
                        {/if}
                        <svelte:component this={block.component} props={block.props} />
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
{/if}

{#each regions.afterBody as block}
    <svelte:component this={block.component} props={block.props} />
{/each}

{#if publishData.chartAfterBodyHTML}
    {@html publishData.chartAfterBodyHTML}
{/if}
