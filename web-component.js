import VisualizationWebComponent from './lib/VisualizationWebComponent.wc.svelte';
import { loadScript } from '@datawrapper/shared/fetch';

if (typeof window.__dw === 'undefined') {
    const callbacks = [];

    window.__dw = {
        onDependencyCompleted: function(cb) {
            callbacks.push(cb);
        },
        dependencyCompleted: function() {
            for (const cb of callbacks) {
                cb();
            }
        },
        dependencies: {},
        render: async function(data) {
            const elementId = `datawrapper-chart-${data.chart.id}`;
            document.write(`<div id="${elementId}"></div>`);

            // slightly hacky way to determine the script origin
            const scripts = document.getElementsByTagName('script');
            data.origin = scripts[scripts.length - 1]
                .getAttribute('src')
                .split('/')
                .slice(0, -1)
                .join('/');

            // fonts need to be appended globally, and can then be used in every WebComponent
            const styleId = `datawrapper-${data.chart.theme}`;
            if (!document.head.querySelector(`#${styleId}`)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.type = 'text/css';
                style.innerHTML = data.styles.fonts;
                document.head.appendChild(style);
            }

            loadDependency(data.dependencies[0]);

            async function loadDependency(script) {
                if (!window.__dw.dependencies[script]) {
                    window.__dw.dependencies[script] = 'loading';
                    await loadScript(
                        script.indexOf('http') === 0 ? script : `${data.origin}/${script}`
                    );
                    window.__dw.dependencies[script] = 'finished';
                }

                if (window.__dw.dependencies[script] === 'finished') {
                    window.__dw.dependencyCompleted();
                }
            }

            window.__dw.onDependencyCompleted(function() {
                for (const script of data.dependencies) {
                    if (window.__dw.dependencies[script] !== 'finished') {
                        if (!window.__dw.dependencies[script]) {
                            loadDependency(script);
                        }

                        return;
                    }
                }

                render();
            });

            let rendered = false;
            function render() {
                if (rendered) return;

                const props = {
                    target: document.getElementById(elementId),
                    props: data,
                    hydrate: false
                };

                if (!customElements.get('datawrapper-visualization')) {
                    customElements.define('datawrapper-visualization', VisualizationWebComponent);
                    new VisualizationWebComponent(props);
                } else {
                    const WebComponent = customElements.get('datawrapper-visualization');
                    new WebComponent(props);
                }

                rendered = true;
            }
        }
    };
}
