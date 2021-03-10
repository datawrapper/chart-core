<script>
    // external props
    import PostEvent from '@datawrapper/shared/postEvent';

    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, theme } = props);

    function onDownload() {
        const postEvent = PostEvent(chart.id);
        postEvent('data.download');
    }

    // internal props
    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });
</script>

{#if getTheData.enabled}
    <a
        class="dw-data-link"
        aria-label="{__(getTheData.caption)}: {purifyHtml(chart.title, '')}"
        on:click={onDownload}
        href="data">
        {__(getTheData.caption)}
    </a>
{/if}
