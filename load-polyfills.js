import { getBrowser, availablePolyfills } from '@datawrapper/polyfills';
const { browser, version } = getBrowser();
const { polyfillUri } = window.__DW_SVELTE_PROPS__.data;

if (browser && availablePolyfills[browser] && version >= availablePolyfills[browser][0]) {
    if (version <= availablePolyfills[browser][1]) {
        document.write(
            `<script type="text/javascript" src="${polyfillUri}/${browser}-${version}.js"></script>`
        );
    }
} else {
    document.write(`<script type="text/javascript" src="${polyfillUri}/all.js"></script>`);
}
