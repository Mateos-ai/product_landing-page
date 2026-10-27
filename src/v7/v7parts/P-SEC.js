// >>> P-SEC Security and control page effects (Security spec §1 C2): the four "what it can touch" stages
// Each stage is a CSS keyframe loop (P-SEC.css): no timeline, no layout animation. This only starts a stage the first time
// it is half visible (.is-play), and freezes it (data-v7-hold) while it is off screen or the tab is hidden. The keyframes
// play once and end on the final look within about 3.8s. Static (reduced motion, failed gate): nothing runs, the markup is the final look.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var d = document;

  function stages() {
    var list = V7.$$(d, '.v7-sec-stage');
    if (!list.length || V7.static) return;
    var seen = [];
    list.forEach(function (st) {
      var vis = false;
      function sync() {
        if (vis && !d.hidden) st.removeAttribute('data-v7-hold');
        else if (st.classList.contains('is-play')) st.setAttribute('data-v7-hold', '');
      }
      V7.observe(st, { enter: .5, leave: .05 }, function (v) {
        vis = !!v;
        if (vis && !st.classList.contains('is-play')) st.classList.add('is-play');
        sync();
      });
      seen.push(sync);
    });
    d.addEventListener('visibilitychange', function () { seen.forEach(function (f) { f(); }); });
  }

  V7.ready(function () {
    try { stages(); } catch (e) { try { console.error('[V7] P-SEC stages:', e); } catch (x) {} }
  });
})();
// <<< P-SEC
