<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: chart = props.chart;
</script>

<div class="dw-chart-notes">
    {@html purifyHtml(get(chart, 'metadata.annotate.notes'))}
</div>
