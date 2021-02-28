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
      a = !!window.chrome && !!window.chrome.loadTimes,
      f = /; wv/.test(e) && /Chrome/.test(e),
      s = /SAMSUNG/.test(e) && /Chrome/.test(e),
      c = a || f || s ? "chrome" : o ? "firefox" : i ? "safari" : t ? "ie" : !!n && "edge";
  return {
    browser: c,
    version: !(!c || !r[c]) && r[c](e)
  };
}var _getBrowser = i(),
    browser = _getBrowser.browser,
    version = _getBrowser.version;

var polyfillUri = window.__DW_SVELTE_PROPS__.polyfillUri;

if (browser && o[browser] && version >= o[browser][0]) {
  if (version <= o[browser][1]) {
    document.write("<script type=\"text/javascript\" src=\"".concat(polyfillUri, "/").concat(browser, "-").concat(version, ".js\"></script>"));
  }
} else {
  document.write("<script type=\"text/javascript\" src=\"".concat(polyfillUri, "/all.js\"></script>"));
}}());