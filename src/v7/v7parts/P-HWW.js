// >>> P-HWW How We Work page effects (How We Work spec §1 W4, W5): the three-step track and the number card
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var d = document;
  function safe(name, f) { try { f(); } catch (e) { try { console.error('[V7] P-HWW ' + name + ':', e); } catch (x) {} } }

  // W5: the number card. Armed: baseline 6%, today at the baseline, target 90%, the bar at the baseline tick, "On track" away
  // (a full card, never an empty frame). At 40% visible: today counts 6 → 51 while the bar fills to .51, then "On track" pops.
  // Final markup = final state (reduced motion and no JS show it as is).
  if (V7.define) V7.define('HWW-N', function (root) {
    var now = V7.$(root, '.v7-hww-num-now'), fill = V7.$(root, '.v7-hww-num-bar .v7-bar-fill'),
      tick = V7.$(root, '.v7-hww-num-bar .v7-bar-tick'), ok = V7.$(root, '.v7-hww-num-ok');
    var to = now ? parseFloat(now.textContent) : NaN, v = fill ? parseFloat(fill.style.getPropertyValue('--v')) : NaN,
      at = tick ? parseFloat(tick.style.getPropertyValue('--at')) : NaN;
    if (isNaN(to)) to = 51;
    if (isNaN(v)) v = .51;
    if (isNaN(at)) at = .06;
    var from = Math.round(at * 100);
    return {
      length: 1700,
      hold: 0,
      arm: function () {
        if (now) now.textContent = from + '%';
        if (fill) fill.style.setProperty('--v', at);
        if (ok) V7.off(ok);
      },
      steps: [
        [0, function (t) {
          V7.count(t, now, { from: from, to: to, duration: 1100, suffix: '%' });
          V7.bar(t, fill, v, { duration: 1100, easing: 'cubic-bezier(.33,1,.68,1)' }); // the count's ease, so number and bar move together
        }],
        [1150, function (t) { V7.pop(t, ok, { duration: 320 }); }]
      ]
    };
  });

  // W4: each stop turns on with .is-on (CSS transitions: the rail draws, the dot pops, the card rises, the artifact fills).
  // One row (≥900px, about 300px tall): all three together at 40% visible, staggered in CSS. A column (<900px, about 700px
  // tall): each stop on its own at 30% of it visible, so the first card never waits for the rest of the track to scroll in
  // (that left a blank band under the heading on phones).
  function track() {
    var ol = d.querySelector('.v7-hww-track');
    if (!ol || V7.static) return;
    var stops = V7.$$(ol, '.v7-hww-stop');
    if (!stops.length) return;
    var uns = [], raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); },
      mq = window.matchMedia ? window.matchMedia('(min-width:900px)') : null;
    ol.setAttribute('data-v7-armed', '');
    function drop() { uns.forEach(function (u) { u(); }); uns = []; }
    function go(list) {
      void ol.offsetWidth; // the armed look is computed before the transitions switch on
      raf(function () { raf(function () { list.forEach(function (li) { li.classList.add('is-on'); }); }); });
    }
    function all() { drop(); stops.forEach(function (li) { li.classList.add('is-on'); }); }
    if (!mq || mq.matches) {
      uns.push(V7.observe(ol, { enter: .4, leave: 0 }, function (vis) { if (vis) { drop(); go(stops); } }));
    } else {
      stops.forEach(function (li) {
        var done = false, u = V7.observe(li, { enter: .3, leave: 0 }, function (vis) {
          if (!vis || done) return;
          done = true;
          if (u) u();
          go([li]);
        });
        uns.push(u);
      });
    }
    // the layout switches between the row and the column (rotation, resize) before every stop is on: show the rest now
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', all);
      else if (mq.addListener) mq.addListener(all);
    }
    // keyboard focus never lands in hidden cards (there are no controls inside today, but stay safe)
    ol.addEventListener('focusin', all);
    d.addEventListener('v7:static', all);
  }

  V7.ready(function () { safe('track', track); });
})();
// <<< P-HWW
