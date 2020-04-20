<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: theme = props.theme;

    // internal props
    $: logo = get(theme, 'data.options.footer.logo', { enabled: false });
</script>

{#if logo.enabled && logo.position === 'right'}
    {#if logo.link}
        <a href={logo.link} target="_blank" rel="noopener noreferrer">
            {#if logo.url}
                <img height={logo.height} src={logo.url} alt={theme.title} />
            {/if}
            {#if logo.text}
                <span class="logo-text">
                    {@html purifyHtml(logo.text)}
                </span>
            {/if}
        </a>
    {:else}
        {#if logo.url}
            <img height={logo.height} src={logo.url} alt={theme.title} />
        {/if}
        {#if logo.text}
            <span class="logo-text">
                {@html purifyHtml(logo.text)}
            </span>
        {/if}
    {/if}
{/if}
