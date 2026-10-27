// >>> M16 m-bars station chart (Industries spec §3 M16). Plays once at 40% visible.
// Data-driven: rows, values (--v), scale (--max on the root, else the largest --v) and the highlight (.is-hi) come from the
// markup. Armed: labels and tracks stand, bars at zero, values hidden (a structured chart, never an empty card).
// Then the bars grow from the inline-start (stagger 80) while each value rides its bar tip and counts up; the highlighted
// bar overshoots softly, settles, and pulses one soft amber glow. Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var GROW = 900, HI_GROW = 1240, HI_PEAK = .7, OVER = 1.025, STAGGER = 80;
  function num(el, name) { var v = el ? parseFloat(el.style.getPropertyValue(name)) : NaN; return isNaN(v) ? NaN : v; }
  function rgba(c, a) { // '#RRGGBB' or 'rgb(a)(…)' → rgba with alpha a
    var m, s = String(c || '').trim();
    if ((m = s.match(/^#([0-9a-f]{6})$/i))) return 'rgba(' + parseInt(m[1].slice(0, 2), 16) + ',' + parseInt(m[1].slice(2, 4), 16) + ',' + parseInt(m[1].slice(4, 6), 16) + ',' + a + ')';
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) { var p = m[1].split(/[\s,\/]+/); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
    return 'rgba(255,140,66,' + a + ')';
  }
  V7.define('M16', function (root) {
    var rows = V7.$$(root, '.m-bars-row').map(function (r) {
      return { row: r, fill: V7.$(r, '.m-bars-fill'), plot: V7.$(r, '.m-bars-plot'), n: V7.$(r, '.m-bars-n'), v: V7.$(r, '.m-bars-v'),
        val: num(r, '--v') || 0, hi: r.classList.contains('is-hi') };
    });
    var max = num(root, '--max');
    if (!(max > 0)) max = Math.max.apply(null, rows.map(function (o) { return o.val; }).concat([1]));
    var dir = V7.dir(root), fmt;
    try { fmt = new Intl.NumberFormat(document.documentElement.lang || 'en', { maximumFractionDigits: 0 }); } catch (e) { fmt = { format: String }; }
    var last = 0;
    rows.forEach(function (o, i) { var end = i * STAGGER + (o.hi ? HI_GROW : GROW); if (end > last) last = end; });

    function grow(t, o, i) {
      if (!o.fill) return;
      var dl = i * STAGGER, W = o.plot ? o.plot.clientWidth : 0, x = Math.min(o.val / max, 1) * W, s = dir;
      o.fill.style.transform = '';
      if (o.n) V7.on(o.n);
      if (o.hi) { // grow past the end, then settle (the value label rides the same keyframes, so it stays on the tip)
        var e1 = V7.ease.out, e2 = 'cubic-bezier(.45,0,.35,1)';
        t.anim(o.fill, [{ offset: 0, transform: 'scaleX(0)', easing: e1 }, { offset: HI_PEAK, transform: 'scaleX(' + OVER + ')', easing: e2 }, { offset: 1, transform: 'scaleX(1)' }],
          { duration: HI_GROW, delay: dl, easing: 'linear', fill: 'backwards' });
        if (o.n) t.anim(o.n, [{ offset: 0, transform: 'translateX(' + (-x * s) + 'px)', opacity: 0, easing: e1 }, { offset: .12, opacity: 1 },
          { offset: HI_PEAK, transform: 'translateX(' + ((OVER - 1) * x * s) + 'px)', easing: e2 }, { offset: 1, transform: 'translateX(0px)', opacity: 1 }],
          { duration: HI_GROW, delay: dl, easing: 'linear', fill: 'backwards' });
      } else {
        t.anim(o.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: GROW, delay: dl, easing: 'out', fill: 'backwards' });
        if (o.n) t.anim(o.n, [{ offset: 0, transform: 'translateX(' + (-x * s) + 'px)', opacity: 0 }, { offset: .15, opacity: 1 }, { offset: 1, transform: 'translateX(0px)', opacity: 1 }],
          { duration: GROW, delay: dl, easing: 'out', fill: 'backwards' });
      }
      // the value counts while its bar grows (it reaches the value at the bar's peak, never above it)
      if (o.v) {
        // While it counts, the unit (" h", the nodes after the number) rides in the number's own text node: the label's
        // start never moves and only its end grows, so there is no text shift and no gap before the unit. The markup's
        // nodes come back when the count lands.
        var to = Math.round(o.val), tail = [], nd = o.v.nextSibling;
        while (nd) { tail.push(nd); nd = nd.nextSibling; }
        var unit = tail.map(function (x) { return x.textContent; }).join('');
        var set = function (p) { o.v.textContent = fmt.format(Math.round(to * p)) + unit; };
        tail.forEach(function (x) { x.parentNode.removeChild(x); });
        set(0);
        t.after(dl, function (t2) {
          t2.tween(o.hi ? HI_GROW * HI_PEAK : GROW * .8, 'out', set, function () {
            o.v.textContent = fmt.format(to);
            tail.forEach(function (x) { o.n.appendChild(x); });
          });
        });
      }
    }
    function glow(t, o) { // one soft amber pulse around the highlighted bar
      if (!o || !o.fill) return;
      var c = '';
      try { c = getComputedStyle(o.fill).backgroundColor; } catch (e) {}
      t.anim(o.fill, [
        { boxShadow: '0 0 0 0 ' + rgba(c, .5) + ',0 0 0 0 ' + rgba(c, 0) },
        { offset: .3, boxShadow: '0 0 0 4px ' + rgba(c, .2) + ',0 0 18px 3px ' + rgba(c, .35) },
        { boxShadow: '0 0 0 9px ' + rgba(c, 0) + ',0 0 26px 6px ' + rgba(c, 0) }
      ], { duration: 1100, easing: 'out', fill: 'none' });
    }

    var steps = [[0, function (t) { rows.forEach(function (o, i) { grow(t, o, i); }); }]];
    rows.forEach(function (o, i) { if (o.hi) steps.push([i * STAGGER + Math.round(HI_GROW * HI_PEAK) - 60, function (t) { glow(t, o); }]); });
    return {
      length: last + 400, hold: 0,
      arm: function () {
        rows.forEach(function (o) {
          if (o.fill) o.fill.style.transform = 'scaleX(0)';
          V7.off(o.n);
        });
      },
      steps: steps
    };
  });
})();
// <<< M16
