import Chart from './lib/Visualization.svelte';

function render() {
    /* eslint-disable no-new */
    new Chart({
        target: document.getElementById('__svelte-dw'),
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

render();
