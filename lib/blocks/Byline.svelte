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

    $: basedOnByline =
        (needBrackets ? '(' : '') +
        __(forkCaption) +
        ' ' +
        purifyHtml(chart.basedOnByline) +
        (needBrackets ? ')' : '');
</script>

<span class="byline-caption">{__(bylineCaption)}</span>
{byline}
{#if chart.basedOnByline}
    {@html purifyHtml(basedOnByline)}
{/if}
