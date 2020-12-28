<script>
    import Chart from './Chart.svelte';
    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';

    export let data = '';
    export let chart = {};
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let blocks = {};
    export let chartAfterHeadHTML = '';
    export let chartAfterBodyHTML = '';
    export let isIframe;
    export let isPreview;
    export let basemap;
    export let minimap;
    export let highlight;
    export let fonts = {};

    // plain style means no header and footer
    export let isStylePlain = false;
    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    $: customCSS = purifyHtml(get(chart, 'metadata.publish.custom-css', ''), '');
</script>

<svelte:head>
    <title>{chart.title}</title>
    <meta name="description" content={get(chart, 'metadata.describe.intro')} />
    {@html `<${'style'}>${customCSS}</style>`}
    {#if chartAfterHeadHTML}
        {@html chartAfterHeadHTML}
    {/if}
</svelte:head>

<Chart
    {data}
    {chart}
    {visualization}
    {theme}
    {locales}
    {blocks}
    {chartAfterBodyHTML}
    {isIframe}
    {isPreview}
    {basemap}
    {minimap}
    {highlight}
    {fonts}
    {isStylePlain}
    {isStyleStatic} />
