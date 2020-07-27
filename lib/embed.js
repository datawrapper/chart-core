/*
 * This is the JS code we ship with the "responsive" embed codes.
 * It's main purpose is to catch the postMessage calls for automatic resizing etc.
 * When you update this, make sure to upload new versions to http://datawrapper.dwcdn.net/lib/embed.js
 * and https://datawrapper.dwcdn.net/lib/embed.min.js
 */
window.addEventListener('message', function(event) {
    if (typeof event.data['datawrapper-height'] !== 'undefined') {
        for (var chartId in event.data['datawrapper-height']) {
            var iframe =
                document.getElementById('datawrapper-chart-' + chartId) ||
                document.querySelector("iframe[src*='" + chartId + "']");

            if (!iframe) continue;
            iframe.style.height = event.data['datawrapper-height'][chartId] + 'px';
        }
    }
});
