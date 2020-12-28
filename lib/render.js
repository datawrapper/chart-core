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
    __dw.params = { locales, d3maps_basemap, locatorMap };

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

    const emotion = createEmotion({
        key: `datawrapper-${chartAttrs.id}`,
        container: isIframe ? document.head : styleHolder
    });

    let vis;

    chart.load(data || '', isPreview ? undefined : chartAttrs.externalData).then(function() {
        vis = dw.visualization(visualization.id);
        vis.meta = visualization;
        vis.lang = language;

        if (isIframe) {
            window.__dw.vis = vis;
            window.__dw.render = () => {
                renderChart(target, chart, vis, isIframe, isPreview, emotion);
            };
        }

        renderChart(target, chart, vis, isIframe, isPreview, emotion);

        observeFonts(fonts, theme.data.typography)
            .then(() => renderChart(target, chart, vis, isIframe, isPreview, emotion))
            .catch(() => renderChart(target, chart, vis, isIframe, isPreview, emotion));

        // iPhone/iPad fix
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            window.onload = renderChart(target, chart, vis, isIframe, isPreview, emotion);
        }
    });

    return {
        success: true,
        render: () => {
            if (vis) renderChart(target, chart, vis, isIframe, isPreview, emotion);

            // if vis doesn't exist yet, no need to re-render as it will
            // be rendered when vis is created anyway
        }
    };
}

/*
 * render calls the chart rendering function provided by the plugin.
 */
function renderChart(target, chart, vis, isIframe, isPreview, emotion) {
    chart.vis(vis);

    vis.reset(target);

    // compute chart dimensions
    const w = width(target);
    const h = isIframe ? getMaxChartHeight() : chart.getMetadata('publish.chart-height');

    vis.size(w, h);

    // only render if iframe has valid dimensions
    if (getHeightMode(chart, vis) === 'fixed' ? w > 0 : w > 0 && h > 0) {
        chart.render(target, emotion);
    }

    const belowChartHeight =
        getHeight('.dw-chart-footer') +
        getHeight('.dw-above-footer') +
        getHeight('.dw-below-footer');

    if (belowChartHeight > 0) {
        addClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
    } else {
        removeClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
    }

    initDataLink();
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
                renderChart(target, chart, vis, isIframe, isPreview, emotion);
            }, 100);
        }
    }

    function initDataLink() {
        // update data link to point to edited dataset
        const csv = chart.dataset().toCSV && chart.dataset().toCSV();
        if (!csv || (csv && csv.trim && csv.trim() === 'X.1')) {
            // hide get the data link
            addClass(document.querySelector('.chart-action-data'), 'hidden');
        } else {
            const dataLink = document.querySelector('a.dw-data-link');
            if (dataLink) {
                if (window.navigator.msSaveOrOpenBlob) {
                    const blobObject = new Blob([csv]);
                    dataLink.addEventListener('click', event => {
                        window.navigator.msSaveOrOpenBlob(
                            blobObject,
                            'data-' + chart.get('id') + '.csv'
                        );
                        event.preventDefault();
                        return false;
                    });
                } else {
                    dataLink.setAttribute('download', 'data-' + chart.get('id') + '.csv');
                    dataLink.setAttribute(
                        'href',
                        'data:application/octet-stream;charset=utf-8,' +
                            encodeURIComponent('\uFEFF' + csv)
                    );
                }
            }
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
