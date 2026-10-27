// >>> M11 m-surf surfaces, product P4 (spec §6 M11). Loop: length 10500, hold 600, 3 cycles. Tap ring only (no cursor).
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  V7.define('M11', function (root) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var panes = $$('.m-surf-pane'), docks = panes.map(function (p) { return $('.m-surf-dock', p); }), token = $('.m-surf-token'),
      r1 = $('.m-surf-r1'), stock = $('.m-surf-stock'), cell = $('.m-surf-cell'), draft = $('.m-surf-draft'), dpill = $('.m-surf-dpill'),
      ask = $('.m-surf-ask'), approve = $('.m-surf-approve'), acts = $$('.m-surf-acts > .v7-fbtn'), reply = $('.m-surf-reply'),
      fig = root.closest('.v7-figure') || root, at = -1;
    var hop = (fig.clientWidth || root.clientWidth) >= 560; // panes side by side: the token travels; stacked (< 560px): hide here, pop there
    var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
    var SENT = dpill ? dpill.textContent : '', DRAFT = HE ? 'טיוטה של Mate · ממתינה לאישור' : 'Draft by Mate · waiting for approval',
      SENT2 = HE ? 'נשלח · 09:42' : 'Sent · 09:42';

    // Lock every pane at the larger of its heights with the final pill and with the (longer) draft pill, so neither the
    // draft row inserting nor a pill that wraps in a tight pane ever moves the panes or the page. Computed heights are
    // fractional and ignore the figure's reveal scale. Leaves the pill showing the draft text (it is invisible until 3900).
    function lock() {
      var hs = function () { return panes.map(function (p) { return parseFloat(getComputedStyle(p).height) || 0; }); }, a, b;
      panes.forEach(function (p) { p.style.minHeight = ''; });
      if (dpill) dpill.textContent = SENT;
      a = hs();
      if (dpill) { dpill.setAttribute('data-tone', 'mate'); dpill.textContent = DRAFT; }
      b = hs();
      panes.forEach(function (p, i) { var h = Math.max(a[i], b[i]); if (h) p.style.minHeight = h + 'px'; });
    }

    function mark(i) { panes.forEach(function (p, k) { if (k === i) p.setAttribute('data-on', ''); else p.removeAttribute('data-on'); }); }
    function dock(t, i) { // move the Q-1042 token to pane i (its top edge, centred)
      var from = at;
      if (!token || !docks[i]) return;
      at = i;
      if (from < 0) { V7.place(token, docks[i]); V7.pop(t, token); mark(i); return; }
      mark(-1);
      if (hop) { V7.travel(t, token, docks[from], docks[i], { duration: 700 }); t.after(560, function () { mark(i); }); return; }
      V7.hide(t, token, { y: -4, duration: 160 });
      t.after(200, function (t2) { V7.place(token, docks[i]); V7.pop(t2, token); mark(i); });
    }

    return {
      length: 10500, hold: 600, maxLoops: 3,
      arm: function () { // rows that insert later stay in the layout (invisible) until step 0
        if (token) { token.hidden = false; V7.off(token); }
        V7.off([stock, ask, draft, reply]);
        acts.forEach(function (b) { b.classList.remove('is-disabled'); }); // live until Dana K. answers
        lock(); // a loop restore never changes the height
        try { if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(function () { if (root.getAttribute('data-v7-state') === 'armed') lock(); }); } catch (e) {}
      },
      steps: [
        [0, function (t) {
          lock(); // again, now that fonts are certainly in; then collapse the rows that insert later
          V7.collapse([draft, reply]);
          dock(t, 0);
        }],
        [200, function (t) { V7.flash(t, r1, { tone: 'you', duration: 600 }); V7.pop(t, stock); }],
        [1500, function (t) { dock(t, 1); }],
        [2300, function (t) {
          V7.flash(t, cell, { tone: 'you', duration: 600 });
          if (cell) { cell.setAttribute('data-hot', ''); t.after(600, function () { cell.removeAttribute('data-hot'); }); }
        }],
        [3100, function (t) { dock(t, 2); }],
        [3900, function (t) { V7.insert(t, draft, { duration: 320 }); }],
        [4700, function (t) { dock(t, 3); }],
        [5400, function (t) { V7.show(t, ask, { y: 8, duration: 280 }); }],
        [6300, function (t) { V7.tap(t, approve); }],
        [6600, function (t) {
          V7.insert(t, reply, { duration: 300 });
          acts.forEach(function (b) { b.classList.add('is-disabled'); }); // answered: Approve and Edit are spent (200ms fade)
        }],
        [7300, function (t) { dock(t, 2); }],
        [8000, function (t) { V7.status(t, dpill, 'ok', SENT2); }],
        [8400, function (t) { V7.hide(t, token, { y: -4, duration: 200 }); mark(-1); }]
      ]
    };
  });
})();
// <<< M11
