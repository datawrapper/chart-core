<script>
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import estimateTextWidth from '@datawrapper/shared/estimateTextWidth';

    export let text;
    export let monospace;

    let width;
    let height;

    $: angle = -Math.atan(height / width);
    $: angleDeg = (angle * 180) / Math.PI;

    $: diagonal = Math.sqrt(width * width + height * height);

    // estimateTextWidth works reasonable well for normal fonts
    // set theme.data.options.watermark.monospace to true if you
    // have a monospace font
    $: estWidth = monospace ? text.length * 20 : estimateTextWidth(text, 20);
    $: fontSize = `${Math.round(20 * ((diagonal * 0.75) / estWidth))}px`;
</script>

<style>
    div {
        position: fixed;
        opacity: 0.182;
        font-weight: 700;
        font-size: 0;
        white-space: nowrap;
        left: -100px;
        top: 0px;
        right: -100px;
        line-height: 100vh;
        bottom: 0;
        text-align: center;
        pointer-events: none;
        transform-origin: middle center;
    }
</style>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div
    class="export-text watermark-new noscript"
    style="transform:rotate({angle}rad); font-size: {fontSize}"
    data-rotate={angleDeg}>
    <span>
        {@html purifyHtml(text)}
    </span>
</div>
