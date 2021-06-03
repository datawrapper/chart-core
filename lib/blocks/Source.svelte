<script>
    // external props
    export let props;
    const { __, get, purifyHtml } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: caption = get(theme, 'data.options.blocks.source.data.caption', __('Source'));
    $: sourceName = purifyHtml(get(chart, 'metadata.describe.source-name'));
    $: sourceUrl = get(chart, 'metadata.describe.source-url');
</script>

{#if sourceName}
    <span class="source-caption">{caption}:</span>
    {#if sourceUrl}
        <a class="source" target="_blank" rel="noopener noreferrer" href={sourceUrl}>
            {@html sourceName}
        </a>
    {:else}
        <span class="source">
            {@html sourceName}
        </span>
    {/if}
{/if}
