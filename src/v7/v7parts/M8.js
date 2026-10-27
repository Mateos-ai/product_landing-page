// >>> M8 m-rules: rules (spec §6 M8). Host-driven (T1). Length 4800, hold 1400.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  V7.define('M8', function (root) {
    var q = function (s) { return root.querySelector(s); };
    var wraps = V7.$$(root, '.m-rules-list > .v7-collapse'), c1 = wraps[0] || null, rest = wraps.slice(1),
      r1 = c1 && c1.querySelector('.m-rules-row'), tag = q('.m-rules-new'), list = q('.m-rules-list'), amt = q('.m-rules-amt'), r5 = q('.m-rules-r5'),
      meta3 = q('.m-rules-meta3'), redBox = q('.m-rules-red'), red = V7.$$(root, '.m-rules-red li'), count = q('.m-rules-count');
    // meta lines are wrap units (one span per part; CSS draws the separators), so they never break inside a part or end on '·'
    var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
    var M2 = HE ? '<span><bdi>R-03</bdi></span><span><bdi>v2</bdi></span><span>אתם</span><span>2 באוק׳</span>' : '<span>R-03</span><span>v2</span><span>You</span><span>Oct 2</span>',
      M3 = HE ? '<span><bdi>R-03</bdi></span><span><bdi>v3</bdi></span><span>אתם</span><span>עכשיו</span>' : '<span>R-03</span><span>v3</span><span>You</span><span>now</span>',
      N13 = HE ? '13 פעילים' : '13 active', N14 = HE ? '14 פעילים' : '14 active';
    // the list keeps its final height while R-14 inserts at the top, so the red lines below it never move
    function hold() {
      if (!list || !c1) return;
      list.style.minHeight = ''; V7.on(c1);
      var h = list.offsetHeight;
      V7.gone(c1);
      if (h) list.style.minHeight = h + 'px';
    }
    function carets() { V7.$$(amt, '.v7-caret').forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); }); }
    return {
      length: 4800, hold: 1400,
      arm: function () {
        hold(); V7.off(tag); V7.off(rest);
        if (amt) amt.textContent = '50,000';
        if (meta3) meta3.innerHTML = M2;
        if (count) count.textContent = N13;
        V7.off(redBox); V7.off(red);
      },
      steps: [
        [0, function (t) { hold(); V7.show(t, rest, { stagger: 60, duration: 260 }); }], // measured again now that fonts are in
        [600, function (t) {
          V7.insert(t, c1, { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }); // grows from 0px (padding sits inside)
          V7.flash(t, r1, { tone: 'you', duration: 1800 });
          V7.pop(t, tag, { delay: 140 });
          V7.roll(t, count, N14);
          t.after(320, function () { if (list) list.style.minHeight = ''; }); // inserted: the natural height is the final one again
        }],
        [1900, function (t) { V7.cursorTo(t, amt, { duration: 550 }); }],
        [2500, function (t) {
          V7.tap(t, amt);
          if (!amt) return;
          amt.classList.add('is-edit');
          var c = document.createElement('span'); c.className = 'v7-caret'; amt.appendChild(c);
        }],
        [2700, function (t) { V7.untype(t, amt, { duration: 240 }); }],
        [3000, function (t) { V7.type(t, amt, '40,000', { duration: 360 }); }],
        [3450, function (t) {
          if (amt) { amt.classList.remove('is-edit'); carets(); }
          V7.roll(t, meta3, M3, { html: true });
          V7.flash(t, r5, { tone: 'ok' });
        }],
        [3800, function (t) { V7.show(t, redBox, { y: 6, duration: 280 }); V7.show(t, red, { stagger: 60, delay: 80 }); }]
      ]
    };
  });
})();
// <<< M8
