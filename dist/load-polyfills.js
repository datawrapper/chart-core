(function(){'use strict';function e(e) {
  return function (r) {
    var o = r.toLowerCase().match(e);
    return !!o && parseInt(o[1], 10);
  };
}

var r = {
  chrome: e(/chrom(?:e|ium)\/([0-9]+)\./),
  firefox: e(/firefox\/([0-9]+\.*[0-9]*)/),
  safari: e(/version\/([0-9]+).[0-9]+.[0-9]+ safari/),
  ie: e(/(?:msie |rv:)([0-9]+).[0-9]+/),
  edge: e(/edge\/([0-9]+).[0-9]+.[0-9]+/)
},
    o = {
  firefox: [50, 74],
  chrome: [50, 80],
  ie: [6, 11],
  edge: [12, 80],
  safari: [9, 13]
};

function i() {
  var e = navigator.userAgent,
      o = "undefined" != typeof InstallTrigger,
      i = /constructor/i.test(window.HTMLElement) || "[object SafariRemoteNotification]" === (!window.safari || window.safari.pushNotification).toString(),
      t = !!document.documentMode,
      n = !t && !!window.StyleMedia,
      a = /HeadlessChrome/.test(e) || !!window.chrome && !!window.chrome.loadTimes,
      s = /; wv/.test(e) && /Chrome/.test(e),
      f = /SAMSUNG/.test(e) && /Chrome/.test(e),
      d = a || s || f ? "chrome" : o ? "firefox" : i ? "safari" : t ? "ie" : !!n && "edge";
  return {
    browser: d,
    version: !(!d || !r[d]) && r[d](e)
  };
}var _getBrowser = i(),
    browser = _getBrowser.browser,
    version = _getBrowser.version;

var polyfillUri = window.__DW_SVELTE_PROPS__.data.polyfillUri;

if (browser && o[browser] && version >= o[browser][0]) {
  if (version <= o[browser][1]) {
    document.write("<script type=\"text/javascript\" src=\"".concat(polyfillUri, "/").concat(browser, "-").concat(version, ".js\"></script>"));
  }
} else {
  document.write("<script type=\"text/javascript\" src=\"".concat(polyfillUri, "/all.js\"></script>"));
}}());