import Chart from './lib/Chart.svelte';
import get from '@datawrapper/shared/get';

const data = window.__DW_DATA__;

const chart = new Chart({
    target: document.body,
    props: {
        data,
        theme: window.__DW_THEME__,
        translations: window.__DW_TRANSLATIONS__
    }
});

export default chart;
