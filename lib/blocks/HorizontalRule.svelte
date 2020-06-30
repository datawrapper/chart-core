<script>
    // external props
    export let props;
    const { get } = props;
    $: theme = props.theme;

    $: data = get(theme, `data.options.blocks.${props.id}.data`, {});
    $: border = get(data, 'border', '1px solid #cccccc');
</script>

<hr class="dw-line" style="border: 0; border-bottom: {border};" />
