<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chartAttrs = props.chartAttrs;

    const allowedTags =
        '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>';

    // internal props
    $: description = purifyHtml(get(chartAttrs, 'metadata.describe.intro'), allowedTags);
</script>

{@html description}
