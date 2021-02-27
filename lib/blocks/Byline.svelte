<script>
    // external props
    export let props;
    const { get, purifyHtml, __ } = props;
    $: chartAttrs = props.chartAttrs;
    $: theme = props.theme;
    $: caption = props.caption;

    // internal props
    $: bylineCaption =
        caption === 'map'
            ? get(theme, 'data.options.footer.mapCaption', 'Map:')
            : caption === 'table'
            ? get(theme, 'data.options.footer.tableCaption', 'Table:')
            : get(theme, 'data.options.footer.chartCaption', 'Chart:');

    $: byline = get(chartAttrs, 'metadata.describe.byline', false);

    $: forkCaption = get(theme, 'data.options.footer.forkCaption', 'footer / based-on');

    $: needBrackets = chartAttrs.basedOnByline && byline;

    $: basedOnByline =
        (needBrackets ? '(' : '') +
        __(forkCaption) +
        ' ' +
        purifyHtml(chartAttrs.basedOnByline) +
        (needBrackets ? ')' : '');

    function capitalize(str) {
        if (typeof str !== 'string') return '';
        return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
    }
</script>

<span class="byline-caption">{__(bylineCaption)}</span>
{byline}
{#if chartAttrs.basedOnByline}
    {@html purifyHtml(basedOnByline)}
{/if}
