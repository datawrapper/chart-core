import ChartWebComponent from './lib/ChartWebComponent.wc.svelte';
import { loadScript } from '@datawrapper/shared/fetch';

// initialize the library

if (typeof window.__dw === 'undefined') window.__dw = {};

window.__dw.renderInto = async function(chart) {
    const elementId = `datawrapper-chart-${chart.chart.id}`;
    document.write(`<div id="${elementId}"></div>`);

    if (typeof __dw.dependencies === 'undefined') __dw.dependencies = {};

    let scripts = [];

    for (var dep in chart.visualization.dependencies) {
        const path = {
            jquery: 'http://app.datawrapper.local/lib/chart-core/jquery.min.js'
        }[dep];

        if (chart.visualization.dependencies[dep] && path) {
            scripts.push(path);
        }
    }

    scripts = [
        ...scripts,
        ...chart.visualization.libraries.map(el => `http://app.datawrapper.local${el.uri}`),
        'http://app.datawrapper.local/lib/chart-core/dw-2.0.min.js',
        `http://api.datawrapper.local/v3/visualizations/${chart.visualization.id}/script.js`
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

    new ChartWebComponent({
        target: document.getElementById(elementId),
        props: chart,
        hydrate: false
    });
};
