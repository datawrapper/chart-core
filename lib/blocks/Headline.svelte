<script>
    export let chart;
    export let purifyHtml;

    $: headline = purifyHtml(chart.title);
</script>

<h1>
    <span class="chart-title">
        {@html headline}
    </span>
</h1>
