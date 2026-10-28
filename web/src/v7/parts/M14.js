// >>> M14 m-xray sample X-ray (spec §6 M14): plays once, 2400ms
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  V7.define('M14', function (root) {
    var rows = V7.$$(root, '.m-xray-row'), fills = V7.$$(root, '.m-xray-row .v7-bar-fill'),
      top = V7.$(root, '.m-xray-top'), start = V7.$(root, '.m-xray-start'), foot = V7.$(root, '.m-xray-foot');
    // targets come from the final markup (--v on each fill)
    var to = fills.map(function (f) { return parseFloat(f.style.getPropertyValue('--v')) || 0; });
    return {
      length: 2400,
      hold: 0,
      arm: function () {
        V7.off(rows);
        fills.forEach(function (f) { f.style.setProperty('--v', '0'); });
        if (top) top.classList.add('is-off');
        V7.off(start);
        V7.off(foot);
      },
      steps: [
        [0, function (tl) { V7.show(tl, rows, { stagger: 80 }); }],
        [100, function (tl) { fills.forEach(function (f, i) { V7.bar(tl, f, to[i], { duration: 600, delay: i * 80 }); }); }],
        [1200, function (tl) { if (top) top.classList.remove('is-off'); V7.pop(tl, start); }],
        [1700, function (tl) { V7.show(tl, foot); }]
      ]
    };
  });
})();
// <<< M14
