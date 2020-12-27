import Chart from './lib/Chart.svelte';
import { loadScript } from '@datawrapper/shared/fetch';

// initialize the library

if (typeof window.__dw === 'undefined') window.__dw = {};

window.__dw.renderInto = async function(target, chart) {
    const elementId = `datawrapper-chart-${chart.data.chartJSON.id}`;
    document.write(`<div class="dw-chart chart" id="${elementId}"></div>`);

    if (typeof __dw.dependencies === 'undefined') __dw.dependencies = {};

    let scripts = [];

    for (var dep in chart.data.visJSON.dependencies) {
        const path = {
            jquery: 'http://app.datawrapper.local/lib/chart-core/jquery.min.js'
        }[dep];

        if (chart.data.visJSON.dependencies[dep] && path) {
            scripts.push(path);
        }
    }

    scripts = [
        ...scripts,
        ...chart.data.visJSON.libraries,
        'http://app.datawrapper.local/lib/chart-core/dw-2.0.min.js',
        `http://api.datawrapper.local/v3/visualizations/${chart.data.visJSON.id}/script.js`
    ];

    const promises = [];

    scripts.forEach(script => {
        promises.push(
            new Promise(async function(resolve, reject) {
                if (__dw.dependencies[script]) {
                    resolve();
                } else {
                    __dw.dependencies[script] = true;
                    await loadScript(script);
                    resolve();
                }
            })
        );
    });

    await Promise.all(promises);

    /*
    // 2. append stylesheet
    const styles = document.head.appendChild('style');
    styles.innerHTML = chart.styles;
    */

    chart.iframe = false;

    new Chart({
        target: document.getElementById(elementId),
        props: chart,
        hydrate: false
    });
};
