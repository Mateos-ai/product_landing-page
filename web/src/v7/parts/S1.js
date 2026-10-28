// >>> S1 v7-how homepage "How it works" controller (spec §7 S1)
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var d = document, w = window;
  var LINE = .55; // a step becomes active when its H3 centre crosses 55% of the viewport height (either direction)

  V7.ready(function () {
    var root = d.querySelector('[data-v7-steps]');
    if (!root || V7.static) return; // static: the CSS stacked layout and the final screens, nothing to drive
    var steps = V7.$$(root, '.v7-how-step[data-step]');
    var figs = steps.map(function (s) { return root.querySelector('.v7-how-win[data-step="' + s.getAttribute('data-step') + '"]'); });
    if (!steps.length || figs.some(function (f) { return !f; })) return;
    var ctrls = figs.map(function (f) { return V7.get(f.querySelector('[data-v7-mock]')); });
    var heads = steps.map(function (s) { return s.querySelector('h3') || s; });
    var dots = steps.map(function (s) { return s.querySelector('.v7-label>i'); });
    var rail = root.querySelector('.v7-how-rail');
    // Pinned needs room for the 562px window under the 68px sticky header; shorter viewports stay stacked.
    var MQ = null;
    try { MQ = w.matchMedia('(min-width: 1024px) and (min-height: 650px)'); } catch (e) {}
    var mode = '', active = -1, offs = [], sides = null, raf = 0, ro = null, rq = 0, stops = null;

    function each(L, i) { L.forEach(function (e, k) { if (k === i) e.setAttribute('data-active', ''); else e.removeAttribute('data-active'); }); }
    function clear() {
      offs.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
      if (ro) { ro.disconnect(); ro = null; }
      if (rq) { w.cancelAnimationFrame(rq); rq = 0; }
      w.removeEventListener('scroll', onScroll); w.removeEventListener('resize', onScroll);
      each(steps, -1); each(figs, -1); active = -1; sides = null; stops = null;
      steps.forEach(function (s) { s.removeAttribute('data-passed'); });
      if (rail) ['--p', '--v7-rail-top', '--v7-rail-h'].forEach(function (p) { rail.style.removeProperty(p); });
    }
    function activate(i) {
      if (i < 0 || i >= steps.length || i === active) return;
      active = i; // CSS: the outgoing window's content fades (100ms) under the incoming window (from 90ms), then drops out
      each(steps, i); each(figs, i);
      steps.forEach(function (s, k) { if (k < i) s.setAttribute('data-passed', ''); else s.removeAttribute('data-passed'); });
      fill();
      ctrls.forEach(function (c, k) { if (k === i) c.play(); else c.pause('host'); }); // done screens stay final, never replay
    }
    function fill() { // the fill ends on the active station (stations are not evenly spaced: step 1 is top-aligned)
      if (rail && active >= 0) rail.style.setProperty('--p', stops ? stops[active] : (steps.length > 1 ? active / (steps.length - 1) : 1));
    }
    function centres() { return heads.map(function (h) { var r = h.getBoundingClientRect(); return r.top + r.height / 2; }); }
    function check() { // the step whose H3 most recently crossed the line becomes active
      raf = 0;
      if (mode !== 'pinned') return;
      var line = w.innerHeight * LINE, c = centres(), now = c.map(function (y) { return y <= line; }), pick = -1, k;
      if (!sides) { // first look (mode change, load mid-page): the H3 nearest the line
        var bd = Infinity;
        c.forEach(function (y, k) { var dd = Math.abs(y - line); if (dd < bd) { bd = dd; pick = k; } });
      } else {
        for (k = 0; k < c.length; k++) if (!sides[k] && now[k]) pick = k; // scrolling down: the last H3 that rose past the line
        if (pick < 0) for (k = c.length - 1; k >= 0; k--) if (sides[k] && !now[k]) pick = k; // scrolling up: the first that dropped below it
      }
      sides = now;
      if (pick >= 0) activate(pick);
    }
    function onScroll() { if (!raf) raf = w.requestAnimationFrame(check); }
    function rails() { // the rail runs from dot 1's centre to the last dot's centre
      if (!rail || mode !== 'pinned' || !dots[0] || !dots[dots.length - 1]) return;
      var base = steps[0].getBoundingClientRect().top, ys = dots.map(function (e) { var r = e ? e.getBoundingClientRect() : null; return r ? r.top + r.height / 2 : 0; }),
        y0 = ys[0], h = Math.max(0, ys[ys.length - 1] - y0);
      rail.style.setProperty('--v7-rail-top', (y0 - base) + 'px');
      rail.style.setProperty('--v7-rail-h', h + 'px');
      stops = ys.map(function (y) { return h ? Math.min(1, Math.max(0, (y - y0) / h)) : 0; });
      fill();
    }
    function pinned() {
      clear(); mode = 'pinned';
      root.setAttribute('data-mode', 'pinned');
      ctrls.forEach(function (c) { c.pause('offscreen'); c.pause('host'); });
      sides = null; check();
      if (active < 0) activate(0);
      rails();
      // The rail is a grid item, so measuring it inside the observer callback can resize what is observed (WebKit then
      // reports a ResizeObserver loop): measure on the next frame instead.
      if ('ResizeObserver' in w) { ro = new ResizeObserver(function () { if (!rq) rq = w.requestAnimationFrame(function () { rq = 0; rails(); }); }); ro.observe(root); heads.forEach(function (h) { ro.observe(h); }); }
      try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { rails(); }); } catch (e) {}
      // The three windows overlap exactly, so the first stands in for "the window": it plays at 35% visible and
      // pauses under 15%, like every other mock (a 5% section threshold started screens before they were on screen).
      offs.push(V7.observe(figs[0], { enter: .35, leave: .15 }, function (v) {
        ctrls.forEach(function (c) { if (v) c.resume('offscreen'); else c.pause('offscreen'); });
      }));
      // Track the steps only while the section is on screen; the last look on the way out settles any jump.
      offs.push(V7.observe(root, { enter: 0 }, function (v) {
        if (v) { w.addEventListener('scroll', onScroll, { passive: true }); w.addEventListener('resize', onScroll); }
        else { w.removeEventListener('scroll', onScroll); w.removeEventListener('resize', onScroll); }
        check();
      }));
    }
    function stacked() {
      clear(); mode = 'stacked';
      root.removeAttribute('data-mode');
      figs.forEach(function (f, i) {
        var c = ctrls[i];
        c.pause('offscreen');
        offs.push(V7.observe(f, { enter: .35, leave: .15 }, function (v) {
          if (v) { c.resume('offscreen'); c.play(); } else c.pause('offscreen');
        }));
      });
    }
    function teardown() { clear(); mode = 'static'; root.removeAttribute('data-mode'); }
    function apply() {
      if (V7.static) { if (mode !== 'static') teardown(); return; }
      var want = MQ && MQ.matches ? 'pinned' : 'stacked';
      if (want !== mode) { if (want === 'pinned') pinned(); else stacked(); }
    }
    if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', apply); else if (MQ.addListener) MQ.addListener(apply); }
    d.addEventListener('v7:static', teardown); // reduced motion switched on: C1 already settled every screen
    apply();
  });
})();
// <<< S1
