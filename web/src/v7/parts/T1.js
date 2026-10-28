// >>> T1 v7-tour product tour controller (spec §7 T1)
(function () {
  'use strict';
  var V7 = window.V7, d = document;
  if (!V7 || !V7.ready) return;
  var DWELL = { goal: 8200, flows: 7800, monitor: 8200, exceptions: 6600, rules: 6200, audit: 8200 }; // screen length + hold
  var CYCLES = 2, BADGE_AT = 4050; // M6 rolls "2 open" → "1 open" at 4050ms; the shell's nav badge follows
  // The handoff moves the shared cursor from the dwell timeline, made with V7.timeline({ owner: 'T1' }): C1 records the
  // mover of the cursor, so the screen that finishes underneath does not hide a cursor the tour now owns.
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he';
  var T = HE ? { play: 'הפעלת הסיור', pause: 'השהיית הסיור' } : { play: 'Play tour', pause: 'Pause tour' };
  var SWITCH_IN = 90; // the incoming screen starts 90ms after the outgoing one (120ms fade, T1.css) begins to fade

  function init(tour) {
    if (tour.__v7t) return;
    tour.__v7t = 1;
    var strip = tour.querySelector('[role=tablist]'), tabs = V7.$$(tour, '[role=tab]'), win = tour.querySelector('.v7-tour-win'),
      app = win && win.querySelector('.v7-app'), toggle = tour.querySelector('.v7-tour-toggle');
    if (!strip || !tabs.length || !app) return;
    var screens = tabs.map(function (t) { return app.querySelector('.v7-screen[data-screen="' + t.getAttribute('data-screen') + '"]'); }),
      panels = tabs.map(function (t) { return d.getElementById(t.getAttribute('aria-controls')); }),
      keys = tabs.map(function (t) { return t.getAttribute('data-screen'); }),
      badge = app.querySelector('.v7-nav-item[data-nav=exceptions] .v7-nav-badge'),
      N = tabs.length, EXC = keys.indexOf('exceptions');
    if (screens.some(function (s) { return !s; })) return;

    tour.classList.add('is-js');
    var idx = 0, auto = !V7.static, started = false, ended = false, laps = 0, tl = null, gen = 0, R = {};

    function dwellOf(i) { return DWELL[keys[i]] || 7000; }
    function navOf(i) { return app.querySelector('.v7-nav-item[data-nav="' + screens[i].getAttribute('data-nav') + '"]'); }
    function blocked() { return !started || R.offscreen || R.tab || R.user || (auto && (R.hover || R.focus)); }

    // 'Pause tour' / 'Play tour' (spec: one visible at a time)
    function syncToggle() {
      if (!toggle) return;
      var play = !auto || R.user, lab = toggle.querySelector('.v7-tour-tlabel'), u = toggle.querySelector('use');
      if (lab) lab.textContent = play ? T.play : T.pause;
      toggle.setAttribute('aria-label', play ? T.play : T.pause); // the narrow bar shows the icon only
      if (u) u.setAttribute('href', play ? '#i-play' : '#i-pause');
      toggle.hidden = !!V7.static;
    }
    // Pause or play the dwell clock and the screen on display together
    function apply() {
      syncToggle();
      if (V7.static) return;
      var c = V7.get(screens[idx]);
      if (blocked()) { if (tl) tl.pause(); c.pause('host'); tour.setAttribute('data-v7-paused', ''); }
      else { tour.removeAttribute('data-v7-paused'); if (tl) tl.play(); c.resume('host'); }
    }
    function progress(offset) {
      tabs.forEach(function (t) { var p = t.querySelector('.v7-tab-prog'); if (p) { p.classList.remove('is-run'); p.style.animationDelay = ''; } });
      var p = tabs[idx].querySelector('.v7-tab-prog');
      tour.classList.toggle('is-auto', auto && !V7.static);
      if (!auto || V7.static || !p) return;
      p.style.setProperty('--v7-dwell', dwellOf(idx) + 'ms');
      if (offset > 0) p.style.animationDelay = -offset + 'ms';
      void p.offsetWidth; // restart the keyframes
      p.classList.add('is-run');
    }
    function center(t) { // keep the selected tab in view inside the scrolling strip (never scrollIntoView)
      if (strip.scrollWidth <= strip.clientWidth + 1) return;
      var left = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
      try { strip.scrollTo({ left: left, behavior: V7.static ? 'auto' : 'smooth' }); } catch (e) { strip.scrollLeft = left; }
    }
    function setBadge(i) { // 2 open until the exception on the Exceptions screen is resolved, 1 after
      if (!badge || EXC < 0) return;
      badge.textContent = i > EXC || (i === EXC && V7.static) ? '1' : '2';
    }
    // Handoff and advance, scheduled on the dwell clock (also used when 'Play tour' resumes a screen mid-way)
    function scheduleAuto() { // each call starts a new generation, so handoffs scheduled before a tab click never fire
      var g = ++gen;
      if (!tl || !auto) return;
      var dw = dwellOf(idx), nx = (idx + 1) % N, last = idx === N - 1 && laps + 1 >= CYCLES, nav = navOf(nx), moved = false;
      var live = function () { return g === gen && auto; };
      if (!last && nav) {
        tl.at(dw - 900, function (t) { if (live() && V7.hasCursor(app)) { moved = true; V7.cursorTo(t, nav, { duration: 500 }); } });
        tl.at(dw - 300, function (t) { if (live() && moved && V7.hasCursor(app)) V7.tap(t, nav); });
      }
      tl.at(dw, function () {
        if (!live()) return;
        if (idx === N - 1) laps++;
        if (laps >= CYCLES) { stop(); return; }
        show(nx);
      });
    }
    function stop() { // two cycles done: rest on the last screen; 'Play tour' starts again from the first
      auto = false; ended = true;
      progress(); apply();
    }

    // spec §7 T1 show(i): tabs and panels, outgoing out, nav, incoming restarted and in, progress, strip
    function show(n, fromUser) {
      n = ((n % N) + N) % N;
      var prev = screens[idx], next = screens[n], same = n === idx, c = V7.get(next);
      idx = n;
      tabs.forEach(function (t, k) {
        var on = k === n;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) panels[k].hidden = !on;
      });
      if (prev && !same) {
        V7.get(prev).pause('host');
        prev.setAttribute('data-v7-inactive', ''); prev.inert = true;
      }
      V7.navTo(app, next.getAttribute('data-nav'), next.getAttribute('data-title'));
      setBadge(n);
      next.removeAttribute('data-v7-inactive'); next.inert = false;
      if (tl) { tl.kill(); tl = null; }
      if (V7.static) {
        if (c.state !== 'final') c.toFinal();
      } else {
        tl = V7.timeline({ owner: 'T1' });
        if (fromUser) V7.cursorHide(tl, app); // a clicked tab does not leave the handoff cursor parked on another nav item
        c.restart();
        if (!same) {
          try { next.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: SWITCH_IN, easing: V7.ease.out, fill: 'backwards' }); } catch (e) {}
          var pn = panels[n];
          if (pn) try { pn.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: SWITCH_IN, easing: V7.ease.out, fill: 'backwards' }); } catch (e) {}
        }
        if (keys[n] === 'exceptions' && badge) tl.at(BADGE_AT, function (t) { if (badge.textContent !== '1') V7.roll(t, badge, '1'); });
        scheduleAuto();
      }
      progress();
      center(tabs[n]);
      apply();
    }

    function pick(k) { // a tab click or arrow key: stay on that screen and play it once
      var same = k === idx, c = V7.get(screens[k]);
      auto = false; ended = false; started = true; delete R.user; gen++;
      if (same && c.state !== 'done' && c.state !== 'final' && !V7.static) { // already on display: keep it running, drop the advance
        progress(); apply();
        return;
      }
      show(k, true);
    }
    function play() { // 'Play tour': autoplay continues from the current screen (from the first after a finished run)
      delete R.user; delete R.hover; delete R.focus;
      auto = true; started = true; laps = 0;
      if (ended) { ended = false; show(0); return; }
      var c = V7.get(screens[idx]);
      if (!tl || c.state === 'done' || c.state === 'final') { show(idx + 1); return; }
      scheduleAuto(); progress(tl.time); apply();
    }

    tabs.forEach(function (t, k) { t.addEventListener('click', function () { pick(k); }); });
    strip.addEventListener('keydown', function (e) {
      var k = tabs.indexOf(d.activeElement), n;
      if (k < 0) return;
      var dir = V7.dir(tour) < 0 ? -1 : 1;
      if (e.key === 'ArrowRight') n = k + dir;
      else if (e.key === 'ArrowLeft') n = k - dir;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = N - 1;
      else return;
      e.preventDefault();
      n = ((n % N) + N) % N;
      tabs[n].focus();
      pick(n);
    });
    if (toggle) toggle.addEventListener('click', function () {
      if (V7.static) return;
      if (!auto) play();
      else if (R.user) { delete R.user; delete R.hover; delete R.focus; apply(); }
      else { R.user = 1; apply(); }
    });
    // Hover pauses only after the mouse really moves over the window, so a page scrolled under a resting pointer keeps playing
    win.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && !R.hover) { R.hover = 1; apply(); } });
    win.addEventListener('pointerleave', function () { if (R.hover) { delete R.hover; apply(); } });
    // Keyboard focus inside the tour pauses it (a mouse click on a control is not a reason to stop)
    tour.addEventListener('focusin', function (e) {
      var kb = true;
      try { kb = e.target.matches(':focus-visible'); } catch (x) {}
      if (kb && !R.focus) { R.focus = 1; apply(); }
    });
    tour.addEventListener('focusout', function (e) { if (R.focus && !(e.relatedTarget && tour.contains(e.relatedTarget))) { delete R.focus; apply(); } });
    d.addEventListener('visibilitychange', function () { if (d.hidden) R.tab = 1; else delete R.tab; apply(); });
    d.addEventListener('v7:static', function () { // reduced motion switched on: C1 has put every screen on its final frame
      auto = false;
      if (tl) { tl.kill(); tl = null; }
      V7.cursorHide(null, app);
      tour.removeAttribute('data-v7-paused');
      setBadge(idx); progress(); syncToggle();
    });

    // Initial state: first screen on display, the others hidden but laid out
    screens.forEach(function (s, k) { if (k !== idx) { s.setAttribute('data-v7-inactive', ''); s.inert = true; } });
    tabs.forEach(function (t, k) { if (panels[k]) panels[k].hidden = k !== idx; });
    setBadge(idx);
    if (d.hidden) R.tab = 1;
    if (V7.static) { show(0, true); return; }
    syncToggle();
    // Autoplay starts the first time the tour is at least 40% visible; under 15% it pauses
    V7.observe(tour, { enter: .4, leave: .15 }, function (v) {
      if (v) {
        delete R.offscreen;
        if (!started && auto) { started = true; show(idx); return; }
      } else R.offscreen = 1;
      apply();
    });
  }

  V7.ready(function () {
    V7.$$(d, '[data-v7-tour]').forEach(function (t) {
      try { init(t); } catch (e) {
        try { console.error('[V7] T1:', e); } catch (x) {}
        t.classList.remove('is-js'); // fall back to the no-JS layout: first screen, every caption
        V7.$$(t, '.v7-screen').forEach(function (s, k) { s.removeAttribute('data-v7-inactive'); if (k) s.hidden = true; });
        V7.$$(t, '[role=tabpanel]').forEach(function (p) { p.hidden = false; });
      }
    });
  });
})();
// <<< T1
