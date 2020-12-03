<script>
    // external props
    export let props;
    const { get } = props;
    $: theme = props.theme;

    $: data = get(theme, `data.options.blocks.${props.id}.data`, {});
    $: margin = get(data, 'margin', '0px');
    $: color = get(data, 'color', '#000000');
    $: width = get(data, 'width', 1);
    $: strokeDasharray = get(data, 'strokeDasharray', 'none');
    $: strokeLinecap = get(data, 'strokeLinecap', 'butt');
</script>

<svg style="width:100%; height:{width}px; margin:{margin};">
    <line
        style="stroke:{color}; stroke-width:{width}; stroke-dasharray:{strokeDasharray};
        stroke-linecap: {strokeLinecap};"
        x1="0"
        y1={width / 2}
        x2="100%"
        y2={width / 2} />
</svg>
