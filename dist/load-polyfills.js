!function(){"use strict";function e(e){return function(t){var r=t.toLowerCase().match(e);return!!r&&parseInt(r[1],10)}}var t={chrome:e(/chrom(?:e|ium)\/([0-9]+)\./),firefox:e(/firefox\/([0-9]+\.*[0-9]*)/),safari:e(/version\/([0-9]+).[0-9]+.[0-9]+ safari/),ie:e(/(?:msie |rv:)([0-9]+).[0-9]+/),edge:e(/edge\/([0-9]+).[0-9]+.[0-9]+/)},r={firefox:[50,74],chrome:[50,80],ie:[6,11],edge:[12,80],safari:[9,13]};var i=function(){var e=navigator.userAgent,r="undefined"!=typeof InstallTrigger,i=/constructor/i.test(window.HTMLElement)||"[object SafariRemoteNotification]"===(!window.safari||window.safari.pushNotification).toString(),o=!!document.documentMode,n=!o&&!!window.StyleMedia,a=!!window.chrome&&!!window.chrome.loadTimes,c=/; wv/.test(e)&&/Chrome/.test(e),s=/SAMSUNG/.test(e)&&/Chrome/.test(e),f=a||c||s?"chrome":r?"firefox":i?"safari":o?"ie":!!n&&"edge";return{browser:f,version:!(!f||!t[f])&&t[f](e)}}(),o=i.browser,n=i.version,a=window.__DW_SVELTE_PROPS__.data.polyfillUri;o&&r[o]&&n>=r[o][0]?n<=r[o][1]&&document.write('<script type="text/javascript" src="'.concat(a,"/").concat(o,"-").concat(n,'.js"><\/script>')):document.write('<script type="text/javascript" src="'.concat(a,'/all.js"><\/script>'))}();