<script>
    import Visualization from './Visualization.svelte';
    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import { onMount } from 'svelte';

    export let data = '';
    export let chart = {};
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let translations;
    export let blocks = {};
    export let chartAfterHeadHTML = '';
    export let chartAfterBodyHTML = '';
    export let isPreview;
    export let assets;
    export let fonts = {};
    export let externalDataUrl;

    // plain style means no header and footer
    export let isStylePlain = false;

    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    $: customCSS = purifyHtml(get(chart, 'metadata.publish.custom-css', ''), '');

    window.__dwUpdate = newAttrs => {
        Object.assign(chart, newAttrs.chart);
        chart = chart; // to force re-rendering
    };

    onMount(async () => {
        document.body.classList.toggle('plain', isStylePlain);
        document.body.classList.toggle('static', isStyleStatic);
        // the body class "png-export" kept for backwards compatibility
        document.body.classList.toggle('png-export', isStyleStatic);
        if (isStyleStatic) {
            document.body.style['pointer-events'] = 'none';
        }
    });
</script>

<svelte:head>
    <title>{purifyHtml(chart.title, '')}</title>
    <meta name="description" content={get(chart, 'metadata.describe.intro')} />
    {@html `<${'style'}>${customCSS}</style>`}
    {#if chartAfterHeadHTML}
        {@html chartAfterHeadHTML}
    {/if}
</svelte:head>

<Visualization
    {data}
    {chart}
    {visualization}
    {theme}
    {locales}
    {translations}
    {blocks}
    {chartAfterBodyHTML}
    isIframe={true}
    {isPreview}
    {assets}
    {fonts}
    {externalDataUrl}
    {isStylePlain}
    {isStyleStatic} />
