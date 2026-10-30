// >>> K2 reverse-the-build flows (homepage #reverse). Markup = final state (K2.html, from tools/k2frag.mjs).
// Old way (~6 s): a flow of three person steps is laid out on the floor, then automated one step at a time (each person
// cube except the middle one gives way to a grey gear cube in the same place). There is no goal: a run goes through the automated flow to
// its end, and then: why?
// Our way (~5 s): the goal line and its flag come first. Then the flow is built backwards from it: the step nearest the
// goal docks first, then the one before it, each with its piece of line, until the start. The line lights up from start
// to goal, a run reaches the goal line, On track. ~13.2 s a cycle (with the rest), two cycles, then the final markup.
// Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var T = {
    o: { start: 200, seg0: 400, step: 600, cube0: 650, swap0: 2700, swapStep: 450, tail: 4100, run: 4500, runMs: 1300, res: 5900 },
    n: { goal: 6500, flag: 6850, cube0: 7400, step: 600, start: 9200, lit: 9650, litMs: 800, run: 9850, runMs: 1100, ok: 11050 },
    len: 11500, hold: 1700
  };
  var EASE = { drop: 'cubic-bezier(.22,1,.36,1)', grow: 'cubic-bezier(.33,0,.2,1)', run: 'cubic-bezier(.45,0,.25,1)' };
  var xy = function (el) { return String(el.getAttribute('data-at') || '0,0').split(',').map(parseFloat); };
  var tf = function (p, dy, sc) { return 'translate(' + p[0] + 'px,' + (p[1] + (dy || 0)) + 'px)' + (sc ? ' scale(' + sc + ')' : ''); };

  V7.define('K2', function (root) {
    var A = { old: V7.$(root, '.k2-act[data-act=old]'), neu: V7.$(root, '.k2-act[data-act=new]') };
    if (!A.old || !A.neu) throw new Error('K2 markup');
    var q = function (act, s) { return V7.$(act, s); }, qq = function (act, s) { return V7.$$(act, s); };
    var o = {
      start: q(A.old, '.k2-start'), segs: qq(A.old, '.k2-seg'), human: qq(A.old, '.k2-cube.is-human'), auto: qq(A.old, '.k2-cube.is-auto'),
      end: q(A.old, '.k2-end'), run: q(A.old, '.k2-run'), res: q(A.old, '.k2-res')
    };
    var n = {
      start: q(A.neu, '.k2-start'), segs: qq(A.neu, '.k2-seg'), cubes: qq(A.neu, '.k2-cube'), lit: q(A.neu, '.k2-lit'),
      goal: q(A.neu, '.k2-goal'), flag: q(A.neu, '.k2-flag'), run: q(A.neu, '.k2-run'), ok: q(A.neu, '.k2-ok')
    };
    if (!o.auto.length || !o.human.length || n.cubes.length !== n.segs.length - 1 || !o.run || !n.run) throw new Error('K2 markup');
    var steps = [], at = function (ms, fn) { steps.push([ms, fn]); };
    var fadeIn = function (tl, el, ms, from) {
      tl.anim(el, [{ opacity: 0, transform: from || 'none' }, { opacity: 1, transform: 'none' }], { duration: ms || 500, easing: 'out', fill: 'both' });
    };
    var grow = function (tl, el, ms) { tl.anim(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms || 380, easing: EASE.grow, fill: 'both' }); };
    var drop = function (tl, el, ms) {
      var p = xy(el), g = el.querySelector('.k2-glint');
      tl.anim(el, [{ opacity: 0, transform: tf(p, -26) }, { opacity: 1, offset: .4 }, { opacity: 1, transform: tf(p) }], { duration: ms || 560, easing: EASE.drop, fill: 'both' });
      if (g) tl.anim(g, [{ opacity: 0 }, { opacity: .35, offset: .3 }, { opacity: 0 }], { duration: 700, delay: 360, easing: 'ease-out', fill: 'none' });
    };
    var run = function (tl, dot, ms) {
      var d = parseFloat(dot.getAttribute('data-run')) || 0;
      tl.anim(dot, [{ opacity: 0, transform: 'translateX(0px)' }, { opacity: 1, offset: .08 }, { opacity: 1, transform: 'translateX(' + d + 'px)' }], { duration: ms, easing: EASE.run, fill: 'both' });
    };

    // ---- Old way: the start, then the flow of three person steps, segment by segment
    at(T.o.start, function (tl) { fadeIn(tl, o.start, 400); });
    o.human.forEach(function (e, i) {
      at(T.o.seg0 + i * T.o.step, function (tl) { grow(tl, o.segs[i]); });
      at(T.o.cube0 + i * T.o.step, function (tl) { drop(tl, e); });
    });
    // automate them one by one (the middle person stays): the person lifts away, a gear cube settles in the same place
    o.auto.forEach(function (e, k) {
      at(T.o.swap0 + k * T.o.swapStep, function (tl) {
        var p = xy(e), h = o.human[+e.getAttribute('data-i')], g = e.querySelector('.k2-glint');
        tl.anim(h, [{ opacity: 1, transform: tf(p) }, { opacity: 0, transform: tf(p, -10, .94) }], { duration: 320, easing: 'in', fill: 'both' });
        tl.anim(e, [{ opacity: 0, transform: tf(p, -16) }, { opacity: 1, offset: .45 }, { opacity: 1, transform: tf(p) }], { duration: 520, delay: 160, easing: EASE.drop, fill: 'both' });
        if (g) tl.anim(g, [{ opacity: 0 }, { opacity: .4, offset: .3 }, { opacity: 0 }], { duration: 650, delay: 520, easing: 'ease-out', fill: 'none' });
      });
    });
    at(T.o.tail, function (tl) { grow(tl, o.segs[o.segs.length - 1]); fadeIn(tl, o.end, 300); });
    // a run goes through the automated flow to its end: no goal to reach, so why?
    at(T.o.run, function (tl) { run(tl, o.run, T.o.runMs); });
    at(T.o.res, function (tl) { V7.pop(tl, o.res, { duration: 380, from: .85 }); });

    // ---- Our way: the goal first
    at(T.n.goal, function (tl) { fadeIn(tl, n.goal, 600, 'translateY(-8px)'); });
    at(T.n.flag, function (tl) { V7.pop(tl, n.flag, { duration: 420, from: .85 }); });
    // then backwards: the step nearest the goal and its line to the goal, then the one before it …
    var last = n.cubes.length - 1;
    n.cubes.forEach(function (e, k) {
      var i = last - k;
      at(T.n.cube0 + k * T.n.step, function (tl) { drop(tl, n.cubes[i]); });
      at(T.n.cube0 + k * T.n.step + 220, function (tl) { grow(tl, n.segs[i + 1], 360); });
    });
    at(T.n.start, function (tl) { grow(tl, n.segs[0], 360); fadeIn(tl, n.start, 400); });
    // the flow is complete: it lights up from start to goal, and a run reaches the goal
    at(T.n.lit, function (tl) { tl.anim(n.lit, [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }], { duration: T.n.litMs, easing: EASE.grow, fill: 'both' }); });
    at(T.n.run, function (tl) { run(tl, n.run, T.n.runMs); });
    at(T.n.ok, function (tl) { V7.pop(tl, n.ok, { duration: 420, from: .8 }); });

    return {
      length: T.len,
      hold: T.hold,
      loop: true,
      maxLoops: 2,
      arm: function () {
        var hide = function (els) { els.forEach(function (e) { if (e) e.style.opacity = '0'; }); };
        hide([o.start, o.end, o.run, n.start, n.goal, n.run, n.lit]);
        hide(o.human); hide(o.auto); hide(n.cubes);
        o.segs.concat(n.segs).forEach(function (e) { e.style.transform = 'scaleX(0)'; });
        V7.off([o.res, n.flag, n.ok]);
      },
      steps: steps
    };
  });
})();
// <<< K2
