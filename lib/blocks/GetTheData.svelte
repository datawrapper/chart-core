<script>
    // external props
    export let props;
    const { get, __ } = props;
    $: theme = props.theme;

    // internal props
    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });
</script>

{#if getTheData.enabled}
    <a class="dw-data-link" href="data">{__(getTheData.caption)}</a>
{/if}
