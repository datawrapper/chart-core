<script>
    import get from '@datawrapper/shared/get';
    export let purifyHtml;
    export let chart;

    $: description = purifyHtml(get(chart, 'metadata.describe.intro'));
</script>

<p class="chart-intro">
    {@html description}
</p>
