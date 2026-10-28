// >>> M23 m-gap100 100 businesses (About spec §2 M23): plays once at 40% visible; the pause button replays it.
// Armed: the card with its header and legend, the 100 dots as faint outlines, the count at 0, the goal line away (never
// an empty frame). Then: the rows firm up in a quick wave, the first 39 dots light teal in reading order while "39"
// counts with them dot by dot, the 61 dim dots get one soft amber outline pulse, and the goal line comes in.
// A replay starts from the finished card: the lit dots go out in reverse (the count runs back), then the same sequence.
// Transform, opacity and short border-colour changes only; every dot exists from the start (no layout change).
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var FAINT = .28, STEP = 26;
  function tv(el, n) { try { return getComputedStyle(el).getPropertyValue(n).trim(); } catch (e) { return ''; } }

  V7.define('M23', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var again = !!root.__m23ran, grid = $('.m-gap100-grid'), rows = $$('.m-gap100-row'), fills = $$('.m-gap100-d > b'),
      dims = $$('.m-gap100-d:not(.is-on)'), num = $('.m-gap100-k.is-on .m-gap100-n'), goal = $('.m-gap100-goal');
    var N = fills.length, L0 = again ? 600 : 520, lit = L0 + (N - 1) * STEP + 340, P0 = lit + 100, G0 = P0 + 760;
    root.__m23ran = 1;
    function set(v) { if (num) num.textContent = String(v); }

    var steps = [];
    if (again) { // the finished card goes back to zero first, so a replay never jumps
      steps.push([0, function (t) {
        V7.hide(t, goal, { y: -4, duration: 200 });
        fills.slice().reverse().forEach(function (f, j) {
          V7.hide(t, f, { y: 0, duration: 180, delay: j * 8 });
          t.after(j * 8, function () { set(N - 1 - j); });
        });
      }]);
    } else {
      steps.push([0, function (t) { // the rows firm up, top to bottom
        if (grid) grid.removeAttribute('data-faint');
        rows.forEach(function (r, i) {
          t.anim(r, [{ opacity: FAINT, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 45, easing: 'out', fill: 'backwards' });
        });
      }]);
    }
    steps.push([L0, function (t) { // 39 light up in reading order; the count follows each dot
      V7.pop(t, fills, { from: .3, duration: 340, stagger: STEP });
      fills.forEach(function (f, i) { t.after(i * STEP, function () { set(i + 1); }); });
    }]);
    steps.push([P0, function (t) { // one soft amber pulse over the 61 still to go
      var base = dims[0] ? getComputedStyle(dims[0]).borderTopColor : '', amber = tv(root, '--m-you') || '#FF8C42';
      if (!base) return;
      dims.forEach(function (dm, j) {
        t.anim(dm, [{ borderColor: base, transform: 'scale(1)' }, { offset: .35, borderColor: amber, transform: 'scale(1.1)' }, { borderColor: base, transform: 'scale(1)' }],
          { duration: 720, delay: j * 9, easing: 'ease-in-out', fill: 'none' });
      });
    }]);
    steps.push([G0, function (t) { V7.show(t, goal, { y: 6, duration: 380 }); }]);

    return {
      length: G0 + 420,
      hold: 0,
      arm: function () {
        if (again) return; // a replay arms on the finished card (step 0 takes it back)
        if (grid) grid.setAttribute('data-faint', '');
        V7.off(fills);
        V7.off(goal);
        set(0);
      },
      steps: steps
    };
  });
})();
// <<< M23
