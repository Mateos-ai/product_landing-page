// >>> K2 reverse-the-build toy blocks (homepage #reverse). Markup = final state (K2.html, from tools/k2frag.mjs).
// Act 1 (old way, ~6 s): with CRM already down, App, Bot, Excel and Dashboard are dropped on, each a little off; the
// tower rocks on its corners, "why?" appears, it tips over and the blocks tumble into a pile, which then fades.
// Act 2 (our way, ~6.5 s after a 1 s beat): the goal block (90%) appears alone, high up, where the top will be; then
// the tower builds DOWNWARD under it, block by block, until the base touches the ground and the shadow lands: On track.
// On a wide stage the pile then comes back small and faded beside the tower (the final markup). Rest 3 s, two cycles.
// Positions are in stage units (one block height, measured from .k2-probe each cycle); x and r mirror in RTL.
// At the end of each cycle every animation is dropped and the CSS (the final markup) takes over, so a later resize
// never leaves pixel positions behind. Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var T = {
    drop0: 400, dropStep: 700, drop: 650,
    rock: [[3100, 0], [3350, 1.4], [3600, 0], [3850, -2.2], [4100, 0], [4350, 2.8], [4600, 0], [4880, -5], [5150, -17]],
    why: 3700, whyOut: 5500, fall: 640, fallStep: 90, pileOut: 6350, capOut: 6550,
    capIn: 7600, goal: 7800, tag: 8400, build0: 9100, buildStep: 700, build: 640, ok: 12200, side: 13000, len: 14000
  };
  var nums = function (s) { return String(s || '').split(',').map(parseFloat); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };

  V7.define('K2', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var olds = $$('.k2-old .k2-b'), news = $$('.k2-new .k2-b'), oldG = $('.k2-old'), oldSh = $('.k2-old .k2-shadow'),
      newSh = $('.k2-new .k2-shadow'), capO = $('.k2-cap[data-act=old]'), capN = $('.k2-cap[data-act=new]'),
      why = $('.k2-why'), tag = $('.k2-tag'), ok = $('.k2-ok'), oldTag = $('.k2-oldtag'), probe = $('.k2-probe');
    if (olds.length < 3 || news.length < 2 || !oldG || !probe) throw new Error('K2 markup');
    var u = parseFloat(getComputedStyle(probe).width) || 60, d = V7.dir(root), pv = parseFloat(root.getAttribute('data-pivot')) || -1.25;
    var tower = olds.map(function (e) { return nums(e.getAttribute('data-tower')); }),
      pile = olds.map(function (e) { return nums(e.getAttribute('data-pile')); }),
      size = olds.map(function (e) { return [parseFloat(e.style.getPropertyValue('--w')), parseFloat(e.style.getPropertyValue('--h'))]; }),
      at = news.map(function (e) { return parseFloat(e.style.getPropertyValue('--y')) || 0; });
    var goal = news[news.length - 1], base = tower[0], bw = size[0][0];
    var tf = function (x, y, r) { return 'translate(' + (x * u * d).toFixed(2) + 'px,' + (-y * u).toFixed(2) + 'px) rotate(' + ((r || 0) * d).toFixed(2) + 'deg)'; };
    // block i of the tower rocked by a degrees (clockwise) about the base corner it leans on
    function rocked(i, a) {
      var p = tower[i], cx = a < 0 ? pv : base[0] + bw / 2;
      var rad = a * Math.PI / 180, dx = p[0] - cx, dy = -p[1];
      return [cx + dx * Math.cos(rad) - dy * Math.sin(rad), -(dx * Math.sin(rad) + dy * Math.cos(rad)), p[2] + a];
    }
    var made = [], touched = [];
    function A(tl, el, kf, o) { var a = tl.anim(el, kf, o); if (a) made.push(a); return a; }
    function fade(tl, el, from, to, ms, extra) {
      var k0 = { opacity: from }, k1 = { opacity: to };
      if (extra) { k0.transform = extra[0]; k1.transform = extra[1]; }
      return A(tl, el, [k0, k1], { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    }
    var steps = [];

    // ---- Act 1: drop App, Bot, Excel, Dashboard onto CRM
    olds.forEach(function (e, i) {
      if (!i) return;
      steps.push([T.drop0 + (i - 1) * T.dropStep, function (tl) {
        var p = tower[i], s = i % 2 ? 1 : -1;
        A(tl, e, [
          { opacity: 0, transform: tf(p[0] + s * .12, p[1] + 1.5, p[2] - s * 5), easing: 'cubic-bezier(.45,0,.8,.45)' },
          { opacity: 1, transform: tf(p[0] + s * .03, p[1] + .35, p[2] - s * 2), offset: .55, easing: 'cubic-bezier(.3,0,.8,.6)' },
          { opacity: 1, transform: tf(p[0], p[1], p[2]), offset: .8, easing: 'ease-out' },
          { opacity: 1, transform: tf(p[0], p[1] + .045, p[2] + s * .3), offset: .9, easing: 'ease-in' },
          { opacity: 1, transform: tf(p[0], p[1], p[2]) }
        ], { duration: T.drop, fill: 'both' });
      }]);
    });
    // rock on its corners, then tip over the inline-start corner and tumble into the pile
    var r0 = T.rock[0][0], r1 = T.rock[T.rock.length - 1][0];
    steps.push([r0, function (tl) {
      olds.forEach(function (e, i) {
        var fall = T.fall + i * T.fallStep, end = r1 + fall, span = end - r0, L = rocked(i, T.rock[T.rock.length - 1][1]), Pp = pile[i];
        var kf = T.rock.map(function (k, j) {
          var q = rocked(i, k[1]);
          return { transform: tf(q[0], q[1], q[2]), offset: (k[0] - r0) / span, easing: j >= T.rock.length - 3 ? 'cubic-bezier(.5,0,.9,.5)' : 'ease-in-out' };
        });
        var o = function (ms) { return (r1 - r0 + ms) / span; };
        kf.push({ transform: tf(lerp(L[0], Pp[0], .62), lerp(L[1], Pp[1], .38), lerp(L[2], Pp[2], .55)), offset: o(fall * .5), easing: 'cubic-bezier(.35,0,.85,.55)' });
        kf.push({ transform: tf(Pp[0], Pp[1], Pp[2]), offset: o(fall * .84), easing: 'ease-out' });
        kf.push({ transform: tf(Pp[0] + (Pp[0] < 0 ? -.03 : .02), Pp[1] + .05, Pp[2] + (Pp[2] < 0 ? -1.5 : 1.5)), offset: o(fall * .92), easing: 'ease-in' });
        kf.push({ transform: tf(Pp[0], Pp[1], Pp[2]), offset: 1 });
        kf[0].opacity = 1; kf[kf.length - 1].opacity = 1;
        A(tl, e, kf, { duration: span, easing: 'linear', fill: 'both' });
      });
    }]);
    steps.push([T.rock[T.rock.length - 2][0], function (tl) {
      if (oldSh) A(tl, oldSh, [{ transform: 'none' }, { transform: 'translateX(' + (-1 * u * d).toFixed(1) + 'px) scaleX(1.55)' }], { duration: 900, easing: 'ease-out', fill: 'both' });
    }]);
    steps.push([T.why, function (tl) { fade(tl, why, 0, 1, 520, ['translateY(8px) scale(.9)', 'none']); }]);
    steps.push([T.whyOut, function (tl) { fade(tl, why, 1, 0, 420); }]);
    steps.push([T.pileOut, function (tl) { fade(tl, oldG, 1, 0, 560); }]);
    steps.push([T.capOut, function (tl) { fade(tl, capO, 1, 0, 420, ['none', 'translateY(-6px)']); }]);

    // ---- Act 2: the goal first, alone and high; then the tower builds downward under it
    steps.push([T.capIn, function (tl) { fade(tl, capN, 0, 1, 520, ['translateY(6px)', 'none']); }]);
    steps.push([T.goal, function (tl) {
      var y = at[at.length - 1];
      A(tl, goal, [{ opacity: 0, transform: tf(0, y + .35, 0) + ' scale(.92)' }, { opacity: 1, offset: .5 }, { opacity: 1, transform: tf(0, y, 0) }],
        { duration: 820, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      if (newSh) fade(tl, newSh, 0, .3, 820, ['scale(.5)', 'scale(.55)']);
    }]);
    steps.push([T.tag, function (tl) { fade(tl, tag, 0, 1, 460, ['translateX(' + (8 * d) + 'px)', 'none']); }]);
    var order = news.slice(0, -1).reverse();      // just under the goal first, the base last
    order.forEach(function (e, k) {
      var i = news.indexOf(e), y = at[i], last = k === order.length - 1;
      steps.push([T.build0 + k * T.buildStep, function (tl) {
        A(tl, e, [{ opacity: 0, transform: tf(0, y - .7, 0) }, { opacity: 1, offset: .45 }, { opacity: 1, transform: tf(0, y, 0) }],
          { duration: T.build, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        if (newSh) {
          var f0 = (k + 1) / (order.length + 1), f1 = (k + 2) / (order.length + 1);
          if (last) A(tl, newSh, [{ opacity: .3 + .5 * f0, transform: 'scale(' + (.55 + .4 * f0) + ')' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 260, easing: 'ease-out', fill: 'both' });
          else A(tl, newSh, [{ opacity: .3 + .5 * f0, transform: 'scale(' + (.55 + .4 * f0) + ')' }, { opacity: .3 + .5 * f1, transform: 'scale(' + (.55 + .4 * f1) + ')' }], { duration: T.build, easing: 'ease-out', fill: 'both' });
        }
      }]);
    });
    steps.push([T.ok, function (tl) {
      A(tl, ok, [{ opacity: 0, transform: 'translateX(' + (-8 * d) + 'px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'both' });
    }]);
    // the pile returns small and faded beside the tower, when the CSS final state has room for it
    steps.push([T.side, function (tl) {
      [oldG, oldTag].forEach(function (el) {
        made.forEach(function (a) { if (a.effect && a.effect.target === el) a.cancel(); });
        el.style.opacity = ''; el.style.transform = '';
        var to = parseFloat(getComputedStyle(el).opacity) || 0;
        el.style.opacity = '0';
        if (to > 0) A(tl, el, [{ opacity: 0 }, { opacity: to }], { duration: 800, easing: 'ease-out', fill: 'both' });
      });
    }]);
    // hand over to the final markup
    steps.push([T.len, function () {
      made.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      made = [];
      touched.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; });
    }]);

    return {
      length: T.len,
      hold: 3000,
      loop: true,
      maxLoops: 2,
      arm: function () {
        var set = function (el, o, t) { if (!el) return; touched.push(el); el.style.opacity = o; el.style.transform = t == null ? '' : t; };
        olds.forEach(function (e, i) { var p = tower[i]; set(e, i ? '0' : '1', tf(p[0], p[1] + (i ? 1.5 : 0), p[2])); });
        set(oldG, '1', 'none'); set(oldSh, '1', 'none'); set(oldTag, '0');
        set(capO, '1', 'none'); set(capN, '0');
        news.forEach(function (e, i) { set(e, '0', tf(0, at[i], 0)); });
        set(newSh, '0'); set(why, '0'); set(tag, '0'); set(ok, '0');
      },
      steps: steps
    };
  });
})();
// <<< K2
