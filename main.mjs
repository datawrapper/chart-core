import VisualizationIframe from './lib/VisualizationIframe.svelte';
function render() {
    const target = document.getElementById('__svelte-dw');
    /* eslint-disable no-new */
    new VisualizationIframe({
        target,
        props: {
            ...window.__DW_SVELTE_PROPS__,
            outerContainer: target
        },
        hydrate: true
    });
}

render();
