<script>
    import Chart from './Chart.svelte';

    export let data = '';
    export let chart = {};
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let blocks = {};
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
</script>

<svelte:options tag="datawrapper-visualization" />

<link rel="stylesheet" href="http://charts.datawrapper.local/{chart.id}/styles.css" />

<div class="chart dw-chart">
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
</div>
