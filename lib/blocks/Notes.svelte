<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chartAttrs = props.chartAttrs;
</script>

{@html purifyHtml(get(chartAttrs, 'metadata.annotate.notes'))}
