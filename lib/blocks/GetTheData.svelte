<script>
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });
    $: externalData = get(chart, 'externalData');
</script>

{#if getTheData.enabled}
    <a
        class="dw-data-link"
        aria-label="{__(getTheData.caption)}: {purifyHtml(chart.title, '')}"
        target={externalData ? '_blank' : '_self'}
        href={externalData || 'data'}>
        {__(getTheData.caption)}
    </a>
{/if}
