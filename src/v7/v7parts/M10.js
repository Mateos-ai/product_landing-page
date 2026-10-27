// >>> M10 m-goals goals overview, product P1 (spec §6 M10 + §0 A6). Plays once, 700ms start delay, starts at 5% visible.
// Rings, sparklines and pills play on load. The "Mate · today" beat (thinking, three typed lines, the G-01 pulse) waits until
// the strip itself is at least 60% in view: the controller holds on its own pause reason ('strip') until then.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var G0 = 1580, G1 = 2320; // the strip beat starts at G0 when the strip is in view; else at G1 (every on-load motion has ended) it holds
  V7.define('M10', function (root, tl, o) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var cards = $$('.m-goals-card'), arcs = $$('.m-goals-arc'), vals = $$('.m-goals-val'), sparks = $$('.m-goals-spark'),
      pills = $$('.m-goals-pill'), lines = $$('.m-goals-entry'), think = $('.m-goals-think'), strip = $('.m-goals-today'),
      narrow = (o && o.size) === 'narrow', ctrl = V7.get(root), go = 0;
    // final values come from the markup: arc p from stroke-dasharray, centre value "51%" / "64 d" → number + suffix.
    // data-from sets where the count starts (G-03 counts down from 72 d: fewer days is better).
    var P = arcs.map(function (a) { return parseFloat(a.getAttribute('stroke-dasharray')) || 0; });
    var N = vals.map(function (v) {
      var m = String(v.textContent).trim().match(/^([\d.,]+)(.*)$/) || [0, '0', ''], f = parseFloat(v.getAttribute('data-from'));
      return { to: parseFloat(m[1].replace(/,/g, '')) || 0, suffix: m[2], from: isNaN(f) ? 0 : f };
    });

    function ring(t, i) { // arc sweep and centre count, in sync (900ms, outCubic)
      var a = arcs[i];
      if (!a) return;
      V7.on(a); // the round cap of a "0 1" dash would show as a lone dot before the sweep
      t.tween(900, V7.ease.outCubic, function (p) { a.setAttribute('stroke-dasharray', (P[i] * p).toFixed(4) + ' 1'); });
      if (vals[i]) V7.count(t, vals[i], { from: N[i].from, to: N[i].to, suffix: N[i].suffix, duration: 900 });
    }
    function typeLine(t, i, ms) { // the time fades in, the message types over its ghost
      var l = lines[i], tx = l && $('.m-goals-txt', l);
      if (!tx) return;
      V7.show(t, $('.m-goals-time', l), { y: 0, duration: 200 });
      V7.on(tx);
      V7.type(t, tx, tx.textContent, { duration: ms });
    }
    function seen() { // at least 60% of the strip is inside the viewport
      if (!strip) return true;
      var r = strip.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      return !r.height || (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height >= .6;
    }
    function beat(t) { // the strip, timed from the gate (offsets are the spec times minus 1580)
      t.after(0, function (t2) { if (think) think.hidden = false; V7.show(t2, think, { y: 0, duration: 200 }); });
      t.after(120, function (t2) { typeLine(t2, 0, 900); });
      t.after(1080, function (t2) { V7.status(t2, pills[0], 'ok'); }); // the line names G-01: its pill answers with a pulse
      t.after(1220, function (t2) { typeLine(t2, 1, 1100); });
      t.after(2520, function (t2) { typeLine(t2, 2, 800); }); // hidden narrow: type() then just settles the text
      t.after(narrow ? 2420 : 3370, function (t2) { // the dots leave the layout once faded, so no CSS loop keeps running
        V7.hide(t2, think, { y: 0, duration: 200 });
        t2.after(220, function () { if (think) think.hidden = true; });
      });
    }
    function unwatch() { if (root.__v7strip) { root.__v7strip(); root.__v7strip = null; } }

    return {
      length: G1 + 3420,
      hold: 500, // the timeline keeps running through the hold, so the last caret (removed 400ms after typing) clears before 'done'
      arm: function () {
        unwatch(); if (ctrl && ctrl.R) delete ctrl.R.strip; // a replay never inherits the previous cycle's hold
        V7.off(cards); V7.off(pills); V7.clip(sparks);
        arcs.forEach(function (a) { a.setAttribute('stroke-dasharray', '0 1'); V7.off(a); });
        vals.forEach(function (v, i) { v.textContent = N[i].from + N[i].suffix; });
        lines.forEach(function (l) {
          var m = $('.m-goals-msg', l), tx = m && $('.m-goals-txt', m), g;
          if (!tx) return;
          g = tx.cloneNode(true); g.className = 'm-goals-ghost'; m.appendChild(g); // appended after, so the typed span keeps its snapshot path
          m.classList.add('is-armed');
          V7.off(tx); V7.off($('.m-goals-time', l));
        });
        if (think) { think.hidden = true; V7.off(think); } // out of the layout until it shows: no dots animate unseen
      },
      steps: [
        [200, function (t) { V7.show(t, cards, { y: 12, duration: 400, stagger: 120 }); }],
        [400, function (t) { arcs.forEach(function (a, i) { if (i) t.after(i * 120, function (t2) { ring(t2, i); }); else ring(t, 0); }); }],
        [600, function (t) { V7.wipe(t, sparks, { duration: 700, stagger: 120 }); }],
        [1300, function (t) {
          V7.pop(t, pills, { stagger: 80 });
          if (pills[2]) t.after(160 + 240, function (t2) { V7.status(t2, pills[2], 'you'); }); // G-03 at risk: one ring pulse once it has landed
        }],
        [G0, function (t) { if (seen()) { go = 1; beat(t); } }],
        [G1, function (t) {
          if (go) return;
          go = 1; beat(t);
          if (seen() || !strip || !ctrl || ctrl.noop) return;
          ctrl.pause('strip'); // everything on screen has settled; the strip waits, unstarted, until it is read
          root.__v7strip = V7.observe(strip, { enter: .6, leave: .6 }, function (v) { if (v) { unwatch(); ctrl.resume('strip'); } });
        }]
      ]
    };
  });
})();
// <<< M10
