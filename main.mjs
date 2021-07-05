import VisualizationIframe from './lib/VisualizationIframe.svelte';

function render() {
    /* eslint-disable no-new */
    new VisualizationIframe({
        target: document.getElementById('__svelte-dw'),
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

render();
