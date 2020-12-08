<script>
    import { onMount } from 'svelte';
    // external props
    export let props;
    const { get } = props;
    let svg;
    let length = 0;

    onMount(() => {
        length = svg.getBoundingClientRect().width;
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => {
            length = svg.getBoundingClientRect().width;
        });
    }

    $: theme = props.theme;

    $: data = get(theme, `data.options.blocks.${props.id}.data`, {});
    $: margin = get(data, 'margin', '0px');
    $: color = get(data, 'color', '#000000');
    $: width = get(data, 'width', 1);
    $: strokeDasharray = get(data, 'strokeDasharray', 'none');
    $: strokeLinecap = get(data, 'strokeLinecap', 'butt');
</script>

<style type="text/css">
    svg {
        width: 100%;

        /*For IE*/
        overflow-x: hidden;
    }
</style>

<svg bind:this={svg} style="height:{Math.max(width, 1)}px; margin:{margin};">
    <line
        style="stroke:{color}; stroke-width:{width}; stroke-dasharray:{strokeDasharray};
        stroke-linecap: {strokeLinecap};"
        x1="0"
        y1={width / 2}
        x2={length}
        y2={width / 2} />
</svg>
