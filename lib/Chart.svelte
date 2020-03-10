<script>
    import { onMount } from 'svelte';
    import Footer from './Footer.svelte';

    import get from '@datawrapper/shared/get';
    import render from './render.js';

    export let data = {};
    export let theme = {};
    export let translations = {};

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
    const chart = data.chartJSON;

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

    const source = {
        name: chart.metadata.describe['source-name'],
        url: chart.metadata.describe['source-url']
    };

    const { footer } = theme.data.options;

    if (data.basemapAttribution) footer.basemapAttribution = data.basemapAttribution;

    let forkCaption = get(theme, 'data.options.footer.forkCaption');
    if (!forkCaption) forkCaption = 'footer / based-on';

    const chartBasedOn = chart.basedOnByline
        ? {
              caption: forkCaption,
              byline: chart.basedOnByline
          }
        : null;

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

{#if !isStylePlain && chart.metadata.annotate.notes}
    <div class="dw-chart-notes">
        {@html chart.metadata.annotate.notes}
    </div>
{/if}

{#if source.name && theme.data.options.footer.sourcePosition === 'above-footer'}
    <span class="footer-block source-block">
        <span class="source-caption">{__(footer.sourceCaption)}:</span>
        {#if source.url}
            <a class="source" target="_blank" rel="noopener noreferrer" href={source.url}>
                {source.name}
            </a>
        {:else}{source.name}{/if}
    </span>
{/if}

{#if get(theme, 'data.template.afterChart')}
    {@html theme.data.template.afterChart}
{/if}

{#if !isStylePlain}
    <div id="footer" class="dw-chart-footer">
        <div class="footer-left">
            {#if footer.logo.enabled && footer.logo.position === 'left' && footer.logo.url}
                <img height={footer.logo.height} src={footer.logo.url} alt={theme.title} />
            {/if}

            {#if footer.sourcePosition === 'left' || footer.sourcePosition === 'above-footer'}
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
    </div>
{/if}

{#if get(chart, 'data.chartAfterBodyHTML')}
    {@html chart.data.chartAfterBodyHTML}
{/if}
