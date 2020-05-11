/* globals dw, Blob */

/*
 * This is the JS code we ship with *every* published Datawrapper chart.
 * It's main purpose is to send the postMessage calls for automatic resizing etc.
 */
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

let chart, reloadTimer;

function renderChart() {
    if (__dw.vis && !__dw.vis.supportsSmartRendering()) {
        // a current visualization exists but it is not smart
        // enough to re-render itself properly, so we need to
        // reset and remove it
        __dw.vis.reset();
    }
    const $chart = document.querySelector('.dw-chart-body');

    const belowChartHeight =
        getHeight('.dw-chart-footer') +
        getHeight('.dw-above-footer') +
        getHeight('.dw-below-footer');

    if (belowChartHeight > 0) {
        addClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
    } else {
        removeClass(document.querySelector('.dw-chart-body'), 'content-below-chart');
    }

    // compute chart dimensions
    const w = width($chart);
    const h = getMaxChartHeight($chart);

    let vis;
    if (__dw.vis && __dw.vis.supportsSmartRendering()) {
        // a current visualization exists and it is smart enough
        // to re-render itself
        vis = __dw.vis;
    } else {
        // we have to create a new vis
        vis = __dw.vis = getVis();
        chart.vis(vis);
    }

    vis.size(w, h);

    initResizeHandler(vis, $chart);

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
                    'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(csv)
                );
            }
        }
    }

    chart.render($chart);
}

function getHeight(sel) {
    const el = document.querySelector(sel);
    if (!el) return 0;
    return height(el);
}

function chartLoaded() {
    chart = dw
        .chart(__dw.params.chartJSON)
        .locale(__dw.params.chartLocale)
        .metricPrefix(__dw.params.metricPrefix)
        .theme(dw.theme(__dw.params.themeId));
    return chart.load(
        __dw.params.data || '',
        __dw.params.preview ? undefined : __dw.params.chartJSON.externalData
    );
}

function getVis() {
    const vis = dw.visualization(__dw.params.visId);
    vis.meta = __dw.params.visJSON;
    vis.lang = __dw.params.lang;
    return vis;
}

function renderLater() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function() {
        renderChart();
    }, 300);
}

function initResizeHandler(vis, container) {
    const height = vis.meta.height || 'fit';
    const resize = height === 'fixed' ? resizeFixed : renderLater;
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
}

const __dw = {
    init: function(params) {
        __dw.params = params;
        __dw.old_attrs = params.chartJSON;
        domReady(() => {
            const postEvent = PostEvent(params.chartJSON.id);
            window.addEventListener('hashchange', () => {
                postEvent('hash.change', { hash: window.location.hash });
            });
            chartLoaded().then(renderChart);
        });
    },
    render: renderLater,
    renderNow: renderChart
};

export default function render({
    visJSON,
    chartJSON,
    publishData,
    chartData,
    isPreview,
    chartLocale,
    metricPrefix,
    themeId,
    fontsJSON,
    typographyJSON,
    locales
}) {
    window.visJSON = visJSON;
    window.__dw = __dw;

    // evaluate locales
    Object.keys(locales).forEach(vendor => {
        // eslint-disable-next-line
        locales[vendor] = eval(locales[vendor]);
    });

    run();

    function run() {
        __dw.init(
            Object.assign(
                {
                    visJSON,
                    chartJSON,
                    publishData,
                    data: chartData,
                    preview: isPreview,
                    chartLocale,
                    locales,
                    themeId: themeId,
                    visId: chartJSON.type,
                    lang: chartLocale.substr(0, 2),
                    metricPrefix
                },
                window.__dwParams || {}
            )
        );

        observeFonts(fontsJSON, typographyJSON)
            .then(() => __dw.render())
            .catch(() => __dw.render());

        // iPhone/iPad fix
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            window.onload = __dw.render();
        }

        let themeFitChart = false;
        const visType = visJSON.id;
        const theme = dw.theme(themeId);
        if (theme && visType) {
            const isPies =
                visType === 'd3-pies' ||
                visType === 'd3-donuts' ||
                visType === 'd3-multiple-pies' ||
                visType === 'd3-multiple-donuts';
            if (isPies) {
                themeFitChart = get(theme, 'vis.d3-pies.fitchart', 0);
            }
        }
        const urlParams = new URLSearchParams(window.location.search);
        const isFitChart =
            urlParams.get('fitchart') === '1' || themeFitChart === 1 || themeFitChart === true;

        setInterval(function() {
            let desiredHeight;
            if (visJSON.height === 'fixed' && !isFitChart) {
                desiredHeight = outerHeight(document.querySelector('html'), true);
            } else {
                if (__dw.params.preview || !__dw.vis.chart().get('metadata.publish.chart-height')) {
                    return;
                }

                desiredHeight =
                    getNonChartHeight() + __dw.vis.chart().get('metadata.publish.chart-height');
            }

            // datawrapper responsive embed
            window.parent.postMessage(
                {
                    'datawrapper-height': {
                        [chartJSON.id]: desiredHeight
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
        }, 1000);
    }
}
