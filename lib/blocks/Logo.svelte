<script>
    // external props
    export let props;
    import LogoInner from './LogoInner.svelte';

    const { get, purifyHtml } = props;
    $: theme = props.theme;

    // internal props
    $: logo = get(theme, 'data.options.footer.logo');
</script>

{#if logo.link}
    <a href={logo.link} target="_blank" rel="noopener noreferrer">
        <LogoInner {logo} {purifyHtml} />
    </a>
{:else}
    <LogoInner {logo} {purifyHtml} />
{/if}
