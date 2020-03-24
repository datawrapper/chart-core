<script>
    // external props
    export let props;
    const { __, get, purifyHtml } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: footer = get(theme, 'data.options.footer');
    $: sourceName = purifyHtml(get(chart, 'metadata.describe.source-name'));
    $: sourceUrl = get(chart, 'metadata.describe.source-url');
</script>

{#if sourceName}
    <span class="source-caption">{__(footer.sourceCaption)}:</span>
    {#if sourceUrl}
        <a class="source" target="_blank" rel="noopener noreferrer" href={sourceUrl}>
            {@html sourceName}
        </a>
    {:else}
        {@html sourceName}
    {/if}
{/if}
