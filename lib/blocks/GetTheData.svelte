<script>
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });
</script>

<a
    class="dw-data-link"
    aria-label="{__(getTheData.caption)}: {purifyHtml(chart.title, '')}"
    href="data">
    {__(getTheData.caption)}
</a>
