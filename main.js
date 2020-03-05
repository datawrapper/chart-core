import Chart from './lib/Chart.svelte';

const data = window.__DW_DATA__;

const chart = new Chart({
    target: document.body,
    props: {
        data,
        theme: window.__DW_THEME__,
        translations: window.__DW_TRANSLATIONS__
    },
    hydrate: true
});

export default Chart;
