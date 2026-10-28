// >>> K2 reverse-the-build cubes (homepage #reverse). Markup = final state (K2.html, from tools/k2frag.mjs).
// Act 1 (old way): six cubes stack into a wobbly tower with no target, "why?" appears, the tower tips and falls into a pile.
// Act 2 (our way): the goal line and its 90% flag come first, a dashed plan of the column appears, then Mate's cubes land
// one by one, each on purpose, until the top one meets the line: On track. Slow on purpose: ~11.6 s, then a 3.2 s rest.
// Two cycles (maxLoops), then it rests on the final markup. Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var T = { drop0: 300, dropStep: 640, why: 4500, tip: 5500, tilt: 950, goal: 7300, flag: 7800, plan: 8300, land0: 8900, landStep: 620, ok: 12200, len: 12700 };
  var nums = function (el, a) { return (el.getAttribute(a) || '').split(',').map(parseFloat); };
  var tf = function (x, y, r) { return 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + (r || 0).toFixed(2) + 'deg)'; };
  var EASE = { drop: 'cubic-bezier(.33,0,.2,1)', land: 'cubic-bezier(.22,1,.36,1)', tilt: 'cubic-bezier(.55,0,.85,.35)', fall: 'cubic-bezier(.5,0,.75,0)' };

  V7.define('K2', function (root) {
    var old = V7.$$(root, '.k2-cube.is-old'), mate = V7.$$(root, '.k2-cube.is-mate'), tower = V7.$(root, '.k2-tower'),
      why = V7.$(root, '.k2-why'), goal = V7.$(root, '.k2-goal'), flag = V7.$(root, '.k2-flag'), plan = V7.$(root, '.k2-ghost'),
      ok = V7.$(root, '.k2-ok');
    if (old.length < 2 || !mate.length || !tower) throw new Error('K2 markup');
    var piv = nums(tower, 'data-pivot');
    var tw = old.map(function (e) { return nums(e, 'data-tower'); }), pl = old.map(function (e) { return nums(e, 'data-pile'); });
    var at = mate.map(function (e) { return nums(e, 'data-at'); });

    // where cube i sits when the whole tower is rotated by a degrees about the pivot (the base cube's front-right corner)
    function tilted(i, a) {
      var r = a * Math.PI / 180, dx = tw[i][0] - piv[0], dy = tw[i][1] - piv[1];
      return tf(piv[0] + dx * Math.cos(r) - dy * Math.sin(r), piv[1] + dx * Math.sin(r) + dy * Math.cos(r), tw[i][2] + a);
    }
    var steps = [];

    // Act 1: the stack, one cube at a time, each set down slightly off
    old.forEach(function (e, i) {
      steps.push([T.drop0 + i * T.dropStep, function (tl) {
        var p = tw[i];
        tl.anim(e, [{ opacity: 0, transform: tf(p[0] + (i % 2 ? 6 : -5), p[1] - 46, p[2] * 2) }, { opacity: 1, offset: .35 }, { opacity: 1, transform: tf(p[0], p[1], p[2]) }],
          { duration: 560, easing: EASE.drop, fill: 'both' });
      }]);
    });
    // the tower sways as it grows (about its base), more with each cube, and is back upright when it tips
    steps.push([T.drop0 + 3 * T.dropStep + 400, function (tl) {
      tl.anim(tower, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1.2deg)', offset: .2 }, { transform: 'rotate(1deg)', offset: .45 },
        { transform: 'rotate(-1.4deg)', offset: .65 }, { transform: 'rotate(1.8deg)', offset: .85 }, { transform: 'rotate(0deg)' }],
        { duration: T.tip - (T.drop0 + 3 * T.dropStep + 400), easing: 'ease-in-out', fill: 'none' });
    }]);
    steps.push([T.why, function (tl) { V7.on(why); tl.anim(why, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'out', fill: 'both' }); }]);
    // tip: the tower leans over its corner (slow start, like weight), then each cube drops to its place in the pile
    steps.push([T.tip, function (tl) {
      old.forEach(function (e, i) {
        var fall = 480 + i * 70, tot = T.tilt + fall, k = T.tilt / tot, lean = 22 + i * 1.5;
        tl.anim(e, [
          { transform: tf(tw[i][0], tw[i][1], tw[i][2]), easing: EASE.tilt },
          { transform: tilted(i, lean * .35), offset: k * .7, easing: 'linear' },
          { transform: tilted(i, lean), offset: k, easing: EASE.fall },
          { transform: tf(pl[i][0], pl[i][1] - 3, pl[i][2]), offset: .94, easing: 'ease-out' },
          { transform: tf(pl[i][0], pl[i][1], pl[i][2]) }
        ], { duration: tot, easing: 'linear', fill: 'both' });
      });
    }]);

    // Act 2: the goal first
    steps.push([T.goal, function (tl) { V7.on(goal); tl.anim(goal, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'out', fill: 'both' }); }]);
    steps.push([T.flag, function (tl) { V7.pop(tl, flag, { duration: 420, from: .85 }); }]);
    // the plan (a dashed outline of the column, drawn back from the goal) shows while the cubes fill it, then clears
    steps.push([T.plan, function (tl) { tl.anim(plan, [{ opacity: 0 }, { opacity: 1, offset: 600 / (T.ok + 600 - T.plan) }, { opacity: 1, offset: (T.ok - T.plan) / (T.ok + 600 - T.plan) }, { opacity: 0 }], { duration: T.ok + 600 - T.plan, easing: 'ease-out', fill: 'both' }); }]);
    // then the column, cube by cube, each landing exactly on the one below
    mate.forEach(function (e, i) {
      steps.push([T.land0 + i * T.landStep, function (tl) {
        var p = at[i], g = e.querySelector('.k2-glint');
        tl.anim(e, [{ opacity: 0, transform: tf(p[0], p[1] - 40) }, { opacity: 1, offset: .4 }, { opacity: 1, transform: tf(p[0], p[1]) }], { duration: 520, easing: EASE.land, fill: 'both' });
        if (g) tl.anim(g, [{ opacity: 0 }, { opacity: .3, offset: .3 }, { opacity: 0 }], { duration: 700, delay: 380, easing: 'ease-out', fill: 'none' });
      }]);
    });
    steps.push([T.ok, function (tl) { V7.pop(tl, ok, { duration: 420, from: .8 }); }]);

    return {
      length: T.len,
      hold: 3200,
      loop: true,
      maxLoops: 2,
      arm: function () {
        old.forEach(function (e, i) { e.style.transform = tf(tw[i][0], tw[i][1] - 46, tw[i][2]); e.style.opacity = '0'; });
        mate.forEach(function (e, i) { e.style.transform = tf(at[i][0], at[i][1] - 40); e.style.opacity = '0'; });
        V7.off([why, goal, flag, ok]);
      },
      steps: steps
    };
  });
})();
// <<< K2
