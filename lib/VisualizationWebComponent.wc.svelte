<script>
    import Visualization from './Visualization.svelte';

    export let data = '';
    export let chartAttrs = {};
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let translations;
    export let blocks = {};
    export let chartAfterBodyHTML = '';
    export let isPreview;
    export let assets;
    export let styles;
    export let origin;
    export let fonts = {};

    // plain style means no header and footer
    export let isStylePlain = false;
    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    let stylesLoaded = false;
    let styleHolder;

    // ensure styles are loaded before the vis is rendered to prevent flickering
    $: {
        if (!stylesLoaded && styleHolder && styles) {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = styles.css;
            styleHolder.appendChild(style);
            stylesLoaded = true;
        }
    }
</script>

<svelte:options tag={null} />

<div bind:this={styleHolder} />

{#if stylesLoaded}
    <div class="chart dw-chart">
        <Visualization
            {data}
            {chartAttrs}
            {visualization}
            {theme}
            {locales}
            {translations}
            {blocks}
            {chartAfterBodyHTML}
            isIframe={false}
            {isPreview}
            {assets}
            {origin}
            {fonts}
            {styleHolder}
            {isStylePlain}
            {isStyleStatic} />
    </div>
{/if}
