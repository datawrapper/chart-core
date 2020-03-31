import { getBrowser, availablePolyfills } from '@datawrapper/polyfills';
/* need promise polyfill for svelte internals */
import 'core-js/es/promise';
import Chart from './lib/Chart.svelte';

function render() {
    new Chart({
        target: document.body,
        props: window.__DW_SVELTE_PROPS__,
        hydrate: true
    });
}

function main() {
    const { browser, version } = getBrowser();
    const { polyfillUri } = window.__DW_SVELTE_PROPS__.data;
    const script = document.createElement('script');
    script.onload = render;
    // render the chart even if load fails!
    script.onerror = render;

    if (browser && availablePolyfills[browser] && version >= availablePolyfills[browser][0]) {
        if (version > availablePolyfills[browser][1]) {
            // no need for polyfill, browser is quite new
            return render();
        }
        // use cached polyfill.io polyfills
        script.src = `${polyfillUri}/${browser}-${version}.js`;
    } else {
        // unknown browser, fall back to generic polyfill
        script.src = `${polyfillUri}/all.js`;
    }

    document.getElementsByTagName('head')[0].appendChild(script);
}

main();
