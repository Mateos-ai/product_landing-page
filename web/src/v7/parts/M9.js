// >>> M9 m-audit: audit trail (spec §6 M9). Host-driven (T1). Length 7600, hold 600.
// Documented exception (§6 M9): the cycle ends with more rows than the final markup; T1 always restart()s before play.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  V7.define('M9', function (root) {
    var q = function (s) { return root.querySelector(s); };
    var table = q('.m-audit-table'), base = V7.$$(root, '.m-audit-table > .m-audit-tr'), pool = V7.$$(root, 'template.m-audit-pool'),
      chips = V7.$$(root, '.m-audit-chip'), all = q('.m-audit-all'), rc = q('.m-audit-rc'), out = [], keep = [];
    function sel(chip) { chips.forEach(function (c) { if (c === chip) c.setAttribute('data-selected', ''); else c.removeAttribute('data-selected'); }); }
    function stream(t, i, tone) { // clone pool row i in at the top of the table
      var tp = pool[i], src = tp && tp.content && tp.content.firstElementChild, el, first;
      if (!src || !table) return;
      el = src.cloneNode(true); first = table.querySelector(':scope > .m-audit-tr');
      V7.gone(el); table.insertBefore(el, first || null);
      V7.insert(t, el, { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }); // eases in from 0px, so the first frame is a sliver
      V7.flash(t, el.querySelector('.m-audit-row'), { tone: tone, duration: 1400 });
    }
    // Filter without layout shifts: a collapse drawn with transforms only. The rows that leave are lifted out of the flow
    // where they stand (absolute); each one slides up by the height leaving above it while it clips away from the bottom
    // and fades, and each row that stays glides up by the same amount (FLIP). With one easing for all, the rows stay
    // packed edge to edge on every frame, exactly like a height collapse, but layout changes only once, compensated.
    // The table has a fixed height, so nothing outside it moves. "All" plays the same collapse in reverse.
    var GLIDE = { duration: 520, easing: 'inOut' }, gone = [];
    function above(rows, set) { var acc = 0; return rows.map(function (r) { var a = acc; if (set.indexOf(r) >= 0) acc += r.offsetHeight; return a; }); }
    function y(px) { return '0 ' + px + 'px'; }
    function filter(t) {
      var rows = V7.$$(table, ':scope > .m-audit-tr'), A, top;
      keep = rows.filter(function (r) { return r.getAttribute('data-kind') === 'rule'; });
      out = rows.filter(function (r) { return keep.indexOf(r) < 0; });
      A = above(rows, out); top = rows.map(function (r) { return r.offsetTop; });
      out.forEach(function (r) { r.classList.add('is-leaving'); r.style.top = top[rows.indexOf(r)] + 'px'; });
      rows.forEach(function (r, i) {
        var a = A[i], h = r.offsetHeight;
        if (keep.indexOf(r) >= 0) { if (a) t.anim(r, [{ translate: y(a) }, { translate: y(0) }], { duration: GLIDE.duration, easing: GLIDE.easing, fill: 'backwards' }); return; }
        gone.push(t.anim(r, [{ translate: y(0), clipPath: 'inset(0 0 0 0)', opacity: 1 }, { translate: y(-a), clipPath: 'inset(0 0 ' + h + 'px 0)', opacity: 0 }],
          { duration: GLIDE.duration, easing: GLIDE.easing, fill: 'forwards' }));
      });
      t.after(GLIDE.duration + 20, function () {
        out.forEach(function (r) { V7.gone(r); r.classList.remove('is-leaving'); r.style.top = ''; });
        gone.splice(0).forEach(function (a) { if (a) try { a.cancel(); } catch (e) {} });
      });
    }
    function unfilter(t) {
      var rows, A;
      out.forEach(function (r) { r.removeAttribute('data-v7-gone'); });
      rows = V7.$$(table, ':scope > .m-audit-tr'); A = above(rows, out);
      rows.forEach(function (r, i) {
        var a = A[i], h = r.offsetHeight;
        if (keep.indexOf(r) >= 0) { if (a) t.anim(r, [{ translate: y(-a) }, { translate: y(0) }], { duration: GLIDE.duration, easing: GLIDE.easing, fill: 'backwards' }); return; }
        // the text is back at full strength before the row is half open, so the opening band never reads as empty
        if (out.indexOf(r) >= 0) t.anim(r, [{ offset: 0, translate: y(-a), clipPath: 'inset(0 0 ' + h + 'px 0)', opacity: 0 }, { offset: .45, opacity: 1 }, { offset: 1, translate: y(0), clipPath: 'inset(0 0 0 0)', opacity: 1 }],
          { duration: GLIDE.duration, easing: GLIDE.easing, fill: 'backwards' });
      });
    }
    return {
      length: 7600, hold: 600,
      arm: function () { V7.off(base); sel(all); },
      steps: [
        [0, function (t) { V7.show(t, base, { stagger: 40 }); }],
        [1200, function (t) { stream(t, 0, 'mate'); }],
        [2800, function (t) { stream(t, 1, 'mate'); }],
        [4000, function (t) { V7.cursorTo(t, rc, { duration: 500 }); }],
        [4600, function (t) { V7.tap(t, rc); sel(rc); filter(t); }],
        [5600, function (t) { V7.cursorTo(t, all, { duration: 400 }); }],
        [6000, function (t) { V7.tap(t, all); sel(all); unfilter(t); }],
        [6400, function (t) { stream(t, 2, 'you'); }]
      ]
    };
  });
})();
// <<< M9
