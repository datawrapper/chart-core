import 'core-js/stable';
import Chart from './lib/Chart.svelte';

const chart = new Chart({
    target: document.body,
    props: { data: window.__DW_DATA__, theme: window.__DW_THEME__ }
});

export default chart;
