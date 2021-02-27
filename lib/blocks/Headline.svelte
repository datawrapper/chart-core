<script>
    // external props
    export let props;
    const { purifyHtml } = props;
    $: chartAttrs = props.chartAttrs;

    $: headline = purifyHtml(chartAttrs.title);
</script>

{@html headline}
