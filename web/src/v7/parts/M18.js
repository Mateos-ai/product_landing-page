// >>> M18 m-plan approval table (industries spec §3 M18): construction I2 "assign", logistics I2 "plan".
// Loop while visible, 2 cycles, selfExit. One factory serves every data set; it reads everything from the markup:
// cells marked .is-key (the input: apartment, rooms, truck) stay as they are; every other cell value (.m-plan-v), each
// reason (.m-plan-wt) and each footer part (.m-plan-sum .m-plan-v) stands as a placeholder bar from arm(), measured to
// the width of its own content, so the table is never empty. Mate fills the rows top-down (each value writes on behind
// an edge that consumes its bar), types the reasons (the bar is consumed as the text grows), then flags the .is-exc row:
// amber wash and edge, the alert icon pops and the reason slides over to make room for it, and a value that holds a
// flag chip (.m-plan-x, "Exception") resolves from its bar only now. The footer fills and its numbers (.m-plan-n) count
// up, the status rolls to Draft; the cursor looks at the flagged row, then taps the approve button, and button and
// status roll to approved; the cursor then fades, so it never sits on the approved label through the hold. Every cycle but the last fades back into the armed look before it ends, so the restart is
// seamless; the last cycle rests on the approved final markup.
// Strings come from the markup: the pill's data-v7-busy / data-v7-draft and final text, the button's two labels.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var MAX = 2;
  var T = { rows: 350, rowStep: 120, cellStep: 60, why: 700, whyStep: 190, flag: 2250, count: 2450, partStep: 90, draft: 3450, look: 3600, cursor: 4500, tap: 5200, ok: 5300, away: 5750, out: 7900, end: 8500 };

  function rm(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function em(v) { return Math.max(1.6, Math.min(txt(v).length * .52, 15)).toFixed(2) + 'em'; }
  function bar(v, w) { // a placeholder bar where v's content sits (w = its measured width); v keeps its box, invisible
    var b = document.createElement('i');
    b.className = 'm-plan-ph';
    b.style.width = w > 0 ? Math.round(w) + 'px' : em(v);
    v.parentNode.insertBefore(b, v.nextSibling);
    v.__ph = b;
    return b;
  }
  function dots() {
    var s = document.createElement('span');
    s.className = 'v7-thinking';
    s.innerHTML = '<i></i><i></i><i></i>';
    return s;
  }

  V7.define('M18', function (root, tl, opts) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    var rtl = V7.dir(root) < 0;
    var pill = $('.m-plan-pill'), go = $('.m-plan-go'), exc = $('.m-plan-row.is-exc'),
      flags = exc ? $$('.m-plan-alert, .m-plan-x', exc) : [],
      alert = exc && $('.m-plan-alert', exc), excWhy = exc && $('.m-plan-wt', exc),
      gl = go ? [$('.m-plan-gl1', go), $('.m-plan-gi1', go)] : [], gr = go ? [$('.m-plan-gl2', go), $('.m-plan-gi2', go)] : [],
      rows = $$('.m-plan-row').map(function (r) {
        var vals = $$(':scope > .m-plan-c:not(.is-key) .m-plan-v', r);
        return {
          el: r, why: $('.m-plan-wt', r),
          vals: vals.filter(function (v) { return !$('.m-plan-x', v); }),
          late: vals.filter(function (v) { return !!$('.m-plan-x', v); }) // a flag chip: resolves at the flag step
        };
      }),
      parts = $$('.m-plan-sum > span > .m-plan-v').map(function (v) {
        return { v: v, nums: $$('.m-plan-n', v).map(function (n) { return { el: n, to: parseFloat(txt(n).replace(/[^\d.\-]/g, '')) || 0 }; }) };
      }),
      late = [].concat.apply([], rows.map(function (r) { return r.late; })),
      look = excWhy;
    var BUSY = (pill && pill.getAttribute('data-v7-busy')) || 'Mate is drafting',
      DRAFT = (pill && pill.getAttribute('data-v7-draft')) || 'Draft',
      DONE = txt(pill) || 'Approved',
      last = (+opts.cycle || 0) >= MAX - 1,
      slide = 0; // px the flagged reason moves over when its alert icon arrives (measured in arm)

    function busy(t, on) { // the status pill: thinking dots in place of its dot while Mate drafts
      if (!pill) return;
      var d = $('.v7-thinking', pill);
      if (on) {
        if (!d) { d = dots(); pill.insertBefore(d, pill.firstChild); }
        pill.classList.add('is-busy');
        if (t) V7.pop(t, d, { duration: 260 });
      } else { pill.classList.remove('is-busy'); rm(d); }
    }
    // clip-path insets for content that starts at the inline-start: show [0, x] of it, or hide [0, x] of it
    function keep(x) { x = Math.max(0, x); return rtl ? 'inset(-3px -3px -3px ' + x + 'px)' : 'inset(-3px ' + x + 'px -3px -3px)'; }
    function cut(x) { x = Math.max(0, x); return rtl ? 'inset(0 ' + x + 'px 0 0)' : 'inset(0 0 0 ' + x + 'px)'; }
    function sweep(t, v, dl) { // the value writes on from the inline-start; its bar is consumed by the same edge
      t.after(dl || 0, function (t2) {
        var b = v.__ph, w = v.offsetWidth, bw = b ? b.offsetWidth : 0, D = Math.max(w, bw, 1),
          dur = Math.round(Math.max(200, Math.min(380, D * 3.4))), o = { duration: dur, easing: 'out' };
        v.__ph = null;
        V7.on(v);
        var kv = [{ offset: 0, clipPath: keep(w) }];
        if (w < D - .5) kv.push({ offset: w / D, clipPath: keep(0) });
        kv.push({ offset: 1, clipPath: keep(0) });
        t2.anim(v, kv, Object.assign({ fill: 'backwards' }, o));
        if (!b) return;
        var kb = [{ offset: 0, clipPath: cut(0) }];
        if (bw < D - .5) kb.push({ offset: bw / D, clipPath: cut(bw) });
        kb.push({ offset: 1, clipPath: cut(bw) });
        t2.anim(b, kb, Object.assign({ fill: 'forwards' }, o));
        t2.after(dur, function () { rm(b); });
      });
    }
    function typeWhy(t, v) { // Mate types the reason; the bar ahead of the text is consumed as the text grows
      var b = v.__ph, s = txt(v), bw = b ? b.offsetWidth : 0, dur = Math.max(260, Math.min(480, s.length * 16));
      v.__ph = null;
      V7.on(v);
      V7.type(t, v, s, { duration: dur, caret: false });
      if (!b) return;
      t.tween(dur, 'linear', function () { b.style.clipPath = cut(Math.min(bw, v.offsetWidth + 3)); }, function () {
        if (bw > v.offsetWidth + 3) { V7.hide(t, b, { y: 0, duration: 120 }); t.after(140, function () { rm(b); }); } else rm(b);
      });
    }
    function fillRow(t, r) {
      r.vals.forEach(function (v, k) { sweep(t, v, k * T.cellStep); });
      V7.flash(t, r.el, { tone: 'mate', duration: 600, easing: 'out' }); // a soft indigo pass: Mate is writing this row
    }
    function roll(t, outs, ins) { // two labels (and icons) in one grid cell: the old one leaves up, the new one comes up
      outs.forEach(function (e) { if (e) t.anim(e, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-70%)' }], { duration: 140, easing: 'in', fill: 'backwards' }); });
      ins.forEach(function (e) { if (e) t.anim(e, [{ opacity: 0, transform: 'translateY(70%)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'out', delay: 120, fill: 'backwards' }); });
    }
    function approve(t, on) {
      if (!go) return;
      var ok = function () { go.classList.remove('is-primary', 'is-pre', 'is-disabled'); go.classList.add('is-ok'); };
      if (on) { if (t) { roll(t, gl, gr); t.after(140, ok); } else ok(); } // teal arrives once the old label has left (140ms), with the new one
      else { go.classList.remove('is-ok'); go.classList.add('is-primary', 'is-pre', 'is-disabled'); if (t) roll(t, gr, gl); }
    }
    function zero(p) { // footer numbers wait at 0, in a box as wide as their final value
      p.nums.forEach(function (n) { n.el.style.minWidth = String(Math.round(Math.abs(n.to))).length + 'ch'; n.el.textContent = '0'; });
    }
    function shifted(on) { // the flagged reason, held at the inline-start while its alert icon is away
      if (excWhy && slide) excWhy.style.transform = on ? 'translateX(' + (rtl ? slide : -slide) + 'px)' : '';
    }

    var steps = [];
    rows.forEach(function (r, i) {
      steps.push([T.rows + i * T.rowStep, function (t) { fillRow(t, r); }]);
      if (r.why) steps.push([T.why + i * T.whyStep, function (t) { typeWhy(t, r.why); }]);
    });
    steps.push(
      [T.flag, function (t) { // the exception row turns amber: wash, edge, flag chip and alert icon; the reason makes room
        if (!exc) return;
        exc.removeAttribute('data-v7-calm');
        late.forEach(function (v) {
          var b = v.__ph;
          v.__ph = null;
          V7.on(v);
          if (b) { V7.hide(t, b, { y: 0, duration: 110 }); t.after(130, function () { rm(b); }); }
        });
        // the chip pops with the wash; the reason starts to make room and the alert icon lands in the freed slot
        V7.pop(t, flags.filter(function (f) { return f !== alert; }), { duration: 340, from: .6, stagger: 90 });
        if (alert) V7.pop(t, alert, { duration: 300, from: .6, delay: slide ? 110 : 0 });
        if (slide && excWhy) {
          var x = (rtl ? slide : -slide) + 'px';
          shifted(false);
          t.anim(excWhy, [{ transform: 'translateX(' + x + ')' }, { transform: 'translateX(0)' }], { duration: 360, easing: 'out', fill: 'backwards' });
        }
      }],
      [T.count, function (t) { // the footer parts write on one by one; their numbers count up from 0
        parts.forEach(function (p, i) {
          sweep(t, p.v, i * T.partStep);
          p.nums.forEach(function (n) { t.after(i * T.partStep, function (t2) { V7.count(t2, n.el, { from: 0, to: n.to, duration: 800 }); }); });
        });
      }],
      [T.draft, function (t) { // drafting is done: the status reads Draft and the approve button wakes up
        V7.status(t, pill, 'mate', DRAFT);
        var d = pill && $('.v7-thinking', pill);
        if (d) V7.hide(t, d, { y: 0, duration: 90 });
        t.after(100, function () { busy(null, false); });
        if (go) go.classList.remove('is-disabled');
      }],
      [T.look, function (t) { if (look) V7.cursorTo(t, look, { duration: 650 }); }], // the person reads the flagged row first
      [T.cursor, function (t) { V7.cursorTo(t, go, { duration: 650 }); }],
      [T.tap, function (t) { V7.tap(t, go); }],
      [T.ok, function (t) { approve(t, true); V7.status(t, pill, 'ok', DONE); }],
      [T.away, function (t) { V7.cursorHide(t, root, { duration: 220 }); }] // the label has rolled: the cursor leaves it readable
    );
    if (!last) steps.push([T.out, function (t) { // back to the armed look together, so the next cycle starts seamlessly
      V7.cursorHide(t, root);
      V7.status(t, pill, 'mate', BUSY);
      t.after(100, function (t2) { busy(t2, true); });
      approve(t, false);
      if (exc) exc.setAttribute('data-v7-calm', '');
      V7.hide(t, flags, { y: 0, duration: 200 });
      var back = [];
      rows.forEach(function (r) { back = back.concat(r.vals, r.late, r.why ? [r.why] : []); });
      parts.forEach(function (p) { back.push(p.v); });
      back.forEach(function (v, i) {
        var b = bar(v, v.offsetWidth);
        V7.off(b);
        V7.hide(t, v, { y: 0, duration: 200 });
        V7.show(t, b, { y: 0, duration: 200, delay: 160 + Math.min(i, 24) * 8 }); // all in by T.out + 552, before T.end
      });
      t.after(220, function () { shifted(true); parts.forEach(zero); }); // hidden by now: match arm() exactly
    }]);

    return {
      length: last ? T.ok + 700 : T.end,
      hold: last ? 1800 : 0,
      maxLoops: MAX,
      selfExit: true,
      arm: function () { // the populated start: input columns, measured placeholder bars, "Mate is drafting", approve asleep
        root.classList.add('m-plan-still');
        if (pill) { V7.status(null, pill, 'mate', BUSY); busy(null, true); }
        approve(null, false);
        if (exc) exc.setAttribute('data-v7-calm', '');
        if (alert && excWhy) { // the reason types where the other reasons start; it moves over when the icon pops
          var a = alert.getBoundingClientRect(), w = excWhy.getBoundingClientRect();
          slide = Math.max(0, Math.round(rtl ? a.right - w.right : w.left - a.left));
        }
        V7.off(flags);
        shifted(true);
        rows.forEach(function (r) {
          r.vals.concat(r.late).forEach(function (v) { var w = v.offsetWidth; V7.off(v); bar(v, w); });
          if (r.why) { var w = r.why.offsetWidth; V7.off(r.why); bar(r.why, w); }
        });
        parts.forEach(function (p) {
          var w = p.v.offsetWidth;
          V7.off(p.v); bar(p.v, w);
          zero(p);
        });
        void root.offsetWidth; // commit the start look with transitions off, then let them back
        root.classList.remove('m-plan-still');
      },
      steps: steps
    };
  });
})();
// <<< M18
