export function outerHeight(element, withMargin = false) {
    if (!element) return null;
    let height = element.offsetHeight;
    if (!withMargin) return height;
    var style = getComputedStyle(element);
    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
    return height;
}
/* global getComputedStyle */

export function getNonChartHeight() {
    let h = 0;

    const chart = document.querySelector('.dw-chart');
    for (let i = 0; i < chart.children.length; i++) {
        const el = chart.children[i];
        const tagName = el.tagName.toLowerCase();
        if (
            tagName !== 'script' &&
            tagName !== 'style' &&
            el.id !== 'chart' &&
            !el.getAttribute('aria-hidden') &&
            !hasClass(el, 'tooltip') &&
            !hasClass(el, 'vg-tooltip') &&
            !hasClass(el, 'hidden') &&
            !hasClass(el, 'qtip') &&
            !hasClass(el, 'container') &&
            !hasClass(el, 'noscript') &&
            !hasClass(el, 'hidden') &&
            !hasClass(el, 'filter-ui') &&
            !hasClass(el, 'dw-chart-body')
        ) {
            h += Number(outerHeight(el, true));
        }
    }
    function hasClass(el, className) {
        el.classList.contains(className);
    }

    function getProp(selector, property) {
        return getComputedStyle(document.querySelector(selector))[property].replace('px', '');
    }

    const selectors = ['.dw-chart', '.dw-chart #chart'];
    const properties = [
        'padding-top',
        'padding-bottom',
        'margin-top',
        'margin-bottom',
        'border-top-width',
        'border-bottom-width'
    ];

    selectors.forEach(function(sel) {
        properties.forEach(function(prop) {
            h += Number(getProp(sel, prop));
        });
    });

    return h;
}
