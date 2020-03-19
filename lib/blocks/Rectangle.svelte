<script>
    import get from '@datawrapper/shared/get';

    export let theme;

    function px(val) {
        return typeof val === 'string' ? val : val + 'px';
    }

    $: data = get(theme, 'data.options.blocks.rectangle.data', {});
    $: width = get(data, 'width', 50);
    $: height = get(data, 'height', 5);
    $: background = get(data, 'background', 'red');
</script>

<div style="width: {px(width)}; height: {px(height)}; background: {background};" />
