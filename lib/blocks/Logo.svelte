<script>
    // external props
    export let props;
    import LogoInner from './LogoInner.svelte';

    const { get, purifyHtml } = props;
    $: theme = props.theme;

    // internal props
    $: logo = get(theme, 'data.options.blocks.logo.data');
</script>

{#if logo.url}
    <a href={logo.url} target="_blank" rel="noopener noreferrer">
        <LogoInner {logo} {purifyHtml} {theme} />
    </a>
{:else}
    <LogoInner {logo} {purifyHtml} {theme} />
{/if}
