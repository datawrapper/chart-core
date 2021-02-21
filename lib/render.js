/* globals dw, Blob */

import {
    width,
    height,
    outerHeight,
    addClass,
    removeClass,
    domReady,
    getNonChartHeight,
    getMaxChartHeight
} from './dw/utils';
import get from '@datawrapper/shared/get';
import PostEvent from '@datawrapper/shared/postEvent';
import observeFonts from '@datawrapper/shared/observeFonts';
import createEmotion from '@emotion/css/create-instance';

/*
 * init performs initialization routines that only need to be done _once_ in
 * the lifetime of a chart. This includes: Loading external data, waiting for
 * fonts to load, registering window-level event listeners.
 *
 * Then, it calls and returns _render_, which is called whenever a chart is
 * supposed to (re-)render.
 */
export default function init(
    target,
    {
        data,
        chart: chartAttrs,
        visualization,
        theme,
        locales,
        d3maps_basemap,
        locatorMap,
        isPreview,
        isIframe,
        fonts,
        styleHolder
    }
) {
    if (!visualization.id || !target) return { success: false, render: () => {} };

    // evaluate locales
    Object.keys(locales).forEach(vendor => {
        // eslint-disable-next-line
        locales[vendor] = eval(locales[vendor]);
    });

    if (typeof __dw === 'undefined') window.__dw = {};
    __dw.params = Object.assign(__dw.params || {}, { locales, locatorMap });
    __dw.params.d3maps_basemap = Object.assign(__dw.params.d3maps_basemap || {}, d3maps_basemap);

    const chartLocale = chartAttrs.language || 'en-US';
    const language = chartLocale.substr(0, 2);

    domReady(() => {
        const postEvent = PostEvent(chartAttrs.id);
        window.addEventListener('hashchange', () => {
            postEvent('hash.change', { hash: window.location.hash });
        });
    });

    const chart = dw
        .chart(chartAttrs)
        .locale(chartLocale)
        .theme(dw.theme(chartAttrs.theme));

    let vis;

    chart.load(data || '', isPreview ? undefined : chartAttrs.externalData).then(function() {
        vis = dw.visualization(visualization.id);
        vis.meta = visualization;
        vis.lang = language;

        if (isIframe) {
            window.__dw.vis = vis;
            window.__dw.render = () => {
                renderChart(target, styleHolder, chart, vis, isIframe, isPreview);
            };
        }

        renderChart(target, styleHolder, chart, vis, isIframe, isPreview);

        observeFonts(fonts, theme.data.typography)
            .then(() => renderChart(target, styleHolder, chart, vis, isIframe, isPreview))
            .catch(() => renderChart(target, styleHolder, chart, vis, isIframe, isPreview));

        // iPhone/iPad fix
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            window.onload = renderChart(target, styleHolder, chart, vis, isIframe, isPreview);
        }
    });

    return {
        success: true,
        render: () => {
            if (vis) renderChart(target, styleHolder, chart, vis, isIframe, isPreview);

            // if vis doesn't exist yet, no need to re-render as it will
            // be rendered when vis is created anyway
        }
    };
}

/*
 * render calls the chart rendering function provided by the plugin.
 */
function renderChart(target, styleHolder, chart, vis, isIframe, isPreview) {
    chart.vis(vis);

    vis.reset(target);

    if (!chart.emotion) {
        chart.emotion = createEmotion({
            key: `datawrapper-${chart.get('id')}`,
            container: isIframe ? document.head : styleHolder
        });
    }

    // compute chart dimensions
    const w = width(target);
    const h = isIframe ? getMaxChartHeight() : chart.getMetadata('publish.chart-height');

    vis.size(w, h);

    // only render if iframe has valid dimensions
    if (getHeightMode(chart, vis) === 'fixed' ? w > 0 : w > 0 && h > 0) {
        chart.render(target);
    }

    isIframe && initResizeHandler(target, vis);
    isIframe && postMessage(target, chart, vis, isPreview);

    function getHeight(sel) {
        const el = target.parentNode.querySelector(sel);
        if (!el) return 0;
        return height(el);
    }

    function initResizeHandler(container, vis) {
        const resize = getHeightMode(chart, vis) === 'fixed' ? resizeFixed : renderLater;
        let curWidth = width(container);

        // IE continuosly reloads the chart for some strange reasons
        if (navigator.userAgent.match(/msie/i) === null) {
            window.onresize = resize;
        }

        function resizeFixed() {
            const w = width(container);
            if (curWidth !== w) {
                curWidth = w;
                renderLater();
            }
        }

        let reloadTimer;

        function renderLater() {
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                renderChart(target, styleHolder, chart, vis, isIframe, isPreview);
            }, 100);
        }
    }

    function postMessage(target, chart, vis, isPreview) {
        let desiredHeight;

        if (getHeightMode(chart, vis) === 'fit') {
            if (isPreview || !chart.getMetadata('publish.chart-height')) return;
            desiredHeight = getNonChartHeight() + chart.getMetadata('publish.chart-height');
        } else {
            desiredHeight = outerHeight(document.querySelector('html'), true);
        }

        // datawrapper responsive embed
        window.parent.postMessage(
            {
                'datawrapper-height': {
                    [chart.get().id]: desiredHeight
                }
            },
            '*'
        );

        // Google AMP
        window.parent.postMessage(
            {
                sentinel: 'amp',
                type: 'embed-size',
                height: desiredHeight
            },
            '*'
        );

        // Medium
        window.parent.postMessage(
            JSON.stringify({
                src: window.location.toString(),
                context: 'iframe.resize',
                height: desiredHeight
            }),
            '*'
        );

        if (typeof window.datawrapperHeightCallback === 'function') {
            window.datawrapperHeightCallback(desiredHeight);
        }
    }

    function getHeightMode(chart, vis) {
        const themeFitChart =
            get(vis.theme(), 'vis.d3-pies.fitchart', false) &&
            ['d3-pies', 'd3-donuts', 'd3-multiple-pies', 'd3-multiple-donuts'].indexOf(
                vis.meta.id
            ) > -1;
        const urlParams = new URLSearchParams(window.location.search);
        const urlFitChart = !!urlParams.get('fitchart');

        return themeFitChart || urlFitChart || vis.meta.height !== 'fixed' ? 'fit' : 'fixed';
    }
}
