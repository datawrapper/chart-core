import $ from 'jquery';
/* global getComputedStyle */

export default function() {
    let h = 0;

    $('.dw-chart > *').each(function(i, el) {
        const tagName = el.tagName.toLowerCase();
        const cls = $(el).attr('class') || '';

        function hasClass(className) {
            return cls.split(' ').indexOf(className) > -1;
        }

        if (
            tagName !== 'script' &&
            tagName !== 'style' &&
            el.id !== 'chart' &&
            !$(el).attr('aria-hidden') &&
            !hasClass('tooltip') &&
            !hasClass('vg-tooltip') &&
            !hasClass('hidden') &&
            !hasClass('qtip') &&
            !hasClass('container') &&
            !hasClass('noscript') &&
            !hasClass('hidden') &&
            !hasClass('filter-ui') &&
            !hasClass('dw-chart-body')
        ) {
            h += Number($(el).outerHeight(true));
        }
    });

    function getProp(selector, property) {
        return getComputedStyle($(selector).get(0))[property].replace('px', '');
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
