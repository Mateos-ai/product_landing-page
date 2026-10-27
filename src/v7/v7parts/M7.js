// >>> M7 m-phone: approval on the phone + mini audit card (spec §6 M7).
// One controller cycle holds three runs of the conversation (spec: 3 loops). Run 1 opens with Mate typing; runs 2 and 3
// start at the quote card. Between runs today's messages scroll away to yesterday's history (a transform), and the audit
// card keeps its earliest row, so the chat and the audit card are never empty and the mock is never faded out as a whole.
// The chat stack moves by transform only (fixed-height clip), so messages never shift layout.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: M7.he.html
  var TX = HE ? { approve: 'אישור', approved: 'אושר' } : { approve: 'Approve', approved: 'Approved' };
  var PAD = 12;                       // chat body padding under the last message
  var RUNS = [0, 11650, 22700];       // run starts; a run after the first skips the 600ms typing intro
  var RESET = 650;                    // scroll-back between runs, before the next run starts
  var LEN = RUNS[2] + 7200 + 3100;    // last event of run 3 at +7200, then a dwell
  V7.define('M7', function (root) {
    var q = function (s) { return root.querySelector(s); };
    var m = [1, 2, 3, 4, 5].map(function (i) { return q('.m-phone-m' + i); }), typing = q('.m-phone-typing'),
      body = q('.m-phone-body'), msgs = q('.m-phone-msgs'),
      card = q('.m-phone-m1 .m-phone-b'), lines = V7.$$(root, '.m-phone-m1 .m-phone-cr, .m-phone-m1 .m-phone-acts'),
      ok = q('.m-phone-ok'), ticks = q('.m-phone-m2 .m-phone-ticks'), src = q('.m-phone-m5 .m-phone-src'),
      audit = q('.m-phone-audit'), rows = V7.$$(root, '.m-phone-ar:not(.m-phone-ar0)'), floating = false, ty = 0;
    var live = m.filter(Boolean);
    function bubble(el) { return el ? el.querySelector('.m-phone-b') : null; }

    // --- chat stack: anchored to the top while it plays and moved with translateY so its bottom sits PAD above the input
    function curY() {
      try {
        var tr = getComputedStyle(msgs).transform, mm = tr && tr !== 'none' && tr.match(/matrix(3d)?\(([^)]+)\)/);
        if (mm) { var v = mm[2].split(',').map(parseFloat); return mm[1] ? v[13] : v[5]; }
      } catch (e) {}
      return ty;
    }
    function setY(y) { ty = y; msgs.style.transform = 'translateY(' + y + 'px)'; }
    function slide(t, to, o) {
      if (!msgs) return;
      var from = t ? curY() : to;
      setY(to);
      if (t && Math.abs(from - to) > .5) t.anim(msgs, [{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(' + to + 'px)' }],
        { duration: (o && o.duration) || 280, easing: (o && o.easing) || 'out', fill: 'backwards' });
    }
    function bottom(h) { return (body ? body.clientHeight : 0) - PAD - h; }
    function pin(t, extra, o) { if (msgs) slide(t, bottom(msgs.offsetHeight + (extra || 0)), o); }
    // insert a message (or the typing bubble) and keep the stack's bottom pinned while it grows (same duration and easing)
    function grow(t, el) {
      if (!el) return;
      el.removeAttribute('data-v7-gone'); el.removeAttribute('data-v7-collapsed');
      var h = el.offsetHeight; // its natural height, measured before the insert starts from 0fr (same task, never painted)
      V7.insert(t, el, { duration: 280 });
      pin(t, Math.max(0, h - el.offsetHeight), { duration: 280, easing: 'out' });
    }
    // Audit rows: inserted when the card floats beside the phone; faded in place when it sits in the page flow
    // under the phone (its height is reserved, so the page below never moves).
    function log(t, i, tone) {
      var r = rows[i];
      if (!r) return;
      if (floating) V7.insert(t, r, { duration: 280 }); else V7.show(t, r, { y: 4, duration: 260 });
      V7.flash(t, r.firstElementChild, { tone: tone, duration: 1400 });
    }
    function startLook() { // today's messages gone, buttons and ticks in their arm state (instant)
      V7.gone(live); V7.gone(typing);
      V7.off(lines);
      if (ok) { ok.classList.remove('is-ok'); ok.classList.add('is-primary'); V7.roll(null, ok, TX.approve); }
      if (ticks) ticks.classList.remove('is-read');
      V7.off(src);
    }

    var steps = [];
    RUNS.forEach(function (b, k) {
      var s = k ? 600 : 0;
      function at(ms, f) { steps.push([b + ms - s, f]); }
      if (k) {
        // scroll back: today's messages slide down and fade while yesterday's history comes back into view
        steps.push([b - RESET, function (t) {
          V7.gone(typing);
          var keep = m[0] ? m[0].offsetTop : 0; // history + the Today pill (everything above today's first message)
          V7.hide(t, live, { y: 0, duration: 300 });
          slide(t, bottom(keep), { duration: 600, easing: 'inOut' });
          // audit rows fade out first; a floating card then closes up (so no half-clipped row is ever legible)
          V7.hide(t, rows, { y: 0, duration: 200 });
          if (floating) t.after(200, function (t2) { V7.remove(t2, rows, { duration: 260 }); });
          t.after(620, function () { startLook(); });
        }]);
      } else {
        at(0, function () { pin(null); }); // re-measure once fonts have settled
        at(400, function (t) { grow(t, typing); });
      }
      at(1200, function (t) {
        V7.gone(typing); // the typing bubble gives way to the message it announced
        grow(t, m[0]);
        V7.pop(t, card, { delay: 60 });
        V7.show(t, lines, { y: 4, duration: 260, stagger: 60, delay: 180 });
      });
      at(2600, function (t) {
        V7.tap(t, ok);
        V7.roll(t, ok, TX.approved);
        if (ok) { ok.classList.remove('is-primary'); ok.classList.add('is-ok'); }
      });
      at(2900, function (t) { grow(t, m[1]); V7.show(t, bubble(m[1]), { x: 12, y: 0 }); });
      at(3300, function (t) { log(t, 0, 'you'); });
      at(3400, function () { if (ticks) ticks.classList.add('is-read'); });
      at(3800, function (t) { grow(t, typing); });
      at(4400, function (t) { V7.gone(typing); grow(t, m[2]); log(t, 1, 'mate'); });
      at(6000, function (t) { grow(t, m[3]); V7.show(t, bubble(m[3]), { x: 12, y: 0 }); });
      at(6600, function (t) { grow(t, typing); });
      at(7500, function (t) { V7.gone(typing); grow(t, m[4]); });
      at(7800, function (t) { V7.pop(t, src); log(t, 2, 'mate'); });
    });
    // the end: hand the stack back to its CSS bottom anchoring (same look; robust to later resizes)
    steps.push([LEN, function () { if (msgs) { msgs.style.top = msgs.style.bottom = msgs.style.transform = ''; } }]);

    return {
      length: LEN, hold: 500, loop: false,
      arm: function () {
        startLook();
        floating = !!audit && getComputedStyle(audit).position === 'absolute';
        if (floating) V7.gone(rows); else V7.off(rows);
        if (msgs) { msgs.style.top = '0'; msgs.style.bottom = 'auto'; pin(null); }
      },
      steps: steps
    };
  });
})();
// <<< M7
