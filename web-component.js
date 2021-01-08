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
        },
        render: async function(data) {
            const elementId = `datawrapper-chart-${data.chart.id}`;
            document.write(`<div id="${elementId}"></div>`);
            //
            // slightly hacky way to determine the script origin
            const scripts = document.getElementsByTagName('script');
            const src = scripts[scripts.length - 1]
                .getAttribute('src')
                .split('/')
                .slice(0, -1)
                .join('/');

            if (typeof __dw.dependencies === 'undefined') __dw.dependencies = {};

            const promises = [];

            let rendered = false;

            const awaitLibraries = () => {
                let loaded = true;

                for (let dep of data.dependencies) {
                    if (__dw.dependencies[dep] !== 'finished') loaded = false;
                }

                if (loaded && !rendered) {
                    data.origin = src;

                    const props = {
                        target: document.getElementById(elementId),
                        props: data,
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

            const styleId = `datawrapper-${data.chart.theme}`;

            if (!document.head.querySelector(`#${styleId}`)) {
                // fonts need to be appended globally, and can then be used in every WebComponent
                const style = document.createElement('style');
                style.id = styleId;
                style.type = 'text/css';
                style.innerHTML = data.styles.fonts;
                document.head.appendChild(style);
            }

            __dw.onDependencyCompleted(awaitLibraries);

            for (let script of data.dependencies) {
                if (__dw.dependencies[script] === 'finished') continue;
                __dw.dependencies[script] = 'loading';

                if (
                    script.toLowerCase().indexOf('underscore') === -1 &&
                    script.toLowerCase().indexOf('globalize') === -1
                ) {
                    await loadScript(`${src}/${script}`);
                }

                __dw.dependencies[script] = 'finished';
                __dw.dependencyCompleted();
            }
        }
    };
}
