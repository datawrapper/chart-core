<script>
    // external props
    export let props;
    const { get, __ } = props;
    $: chart = props.chart;
    $: theme = props.theme;

    // internal props
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
            <textarea readonly on:click={handleTextareaClick}>{embedCode}</textarea>
        </div>
    {/if}
{/if}
