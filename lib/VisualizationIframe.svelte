<script>
    import Visualization from './Visualization.svelte';
    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import { domReady } from './dw/utils';
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
    let dwChart;

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

        window.__dw = window.__dw || {};
        window.__dw.params = { data };
        window.__dw.vis = vis;
        window.__dw.render = () => {
            dwChart.render(isIframe, isPreview);
        };
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
    bind:dwChart
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
    {isStylePlain}
    {isStyleStatic} />
