<script>
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: caption = get(theme, 'data.options.blocks.get-the-data.data.caption', __('Get the data'));
    $: externalData = get(chart, 'externalData');
</script>

<a
    class="dw-data-link"
    aria-label="{caption}: {purifyHtml(chart.title, '')}"
    target={externalData ? '_blank' : '_self'}
    href={externalData || 'data'}>
    {caption}
</a>
