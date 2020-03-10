<script>
    import get from '@datawrapper/shared/get';

    export let chart;
    export let theme;
    export let data;
    export let caption;
    export let __;

    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });
</script>

{#if getTheData.enabled}
    <a class="dw-data-link" href="data">{__(getTheData.caption)}</a>
{/if}
