import 'core-js/stable';
import Chart from './lib/Chart.svelte';

const chart = new Chart({
    target: document.querySelector('.dw-chart'),
    props: {
        data: window.__DW_DATA__,
        theme: window.__DW_THEME__,
        translations: window.__DW_TRANSLATIONS__
    }
});

export default chart;
