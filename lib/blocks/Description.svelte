<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chart = props.chart;

    const allowedTags =
        '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><table><thead><tbody><tfoot><caption><colgroup><col><tr><td><th>';

    // internal props
    $: description = purifyHtml(get(chart, 'metadata.describe.intro'), allowedTags);
</script>

{@html description}
