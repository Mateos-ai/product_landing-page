// >>> P-ABOUT About page effects (About spec §1 A5): the four belief pictures
// The team rings, the advisor chips and the join-row seats run on the reveal system alone (P-ABOUT.css).
// Each belief picture is a small canvas whose markup is the built look. JS arms it (data-v7-armed: empty seats, nothing
// built) and, while it is at least 60% on screen, plays it twice: build (CSS transitions on .is-on, staggered), hold, a quick
// reset (data-v7-cycling), build again, then it rests built. Its clock is a V7 page timeline, paused whenever the picture
// leaves the screen, so it never runs unseen. Reduced motion, no JS, or a live switch to reduced motion: the built markup.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var d = document;
  function safe(name, f) { try { f(); } catch (e) { try { console.error('[V7] P-ABOUT ' + name + ':', e); } catch (x) {} } }

  // build length per picture (ms until its last transition settles), the hold on the built look, the reset, the cycles
  var LEN = { goal: 1300, approve: 1150, label: 1600, skin: 1450 }, HOLD = 1600, RESET = 340, GAP = 280, CYCLES = 2;

  function picture(v, i) {
    var tl = V7.timeline({ owner: 'P-ABOUT' }), len = LEN[v.getAttribute('data-viz')] || 1400, n = 0, over = false, un = null;
    function end() {
      if (over) return;
      over = true;
      if (un) un();
      tl.kill();
      v.removeAttribute('data-v7-cycling');
      v.classList.add('is-on');
    }
    function build(t) {
      void v.offsetWidth; // the armed (or reset) look is computed before the build transitions switch on
      v.classList.add('is-on');
      n++;
      if (n >= CYCLES) { t.after(len, end); return; }
      t.after(len + HOLD, function (t2) {
        v.setAttribute('data-v7-cycling', '');
        v.classList.remove('is-on');
        t2.after(RESET + GAP, build);
      });
    }
    v.setAttribute('data-v7-armed', '');
    tl.at(360 + (i % 2) * 140, build); // the card's own reveal lands first; the second column follows a beat later
    un = V7.observe(v, { enter: .6, leave: .2 }, function (vis) { if (over) return; if (vis) tl.play(); else tl.pause(); });
    return function settle() { end(); v.removeAttribute('data-v7-armed'); };
  }

  function beliefs() {
    if (V7.static) return;
    var L = V7.$$(d, '.v7-about-viz');
    if (!L.length) return;
    var settle = L.map(picture);
    d.addEventListener('v7:static', function () { settle.forEach(function (f) { f(); }); });
  }

  V7.ready(function () { safe('beliefs', beliefs); });
})();
// <<< P-ABOUT
