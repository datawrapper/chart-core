import ChartWebComponent from './lib/ChartWebComponent.wc.svelte';
import { loadScript } from '@datawrapper/shared/fetch';

// initialize the library

if (typeof window.__dw === 'undefined') {
    const callbacks = [];

    window.__dw = {
        onDependencyCompleted: function(cb) {
            callbacks.push(cb);
        },
        dependencyCompleted: function() {
            for (let cb of callbacks) {
                cb();
            }
        }
    };
}

window.__dw.renderInto = async function(chart) {
    const elementId = `datawrapper-chart-${chart.chart.id}`;
    document.write(`<div id="${elementId}"></div>`);

    if (typeof __dw.dependencies === 'undefined') __dw.dependencies = {};

    const promises = [];

    let rendered = false;

    const awaitLibraries = () => {
        let loaded = true;

        for (let dep of chart.dependencies) {
            if (__dw.dependencies[dep] !== 'finished') loaded = false;
        }

        if (loaded && !rendered) {
            const props = {
                target: document.getElementById(elementId),
                props: chart,
                hydrate: false
            };

            if (!customElements.get('datawrapper-visualization')) {
                customElements.define('datawrapper-visualization', ChartWebComponent);
                new ChartWebComponent(props);
            } else {
                const WebComponent = customElements.get('datawrapper-visualization');
                new WebComponent(props);
            }

            rendered = true;
        }
    };

    __dw.onDependencyCompleted(awaitLibraries);

    // slightly hacky way to determine the script origin
    const scripts = document.getElementsByTagName('script');
    const src = scripts[scripts.length - 1]
        .getAttribute('src')
        .split('/')
        .slice(0, -1)
        .join('/');

    for (let script of chart.dependencies) {
        if (__dw.dependencies[script]) continue;
        __dw.dependencies[script] = 'loading';
        await loadScript(`${src}/${script}`);
        __dw.dependencies[script] = 'finished';
        __dw.dependencyCompleted();
    }
};
