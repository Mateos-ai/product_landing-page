// >>> M17 m-ask phone Q&A (Industries spec §3 M17). Loops while visible: data-v7-runs runs (spec maxLoops 2) in one
// controller cycle, so the phone is never faded out as a whole: between runs today's messages slide down and fade back
// to yesterday's dimmed exchange, and the last run ends on the exact final markup.
// Data-driven from the markup: beats (.m-phone-msgs > [data-v7-at]) appear at their time; a Mate beat with
// data-v7-think shows the typing bubble that long first (and marks the rep's earlier messages read); [data-v7-pop]
// children pop after their beat; .m-ask-card rows check at their data-v7-at.
// Transform-only chat: the stack is top-anchored while it plays and moved with translateY so its bottom stays pinned
// above the input; a new message is laid out below the clip and slides up into view. Nothing above it moves in layout.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var PAD = 12, RESET = 650, SLIDE = 320;
  function n(el, a, d) { var v = el ? parseFloat(el.getAttribute(a)) : NaN; return isNaN(v) ? d : v; }
  V7.define('M17', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var body = $('.m-phone-body'), msgs = $('.m-phone-msgs'), typing = $('.m-ask-typing');
    var beats = $$('.m-phone-msgs > [data-v7-at]'), pops = $$('.m-phone-msgs [data-v7-pop]'),
      rows = $$('.m-ask-card [data-v7-at]'), checks = $$('.m-ask-card .m-ask-ok'),
      ticks = beats.reduce(function (a, b) { return a.concat(V7.$$(b, '.m-phone-ticks')); }, []);
    var RUN = n(root, 'data-v7-run', 9000), RUNS = Math.max(1, Math.round(n(root, 'data-v7-runs', 1))),
      LEN = (RUNS - 1) * (RUN + RESET) + RUN, ty = 0;

    // --- the stack: top-anchored while playing, translateY keeps its bottom PAD above the input
    function curY() {
      try {
        var tr = getComputedStyle(msgs).transform, m = tr && tr !== 'none' && tr.match(/matrix(3d)?\(([^)]+)\)/);
        if (m) { var v = m[2].split(',').map(parseFloat); return m[1] ? v[13] : v[5]; }
      } catch (e) {}
      return ty;
    }
    function slide(t, to, o) {
      if (!msgs) return;
      var from = t ? curY() : to;
      ty = to; msgs.style.transform = 'translateY(' + to + 'px)';
      if (t && Math.abs(from - to) > .5) t.anim(msgs, [{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(' + to + 'px)' }],
        { duration: (o && o.duration) || SLIDE, easing: (o && o.easing) || 'out', fill: 'backwards' });
    }
    function bottom(h) { return (body ? body.clientHeight : 0) - PAD - h; }
    function pin(t, o) { if (msgs) slide(t, bottom(msgs.offsetHeight), o); }
    function enter(t, el) { // lay the element out at the bottom (below the clip), then slide the stack up by its height
      if (!el) return;
      V7.on(el);
      pin(t);
      var b = el.querySelector('.m-phone-b, .m-ask-sys') || el;
      t.anim(b, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'out', fill: 'backwards' });
    }
    function startLook() { // today's beats gone, ticks unread, pops off, card rows waiting (instant)
      V7.gone(beats); V7.gone(typing); V7.off(pops); V7.off(checks);
      ticks.forEach(function (k) { k.classList.remove('is-read'); });
      rows.forEach(function (r) { r.classList.add('is-wait'); });
    }

    var steps = [];
    for (var k = 0; k < RUNS; k++) (function (b, k) {
      function at(ms, f) { steps.push([b + ms, f]); }
      if (k) {
        // scroll back: today's messages slide down and fade while yesterday's exchange comes back into view
        steps.push([b - RESET, function (t) {
          var live = beats.filter(function (e) { return !e.hasAttribute('data-v7-gone'); }), keep = beats[0] ? beats[0].offsetTop : 0;
          V7.gone(typing);
          V7.hide(t, live, { y: 0, duration: 300 });
          slide(t, bottom(keep), { duration: 600, easing: 'inOut' });
          V7.hide(t, checks, { y: 0, duration: 200 });
          rows.forEach(function (r) { r.classList.add('is-wait'); });
          t.after(620, function () { startLook(); });
        }]);
      } else at(0, function () { pin(null); }); // re-measure once fonts have settled
      beats.forEach(function (el, i) {
        var when = n(el, 'data-v7-at', 0), think = n(el, 'data-v7-think', 0);
        if (think > 0) at(when - think, function (t) {
          beats.slice(0, i).forEach(function (p) { V7.$$(p, '.m-phone-ticks').forEach(function (x) { x.classList.add('is-read'); }); });
          enter(t, typing);
        });
        at(when, function (t) {
          if (think > 0) V7.gone(typing); // the typing bubble gives way to the message it announced
          enter(t, el);
        });
        V7.$$(el, '[data-v7-pop]').forEach(function (p) { at(when + n(p, 'data-v7-pop', 0), function (t) { V7.pop(t, p); }); });
      });
      rows.forEach(function (r) {
        at(n(r, 'data-v7-at', 0), function (t) {
          r.classList.remove('is-wait');
          V7.pop(t, r.querySelector('.m-ask-ok'), { from: .6 });
          V7.flash(t, r, { tone: 'mate', duration: 900 });
        });
      });
    })(k * (RUN + RESET), k);
    // the end: every tick read, and the stack handed back to its CSS bottom anchoring (same look)
    steps.push([LEN, function () {
      ticks.forEach(function (x) { x.classList.add('is-read'); });
      if (msgs) msgs.style.top = msgs.style.bottom = msgs.style.transform = '';
    }]);

    return {
      length: LEN, hold: 600, loop: false,
      arm: function () {
        startLook();
        if (msgs) { msgs.style.top = '0'; msgs.style.bottom = 'auto'; pin(null); }
      },
      steps: steps
    };
  });
})();
// <<< M17
