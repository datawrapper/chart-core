<script>
    // external props
    export let props;
    const { get, purifyHtml, __ } = props;
    $: chart = props.chart;
    $: theme = props.theme;
    $: caption = props.caption;

    // internal props
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
    {byline}
{/if}

{#if chart.basedOnByline}
    {#if needBrackets}({/if}
    {__(forkCaption)}
    {@html purifyHtml(chart.basedOnByline)}
    {#if needBrackets}){/if}
{/if}
