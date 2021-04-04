<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chart = props.chart;
</script>

{@html purifyHtml(get(chart, 'metadata.annotate.notes'))}
