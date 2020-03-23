<script>
    // external props
    export let props;
    const { get, purifyHtml } = props;
    $: theme = props.theme;

    // internal props
    function px(val) {
        return typeof val === 'string' ? val : val + 'px';
    }

    $: data = get(theme, 'data.options.blocks.rectangle.data', {});
    $: width = get(data, 'width', 50);
    $: height = get(data, 'height', 5);
    $: background = get(data, 'background', 'red');
</script>

<div style="width: {px(width)}; height: {px(height)}; background: {background};" />
