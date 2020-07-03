<script>
    // external props
    export let props;
    const { purifyHtml } = props;
    $: chart = props.chart;

    $: headline = purifyHtml(chart.title);
</script>

{@html headline}
