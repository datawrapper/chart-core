<script>
    // external props
    export let props;
    const { get } = props;
    $: theme = props.theme;

    // internal props
    $: logo = get(theme, 'data.options.footer.logo', { enabled: false });
</script>

{#if logo.enabled && logo.position === 'right'}
    {#if logo.url}
        <img height={logo.height} src={logo.url} alt={theme.title} />
    {/if}
    {#if logo.text}
        <span class="logo-text">{logo.text}</span>
    {/if}
{/if}
