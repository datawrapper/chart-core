<script>
    // external props
    export let props;
    const { purifyHtml } = props;
    $: chart = props.chart;

    $: headline = purifyHtml(chart.title);
</script>

<h1>
    <span class="chart-title">
        {@html headline}
    </span>
</h1>
