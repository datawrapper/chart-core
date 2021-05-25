/*
 * This is the JS code we ship with the "responsive" embed codes.
 * It's main purpose is to catch the postMessage calls for automatic resizing etc.
 * When you update this, make sure to upload new versions to http://datawrapper.dwcdn.net/lib/embed.js
 * and https://datawrapper.dwcdn.net/lib/embed.min.js
 */
window.addEventListener('message', function(event) {
    if (typeof event.data['datawrapper-height'] !== 'undefined') {
        var iframes = document.querySelectorAll('iframe');
        for (var chartId in event.data['datawrapper-height']) {
            for (var i = 0; i < iframes.length; i++) {
                if (iframes[i].contentWindow === event.source) {
                    iframes[i].style.height = event.data['datawrapper-height'][chartId] + 'px';
                }
            }
        }
    }
});
