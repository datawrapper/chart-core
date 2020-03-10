<script>
    import get from '@datawrapper/shared/get';

    export let chart;
    export let theme;
    export let data;
    export let caption;

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
