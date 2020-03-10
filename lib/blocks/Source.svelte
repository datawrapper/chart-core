<script>
    import get from '@datawrapper/shared/get';

    export let chart;
    export let theme;
    export let data;
    export let caption;
    export let __;

    $: footer = theme.data.options.footer;

    $: sourceName = get(chart, 'metadata.describe.source-name');
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
