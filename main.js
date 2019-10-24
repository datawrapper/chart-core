import 'core-js/stable';
import Chart from './lib/Chart.svelte';
import afterBodyComponents from './lib/AfterBodyComponents.js';

const chart = new Chart({
    target: document.body,
    props: {
        data: window.__DW_DATA__,
        theme: window.__DW_THEME__,
        translations: window.__DW_TRANSLATIONS__,
        afterBodyComponents
    }
});

export default chart;
