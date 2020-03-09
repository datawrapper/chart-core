import Chart from './lib/Chart.svelte';

const chart = new Chart({
    target: document.body,
    props: window.__DW_SVELTE_PROPS__,
    hydrate: true
});

export default Chart;
