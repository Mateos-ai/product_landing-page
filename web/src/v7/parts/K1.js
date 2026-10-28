// >>> K1 k-flip reverse flip (spec §6 K1): the old list is struck, then physically reversed, so the number goes from last to first.
// Sequence: strike the old rows → the struck list physically reverses → the old rows leave → (a clear gap, no text) → the label
// turns to "MateOS way" as the new rows rise. The rows never leave their DOM (final) order: the old visual order is a
// translate on each row, and the reversal animates it back to 0, so nothing changes layout while text is on screen. Each
// row is as tall as the text it shows; the list reserves the larger of its old and final heights for the whole run (and
// after it), so nothing below ever moves.
(function () {
  'use strict';
  var V7 = window.V7, d = document;
  if (!V7 || !V7.ready) return;
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: K1.he.html
  var TX = HE ? { old: 'הדרך הישנה: המספר מגיע אחרון.', mateos: 'הדרך שלנו: המספר מגיע ראשון.' } : { old: 'Old way: the number comes last.', mateos: 'Our way: the number comes first.' };
  var STRIKE_Y = HE ? .5 : .56; // strike height inside a rendered line box (content area); Hebrew letters sit higher than an x-height
  // Timeline (ms): a beat to read the old way, then one strike per line in turn (900/1600/2300, 550 each, so each is
  // seen being crossed out); reversal 3250–3950; old rows leave 3950–4290; new rows rise from 4370.
  var STRIKE = { start: 900, step: 700, dur: 550 };
  var T = { flip: 3250, flipDur: 700, out: 3950, outDur: 240, outStep: 50, swap: 4370, rise: 380, riseStep: 90, dots: 4650, last: 4950, first: 5150, oldLine: 5350, end: 5850 };

  function whenFonts(cb) { // like boot step 4: fonts ready, or 600ms
    var n = 0, go = function () { if (!n++) cb(); };
    try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(go, go); } catch (e) {}
    setTimeout(go, 600);
  }
  function oldOrder(r) { return +r.getAttribute('data-old-order') || 0; }

  // One rect per rendered line of el's text, relative to el's padding box (unscaled).
  function lines(el) {
    var rg = d.createRange(), box = el.getBoundingClientRect(), s = el.offsetWidth ? box.width / el.offsetWidth : 1, out = [];
    rg.selectNodeContents(el);
    Array.prototype.forEach.call(rg.getClientRects(), function (r) {
      if (r.width < 1) return;
      var L = out[out.length - 1];
      if (L && Math.abs(L.top - r.top) < 2) { L.left = Math.min(L.left, r.left); L.right = Math.max(L.right, r.right); L.h = Math.max(L.h, r.height); }
      else out.push({ top: r.top, left: r.left, right: r.right, h: r.height });
    });
    return out.map(function (L) {
      return { x: (L.left - box.left) / s, y: (L.top - box.top + L.h * STRIKE_Y) / s, w: (L.right - L.left) / s }; // y = strike centre
    });
  }

  function init(root) {
    if (root.__k1) return;
    var snap = root.innerHTML, st = root.__k1 = { tl: null, state: '', vis: false, unobs: null, minH: 0 };
    var set = function (s) { st.state = s; root.setAttribute('data-v7-state', s); };
    st.fail = function () { finish('final'); }; // any error from here on settles K1 on its final markup
    if (V7.static) { set('final'); return; } // reduced motion or failed gate: the final markup as written

    function q(s) { return V7.$(root, s); }
    function qa(s) { return V7.$$(root, s); }
    var listHTML = (function () { var t = d.createElement('div'); t.innerHTML = snap; var l = t.querySelector('.k-flip-list'); return l ? l.outerHTML : ''; })();

    // The list's final height, measured on a hidden copy of the final markup (so the live rows are never touched).
    function finalH() {
      if (!listHTML) return 0;
      var p = d.createElement('div');
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText = 'position:absolute;inset-inline:0;top:0;visibility:hidden;pointer-events:none';
      p.innerHTML = listHTML; root.appendChild(p);
      var h = p.firstElementChild.getBoundingClientRect().height;
      root.removeChild(p);
      return h;
    }
    // Reserve the larger of the old and the final list heights, so neither the run nor its end moves the caption.
    function reserve() {
      var list = q('.k-flip-list');
      if (!list) return;
      list.style.minHeight = '';
      st.minH = Math.max(finalH(), list.getBoundingClientRect().height); // exact, so the final state matches the static one
      list.style.minHeight = st.minH + 'px';
    }

    // Old visual order (Buy tools, Draw the processes, Hope the number moves) as a translate on each row: measured from
    // the rows' layout boxes, so it is exact at every width and in RTL.
    function place() {
      var rows = qa('.k-row'), list = q('.k-flip-list');
      if (!rows.length || !list) return;
      var gap = parseFloat(getComputedStyle(list).rowGap) || 0, y = rows[0].offsetTop;
      rows.slice().sort(function (a, b) { return oldOrder(a) - oldOrder(b); }).forEach(function (r) {
        r.__dy = y - r.offsetTop; r.style.translate = '0 ' + r.__dy + 'px';
        y += r.offsetHeight + gap;
      });
    }
    function arm() {
      var rows = qa('.k-row');
      if (rows.length < 2) return false;
      var lab = q('.k-lab');
      if (lab) lab.textContent = TX.old;
      rows.forEach(function (r) { r.classList.add('is-old'); });
      V7.off(qa('.k-dot'));
      var last = q('.k-last'); if (last) last.classList.add('is-plain');
      V7.off(q('.k-first'));
      V7.off(q('.k-flip-old'));
      reserve(); place();
      return true;
    }

    function build() {
      var tl = guard(V7.timeline()), rows = qa('.k-row'), byOld = rows.slice().sort(function (a, b) { return oldOrder(a) - oldOrder(b); });
      var n = byOld.length, rising = byOld[n - 1], falling = byOld[0];

      // strike each old line in visual order, one after the other (measured now, after fonts and layout settle)
      tl.at(0, function () {
        reserve(); place();
        byOld.forEach(function (r, i) {
          var old = r.querySelector('.k-old');
          if (!old) return;
          var L = lines(old), tot = 0;
          var bars = L.map(function (l) {
            var b = d.createElement('i'); b.className = 'k-strike';
            b.style.left = l.x + 'px'; b.style.top = l.y + 'px'; b.style.width = l.w + 'px';
            old.appendChild(b); b.__a = tot; tot += l.w; return b;
          });
          if (!tot) return;
          tl.at(STRIKE.start + i * STRIKE.step, function () {
            tl.tween(STRIKE.dur, 'inOut', function (p) {
              var reach = p * tot;
              bars.forEach(function (b) { var w = parseFloat(b.style.width) || 1, s = (reach - b.__a) / w; b.style.transform = 'scaleX(' + (s < 0 ? 0 : s > 1 ? 1 : s) + ')'; });
            });
          });
        });
      });

      // the struck list physically reverses (each row's translate back to 0: its DOM place). The rising row (the number)
      // lifts out in front on a slight arc; the others recede while they cross, so it reads as depth. Only struck old text
      // is on screen, and nothing changes layout.
      tl.at(T.flip, function () {
        var dir = V7.dir(root), fs = parseFloat(getComputedStyle(rows[0]).fontSize) || 40;
        if (rising) rising.style.zIndex = '2';
        rows.forEach(function (r) {
          var dy = r.__dy || 0;
          r.style.translate = '';
          if (Math.abs(dy) > .5) tl.anim(r, [{ translate: '0 ' + dy + 'px' }, { translate: '0 0' }], { duration: T.flipDur, easing: 'inOut', fill: 'backwards' });
        });
        if (rising) tl.anim(rising, [{ scale: '1', transform: 'translateX(0)' }, { scale: '1.03', transform: 'translateX(' + (dir * fs * .28).toFixed(1) + 'px)', offset: .5 }, { scale: '1', transform: 'translateX(0)' }], { duration: T.flipDur, easing: 'inOut', fill: 'none' });
        rows.forEach(function (r) {
          if (r === rising) return;
          var sc = r === falling ? '.97' : '1';
          // the others are faint ghosts for the whole crossing (back only once the number has passed), so two legible
          // texts never overlap
          tl.anim(r, [{ opacity: 1, scale: '1' }, { opacity: .12, scale: sc, offset: .18 }, { opacity: .12, scale: sc, offset: .9 }, { opacity: 1, scale: '1' }], { duration: T.flipDur, easing: 'linear', fill: 'none' });
        });
      });

      // the old rows leave, top to bottom (fade and lift); they are fully gone before anything new appears
      tl.at(T.out, function () {
        rows.forEach(function (r, i) {
          var old = r.querySelector('.k-old');
          if (old) tl.anim(old, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -24%' }], { duration: T.outDur, delay: i * T.outStep, easing: 'in', fill: 'forwards' });
        });
      });

      // the label turns in the empty beat, so it already reads "MateOS way" when the first new row appears
      tl.at(T.swap - 160, function () { V7.roll(tl, q('.k-lab'), TX.mateos); });
      // a clear frame later: the rows switch to the new text. Each row is now sized by it, so rows resize and move inside
      // the (reserved) list; they are fully transparent for that frame, so no visible box shifts. Then the new rows rise in,
      // top to bottom.
      tl.at(T.swap, function () {
        rows.forEach(function (r) { r.style.zIndex = ''; r.style.opacity = '0'; r.classList.remove('is-old'); });
      });
      tl.at(T.swap + 50, function () {
        rows.forEach(function (r, i) {
          var nw = r.querySelector('.k-new');
          if (nw) tl.anim(nw, [{ opacity: 0, translate: '0 36%' }, { opacity: 1, translate: '0 0' }], { duration: T.rise, delay: i * T.riseStep, easing: 'out', fill: 'backwards' });
          r.style.opacity = '';
        });
      });

      tl.at(T.dots, function () { V7.pop(tl, qa('.k-dot'), { stagger: 80, from: 0 }); });
      tl.at(T.last, function () { var last = q('.k-last'); if (last) last.classList.remove('is-plain'); });
      tl.at(T.first, function () { V7.show(tl, q('.k-first'), { y: 6, duration: 300 }); });
      tl.at(T.oldLine, function () { V7.show(tl, q('.k-flip-old'), { y: 0, duration: 400 }); });
      tl.at(T.end, function () { finish('done'); });
      return tl;
    }
    // A step that throws settles K1 on its final markup (a free timeline has no controller to do it).
    function guard(tl) {
      var at = tl.at;
      tl.at = function (ms, f) { return at.call(tl, ms, function (t) { try { f(t); } catch (e) { try { console.error('[V7] K1:', e); } catch (x) {} setTimeout(function () { finish('final'); }, 0); } }); };
      return tl;
    }

    function finish(s) { // back to the exact final markup; the list keeps the height it reserved, so nothing below moves
      if (st.tl) { st.tl.kill(); st.tl = null; }
      root.innerHTML = snap;
      var list = q('.k-flip-list');
      if (list && st.minH && s === 'done') list.style.minHeight = st.minH + 'px';
      if (st.unobs) { st.unobs(); st.unobs = null; }
      set(s);
    }
    function sync() {
      if (!st.tl || st.state === 'done' || st.state === 'final') return;
      if (st.vis && !d.hidden) { st.tl.play(); set('running'); }
      else if (st.state === 'running') { st.tl.pause(); set('paused'); }
    }

    if (!arm()) { root.innerHTML = snap; set('final'); return; }
    set('armed');
    st.tl = build();
    function watch() { // play once (nearly) the whole block is in view, so the reversal is seen; pause if it scrolls away mid-run
      if (!st.unobs) st.unobs = V7.observe(root, { enter: .9, leave: .15 }, function (v) { st.vis = v; sync(); });
    }
    st.replay = function () { // lab and tests: re-arm and play again from 0 (the root itself is never replaced)
      if (V7.static) return;
      if (st.tl) st.tl.kill();
      root.innerHTML = snap;
      arm(); st.tl = build(); set('armed'); st.vis = true; sync(); watch();
    };
    d.addEventListener('v7:static', function () { if (st.state !== 'done') finish('final'); });
    d.addEventListener('visibilitychange', sync);
    whenFonts(function () { if (st.state === 'armed') { reserve(); place(); watch(); } });
    // while it waits, keep the old order and the reserved height true to the current width (fonts, rotation, resize)
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (st.state === 'armed') { reserve(); place(); } }, 120); });
  }

  V7.ready(function () {
    V7.$$(d, '[data-v7-flip]').forEach(function (r) {
      try { init(r); } catch (e) { try { console.error('[V7] K1:', e); } catch (x) {} if (r.__k1 && r.__k1.fail) r.__k1.fail(); }
    });
  });
})();
// <<< K1
