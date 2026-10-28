// >>> M12 m-loop learning loop, product P5 (spec §6 M12). Plays once, length 5600.
// From arm() the whole loop stands as a ghost: every label, card frame and lane row in its normal frame, with static
// placeholder bars where the text goes. The timeline then fills each one in place (bars out, text in), so the canvas is
// never empty and nothing moves. Connectors still grow between the steps.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var BARS = [['58%', '86%'], ['34%', '82%', '44%'], ['92%', '66%', '40%']]; // placeholder lines per card
  V7.define('M12', function (root) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    var cols = [1, 2, 3].map(function (n) { var k = $('.m-loop-k' + n); return { lbl: $('.m-loop-lbl', k), card: $('.m-loop-card', k) }; }),
      conns = $$('.m-loop-h').map(function (h) { return { line: $('.m-loop-line', h), chev: $('.v7-ic', h) }; }),
      down = $('.m-loop-down .m-loop-line'), dchev = $('.m-loop-down .v7-ic'), dl = $('.m-loop-dl'),
      lane = { lbl: $('.m-loop-lane > .m-loop-lbl') }, rows = $$('.m-loop-row').map(function (r) { return { el: r }; }),
      box = $('.m-loop-box'), tick = $('.m-loop-box path'), fig = root.closest('.v7-figure') || root;
    var axis = (fig.clientWidth || root.clientWidth) >= 760 ? 'x' : 'y'; // connectors run across in three columns, down in one

    function ph(host, widths, cls) { // shared placeholder look: static --m-line bars, 8px tall, radius 4px, no loop
      var s = document.createElement('span');
      s.className = 'm-loop-ph' + (cls ? ' ' + cls : '');
      widths.forEach(function (w) { var i = document.createElement('i'); i.style.width = w; s.appendChild(i); });
      host.appendChild(s);
      return s;
    }
    function ghost(o, widths) { // o.host keeps its frame; its content goes invisible and bars stand in
      if (!o.host) return;
      o.kids = $$(':scope > :not(.m-loop-ph)', o.host);
      V7.off(o.kids);
      o.ph = ph(o.host, widths, o.cls);
      if (o.cls === 'is-lbl') o.host.classList.add('is-ghost');
    }
    function fill(t, o, opt) { // bars out, content in, in place
      if (!o.host) return;
      opt = opt || {};
      o.host.classList.remove('is-ghost');
      V7.hide(t, o.ph, { y: 0, duration: 180 });
      V7.show(t, opt.only || o.kids, { x: opt.x || 0, y: opt.x ? 0 : 4, duration: 280, stagger: 60, delay: 80 });
      var p = o.ph; t.after(300, function () { if (p && p.parentNode) p.parentNode.removeChild(p); });
    }
    function col(t, i) { // a column's label and card fill together
      var c = cols[i];
      fill(t, c.L); fill(t, c.C);
    }
    function link(t, i) { // the line grows from the inline-start (or the top), then the chevron lands
      var c = conns[i];
      if (!c) return;
      V7.grow(t, c.line, { axis: axis, duration: 400 });
      t.after(260, function (t2) { V7.show(t2, c.chev, axis === 'x' ? { x: -4, y: 0, duration: 180 } : { y: -4, duration: 180 }); });
    }
    function row(t, i) { // a lane row fills: its line slides in, its check pops
      var r = rows[i];
      if (!r || !r.R.host) return;
      fill(t, r.R, { x: -8, only: r.txt });
      V7.pop(t, r.ic, { duration: 300, from: .4, delay: 140 });
    }

    return {
      length: 5600,
      arm: function () {
        cols.forEach(function (c, i) {
          c.L = { host: c.lbl, cls: 'is-lbl' }; c.C = { host: c.card };
          ghost(c.L, ['100%']); ghost(c.C, BARS[i]);
        });
        lane.L = { host: lane.lbl, cls: 'is-lbl' }; ghost(lane.L, ['100%']);
        rows.forEach(function (r, i) {
          r.ic = $('.v7-ic', r.el); r.txt = $(':scope > span', r.el); r.R = { host: r.el, cls: 'is-row' };
          ghost(r.R, [['74%', '70%', '62%'][i]]);
        });
        conns.forEach(function (c) { V7.shrink(c.line, axis); V7.off(c.chev); });
        V7.shrink(down, 'y'); V7.off([dchev, dl]);
        if (box) box.setAttribute('data-unchecked', '');
        V7.undraw(tick);
      },
      steps: [
        [0, function (t) { col(t, 0); }],
        [600, function (t) { link(t, 0); }],
        [1000, function (t) { col(t, 1); }],
        [1500, function (t) { if (box) box.removeAttribute('data-unchecked'); V7.draw(t, tick, { duration: 300 }); }],
        [1900, function (t) { link(t, 1); }],
        [2300, function (t) { col(t, 2); V7.flash(t, cols[2].card, { tone: 'you', duration: 1500, delay: 260 }); }],
        [3100, function (t) {
          V7.grow(t, down, { axis: 'y', duration: 400 });
          V7.show(t, dchev, { y: -4, duration: 180, delay: 260 });
          V7.show(t, dl, { x: -6, y: 0, duration: 280, delay: 160 });
        }],
        [3500, function (t) { fill(t, lane.L); row(t, 0); }], // the lane's label fills with its first row
        [4100, function (t) { row(t, 1); }],
        [4700, function (t) { row(t, 2); }]
      ]
    };
  });
})();
// <<< M12
