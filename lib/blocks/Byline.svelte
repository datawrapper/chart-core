<script>
    // external props
    export let props;
    const { get, purifyHtml, __ } = props;
    $: chart = props.chart;
    $: theme = props.theme;
    $: caption = props.caption;

    // internal props
    $: fallBackCaption = caption === 'map' ? 'Map:' : caption === 'table' ? 'Table:' : 'Chart:';
    $: bylineCaption = get(
        theme,
        `data.options.blocks.byline.data.${caption}Caption`,
        fallBackCaption
    );

    $: byline = get(chart, 'metadata.describe.byline', false);

    $: forkCaption = get(theme, 'data.options.blocks.byline.data.forkCaption', 'footer / based-on');

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
