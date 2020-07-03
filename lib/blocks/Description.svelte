<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chart = props.chart;

    // internal props
    $: description = purifyHtml(get(chart, 'metadata.describe.intro'));
</script>

{@html description}
