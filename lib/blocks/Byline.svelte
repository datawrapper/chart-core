<script>
    // external props
    export let props;
    const { get, purifyHtml, __ } = props;
    $: chart = props.chart;
    $: theme = props.theme;
    $: caption = props.caption;

    // internal props
    $: bylineCaption = get(
        theme,
        `data.options.blocks.byline.data.${caption}Caption`,
        __(caption === 'map' ? 'Map:' : caption === 'table' ? 'Table:' : 'Chart:')
    );

    $: byline = get(chart, 'metadata.describe.byline', false);

    $: forkCaption = get(
        theme,
        'data.options.blocks.byline.data.forkCaption',
        __('footer / based-on')
    );

    $: needBrackets = chart.basedOnByline && byline;

    $: basedOnByline =
        (needBrackets ? '(' : '') +
        forkCaption +
        ' ' +
        purifyHtml(chart.basedOnByline) +
        (needBrackets ? ')' : '');
</script>

<span class="byline-caption">{bylineCaption}</span>
{byline}
{#if chart.basedOnByline}
    {@html purifyHtml(basedOnByline)}
{/if}
