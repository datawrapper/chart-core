import VisualizationIframe from './lib/VisualizationIframe.svelte';

function render() {
    new VisualizationIframe({
        target: document.getElementById('__svelte-dw'),
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

render();
