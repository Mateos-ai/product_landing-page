// >>> M13 m-ctrl control settings (spec §6 M13). Screen in M0, plays once. 8000ms.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
  var RUN3 = HE ? '3 תהליכים רצים' : '3 flows running', RUN0 = HE ? '0 תהליכים רצים' : '0 flows running';
  function vis(list) { return list.filter(function (e) { return e.getClientRects().length; }); }
  V7.define('M13', function (root, tl) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var rows = qa('.m-ctrl-g, .m-ctrl-row'), oks = qa('.m-ctrl-list .v7-pill[data-tone=ok]'),
      tip = q('.m-ctrl-tip'), banner = q('.m-ctrl-banner'), write = q('.m-ctrl-write'), sw = q('.m-ctrl-write .m-ctrl-sw'),
      stop = q('.m-ctrl-stop'), resume = q('.m-ctrl-resume'), run = q('.m-ctrl-run-t'), live = q('.m-ctrl-run .v7-live');
    function shake(t, el) { // denied: 0, 3, -3, 3, -3, 0 px (× dir), 300ms
      if (!el) return;
      var k = 3 * V7.dir(el);
      t.anim(el, [0, k, -k, k, -k, 0].map(function (x) { return { transform: 'translateX(' + x + 'px)' }; }), { duration: 300, easing: 'linear', fill: 'none' });
    }
    function running(t, on) { // run label + live dot + the stop button's state
      V7.roll(t, run, on ? RUN3 : RUN0);
      if (live) { if (on) live.removeAttribute('data-state'); else live.setAttribute('data-state', 'off'); }
      if (stop) stop.classList.toggle('is-disabled', !on);
    }
    return {
      length: 8000,
      hold: 600,
      arm: function () {
        V7.off(rows); V7.off(oks); V7.gone(tip); V7.gone(banner);
        qa('.m-ctrl-group').forEach(function (g) { g.style.borderTopColor = 'transparent'; }); // each rule fades in with its section
      },
      steps: [
        [0, function (t) {
          vis(rows).forEach(function (el, i) {
            V7.show(t, el, { delay: i * 60 });
            if (el.classList.contains('m-ctrl-g')) t.after(i * 60, function () {
              var g = el.parentNode; g.style.borderTopColor = '';
              t.anim(g, [{ offset: 0, borderTopColor: 'transparent' }], { duration: 240, easing: 'out', fill: 'backwards' });
            });
          });
        }],
        [700, function (t) { V7.pop(t, vis(oks), { stagger: 150 }); }],
        [2200, function (t) { V7.cursorTo(t, sw, { duration: 550 }); }],
        [2800, function (t) { V7.tap(t, sw); shake(t, write); V7.show(t, tip, { y: 4, duration: 200 }); }],
        [4300, function (t) { V7.hide(t, tip, { y: 2 }); }],
        [4500, function (t) { V7.gone(tip); V7.cursorTo(t, stop, { duration: 550 }); }],
        [5100, function (t) { V7.tap(t, stop); V7.insert(t, banner, { duration: 280 }); running(t, false); }],
        [6600, function (t) { V7.cursorTo(t, resume, { duration: 450 }); }],
        [7100, function (t) { V7.tap(t, resume); V7.remove(t, banner, { duration: 280 }); running(t, true); }]
      ]
    };
  });
})();
// <<< M13
