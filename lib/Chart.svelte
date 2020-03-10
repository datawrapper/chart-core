<script>
    import { onMount } from 'svelte';
    import Footer from './Footer.svelte';
    import Source from './blocks/Source.svelte';
    import Byline from './blocks/Byline.svelte';
    import Notes from './blocks/Notes.svelte';
    import GetTheData from './blocks/GetTheData.svelte';
    import Embed from './blocks/Embed.svelte';

    import get from '@datawrapper/shared/get';
    import render from './render.js';

    export let data = {};
    export let theme = {};
    export let translations = {};

    $: chart = data.chartJSON;

    const defaultBlocks = [
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
        }
    ];

    $: allBlocks = defaultBlocks; // todo: concat with plugin blocks

    $: blockProps = {
        __,
        theme,
        data,
        chart,
        caption
    };

    function byPriority(a, b) {
        return (a.priority || 99) - (b.priority || 99);
    }

    function getBlocks(allBlocks, region, props) {
        return allBlocks
            .filter(d => d.region === region)
            .filter(d => !d.test || d.test(props))
            .sort(byPriority);
    }

    let regions;
    $: {
        // build all the region
        regions = {
            aboveFooter: getBlocks(allBlocks, 'aboveFooter', { chart, data, theme }),
            footerLeft: getBlocks(allBlocks, 'footerLeft', { chart, data, theme }),
            footerCenter: getBlocks(allBlocks, 'footerCenter', { chart, data, theme }),
            footerRight: getBlocks(allBlocks, 'footerRight', { chart, data, theme })
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

        let translation = translations[key] || key;

        if (!translations[key]) {
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

    const { footer } = theme.data.options;

    if (data.basemapAttribution) footer.basemapAttribution = data.basemapAttribution;

    onMount(() => {
        document.body.classList.toggle('fullscreen', isStyleFullscreen);
        document.body.classList.toggle('plain', isStylePlain);

        if (isStyleNoPointer) {
            document.body.style['pointer-events'] = 'none';
        }

        dw.theme.register(theme.id, theme.data);

        const { basemap, minimap, highlight } = chart.data;
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
</svelte:head>

{#if !isStylePlain}
    <div id="header" class="dw-chart-header">
        {#if chart.title && !chart.metadata.describe['hide-title']}
            <h1>
                <span class="chart-title">
                    {@html chart.title}
                </span>
            </h1>
        {/if}
        {#if chart.metadata.describe.intro}
            <p class="chart-intro">
                {@html chart.metadata.describe.intro}
            </p>
        {/if}
    </div>
{/if}

<div id="chart" class="dw-chart-body" />

<!-- {#if !isStylePlain && chart.metadata.annotate.notes}

{/if} -->

{#if get(theme, 'data.template.afterChart')}
    {@html theme.data.template.afterChart}
{/if}

{#if !isStylePlain}
    <div class="dw-chart-above-footer">
        {#each regions.aboveFooter as block}
            <svelte:component this={block.component} {...blockProps} />
        {/each}
    </div>

    <div id="footer" class="dw-chart-footer">
        <div class="footer-left">
            {#each regions.footerLeft as block, i}
                {#if i}
                    <span class="separator" />
                {/if}
                <span class="footer-block {block.id}-block">
                    <svelte:component this={block.component} {...blockProps} />
                </span>
            {/each}
        </div>
        <div class="footer-center">
            {#each regions.footerCenter as block, i}
                {#if i}
                    <span class="separator" />
                {/if}
                <svelte:component this={block.component} {__} {theme} {caption} {chart} {data} />
            {/each}
        </div>
        <div class="footer-right">
            {#each regions.footerRight as block, i}
                {#if i}
                    <span class="separator" />
                {/if}
                <svelte:component this={block.component} {__} {theme} {caption} {chart} {data} />
            {/each}
        </div>
    </div>

    <!-- <div id="footer" class="dw-chart-footer">
        <div class="footer-left">
            {#if footer.logo.enabled && footer.logo.position === 'left' && footer.logo.url}
                <img height={footer.logo.height} src={footer.logo.url} alt={theme.title} />
            {/if}

            {#if footer.sourcePosition === 'left' || footer.sourcePosition === 'above-footer'}
                <Footer
                    chartId={chart.id}
                    data={footer}
                    embedCode={}
                    byline={chart.metadata.describe['byline']}
                    {chartBasedOn}
                    {caption}
                    {source}
                    {__} />
            {/if}
        </div>
        <div class="footer-right">
            {#if footer.sourcePosition && footer.sourcePosition === 'right'}
                <Footer
                    chartId={chart.id}
                    data={footer}
                    embedCode={get(chart, 'metadata.publish.embed-codes.embed-method-iframe')}
                    byline={chart.metadata.describe['byline']}
                    {chartBasedOn}
                    {caption}
                    {source}
                    {__} />
            {/if}

            {#if footer.logo.enabled && footer.logo.position === 'right'}
                {#if footer.logo.url}
                    <img height={footer.logo.height} src={footer.logo.url} alt={theme.title} />
                {/if}
                {#if footer.logo.text}
                    <span class="logo-text">{footer.logo.text}</span>
                {/if}
            {/if}
        </div>
    </div> -->
{/if}

{#if get(chart, 'data.chartAfterBodyHTML')}
    {@html chart.data.chartAfterBodyHTML}
{/if}
