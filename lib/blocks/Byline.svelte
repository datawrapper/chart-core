<script>
    export let chart;
    export let theme;
    export let data;
    export let caption;
    export let __;
    import get from '@datawrapper/shared/get';

    $: bylineCaption =
        caption === 'map'
            ? get(theme, 'data.options.footer.mapCaption', 'Map:')
            : caption === 'table'
            ? get(theme, 'data.options.footer.tableCaption', 'Table:')
            : get(theme, 'data.options.footer.chartCaption', 'Chart:');

    $: byline = get(chart, 'metadata.describe.byline', false);

    $: forkCaption = get(theme, 'data.options.footer.forkCaption', 'footer / based-on');

    $: needBrackets = chart.basedOnByline && byline;

    function capitalize(str) {
        if (typeof str !== 'string') return '';
        return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
    }
</script>

{#if byline}
    <span class="byline-caption">{__(bylineCaption)}</span>
    {@html byline}
{/if}

{#if chart.basedOnByline}
    {#if needBrackets}({/if}
    {__(forkCaption)}
    {@html chart.basedOnByline}
    {#if needBrackets}){/if}
{/if}
