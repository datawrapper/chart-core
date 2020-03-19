<script>
    import get from '@datawrapper/shared/get';

    export let purifyHtml;
    export let chart;
    export let data;
    export let theme;
    export let caption;
    export let __;
</script>

<div class="dw-chart-notes">
    {@html purifyHtml(get(chart, 'metadata.annotate.notes'))}
</div>
