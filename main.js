import ChartStandalone from './lib/ChartStandalone.svelte';

function render() {
    new ChartStandalone({
        target: document.getElementById('__svelte-dw'),
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

render();
