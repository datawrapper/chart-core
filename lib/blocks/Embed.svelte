<script>
    import get from '@datawrapper/shared/get';

    export let chart;
    export let theme;
    export let data;
    export let caption;
    export let __;

    $: embed = get(theme, 'data.options.footer.embed', { enabled: false });
    $: embedCode = get(
        chart,
        'metadata.publish.embed-codes.embed-method-iframe',
        '<!-- embed code will be here after publishing -->'
    );

    let modalIsHidden = true;

    function handleClick(e) {
        e.preventDefault();
        modalIsHidden = !modalIsHidden;
    }

    function handleTextareaClick(e) {
        e.target.focus();
        e.target.select();
    }
</script>

{#if embed.enabled}
    <a href="#embed" class="chart-action-embed" on:click={handleClick}>{__(embed.caption)}</a>
    {#if !modalIsHidden}
        <div class="embed-code">
            <div class="close" on:click={handleClick}>×</div>
            <div>{embed.text || 'Please use the following HTML code to embed this chart:'}</div>
            <textarea on:click={handleTextareaClick}>{embedCode}</textarea>
        </div>
    {/if}
{/if}
