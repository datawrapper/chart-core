import 'core-js/stable';
import Chart from './lib/Chart.svelte';
import get from '@datawrapper/shared/get';
import components from './lib/AfterBodyComponents.js';

const data = window.__DW_DATA__;

const afterBodyComponents = components
    .filter(([, key]) => get(data, `chartJSON.${key}`))
    .map(([comp]) => comp);

const chart = new Chart({
    target: document.body,
    props: {
        data,
        theme: window.__DW_THEME__,
        translations: window.__DW_TRANSLATIONS__,
        afterBodyComponents
    }
});

export default chart;
