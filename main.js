import Chart from './lib/Visualization.svelte';

function render() {
    new Chart({
        target: document.getElementById('__svelte-dw'),
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

render();
