// >>> M6 m-exc: exception desk (spec §6 M6). Host-driven (T1). Length 5200, hold 1400.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
  var T = HE ? { age: 'לפני 12 דק׳', open2: '2 פתוחים', open1: '1 פתוח', approve: 'אישור ושמירה ככלל', saved: 'נשמר ככלל <bdi>R-14</bdi>', resolved: 'נפתר · R-14' }
    : { age: '12 min', open2: '2 open', open1: '1 open', approve: 'Approve and save as rule', saved: 'Saved as rule <bdi>R-14</bdi>', resolved: 'Resolved · R-14' };
  function cls(el, add, rm) { if (!el) return; if (rm) el.classList.remove(rm); if (add) el.classList.add(add); }
  V7.define('M6', function (root, tl, o) {
    var q = function (s) { return root.querySelector(s); };
    var rows = V7.$$(root, '.m-exc-row, .m-exc-earlier'), r1 = q('.m-exc-r1'), age = q('.m-exc-r1 .m-exc-age'), count = q('.m-exc-count'),
      det = q('.m-exc-detail'), parts = det ? V7.$$(det, ':scope > *') : [], think = q('.m-exc-think'), stext = q('.m-exc-stext'),
      save = q('.m-exc-save'), saveIc = save && save.querySelector('.v7-ic'), ghosts = V7.$$(root, '.m-exc-acts > .is-ghost'),
      toast = q('.m-exc-toast'), full = stext ? stext.textContent.replace(/\s+/g, ' ').trim() : '', typed = null, wF = 0, wA = 0,
      pane = o && o.size === 'wide'; // wide: the detail is a fixed pane of the split view; only its contents come in
    return {
      length: 5200, hold: 1400,
      arm: function () {
        V7.off(rows);
        if (r1) { r1.removeAttribute('data-selected'); r1.classList.remove('is-resolved'); }
        if (age) { age.removeAttribute('data-tone'); age.classList.add('is-age'); age.textContent = T.age; }
        if (count) count.textContent = T.open2;
        if (!pane) V7.off(det);
        V7.off(parts);
        V7.on(think);
        if (stext) { // a hidden copy of the final text keeps the box at its final height while Mate types
          var gh = document.createElement('span');
          gh.className = 'm-exc-ghost'; gh.textContent = full;
          typed = document.createElement('span'); typed.className = 'm-exc-typed';
          stext.textContent = ''; stext.appendChild(gh); stext.appendChild(typed);
        }
        if (save) { // the button keeps the wider of its two widths, so the row does not jump when the label changes
          wF = save.offsetWidth;
          cls(save, 'is-primary', 'is-ok'); V7.gone(saveIc);
          V7.roll(null, save, T.approve);
          wA = save.offsetWidth;
          if (wF && wA) save.style.minWidth = Math.max(wF, wA) + 'px';
        }
        ghosts.forEach(function (g) { g.classList.remove('is-disabled'); });
        V7.off(toast);
      },
      steps: [
        [0, function (t) { V7.show(t, rows, { stagger: 70 }); }],
        [450, function () { if (r1) r1.setAttribute('data-selected', ''); }],
        [600, function (t) {
          if (!pane) V7.show(t, det, { x: 12, y: 0, duration: 320 });
          V7.show(t, parts, pane ? { x: 12, y: 0, duration: 320, stagger: 50 } : { y: 6, duration: 280, stagger: 50, delay: 40 });
        }],
        [1900, function (t) { V7.gone(think); if (typed) V7.type(t, typed, full, { duration: 1100 }); }],
        [3100, function (t) { V7.cursorTo(t, save, { duration: 550 }); }],
        [3700, function (t) {
          V7.tap(t, save);
          V7.roll(t, save, T.saved, { html: true });
          cls(save, 'is-ok', 'is-primary');
          V7.pop(t, saveIc, { delay: 100, from: .6 });
          ghosts.forEach(function (g) { g.classList.add('is-disabled'); });
        }],
        [4050, function (t) {
          cls(age, null, 'is-age');
          V7.status(t, age, 'ok', T.resolved);
          cls(r1, 'is-resolved');
          V7.roll(t, count, T.open1);
        }],
        [4400, function (t) { V7.show(t, toast, { y: 8, duration: 300 }); }],
        [4700, function (t) { // the saved button settles to its own width (the final markup), so the end frame equals it
          if (!save || !save.style.minWidth) return;
          if (!wF || !wA || wF >= wA) { save.style.minWidth = ''; return; }
          t.tween(240, V7.ease.outCubic, function (p) { save.style.minWidth = (wA + (wF - wA) * p).toFixed(2) + 'px'; }, function () { save.style.minWidth = ''; });
        }]
      ]
    };
  });
})();
// <<< M6
