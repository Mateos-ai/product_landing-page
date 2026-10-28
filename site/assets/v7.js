/* Mateos v7 motion and components. Built from parts by assemble.sh; edit the parts, not this file. */
// >>> C1 motion core (spec §3). window.V7: gating, controllers, one rAF clock, primitives, reveal.
(function () {
  'use strict';
  var w = window, d = document, H = d.documentElement;
  if (w.V7 && w.V7.core) return;
  H.classList.add('v7-ready'); // §3.8 step 1: first action of v7.js, stops the head gate's fail-open

  var V7 = w.V7 = w.V7 || {};
  V7.core = 1;
  function mq(q) { try { return w.matchMedia(q); } catch (e) { return null; } }
  var RMQ = mq('(prefers-reduced-motion: reduce)');
  // Late boot. On a slow phone link the head gate fails open after 2500ms (html loses .v7-motion), so the visitor sees
  // the final look. When this script still arrives, motion comes back for what has not been seen yet: reveals that start
  // above the bottom of the viewport stay in, the hero copy does not replay (C1.css, html.v7-late), and a mock already on
  // screen fades in from its start state (mount below). Reduced motion, pages without the head gate and no-JS stay static.
  V7.late = false;
  function gated() {
    var s = d.querySelectorAll('head script:not([src])'), i;
    for (i = 0; i < s.length; i++) if (s[i].textContent.indexOf("add('v7-motion')") >= 0) return true;
    return false;
  }
  if (!H.classList.contains('v7-motion') && !(RMQ && RMQ.matches)) try {
    if (gated()) {
      var vh0 = w.innerHeight || H.clientHeight;
      Array.prototype.forEach.call(d.querySelectorAll('[data-v7-reveal]'), function (e) { if (e.getBoundingClientRect().top < vh0) e.classList.add('is-in'); });
      Array.prototype.forEach.call(d.querySelectorAll('[data-v7-mock]'), function (r) {
        var b = (r.closest('.v7-figure') || r).getBoundingClientRect();
        if (b.top < vh0 && b.bottom > 0) r.__v7late = 1;
      });
      H.classList.add('v7-late'); H.classList.add('v7-motion'); V7.late = true;
    }
  } catch (e) {}
  V7.static = !H.classList.contains('v7-motion');
  V7.coarse = !!(mq('(pointer: coarse)') || 0).matches;
  // Page language from <html lang> ('he' on the Hebrew pages). Informational: components read the lang attribute themselves.
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he';
  V7.lang = HE ? 'he' : 'en';
  V7.dir = function (el) {
    var n = el && el.closest ? el.closest('[dir]') : H, v = n && n.getAttribute('dir');
    return v && v.toLowerCase() === 'rtl' ? -1 : 1;
  };

  function report(id, e) { try { console.error('[V7] ' + id + ':', e); } catch (x) {} }
  function dv(v, def) { return v == null || v === '' || isNaN(v) ? def : +v; }
  function rmEl(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function rmA(a, x) { var i = a.indexOf(x); if (i >= 0) a.splice(i, 1); }
  function els(x) {
    if (!x) return [];
    if (x.nodeType === 1) return [x];
    if (typeof x !== 'string' && typeof x.length === 'number') return Array.prototype.filter.call(x, function (e) { return e && e.nodeType === 1; });
    return [];
  }
  function shown(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  V7.$ = function (r, s) { return r ? r.querySelector(s) : null; };
  V7.$$ = function (r, s) { return r ? Array.prototype.slice.call(r.querySelectorAll(s)) : []; };

  /* ---------- easing ---------- */
  function bez(p1x, p1y, p2x, p2y) {
    var cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx, cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    function X(t) { return ((ax * t + bx) * t + cx) * t; }
    function Y(t) { return ((ay * t + by) * t + cy) * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, e, s;
      for (i = 0; i < 8; i++) { e = X(t) - x; if (Math.abs(e) < 1e-5) return Y(t); s = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(s) < 1e-6) break; t -= e / s; }
      var lo = 0, hi = 1; t = x;
      for (i = 0; i < 30; i++) { e = X(t); if (Math.abs(e - x) < 1e-5) break; if (x > e) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  V7.ease = {
    out: 'cubic-bezier(.22,1,.36,1)', inOut: 'cubic-bezier(.65,0,.35,1)', pop: 'cubic-bezier(.34,1.4,.64,1)', in: 'cubic-bezier(.55,0,1,.45)',
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };
  V7.ease.outCubic.css = 'cubic-bezier(.33,1,.68,1)';
  V7.ease.inOutCubic.css = 'cubic-bezier(.65,0,.35,1)';
  var KW = { ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] }, EZ = {};
  function ecss(e) { // easing for el.animate()
    if (!e) return 'ease';
    if (typeof e === 'function') return e.css || 'linear';
    var v = V7.ease[e];
    return v ? (typeof v === 'function' ? v.css : v) : e;
  }
  function efn(e) { // easing for tween()
    if (typeof e === 'function') return e;
    if (!e || e === 'linear') return function (t) { return t; };
    var s = ecss(e);
    if (!EZ[s]) {
      var m = KW[s] || ((s.match(/cubic-bezier\(([^)]+)\)/) || [])[1] || '').split(',').map(parseFloat);
      EZ[s] = m.length === 4 && !m.some(isNaN) ? bez(m[0], m[1], m[2], m[3]) : function (t) { return t; };
    }
    return EZ[s];
  }

  /* ---------- the one clock ---------- */
  var ACT = [], raf = 0, last = 0;
  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(now - last, 50) : 0, a = ACT.slice(), i;
    last = now;
    for (i = 0; i < a.length; i++) a[i]._adv(dt);
    if (ACT.length) raf = w.requestAnimationFrame(frame); else last = 0;
  }
  function kick() { if (!raf) raf = w.requestAnimationFrame(frame); }

  /* ---------- Timeline (§3.5) ---------- */
  function TL(ctrl) { this.ctrl = ctrl || null; this.time = 0; this.q = []; this.n = 0; this.A = []; this.T = []; this.playing = false; this.dead = false; this.cur = null; }
  var P = TL.prototype;
  P.now = function () { return this.cur == null ? this.time : this.cur; };
  P.at = function (ms, f) {
    if (this.dead || typeof f !== 'function') return this;
    var it = { t: +ms || 0, f: f, n: this.n++ }, q = this.q, i = q.length;
    while (i && q[i - 1].t > it.t) i--;
    q.splice(i, 0, it);
    if (this.playing && it.t <= this.time) kick();
    return this;
  };
  P.after = function (ms, f) { return this.at(this.now() + (+ms || 0), f); };
  function keep(a) { var s = a.playState; return s !== 'idle' && !(s === 'finished' && (a._f === 'none' || a._f === 'backwards')); }
  P.anim = function (el, kf, o) {
    if (this.dead || !el || !el.animate) return null;
    o = o || {};
    var a, fill = o.fill || 'both';
    try {
      // a negative delay absorbs the frame lag, so animations land on their nominal step time
      a = el.animate(kf, { duration: Math.max(0, dv(o.duration, 300)), easing: ecss(o.easing || 'ease'), delay: (+o.delay || 0) - (this.time - this.now()), fill: fill });
    } catch (e) { report('anim', e); return null; }
    a._f = fill;
    if (!this.playing) a.pause();
    if (this.A.length > 60) this.A = this.A.filter(keep);
    this.A.push(a);
    return a;
  };
  P.tween = function (dur, ez, up, done) {
    if (this.dead) return null;
    var tw = { s: this.now(), d: Math.max(0, +dur || 0), e: efn(ez), u: up, f: done, on: 1 };
    this.T.push(tw); tstep(this, tw);
    return tw;
  };
  function tstep(tl, tw) {
    var r = tw.d ? (tl.time - tw.s) / tw.d : 1;
    r = r < 0 ? 0 : r > 1 ? 1 : r;
    try { if (tw.u) tw.u(tw.e(r), r); if (r >= 1) { tw.on = 0; if (tw.f) tw.f(); } } catch (e) { tw.on = 0; tl.err(e); }
  }
  P._adv = function (dt) { if (this.playing && !this.dead) { this.time += dt; this._run(); } };
  P._run = function () {
    var q = this.q, g = 0, it, T, i;
    while (this.playing && !this.dead && q.length && q[0].t <= this.time && g++ < 500) {
      it = q.shift(); this.cur = it.t;
      try { it.f(this); } catch (e) { this.cur = null; this.err(e); return; }
      this.cur = null;
    }
    if (this.dead || !this.playing) return;
    T = this.T;
    for (i = 0; i < T.length; i++) if (T[i].on && this.playing && !this.dead) tstep(this, T[i]);
    if (T.length) this.T = T.filter(function (x) { return x.on; });
  };
  P.play = function () {
    if (this.playing || this.dead) return this;
    this.playing = true;
    this.A.forEach(function (a) { try { if (a.playState === 'paused') a.play(); } catch (e) {} });
    if (ACT.indexOf(this) < 0) ACT.push(this);
    kick(); this._run();
    return this;
  };
  P.pause = function () {
    if (!this.playing) return this;
    this.playing = false; rmA(ACT, this);
    this.A.forEach(function (a) { try { if (a.playState === 'running') a.pause(); } catch (e) {} });
    return this;
  };
  P.kill = function () {
    this.dead = true; this.playing = false; rmA(ACT, this); this.q = []; this.T = [];
    this.A.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    this.A = [];
    return this;
  };
  P.commit = function () { // cycle end: settle pending primitive ends, commit fill:'both' styles, cancel
    var A = this.A; this.A = [];
    A.forEach(function (a) {
      try { if (a._end) a._end(); } catch (e) {}
      try { if ((a._f === 'both' || a._f === 'forwards') && a.playState !== 'idle' && a.commitStyles) a.commitStyles(); } catch (e) {}
      try { a.cancel(); } catch (e) {}
    });
  };
  P.err = function (e) {
    report(this.ctrl ? this.ctrl.id : this.own ? this.own.id : 'timeline', e);
    var c = this.ctrl;
    this.kill();
    if (c) setTimeout(function () { c.toFinal(); }, 0);
  };
  // A free-standing page timeline. {owner:'T1'} names its owner: errors are reported under that id, and a cursor it
  // moved stays owned by it, so a mock that finishes underneath does not hide it (the T1 handoff). Not a controller.
  V7.timeline = function (o) {
    var tl = new TL(null);
    if (o && o.owner != null && o.owner !== '') tl.own = { id: String(o.owner), owner: true };
    return tl;
  };

  function onEnd(tl, a, f) { // run f when animation a finishes (or now, if there is none)
    if (!a) { if (!tl || !tl.dead) f(); return; }
    var n = 0;
    a._end = function () { if (!n++) f(); };
    a.onfinish = function () { if (!tl || !tl.dead) a._end(); };
  }
  function later(tl, o, f) { var dl = +(o && o.delay) || 0; if (dl > 0 && tl) { tl.after(dl, f); return null; } return f(); }
  function many(f) { // accept one element, a NodeList or an array; {stagger} adds i*stagger to delay
    return function (tl, x, o) {
      var L = els(x); o = o || {};
      if (L.length < 2) return L[0] ? f(tl, L[0], o) : null;
      var st = +o.stagger || 0, dl = +o.delay || 0;
      return L.map(function (e, i) { return f(tl, e, Object.assign({}, o, { delay: dl + i * st })); });
    };
  }

  /* ---------- controllers (§3.4) ---------- */
  var DEFS = {}, CTRLS = [], READY = [], phase = 0, watching = 0;
  V7.define = function (id, factory) {
    if (typeof factory !== 'function') return;
    DEFS[id] = factory;
    CTRLS.forEach(function (c) { if (c.id === id && !c.def) { c.def = factory; c.state = ''; c._mount(); if (watching) c._watch(); } });
  };
  function Ctrl(root) {
    var at = function (n) { return root.getAttribute(n); }, th = parseFloat(at('data-v7-threshold'));
    this.root = root; this.id = at('data-v7-mock') || ''; this.def = DEFS[this.id] || null;
    this.snapshot = root.innerHTML; this.play_ = at('data-v7-play') || 'host';
    this.th = th >= 0 ? th : .35; this.delay = parseFloat(at('data-v7-start-delay')) || 0;
    this.R = {}; this.R[this.play_ === 'host' ? 'host' : 'offscreen'] = 1;
    if (d.hidden) this.R.tab = 1;
    this.L = {}; this.cycle = 0; this.extra = {}; this.cur = null; this.tl = null; this.state = ''; this.first = true; this.size = '';
  }
  var C = Ctrl.prototype;
  C._set = function (s) {
    if (this.state === s) return;
    this.state = s; this.root.setAttribute('data-v7-state', s);
    if (s !== 'paused') this.root.removeAttribute('data-v7-paused');
    this._emit('state', { state: s });
  };
  C._emit = function (n, det) {
    var self = this;
    (this.L[n] || []).slice().forEach(function (f) { try { f.call(self, det); } catch (e) { report(self.id, e); } });
    V7.emit(this.root, 'v7:' + n, Object.assign({ id: this.id }, det));
  };
  C._opts = function () { // mode = size band of the container, or the figure's data-v7-mode (M15); restart(opts) overrides
    var r = this.root, fig = r.closest('.v7-figure'), box = r.closest('.v7-app-main') || fig || r.parentElement || r, wd = 0;
    try { var cs = getComputedStyle(box); wd = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); } catch (e) {}
    var size = this.size = wd < 480 ? 'narrow' : wd < 760 ? 'medium' : 'wide';
    var host = r.closest('[data-v7-tour]') ? 'tour' : r.closest('[data-v7-steps]') ? 'home' : 'auto';
    return Object.assign({ mode: (fig && fig.getAttribute('data-v7-mode')) || size, size: size, cycle: this.cycle, host: host }, this.extra);
  };
  C._prep = function () { // factory + arm for one cycle, on a fresh Timeline
    var self = this, tl = new TL(this), spec;
    try { spec = this.def(this.root, tl, this._opts()) || {}; } catch (e) { report(this.id, e); return false; }
    var st = Array.isArray(spec.steps) ? spec.steps : [], max = 0;
    st.forEach(function (s) { if (s && +s[0] > max) max = +s[0]; });
    var len = dv(spec.length, max), hold = dv(spec.hold, 0);
    try { if (spec.arm) spec.arm(); } catch (e) { report(this.id, e); return false; }
    st.forEach(function (s) { if (s && typeof s[1] === 'function') tl.at(s[0], s[1]); });
    tl.at(len, function () { self._set('holding'); });
    tl.at(len + hold, function () { self._end(); });
    this.cur = { tl: tl, loop: spec.loop == null ? this.play_ === 'loop' : !!spec.loop, max: dv(spec.maxLoops, Infinity), self: !!spec.selfExit, length: len, hold: hold };
    return true;
  };
  C._mount = function () {
    if (V7.static || !this.def) { this._set('final'); return; }
    if (!this._prep()) { this._fail(); return; }
    this._set('armed'); this._sync();
  };
  C._kill = function () {
    if (this.tl) this.tl.kill();
    if (this.cur) this.cur.tl.kill();
    this.tl = this.cur = null;
    if (this.fx) { try { this.fx.cancel(); } catch (e) {} this.fx = null; }
  };
  C._restore = function () { this._kill(); this.frag = null; this.root.innerHTML = this.snapshot; };
  C._fail = function () { this._restore(); this._set('final'); };
  C._blocked = function () { for (var k in this.R) return true; return false; };
  C._sync = function () {
    var s = this.state, b = this._blocked();
    if (!s || s === 'final' || s === 'done') return;
    if (s === 'armed') { if (!b) this._begin(); return; }
    if (b) {
      if (s !== 'paused') { this.prev = s; if (this.tl) this.tl.pause(); this.root.setAttribute('data-v7-paused', ''); this._set('paused'); }
    } else if (s === 'paused') {
      this._set(this.prev || 'running');
      if (this.tl) this.tl.play();
    }
  };
  C._begin = function () {
    var self = this;
    if (!this.cur && !this._prep()) { this._fail(); return; }
    if (this.first && this.delay > 0) {
      var wt = new TL(this);
      this.first = false; this.tl = wt;
      wt.at(this.delay, function () { wt.kill(); self._go(); });
      this._run(wt);
      return;
    }
    this.first = false; this._go();
  };
  C._run = function (tl) { // start a timeline, or park it paused when a pause reason is active
    this.tl = tl;
    if (this._blocked()) { this.prev = 'running'; this.root.setAttribute('data-v7-paused', ''); this._set('paused'); }
    else { this._set('running'); tl.play(); }
  };
  C._go = function () { this._run(this.cur.tl); };
  C._end = function () { // tl.time reached length + hold
    var c = this.cur, self = this, r = this.root, n = this.cycle, last;
    c.tl.commit(); c.tl.kill(); this.cycle++;
    last = !c.loop || this.cycle >= c.max;
    if (last) {
      this.cur = this.tl = null;
      if (c.loop && c.self) { // selfExit loops end on the start look: rest on the final markup instead
        // When the root is a frame around one content child (M1), cross-fade the content inside the frame, so the
        // window never blanks: a clone of the outgoing content sits over the restored markup and fades out.
        var kid = function () { return [].filter.call(r.children, function (k) { return !k.matches('.v7-cursor,.v7-tap'); }); };
        var was = kid(), out = null;
        try { if (was.length === 1 && getComputedStyle(r).position !== 'static') out = was[0].cloneNode(true); } catch (e) {}
        r.innerHTML = this.snapshot; this.frag = null;
        try {
          var now = kid();
          if (out && now.length === 1) {
            if (out.id) out.removeAttribute('id');
            [].forEach.call(out.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
            out.style.position = 'absolute'; out.style.inset = '0 0 auto 0'; out.style.margin = '0'; out.style.pointerEvents = 'none';
            r.insertBefore(out, now[0].nextSibling);
            var xo = out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
            xo.onfinish = xo.oncancel = function () { if (out.parentNode) out.parentNode.removeChild(out); };
            this.fx = now[0].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
            this.fx.oncancel = function () { try { xo.cancel(); } catch (e) {} };
          } else this.fx = r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
        } catch (e) {}
      }
      cursorOff(r, this, true); // a finished screen does not keep a cursor parked on its last button
      this._set('done');
      this._emit('end', { cycle: n, done: true });
      return;
    }
    this._emit('end', { cycle: n, done: false });
    if (this.cur !== c) return; // a listener took over (restart/toFinal)
    this.cur = null;
    if (c.self) { r.innerHTML = this.snapshot; this.frag = null; if (!this._prep()) { this._fail(); return; } this._go(); return; }
    var xt = new TL(this); // fade out, restore + re-arm, fade in, next cycle
    this.tl = xt;
    xt.anim(r, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
    xt.at(240, function () {
      r.innerHTML = self.snapshot; self.frag = null;
      if (!self._prep()) { self._fail(); return; }
      xt.anim(r, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out', fill: 'both' });
    });
    xt.at(480, function () { xt.kill(); if (self.cur) self._go(); });
    this._run(xt);
  };
  C._watch = function () {
    if (this.w || this.play_ === 'host' || V7.static || !this.def) return;
    var self = this, fig = this.root.closest('.v7-figure') || this.root;
    this.w = V7.observe(fig, { enter: this.th, leave: Math.min(.15, this.th) }, function (v) { if (v) self.resume('offscreen'); else self.pause('offscreen'); });
  };
  // public controller API (pause/resume without a reason use 'host', the reason play() clears)
  C.play = function () { delete this.R.host; this._sync(); return this; };
  C.pause = function (r) { this.R[r || 'host'] = 1; this._sync(); return this; };
  C.resume = function (r) { delete this.R[r || 'host']; this._sync(); return this; };
  C.reasons = function () { return Object.keys(this.R); };
  C.restart = function (o) {
    if (!this.def) return this;
    if (V7.static) return this.toFinal();
    if (o) this.extra = Object.assign({}, o);
    delete this.R.host; delete this.R.user;
    this._restore(); this.cycle = 0; this.first = false;
    this.root.removeAttribute('data-v7-paused');
    if (!this._prep()) { this._fail(); return this; }
    this.state = ''; this._set('armed'); this._sync();
    return this;
  };
  C.toFinal = function () {
    this._restore(); this.root.removeAttribute('data-v7-paused');
    this.state = ''; this._set('final'); cursorOff(this.root, this, false);
    return this;
  };
  C.on = function (n, f) { if (typeof f === 'function') (this.L[n] || (this.L[n] = [])).push(f); return this; };
  C.off = function (n, f) { if (this.L[n]) rmA(this.L[n], f); return this; };

  // V7.get never returns null: a missing mock yields an inert controller, so page code cannot throw on absent markup
  var NOOP = { id: '', root: null, state: 'final', cycle: 0, R: {}, def: null, noop: true };
  ['play', 'pause', 'resume', 'restart', 'toFinal', 'on', 'off'].forEach(function (k) { NOOP[k] = function () { return NOOP; }; });
  NOOP.reasons = function () { return []; };
  V7.get = function (el) {
    if (typeof el === 'string') el = d.querySelector(el);
    if (!el || el.nodeType !== 1) return NOOP;
    var r = el.hasAttribute('data-v7-mock') ? el : (el.closest('[data-v7-mock]') || el.querySelector('[data-v7-mock]'));
    if (!r) return NOOP;
    if (r.__v7) return r.__v7;
    var c = r.__v7 = new Ctrl(r);
    CTRLS.push(c); c._mount();
    if (watching) c._watch();
    return c;
  };
  V7.all = function () { return CTRLS.slice(); };
  V7.ready = function (f) { if (typeof f !== 'function') return; if (phase > 1) runReady(f); else READY.push(f); };
  function runReady(f) { try { f(V7); } catch (e) { report('ready', e); } }
  V7.emit = function (el, name, det) { try { (el || d).dispatchEvent(new CustomEvent(name, { bubbles: true, detail: det })); } catch (e) {} };
  V7.navTo = function (el, key, title) {
    var app = el && el.closest && (el.closest('.v7-app') || el.querySelector('.v7-app'));
    if (!app) return;
    app.querySelectorAll('.v7-nav-item').forEach(function (n) { if (n.getAttribute('data-nav') === key) n.setAttribute('data-active', ''); else n.removeAttribute('data-active'); });
    var t = title != null && app.querySelector('.v7-app-title');
    if (t) t.textContent = title;
  };

  /* ---------- shared IntersectionObserver with hysteresis ---------- */
  var IO = null;
  function onIO(list) {
    list.forEach(function (en) {
      var recs = en.target.__v7o, vh = (en.rootBounds && en.rootBounds.height) || w.innerHeight, r = 0;
      if (!recs) return;
      if (en.isIntersecting) r = Math.max(en.intersectionRatio, vh ? en.intersectionRect.height / vh : 0); // tall elements count as visible when they fill the view
      recs.slice().forEach(function (k) {
        var on = k.enter <= 0 ? en.isIntersecting : r >= k.enter, off = k.enter <= 0 ? !en.isIntersecting : r < k.leave;
        if (on && k.v !== true) { k.v = true; try { k.cb(true, r); } catch (e) { report('observe', e); } }
        else if (off && k.v !== false) { k.v = false; try { k.cb(false, r); } catch (e) { report('observe', e); } }
      });
    });
  }
  V7.observe = function (el, o, cb) {
    if (typeof o === 'function') { cb = o; o = {}; }
    o = o || {};
    if (!el || typeof cb !== 'function') return function () {};
    var en = dv(o.enter, .35), k = { enter: en, leave: Math.min(dv(o.leave, .15), en), cb: cb, v: null };
    (el.__v7o || (el.__v7o = [])).push(k);
    if (!('IntersectionObserver' in w)) { setTimeout(function () { k.v = true; cb(true, 1); }, 0); return function () {}; }
    if (!IO) {
      var th = [0, .01, .02]; for (var i = 1; i <= 20; i++) th.push(i / 20);
      IO = new IntersectionObserver(onIO, { threshold: th });
    }
    IO.unobserve(el); IO.observe(el); // re-observing delivers a fresh initial entry for the new record
    return function () { if (el.__v7o) { rmA(el.__v7o, k); if (!el.__v7o.length && IO) IO.unobserve(el); } };
  };

  /* ---------- keyframe helpers ---------- */
  var IT = !!(w.CSS && CSS.supports && CSS.supports('translate', '1px 1px') && CSS.supports('scale', '1 1'));
  function tr(x, y) { return IT ? { translate: x + ' ' + y } : { transform: 'translate(' + x + ',' + y + ')' }; }
  function sc(x, y) { y = y == null ? x : y; return IT ? { scale: x + ' ' + y } : { transform: 'scale(' + x + ',' + y + ')' }; }
  function kf(a, b) { return Object.assign({}, a, b); }
  function tv(el, name) { try { return getComputedStyle(el).getPropertyValue(name).trim(); } catch (e) { return ''; } }
  function rgba(c, a) {
    var m, s = String(c || '').trim();
    if ((m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
      var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
      return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean), al = p.length > 3 ? parseFloat(p[3]) * (p[3].indexOf('%') > 0 ? .01 : 1) : 1;
      return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + (al * a) + ')';
    }
    return a ? s : 'transparent';
  }
  function soft(el, tone) { return tv(el, '--m-' + tone + '-soft') || tv(el, '--m-sunken') || 'rgba(127,127,127,.15)'; }
  function rel(host, t, fx, fy) { // a point of t, in host's unscaled padding-box coordinates
    var h = host.getBoundingClientRect(), r = t.getBoundingClientRect(),
      sx = host.offsetWidth ? h.width / host.offsetWidth : 1, sy = host.offsetHeight ? h.height / host.offsetHeight : 1;
    return { x: (r.left - h.left + r.width * fx) / (sx || 1) - host.clientLeft, y: (r.top - h.top + r.height * fy) / (sy || 1) - host.clientTop };
  }
  function kid(host, cls) {
    for (var i = host.children.length - 1; i >= 0; i--) if (host.children[i].classList.contains(cls)) return host.children[i];
    return host.querySelector('.' + cls);
  }

  /* ---------- primitives (§3.6): all take tl first; tl may be null for an instant end state ---------- */
  V7.off = function (x) { els(x).forEach(function (e) { e.setAttribute('data-v7-off', ''); }); };
  V7.on = function (x) { els(x).forEach(function (e) { e.removeAttribute('data-v7-off'); e.removeAttribute('data-v7-gone'); }); };
  V7.gone = function (x) { els(x).forEach(function (e) { e.setAttribute('data-v7-gone', ''); }); };
  V7.collapse = function (x) { els(x).forEach(function (e) { e.setAttribute('data-v7-collapsed', ''); }); };
  V7.shrink = function (x, axis) { els(x).forEach(function (e) { e.setAttribute('data-v7-shrunk', axis === 'x' ? 'x' : 'y'); }); };
  V7.clip = function (x) { els(x).forEach(function (e) { e.setAttribute('data-v7-clip', ''); }); };
  V7.undraw = function (x) { els(x).forEach(function (e) { e.setAttribute('data-v7-undrawn', ''); }); };

  V7.show = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-off'); el.removeAttribute('data-v7-gone');
      if (!tl || !shown(el)) return null;
      return tl.anim(el, [kf({ offset: 0, opacity: 0 }, tr((+o.x || 0) * V7.dir(el) + 'px', dv(o.y, 8) + 'px'))],
        { duration: dv(o.duration, 240), easing: o.easing || 'out', fill: 'backwards' });
    });
  });
  V7.hide = many(function (tl, el, o) {
    return later(tl, o, function () {
      if (!tl || !shown(el)) { el.setAttribute('data-v7-off', ''); return null; }
      var a = tl.anim(el, [kf({ offset: 1, opacity: 0 }, tr('0px', dv(o.y, -4) + 'px'))], { duration: dv(o.duration, 160), easing: o.easing || 'ease-in', fill: 'forwards' });
      onEnd(tl, a, function () { el.setAttribute('data-v7-off', ''); if (a) try { a.cancel(); } catch (e) {} });
      return a;
    });
  });
  V7.pop = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-off'); el.removeAttribute('data-v7-gone');
      if (!tl || !shown(el)) return null;
      var D = dv(o.duration, 260);
      tl.anim(el, [{ offset: 0, opacity: 0 }], { duration: Math.round(D * .6), easing: 'ease-out', fill: 'backwards' });
      return tl.anim(el, [kf({ offset: 0 }, sc(dv(o.from, .9)))], { duration: D, easing: 'pop', fill: 'backwards' });
    });
  });
  V7.insert = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-gone'); el.removeAttribute('data-v7-collapsed'); el.removeAttribute('data-v7-off');
      if (!tl || !shown(el)) return null;
      el.setAttribute('data-v7-moving', '');
      var a = tl.anim(el, [{ offset: 0, gridTemplateRows: '0fr', opacity: 0 }, { offset: 1, gridTemplateRows: '1fr', opacity: 1 }], { duration: dv(o.duration, 280), easing: o.easing || 'out', fill: 'backwards' });
      onEnd(tl, a, function () { el.removeAttribute('data-v7-moving'); });
      return a;
    });
  });
  V7.remove = many(function (tl, el, o) {
    return later(tl, o, function () {
      if (!tl || !shown(el)) { el.setAttribute('data-v7-gone', ''); return null; }
      el.setAttribute('data-v7-moving', '');
      var a = tl.anim(el, [{ offset: 0, gridTemplateRows: '1fr', opacity: 1 }, { offset: 1, gridTemplateRows: '0fr', opacity: 0 }], { duration: dv(o.duration, 220), easing: o.easing || 'inOut', fill: 'forwards' });
      onEnd(tl, a, function () { el.setAttribute('data-v7-gone', ''); el.removeAttribute('data-v7-moving'); if (a) try { a.cancel(); } catch (e) {} });
      return a;
    });
  });

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function finalHTML(tl, el, text) { // the snapshot markup of el, when it has inner spans (M1 highlights)
    var c = tl && tl.ctrl, k = el.children, n = norm(text), cl, path = [], e = el, node, i;
    if (k.length && !(k.length === 1 && k[0].classList.contains('v7-caret')) && norm(el.textContent) === n) {
      cl = el.cloneNode(true); cl.querySelectorAll('.v7-caret').forEach(rmEl); return cl.innerHTML;
    }
    if (!c) return null;
    while (e && e !== c.root) { if (!e.parentElement) return null; path.unshift(Array.prototype.indexOf.call(e.parentElement.children, e)); e = e.parentElement; }
    if (e !== c.root) return null;
    if (!c.frag) { var t = d.createElement('template'); t.innerHTML = c.snapshot; c.frag = t.content; }
    for (node = c.frag, i = 0; node && i < path.length; i++) node = node.children[path[i]];
    return node && node.tagName === el.tagName && node.children.length && norm(node.textContent) === n ? node.innerHTML : null;
  }
  V7.type = function (tl, el, text, o) {
    o = o || {};
    if (!el) return null;
    text = text == null ? el.textContent : String(text);
    return later(tl, o, function () {
      var fin = o.html != null ? o.html : finalHTML(tl, el, text), car = null, tn = d.createTextNode(''), n = text.length, cum = [], tot = 0, i, k = 0;
      el.textContent = ''; el.appendChild(tn);
      if (o.caret !== false) { car = d.createElement('span'); car.className = 'v7-caret'; el.appendChild(car); }
      for (i = 0; i < n; i++) { tot += (i && /[,.;:]/.test(text[i - 1]) ? 4 : 1) * (1 + (((i * 37) % 21) - 10) / 50); cum.push(tot); }
      var end = function () {
        if (fin) el.innerHTML = fin; else tn.data = text;
        if (car) { el.appendChild(car); if (tl && !tl.dead) tl.after(400, function () { rmEl(car); }); else rmEl(car); }
      };
      if (!tl || !n || !shown(el)) { end(); return null; }
      return tl.tween(dv(o.duration, Math.max(300, n * 40)), 'linear', function (p) {
        var lim = p * tot + 1e-6, j = k;
        while (j < n && cum[j] <= lim) j++;
        if (j !== k) { k = j; tn.data = text.slice(0, k); }
      }, end);
    });
  };
  V7.untype = function (tl, el, o) {
    o = o || {};
    if (!el) return null;
    return later(tl, o, function () {
      var car = el.querySelector('.v7-caret'), full = el.textContent, tn = d.createTextNode(full);
      el.textContent = ''; el.appendChild(tn);
      if (car) el.appendChild(car);
      if (!tl || !shown(el)) { tn.data = ''; return null; }
      return tl.tween(dv(o.duration, 500), 'linear', function (p) { tn.data = full.slice(0, Math.round(full.length * (1 - p))); });
    });
  };
  var NF = {};
  function nf(dec) {
    var l = H.lang || 'en', key = l + dec;
    if (!NF[key]) try { NF[key] = new Intl.NumberFormat(l, { minimumFractionDigits: dec, maximumFractionDigits: dec }); } catch (e) { NF[key] = { format: function (v) { return v.toFixed(dec); } }; }
    return NF[key];
  }
  V7.count = function (tl, el, o) {
    o = o || {};
    if (!el) return null;
    return later(tl, o, function () {
      var f = +o.from || 0, t = +o.to, dec = o.decimals | 0, F = nf(dec),
        set = function (v) { el.textContent = (o.prefix || '') + F.format(Math.abs(v) < Math.pow(10, -dec) / 2 ? 0 : v) + (o.suffix || ''); };
      if (isNaN(t)) t = parseFloat(String(el.textContent).replace(/[^\d.\-]/g, '')) || 0;
      if (!tl || !shown(el)) { set(t); return null; }
      set(f);
      return tl.tween(dv(o.duration, 900), V7.ease.outCubic, function (p) { set(f + (t - f) * p); }, function () { set(t); });
    });
  };
  V7.roll = function (tl, el, text, o) {
    o = o || {};
    if (!el) return null;
    if (el.classList.contains('v7-pill') || el.classList.contains('v7-fbtn')) el = lbl(el); // roll the label, keep the dot and icons
    return later(tl, o, function () {
      var D = dv(o.duration, 240), d1 = Math.round(D * .4), swap = function () { if (o.html) el.innerHTML = text; else el.textContent = text; };
      if (!tl || !shown(el)) { swap(); return null; }
      var a = tl.anim(el, [kf({ offset: 1, opacity: 0 }, tr('0px', '-60%'))], { duration: d1, easing: 'in', fill: 'forwards' });
      onEnd(tl, a, function () {
        swap(); if (a) try { a.cancel(); } catch (e) {}
        tl.anim(el, [kf({ offset: 0, opacity: 0 }, tr('0px', '60%'))], { duration: D - d1, easing: 'out', fill: 'backwards' });
      });
      return a;
    });
  };
  function lbl(p) { // wraps a pill's or fake button's text in span.v7-lbl (inline-block) so it can roll without moving the dot or icon
    var l = p.querySelector('.v7-lbl');
    if (l) return l;
    l = d.createElement('span'); l.className = 'v7-lbl';
    var mv = Array.prototype.filter.call(p.childNodes, function (n) { return !(n.nodeType === 1 && (n.tagName.toLowerCase() === 'svg' || n.classList.contains('v7-ic'))); });
    if (mv.length) p.insertBefore(l, mv[0]); else p.appendChild(l);
    mv.forEach(function (n) { l.appendChild(n); });
    return l;
  }
  V7.status = function (tl, p, tone, text, o) {
    o = o || {};
    if (!p) return null;
    return later(tl, o, function () {
      if (tone) p.setAttribute('data-tone', tone);
      if (text != null) V7.roll(tl, p, text, { duration: o.duration });
      if (!tl || !shown(p)) return null;
      var c = soft(p, tone || 'neutral');
      return tl.anim(p, [{ boxShadow: '0 0 0 0 ' + rgba(c, 1) }, { boxShadow: '0 0 0 6px ' + rgba(c, 0) }], { duration: 600, easing: 'out', fill: 'none' });
    });
  };
  V7.flash = many(function (tl, el, o) { // a soft tone wash painted over the element's own background
    return later(tl, o, function () {
      if (!tl || !shown(el)) return null;
      var c = soft(el, o.tone || 'you'), sh = getComputedStyle(el).boxShadow, sp = Math.ceil(Math.max(el.offsetWidth, el.offsetHeight)) + 'px';
      sh = sh && sh !== 'none' ? ', ' + sh : '';
      return tl.anim(el, [{ boxShadow: 'inset 0 0 0 ' + sp + ' ' + rgba(c, 1) + sh }, { boxShadow: 'inset 0 0 0 ' + sp + ' ' + rgba(c, 0) + sh }],
        { duration: dv(o.duration, 1200), easing: o.easing || 'ease-in', fill: 'none' });
    });
  });
  V7.bar = function (tl, fill, to, o) {
    o = o || {};
    if (!fill) return null;
    to = +to || 0;
    return later(tl, o, function () {
      var cur = parseFloat(tv(fill, '--v')), set = function () { fill.style.setProperty('--v', to); };
      if (isNaN(cur)) cur = 0;
      if (!tl || !shown(fill)) { set(); return null; }
      var a = tl.anim(fill, [{ transform: 'scaleX(' + cur + ')' }, { transform: 'scaleX(' + to + ')' }], { duration: dv(o.duration, 900), easing: o.easing || 'out', fill: 'forwards' });
      onEnd(tl, a, function () { set(); if (a) try { a.cancel(); } catch (e) {} });
      return a;
    });
  };
  V7.grow = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-shrunk');
      if (!tl || !shown(el)) return null;
      var x = o.axis === 'x', f = o.from || 'start', og;
      if (f === 'center') og = 'center center';
      else if (x) og = ((f === 'end') !== (V7.dir(el) < 0) ? 'right' : 'left') + ' center';
      else og = f === 'end' ? 'center bottom' : 'center top';
      return tl.anim(el, [kf({ transformOrigin: og }, x ? sc(0, 1) : sc(1, 0)), kf({ transformOrigin: og }, sc(1, 1))], { duration: dv(o.duration, 200), easing: o.easing || 'out', fill: 'backwards' });
    });
  });
  V7.wipe = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-clip'); el.style.clipPath = '';
      if (!tl || !shown(el)) return null;
      var f = +o.from || 0;
      return tl.anim(el, [{ clipPath: 'inset(0 ' + (100 - f) + '% 0 ' + f + '%)' }, { clipPath: 'inset(0 0% 0 ' + f + '%)' }], { duration: dv(o.duration, 900), easing: o.easing || 'out', fill: 'backwards' });
    });
  });
  V7.draw = many(function (tl, el, o) {
    return later(tl, o, function () {
      el.removeAttribute('data-v7-undrawn');
      if (!tl || !shown(el)) return null;
      return tl.anim(el, [{ strokeDasharray: '1 2', strokeDashoffset: '1.01' }, { strokeDasharray: '1 2', strokeDashoffset: '0' }], { duration: dv(o.duration, 300), easing: o.easing || 'out', fill: 'backwards' });
    });
  });

  var TIP = [3.75, 2.25]; // arrow tip of i-cursor at 18px
  function hostOf(x) { return x && x.closest ? (x.closest('.v7-cursor-host') || x.querySelector('.v7-cursor-host')) : null; }
  function cursorOf(host) { var c = host && kid(host, 'v7-cursor'); return c && c.closest('.v7-cursor-host') === host ? c : null; }
  // The cursor is rendered only on hosts at least 560px wide with a fine pointer (CSS hides it on coarse pointers and narrow M0 shells).
  V7.hasCursor = function (x) { var h = hostOf(x), c = cursorOf(h); return !!(c && shown(c) && h.clientWidth >= 560); };
  function cursorOff(root, ctrl, fade) { // hide the cursor this controller moved last (T1's handoff takes ownership with its own timeline)
    var cur = cursorOf(hostOf(root)), st = cur && cur.__v7;
    if (!st || (st.c && st.c !== ctrl)) return;
    cur.__v7 = null;
    if (fade && st.on && shown(cur)) { try { cur.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' }); } catch (e) {} }
    cur.removeAttribute('data-v7-on');
  }
  function setXY(cur, x, y) { if (IT) cur.style.translate = x + 'px ' + y + 'px'; else cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  V7.cursorTo = function (tl, t, o) {
    o = o || {};
    var host = t && t.closest('.v7-cursor-host'), cur = cursorOf(host);
    if (!cur || !V7.hasCursor(host)) return null; // narrow host, coarse pointer or no cursor: taps only
    return later(tl, o, function () {
      if (!V7.hasCursor(host) || !shown(t)) return null;
      var p = rel(host, t, .55, .6), x = p.x - TIP[0], y = p.y - TIP[1], st = cur.__v7 || (cur.__v7 = { on: 0, x: 0, y: 0 }), fx = st.x, fy = st.y;
      st.c = tl ? (tl.ctrl || tl.own || null) : null; // the mover owns the cursor until someone else moves it
      if (!st.on) {
        fx = x + 26 * V7.dir(host); fy = y + 40; st.on = 1; cur.setAttribute('data-v7-on', '');
        if (tl) tl.anim(cur, [{ offset: 0, opacity: 0 }], { duration: 150, easing: 'linear', fill: 'backwards' });
      }
      st.x = x; st.y = y; setXY(cur, x, y); // the resting position lives in translate; the move animates from the old one
      return tl ? tl.anim(cur, [kf({ offset: 0 }, tr(fx + 'px', fy + 'px'))], { duration: dv(o.duration, 600), easing: o.easing || 'inOut', fill: 'backwards' }) : null;
    });
  };
  V7.cursorHide = function (tl, x, o) {
    o = o || {};
    var cur = cursorOf(hostOf(x));
    if (!cur) return null;
    return later(tl, o, function () {
      if (!cur.__v7 || !cur.__v7.on) return null;
      var a = tl && shown(cur) ? tl.anim(cur, [{ offset: 1, opacity: 0 }], { duration: dv(o.duration, 150), easing: 'linear', fill: 'forwards' }) : null;
      onEnd(tl, a, function () { if (cur.__v7) cur.__v7.on = 0; cur.removeAttribute('data-v7-on'); if (a) try { a.cancel(); } catch (e) {} });
      return a;
    });
  };
  V7.tap = function (tl, t, o) {
    o = o || {};
    if (!t) return null;
    return later(tl, o, function () {
      if (!tl || !shown(t)) return null;
      var host = t.closest('.v7-cursor-host'), ring = host && kid(host, 'v7-tap'), cur = cursorOf(host), on = cur && cur.__v7 && cur.__v7.on && shown(cur), p;
      tl.anim(t, [sc(1), kf({ offset: .4 }, sc(.96)), sc(1)], { duration: 200, easing: 'ease-out', fill: 'none' });
      if (on) tl.anim(cur, [sc(1), kf({ offset: .4 }, sc(.86)), sc(1)], { duration: 220, easing: 'ease-out', fill: 'none' });
      if (!ring) return null;
      p = on ? { x: cur.__v7.x + TIP[0], y: cur.__v7.y + TIP[1] } : rel(host, t, .5, .5); // ring under the arrow tip when the cursor is shown
      ring.style.left = (p.x - 16) + 'px'; ring.style.top = (p.y - 16) + 'px';
      return tl.anim(ring, [kf({ opacity: .35 }, sc(.4)), kf({ opacity: 0 }, sc(1.4))], { duration: 360, easing: 'out', fill: 'none' });
    });
  };
  function place(dot, op, cx, cy) { // put dot's centre at (cx, cy) of its offsetParent, correcting for its own margins and transforms
    var s = dot.style, L = cx - dot.offsetWidth / 2, T = cy - dot.offsetHeight / 2, c;
    s.right = s.bottom = 'auto'; s.left = L + 'px'; s.top = T + 'px';
    c = rel(op, dot, .5, .5);
    if (Math.abs(c.x - cx) > .5 || Math.abs(c.y - cy) > .5) { s.left = (L + cx - c.x) + 'px'; s.top = (T + cy - c.y) + 'px'; }
  }
  V7.place = function (dot, t) { var op = dot && t && dot.offsetParent; if (op) { var c = rel(op, t, .5, .5); place(dot, op, c.x, c.y); } };
  V7.travel = function (tl, dot, from, to, o) {
    o = o || {};
    if (!dot || !to) return null;
    return later(tl, o, function () {
      var op = dot.offsetParent;
      if (!op || !shown(to)) return null;
      var a = from ? rel(op, from, .5, .5) : rel(op, dot, .5, .5), b = rel(op, to, .5, .5);
      if (dot.__v7t) { try { dot.__v7t.cancel(); } catch (e) {} }
      place(dot, op, b.x, b.y);
      if (!tl) return null;
      return (dot.__v7t = tl.anim(dot, [kf({ offset: 0 }, tr((a.x - b.x) + 'px', (a.y - b.y) + 'px'))], { duration: dv(o.duration, 700), easing: o.easing || 'inOut', fill: 'backwards' }));
    });
  };
  V7.flip = function (tl, x, mutate, o) {
    o = o || {};
    var L = els(x);
    return later(tl, o, function () {
      var A = L.map(function (e) { return e.getBoundingClientRect(); });
      try { if (mutate) mutate(); } catch (e) { report('flip', e); }
      if (!tl) return [];
      return L.map(function (e, i) {
        var r = e.getBoundingClientRect(), s = (e.offsetWidth ? r.width / e.offsetWidth : 1) || 1, dx = (A[i].left - r.left) / s, dy = (A[i].top - r.top) / s;
        if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return null;
        return tl.anim(e, [kf({ offset: 0 }, tr(dx + 'px', dy + 'px'))], { duration: dv(o.duration, 800), easing: o.easing || 'inOut', fill: 'backwards' });
      });
    });
  };

  /* ---------- pause buttons (§3.4) ---------- */
  var PL = HE ? { pause: 'השהיית האנימציה', play: 'הפעלת האנימציה', replay: 'הפעלה חוזרת של האנימציה' }
    : { pause: 'Pause animation', play: 'Play animation', replay: 'Replay animation' };
  function bindPause(b, c) {
    if (!b || b.__v7) return;
    if (!c) { var fig = b.closest('.v7-figure'), root = fig && fig.querySelector('[data-v7-mock]'); c = root && V7.get(root); }
    if (!c) return;
    b.__v7 = c;
    if (!b.getAttribute('type')) b.setAttribute('type', 'button');
    b.removeAttribute('aria-pressed'); // the label says what a press does (Pause / Play / Replay); a pressed state would contradict it
    if (!b.querySelector('use')) b.innerHTML = '<svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg>';
    var sync = function () {
      var st = c.state, k = 'pause', label = PL.pause;
      b.hidden = st === 'final' || !c.def;
      if (st === 'done') { k = 'replay'; label = PL.replay; }
      else if (c.R.user) { k = 'play'; label = PL.play; }
      b.setAttribute('aria-label', label);
      var u = b.querySelector('use'); if (u) u.setAttribute('href', '#i-' + k);
    };
    c.on('state', sync); sync();
    b.addEventListener('click', function () {
      if (c.state === 'done') c.restart(); else if (c.R.user) c.resume('user'); else c.pause('user');
      sync();
    });
  }
  V7.bindPause = bindPause;

  /* ---------- reveal (§3.7) ---------- */
  var RIO = null;
  // Hero copy reveals with CSS keyframes at first paint (C1.css), before this script runs; JS only marks it in.
  function heroCopy(e) { return !!e.closest('.v7-hero') && !e.closest('.v7-figure'); }
  function rprep(scope) {
    var S = scope || d;
    V7.$$(S, '[data-v7-stagger]').forEach(function (p) {
      var s = parseFloat(p.getAttribute('data-v7-stagger')) || 0, i = 0;
      Array.prototype.forEach.call(p.children, function (k) { if (k.hasAttribute('data-v7-reveal')) { k.style.setProperty('--v7-stagger', s + 'ms'); k.style.setProperty('--v7-i', i); k.__v7d = i++ * s; } });
    });
    V7.$$(S, '[data-v7-delay]').forEach(function (e) { e.style.setProperty('--v7-delay', (parseFloat(e.getAttribute('data-v7-delay')) || 0) + 'ms'); });
    V7.$$(S, '[data-v7-reveal=mask]').forEach(function (e) { V7.$$(e, '.v7-line').forEach(function (l, i) { l.style.setProperty('--v7-li', i); }); });
    if (!V7.static) V7.$$(S, '[data-v7-reveal]:not(.is-in)').forEach(function (e) {
      if (heroCopy(e)) e.classList.add('is-in'); // already animating (CSS); never animate it a second time
      else e.setAttribute('data-v7-revealing', '');
    });
  }
  function rin(e) { // .is-in, then drop the reveal transition so the element's own transitions apply again
    if (e.classList.contains('is-in')) return;
    e.classList.add('is-in');
    if (!e.hasAttribute('data-v7-revealing')) return;
    var v = e.getAttribute('data-v7-reveal'), ms = (parseFloat(e.getAttribute('data-v7-delay')) || 0) + (e.__v7d || 0) +
      (v === 'rise' ? 1000 : v === 'mask' ? 700 + 80 * e.querySelectorAll('.v7-line').length : 600) + 900; // headroom for nested effects (check draw)
    setTimeout(function () { e.removeAttribute('data-v7-revealing'); }, ms);
  }
  function rstart(scope) {
    var L = V7.$$(scope || d, '[data-v7-reveal]:not(.is-in)'), vh = w.innerHeight;
    if (V7.static || !('IntersectionObserver' in w)) { L.forEach(rin); return; }
    if (!RIO) RIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { rin(en.target); RIO.unobserve(en.target); } }); }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    // Anything that starts above the fold reveals now (with its delay and stagger): a figure whose top sits near the
    // bottom of a short viewport would otherwise never reach the threshold. Below the fold, the observer decides.
    L.forEach(function (e) { if (e.getBoundingClientRect().top < vh) rin(e); else RIO.observe(e); });
  }
  // Keyboard focus never lands on something invisible: focus reveals every pending reveal around the target at once,
  // without a transition (C1.css has a :focus-within safety net for the same case).
  function focusReveal(ev) {
    var n = ev.target && ev.target.closest ? ev.target.closest('[data-v7-reveal]') : null;
    for (; n; n = n.parentElement ? n.parentElement.closest('[data-v7-reveal]') : null) {
      if (n.classList.contains('is-in') && !n.hasAttribute('data-v7-revealing')) continue;
      n.removeAttribute('data-v7-revealing');
      n.classList.add('is-in');
      if (RIO) RIO.unobserve(n);
    }
  }
  d.addEventListener('focusin', focusReveal, true);
  V7.reveal = function (scope) { rprep(scope); if (phase > 2) rstart(scope); };

  /* ---------- live preference change, tab visibility ---------- */
  function goStatic() {
    if (V7.static && !H.classList.contains('v7-motion')) return;
    H.classList.remove('v7-motion'); V7.static = true;
    CTRLS.forEach(function (c) { c.toFinal(); });
    V7.$$(d, '[data-v7-reveal]').forEach(function (e) { e.classList.add('is-in'); e.removeAttribute('data-v7-revealing'); });
    V7.emit(d, 'v7:static', {}); // S1 drops to stacked, T1 stops autoplay, K1 and page timelines settle
  }
  if (RMQ) {
    var onRM = function (e) { if (e.matches) goStatic(); };
    if (RMQ.addEventListener) RMQ.addEventListener('change', onRM); else if (RMQ.addListener) RMQ.addListener(onRM);
  }
  d.addEventListener('visibilitychange', function () { var h = d.hidden; CTRLS.forEach(function (c) { if (h) c.pause('tab'); else c.resume('tab'); }); });

  /* ---------- boot hooks, called in order by ZZ-boot.js (§3.8) ---------- */
  V7._boot = {
    gate: function () { H.classList.add('v7-ready'); V7.static = !H.classList.contains('v7-motion'); phase = 1; },
    mount: function () {
      V7.$$(d, '[data-v7-mock]').forEach(function (r) { try { V7.get(r); } catch (e) { report('mount', e); } });
      // Late boot: a mock the visitor already saw in its final look fades in from its start state, without a jump
      if (V7.late && !V7.static) V7.$$(d, '[data-v7-mock]').forEach(function (r) {
        if (r.__v7late && r.animate) try { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' }); } catch (e) {}
      });
      rprep();
      // Keyframe loops (live dot, caret, thinking dots) pause while their figure is off screen (C1.css)
      if (!V7.static) V7.$$(d, '.v7-figure').forEach(function (f) {
        V7.observe(f, { enter: 0 }, function (v) { if (v) f.removeAttribute('data-v7-offscreen'); else f.setAttribute('data-v7-offscreen', ''); });
      });
    },
    init: function () { V7.$$(d, '.v7-pause').forEach(function (b) { bindPause(b); }); phase = 2; READY.splice(0).forEach(runReady); },
    fonts: function (cb) {
      var n = 0, go = function () { if (!n++) cb(); };
      try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(go, go); } catch (e) {}
      setTimeout(go, 600);
    },
    watch: function () { phase = 3; watching = 1; rstart(); CTRLS.forEach(function (c) { c._watch(); }); }
  };
  // Safety net: if a later part throws at load and boot never runs, fail open to the final state.
  function net() { setTimeout(function () { if (!V7.booted) { report('boot', 'v7 boot did not run; showing the final state'); H.classList.remove('v7-motion'); V7.static = true; } }, 50); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', net); else net();
})();
// <<< C1
;
// >>> M0 v7-app shell (spec §6 M0). The shell has no timeline; navTo lives in C1.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  function appOf(el) { return el && el.closest ? (el.closest('.v7-app') || (el.querySelector ? el.querySelector('.v7-app') : null)) : null; }
  // 'none' (< 560px), 'rail' (560–879px) or 'full' (≥ 880px): the same bands as the container queries in M0.css.
  V7.shellMode = function (el) {
    var app = appOf(el), w = app ? app.clientWidth : 0;
    return !app ? '' : w < 560 ? 'none' : w < 880 ? 'rail' : 'full';
  };
  // A shell without an active nav item takes it (and its title) from its first screen's data-nav / data-title.
  V7.ready(function () {
    V7.$$(document, '.v7-app').forEach(function (app) {
      if (app.querySelector('.v7-nav-item[data-active]')) return;
      var s = app.querySelector('.v7-screen[data-nav]');
      if (s) V7.navTo(app, s.getAttribute('data-nav'), s.getAttribute('data-title'));
    });
  });
})();
// <<< M0
;
// >>> M1 m-hero hero composite (spec §6 M1) + hero stepper sync (spec §4 H1, Industries spec §2)
// The window always shows a structured app: while a goal is being set, the chips, the flows card and the track card
// hold static placeholders, and each goal builds into them in place (it never clears to an empty canvas).
// Goals come from <script type="application/json" class="m-hero-data"> inside the figure when present (industry pages,
// format in README §8); otherwise the built-in G1–G3 below play (homepage). The markup is always the first goal, final.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  // UI strings by page language (<html lang>). Hebrew pages carry their goals as data (M1.he.html, M1.<industry>.he.html).
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
  var TX = HE ? { checking: 'בודק…', building: 'Mate בונה את התהליכים', built: function (n) { return 'Mate בנה ' + n + ' שלבים'; },
    risk: 'בסיכון', ok: 'כמתוכנן', approve: 'אישור', approved: 'אושר על ידיכם' }
    : { checking: 'Checking…', building: 'Mate is building the flows', built: function (n) { return 'Mate built ' + n + ' steps'; },
    risk: 'At risk', ok: 'On track', approve: 'Approve', approved: 'Approved by you' };

  /* Sparkline: six weekly points on a 120×28 box, y = 26 - .24 × value (G1 reproduces the spec path exactly). */
  var SX = [2, 25.2, 48.4, 71.6, 94.8, 118];
  function sy(v) { return Math.round((26 - .24 * v) * 10) / 10; }
  function spark(vals) { return vals.map(function (v, i) { return (i ? 'L' : 'M') + SX[i] + ' ' + sy(v); }).join(' '); }
  function hl(k, s) { return '<span class="m-hero-hl" data-k="' + k + '">' + s + '</span>'; }

  // Three sample goals (spec §6 M1 data table). G1 is also the shipped final markup.
  var G = [
    {
      text: 'Get 90% of quotes out within 4 hours by January 15.',
      html: 'Get ' + hl('target', '90%') + ' of ' + hl('metric', 'quotes out within 4 hours') + ' by ' + hl('date', 'January 15') + '.',
      chips: ['Quotes out within 4 h', '6% at start', '90% by Jan 15'],
      nodes: [['trigger', 'mail', 'Request in', 'Mailbox'], ['mate', 'db', 'Read and match', 'ERP, read-only'], ['mate', 'db', 'Check stock', 'ERP, read-only'],
        ['rule', 'rules', 'Price', 'Rule: max 10%'], ['mate', 'doc', 'Draft quote', 'Mate'], ['person', 'person', 'Approve', 'Dana K.'], ['action', 'send', 'Send and log', 'Mailbox']],
      name: 'Quotes out within 4 h', week: 'Week 5 of 10', val: 51, base: .06, target: .9, sp: [6, 8, 19, 33, 44, 51]
    },
    {
      text: 'Answer every rep’s price question in under a minute.',
      html: 'Answer every rep’s ' + hl('metric', 'price question in under a minute') + '.',
      chips: ['Price answers under 1 min', '12% at start', '95% by Feb 1'],
      nodes: [['trigger', 'chat', 'Rep asks', 'WhatsApp'], ['mate', 'db', 'Find customer and item', 'ERP, read-only'], ['mate', 'db', 'Price list and terms', 'ERP, read-only'],
        ['rule', 'rules', 'Discount rule', 'max 10%'], ['mate', 'chat', 'Answer with source', 'WhatsApp'], ['person', 'person', 'Over the limit?', 'Manager approves']],
      name: 'Price answers under 1 min', week: 'Week 3 of 8', val: 68, base: .12, target: .95, sp: [12, 30, 45, 56, 63, 68]
    },
    {
      text: 'Draft claim letters the same day the file is complete.',
      html: 'Draft ' + hl('metric', 'claim letters the same day') + ' the file is complete.',
      chips: ['Letters drafted same day', '18% at start', '85% by Mar 1'],
      nodes: [['trigger', 'doc', 'File complete', 'Claims system'], ['mate', 'doc', 'Read the medical file', 'Mate'], ['mate', 'doc', 'Summarize the case', 'Mate'],
        ['rule', 'rules', 'Pick letter type', 'Rule'], ['mate', 'doc', 'Draft letter', 'Mate'], ['person', 'person', 'Adjuster approves', 'Person']],
      name: 'Letters drafted same day', week: 'Week 4 of 12', val: 44, base: .18, target: .85, sp: [18, 25, 33, 38, 41, 44], risk: true,
      fc: 'Forecast <bdi>71% → 87%</bdi> by Mar 1'
    }
  ];
  var MAXN = 7;
  // Placeholder bar widths (px): chip values, header status, step titles, track name / week / value
  var SK = { chips: [96, 52, 76], fstat: 136, rows: [76, 104, 88, 60, 92, 70, 96], name: 116, week: 72, val: 52 };
  // Times inside one goal (ms from its start). Typing starts at 200 and lasts 1000; Enter 1350; 'flows' 1800; 'track' 2900.
  var T = { ph: 60, type: 200, typeDur: 1000, enter: 1350, hl: 1450, flows: 1800, row0: 1900, step: 90, xf: 180, track: 2900,
    fill: 3050, status: 4000, dot: 4300, back: 260, untype: 400 };
  // Per goal: when it steps back to placeholders (exit: 7700 on track, 8700 at risk, or the goal's own "exit") and its
  // full length (exit + 700); the next goal types 200ms after its start.
  function exitAt(g) { return g.exit > 0 ? g.exit : g.risk ? 8700 : 7700; }
  function bar(w, cls) { return '<i class="m-hero-skb' + (cls ? ' ' + cls : '') + '" style="--w:' + w + 'px"></i>'; }

  /* Goal data from the page (README §8). Parsed once per figure; a bad set throws, so C1 logs [V7] M1 and the figure
     rests on its final markup (the first goal). */
  var KINDS = { trigger: 1, mate: 1, rule: 1, person: 1, action: 1 }, HK = ['metric', 'target', 'date'];
  // weekly progress shapes (fraction of the way from baseline to value): G1's climb, and G3's flattening (at risk)
  var SHAPE = { ok: [0, .044, .289, .6, .844, 1], risk: [0, .269, .577, .769, .885, 1] };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bad(m) { throw new Error('M1 data: ' + m); }
  function marks(text, h) { // the typed text with its highlight phrases wrapped in spans (text order; missing phrase = error)
    var m = [], out = '', at = 0;
    HK.forEach(function (k) {
      var p = h && h[k], i;
      if (!p) return;
      if ((i = text.indexOf(p)) < 0) bad('highlight "' + p + '" is not in "' + text + '"');
      m.push([i, i + p.length, k]);
    });
    m.sort(function (a, b) { return a[0] - b[0]; });
    m.forEach(function (x) { if (x[0] < at) return; out += esc(text.slice(at, x[0])) + hl(x[2], esc(text.slice(x[0], x[1]))); at = x[1]; });
    return out + esc(text.slice(at));
  }
  function nodeFrom(n) {
    var a = Array.isArray(n) ? n : [n && n.kind, n && n.icon, n && n.title, n && n.meta];
    if (!KINDS[a[0]] || !a[1] || !a[2]) bad('node needs kind (trigger|mate|rule|person|action), icon and title');
    return [String(a[0]), String(a[1]).replace(/^i-/, ''), String(a[2]), a[3] == null ? '' : String(a[3])];
  }
  // the forecast's "A% → B%" pair goes in a bdi; a Hebrew "A% ← B%" pair in an RTL bdi (it reads A, then B, in RTL)
  function fcHTML(s) {
    return /\S+\s*←\s*\S+/.test(s) ? s.replace(/(\S+\s*←\s*\S+)/, '<bdi dir="rtl">$1</bdi>') : s.replace(/(\S+\s*→\s*\S+)/, '<bdi>$1</bdi>');
  }
  function goalFrom(o) {
    var t = (o && o.track) || {}, risk = o && o.status === 'risk', N = ((o && o.nodes) || []).map(nodeFrom),
      val = +t.value, base = +t.baseline, tgt = +t.target, sp = t.spark;
    if (!o || typeof o.text !== 'string' || !o.text) bad('goal needs text');
    if (!o.chips || o.chips.length !== 3) bad('goal needs 3 chips (metric, baseline, target)');
    if (N.length < 2 || N.length > MAXN) bad('goal needs 2 to ' + MAXN + ' nodes');
    if (isNaN(val) || isNaN(base) || isNaN(tgt)) bad('track needs value (percent), baseline and target (fractions)');
    if (risk && !o.forecast) bad('a risk goal needs a forecast');
    return {
      text: o.text, html: marks(o.text, o.highlight), chips: o.chips.map(String), nodes: N,
      name: String(t.name || o.chips[0]), week: String(t.period || ''), val: val, base: base, target: tgt,
      sp: Array.isArray(sp) && sp.length === 6 ? sp.map(Number) : SHAPE[risk ? 'risk' : 'ok'].map(function (f) { return Math.round(base * 100 + (val - base * 100) * f); }),
      risk: !!risk, fc: risk ? fcHTML(esc(o.forecast)) : undefined,
      note: risk && o.note != null ? String(o.note) : undefined, exit: +o.exit || 0
    };
  }
  function goals(root) {
    var fig = root.closest && root.closest('.v7-figure'), s = fig && fig.querySelector('script.m-hero-data');
    if (!s) return G;
    if (!s.__m1) {
      var j = JSON.parse(s.textContent), L = (j && j.goals) || [];
      if (!L.length) bad('no goals');
      s.__m1 = L.map(goalFrom);
    }
    return s.__m1;
  }

  V7.define('M1', function (root, tl, opts) {
    var G = goals(root), OFF = [], EXIT = [], TOTAL = 0;
    G.forEach(function (g, i) { OFF[i] = TOTAL; EXIT[i] = exitAt(g); TOTAL += EXIT[i] + 700; });
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var inEl = q('.m-hero-in'), goal = q('.m-hero-goal'), text = q('.m-hero-text'), ph = q('.m-hero-ph'), kbd = q('.m-hero-enter .v7-kbd'),
      chips = qa('.m-hero-chips > .v7-chip'), vals = chips.map(function (c) { return c.querySelector(':scope > span'); }),
      flows = q('.m-hero-flows'), fstat = q('.m-hero-fstat'), think = q('.m-hero-fhead .v7-thinking'),
      ready = q('.m-hero-ready'), nodes = q('.m-hero-nodes'), rows = qa('.m-hero-nodes > li'), dot = q('.m-hero-dot'), track = q('.m-hero-track'),
      trow = q('.m-hero-row'), name = q('.m-hero-name'), week = q('.m-hero-week'), val = q('.m-hero-val'), pill = q('.m-hero-status'),
      fill = q('.m-hero-track .v7-bar-fill'), tick = q('.m-hero-track .v7-bar-tick'), flag = q('.m-hero-track .v7-bar-flag'),
      spk = q('.m-hero-spark'), note = q('.m-hero-note'), approve = q('.m-hero-note .v7-fbtn.is-primary'), details = q('.m-hero-note .v7-fbtn.is-ghost');
    if (!inEl || !goal || !text || !flows || !nodes || !track || !trow || rows.length < MAXN || vals.length < 3 || vals.some(function (v) { return !v; })) throw new Error('M1 markup incomplete');
    var spath = spk && spk.querySelector('.m-hero-line'), sarea = spk && spk.querySelector('.m-hero-area'), sdot = spk && spk.querySelector('circle');
    var first = !(opts && opts.cycle), count = MAXN, skRows = [], skTrack = [], dims = [];
    function link(li) { return li && li.querySelector('.m-hero-link'); }
    function tile(li) { return li && li.querySelector('.v7-node-tile'); }
    function body(li) { return li && li.querySelector('.v7-node-body'); }
    function stage(s) { V7.emit(root, 'v7:stage', { stage: s }); }
    function caret() { text.innerHTML = '<span class="v7-caret"></span>'; }
    function nocaret() { V7.$$(text, '.v7-caret').forEach(function (c) { c.parentNode.removeChild(c); }); }
    function prop(el, n) { try { return getComputedStyle(el).getPropertyValue(n).trim(); } catch (e) { return ''; } }
    function num(el, n, d) { var v = parseFloat(prop(el, n)); return isNaN(v) ? d : v; }
    function trackParts() { return [name, week, val, pill, tick, flag].filter(Boolean); }

    function setRow(li, n) {
      li.setAttribute('data-kind', n[0]);
      var u = li.querySelector('.v7-node-tile use'), t = li.querySelector('.v7-node-t'), m = li.querySelector('.v7-node-m');
      if (u) u.setAttribute('href', '#i-' + n[1]);
      if (t) t.textContent = n[2];
      if (m) m.textContent = n[3];
    }

    // Flow length: the card hugs n steps; the frame's bottom padding takes the rest, so the window never changes height.
    function setCount(n, t, o) {
      var from = count;
      nodes.style.height = 'calc(' + n + ' * var(--m-hero-row))';
      inEl.style.paddingBottom = 'calc(var(--m-hero-pb) + ' + (MAXN - n) + ' * var(--m-hero-row))';
      count = n;
      if (!t || from === n) return;
      var h = num(inEl, '--m-hero-row', 34), pb = num(inEl, '--m-hero-pb', 20), op = { duration: (o && o.duration) || 300, easing: 'inOut', fill: 'backwards', delay: (o && o.delay) || 0 };
      t.anim(nodes, [{ height: from * h + 'px' }, { height: n * h + 'px' }], op);
      t.anim(inEl, [{ paddingBottom: pb + (MAXN - from) * h + 'px' }, { paddingBottom: pb + (MAXN - n) * h + 'px' }], op);
    }

    // Placeholders: one per step (tile + title bar + meta bar) and three bars in the track card. Built once per cycle.
    function buildSk() {
      rows.forEach(function (li, i) {
        var s = document.createElement('span');
        s.className = 'm-hero-sk';
        s.innerHTML = '<i class="m-hero-sk-tile"></i>' + bar(SK.rows[i]) + bar(48, 'm-hero-sk-meta');
        li.appendChild(s); skRows.push(s);
      });
      [['name', SK.name], ['week', SK.week], ['val', SK.val]].forEach(function (a) {
        var t = document.createElement('i');
        t.className = 'm-hero-skb m-hero-sk-' + a[0];
        t.style.setProperty('--w', a[1] + 'px'); t.style.gridArea = a[0];
        trow.appendChild(t); skTrack.push(t);
      });
    }

    // The placeholder look for goal g (instant). Used by arm() and, once a goal has stepped back, to load the next one's data.
    function toSk(g) {
      var N = g.nodes.length;
      goal.classList.add('m-hero-typing');
      caret();
      vals.forEach(function (v, i) { v.innerHTML = bar(SK.chips[i]); });
      fstat.innerHTML = bar(SK.fstat);
      V7.gone(think); V7.off(ready);
      rows.forEach(function (li, i) {
        var lk = link(li);
        li.classList.add('is-sk');
        V7.off([tile(li), body(li)]); V7.on(skRows[i]);
        if (i < N) { setRow(li, g.nodes[i]); V7.on(li); } else V7.gone(li);
        if (lk) { if (i < N - 1) { V7.on(lk); V7.shrink(lk, 'y'); } else V7.gone(lk); }
      });
      setCount(N);
      V7.gone(dot);
      name.textContent = g.name;
      week.textContent = g.week; week.classList.remove('is-fc');
      val.textContent = '0%';
      pill.setAttribute('data-tone', 'neutral'); pill.textContent = TX.checking;
      V7.off(trackParts()); V7.on(skTrack);
      if (fill) fill.style.setProperty('--v', 0);
      if (tick) tick.style.setProperty('--at', g.base);
      if (flag) { flag.style.setProperty('--at', g.target); if (g.target >= .97 || flag.classList.contains('m-hero-flag-end')) flag.classList.toggle('m-hero-flag-end', g.target >= .97); }
      if (spath) spath.setAttribute('d', spark(g.sp));
      if (sarea) sarea.setAttribute('d', spark(g.sp) + ' L118 28 L2 28 Z');
      if (sdot) { sdot.setAttribute('cx', SX[5]); sdot.setAttribute('cy', sy(g.sp[5])); }
      if (spk) { V7.clip(spk); V7.on(spk); }
      if (note) { V7.gone(note); if (g.note != null && note.querySelector('p')) note.querySelector('p').textContent = g.note; }
      if (approve) { approve.className = 'v7-fbtn is-primary'; approve.textContent = TX.approve; }
      if (details) V7.on(details);
    }

    var steps = [];
    function at(ms, f) { steps.push([ms, f]); }

    G.forEach(function (g, gi) {
      var o = OFF[gi], N = g.nodes.length, built = T.row0 + (N - 1) * T.step + T.xf + 80, E = o + EXIT[gi], next = G[(gi + 1) % G.length], NN = next.nodes.length;
      // 0: Set the goal
      at(o, function () {
        stage('goal');
        if (!gi && first && ph && !ph.hasAttribute('data-v7-gone')) V7.hide(tl, ph, { y: 0, duration: 120, delay: T.ph });
      });
      at(o + T.type, function () { V7.type(tl, text, g.text, { duration: T.typeDur, html: g.html }); });
      // Enter: key cap press, border flash; the typed text becomes the span markup (no visual change)
      at(o + T.enter, function () {
        text.innerHTML = g.html;
        V7.tap(tl, kbd);
        var line = prop(goal, 'border-top-color'), you = prop(root, '--m-you'), soft = prop(root, '--m-you-soft'), sh = prop(goal, 'box-shadow');
        sh = sh && sh !== 'none' ? sh : '0 0 0 0 transparent';
        if (you) tl.anim(goal, [{ borderColor: line, boxShadow: '0 0 0 0 transparent, ' + sh }, { offset: .2, borderColor: you, boxShadow: '0 0 0 3px ' + (soft || 'transparent') + ', ' + sh },
          { offset: .8, borderColor: you, boxShadow: '0 0 0 3px ' + (soft || 'transparent') + ', ' + sh }, { borderColor: line, boxShadow: '0 0 0 0 transparent, ' + sh }], { duration: 520, easing: 'linear', fill: 'none' });
      });
      // highlights draw, the chip values roll in, the rest of the sentence steps back
      at(o + T.hl, function () {
        nocaret();
        goal.classList.remove('m-hero-typing');
        V7.$$(text, '.m-hero-hl').forEach(function (h, k) {
          tl.anim(h, [{ backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px' }], { duration: 200, delay: k * 70, easing: 'out', fill: 'backwards' });
        });
        vals.forEach(function (v, i) { V7.roll(tl, v, g.chips[i], { delay: i * 90 }); });
      });
      // Mate builds the flows: each placeholder step resolves into its real step, top-down
      at(o + T.flows, function () {
        stage('flows');
        V7.roll(tl, fstat, TX.building);
        V7.show(tl, think, { y: 0, duration: 200, delay: 160 });
      });
      at(o + T.row0, function () {
        rows.slice(0, N).forEach(function (li, n) {
          var d = n * T.step;
          if (n) V7.grow(tl, link(rows[n - 1]), { axis: 'y', duration: 110, delay: Math.max(0, d - 70) });
          V7.hide(tl, skRows[n], { y: 0, duration: T.xf, delay: d });
          V7.show(tl, [tile(li), body(li)], { y: 4, duration: T.xf, delay: d });
          tl.after(d, function () { li.classList.remove('is-sk'); });
        });
      });
      at(o + built - 60, function () { V7.hide(tl, think, { y: 0, duration: 120 }); });
      at(o + built, function () {
        V7.roll(tl, fstat, TX.built(N));
        V7.pop(tl, ready);
      });
      // Mate keeps you on track: the track placeholder resolves into the real card
      at(o + T.track, function () {
        stage('track');
        V7.hide(tl, skTrack, { y: 0, duration: T.xf });
        V7.show(tl, [name, week, val], { y: 4, duration: T.xf });
        V7.pop(tl, pill, { duration: 240 });
        V7.show(tl, [tick, flag], { y: 0, duration: T.xf, delay: 80 });
      });
      at(o + T.fill, function () {
        V7.bar(tl, fill, g.val / 100, { duration: 900 });
        V7.count(tl, val, { from: 0, to: g.val, duration: 900, suffix: '%' });
        if (spk) V7.wipe(tl, spk, { duration: 900 });
      });
      at(o + T.status, function () { V7.status(tl, pill, g.risk ? 'you' : 'ok', g.risk ? TX.risk : TX.ok); });

      if (!g.risk) {
        // a run dot walks the flow, each step washes teal as it passes
        at(o + T.dot, function () {
          var Ts = rows.slice(0, N).map(tile);
          V7.on(dot); V7.place(dot, Ts[0]);
          V7.pop(tl, dot, { duration: 180, from: .4 });
          V7.flash(tl, rows[0], { tone: 'ok', duration: 400 });
          for (var k = 1; k < N; k++) {
            V7.travel(tl, dot, Ts[k - 1], Ts[k], { duration: 200, delay: 60 + (k - 1) * 200 });
            V7.flash(tl, rows[k], { tone: 'ok', duration: 400, delay: 60 + k * 200 });
          }
          V7.hide(tl, dot, { y: 0, duration: 160, delay: 60 + (N - 1) * 200 + 120 });
        });
      } else {
        // G3: Mate proposes a fix over the last whole steps (they dim); you approve it; the forecast and the status recover
        var cover = function () { var c = Math.round(num(inEl, '--m-hero-cover', 2)); return rows.slice(Math.max(0, N - c), N); };
        at(o + 4200, function () {
          V7.show(tl, note, { y: 8, duration: 300 });
          dims = cover().map(function (li) { return tl.anim(li, [{ opacity: 1 }, { opacity: .28 }], { duration: 260, easing: 'out', fill: 'forwards' }); });
        });
        at(o + 4800, function () { V7.cursorTo(tl, approve, { duration: 500 }); });
        at(o + 5400, function () {
          V7.tap(tl, approve);
          V7.hide(tl, details, { y: 0, duration: 120 });
          tl.after(124, function () { V7.gone(details); });
          V7.roll(tl, approve, TX.approved, { delay: 40 });
          tl.after(136, function () { approve.classList.remove('is-primary'); approve.classList.add('is-ok'); });
        });
        at(o + 5700, function () {
          V7.roll(tl, week, g.fc, { html: true });
          tl.after(96, function () { week.classList.add('is-fc'); });
        });
        at(o + 6000, function () { V7.status(tl, pill, 'ok', TX.ok); });
        at(o + 7000, function () {
          V7.hide(tl, note, { y: 8, duration: 220 });
          V7.cursorHide(tl, approve);
          dims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
          dims = [];
          cover().forEach(function (li) { tl.anim(li, [{ opacity: .28 }, { opacity: 1 }], { duration: 260, easing: 'out', fill: 'backwards' }); });
        });
      }

      // exit: everything cross-fades back to placeholders (shaped for the next goal) while the goal untypes
      at(E, function () {
        goal.classList.add('m-hero-typing');
        V7.$$(text, '.m-hero-hl').forEach(function (h) {
          tl.anim(h, [{ backgroundSize: '100% 2px' }, { backgroundSize: '0% 2px' }], { duration: 160, easing: 'in', fill: 'forwards' });
        });
        vals.forEach(function (v, i) { V7.roll(tl, v, bar(SK.chips[i]), { html: true, delay: i * 40 }); });
        V7.roll(tl, fstat, bar(SK.fstat), { html: true });
        V7.hide(tl, ready, { y: 0, duration: 200 });
        rows.slice(0, N).forEach(function (li, i) {
          li.classList.add('is-sk');
          V7.hide(tl, [tile(li), body(li)], { y: 0, duration: T.back });
          if (i < NN) V7.show(tl, skRows[i], { y: 0, duration: T.back });
          else V7.hide(tl, li, { y: 0, duration: T.back });
          if (i < N - 1) V7.hide(tl, link(li), { y: 0, duration: 200 });
        });
        V7.hide(tl, trackParts(), { y: 0, duration: T.back });
        V7.show(tl, skTrack, { y: 0, duration: T.back });
        V7.bar(tl, fill, 0, { duration: T.back + 60, easing: 'inOut' });
        if (spk) V7.hide(tl, spk, { y: 0, duration: T.back });
        if (NN > N) { // the next flow is longer: its extra placeholder steps fade in as the card grows
          setCount(NN, tl, { duration: 300 });
          rows.slice(N, NN).forEach(function (li, i) {
            setRow(li, next.nodes[N + i]);
            li.classList.add('is-sk'); V7.off([tile(li), body(li)]); V7.on(skRows[N + i]);
            V7.show(tl, li, { y: 0, duration: T.back, delay: 120 });
          });
        }
      });
      if (NN < N) at(E + T.back + 10, function () { V7.gone(rows.slice(NN, N)); setCount(NN, tl, { duration: 300 }); });
      at(E + 160, function () { V7.untype(tl, text, { duration: T.untype }); });
      // the next goal's data loads behind the placeholders (no visible change)
      at(E + 160 + T.untype + 60, function () { toSk(next); });
    });

    return {
      length: TOTAL, hold: 0, loop: true, maxLoops: 2, selfExit: true,
      arm: function () {
        buildSk();
        toSk(G[0]);
        if (ph) { if (first) V7.on(ph); else V7.gone(ph); }
      },
      steps: steps
    };
  });

  /* Hero stepper sync (spec §4 H1, Industries spec §2), shared by every page: M1's v7:stage events move data-active on the
     ol.v7-stepper in the same .v7-hero (or section); data-sync lives from the first cycle until done/final. A stepper
     elsewhere on the page is never touched. */
  V7.ready(function () {
    var d = document;
    function isM1(t) { return t && t.getAttribute && t.getAttribute('data-v7-mock') === 'M1'; }
    function stepperFor(t) {
      var s = t && t.closest && (t.closest('.v7-hero') || t.closest('section'));
      return s && s.querySelector('ol.v7-stepper');
    }
    function clear(ol) {
      if (!ol) return;
      ol.removeAttribute('data-sync');
      V7.$$(ol, 'li[data-active]').forEach(function (li) { li.removeAttribute('data-active'); });
    }
    d.addEventListener('v7:stage', function (e) {
      var t = e.target, st = e.detail && e.detail.stage, ol;
      if (!isM1(t) || V7.static || !st) return;
      var c = V7.get(t);
      if (c.state === 'done' || c.state === 'final') return; // arm() inside restart() runs before the state resets
      if (!(ol = stepperFor(t))) return;
      ol.setAttribute('data-sync', '');
      V7.$$(ol, ':scope > li').forEach(function (li) {
        if (li.getAttribute('data-stage') === st) li.setAttribute('data-active', ''); else li.removeAttribute('data-active');
      });
    });
    d.addEventListener('v7:state', function (e) {
      var t = e.target, s = e.detail && e.detail.state;
      if (isM1(t) && (s === 'done' || s === 'final')) clear(stepperFor(t));
    });
    d.addEventListener('v7:static', function () { V7.$$(d, 'ol.v7-stepper').forEach(clear); });
  });
})();
// <<< M1
;
// >>> M3 m-goal: goal setup (spec §6 M3). Host-driven (S1 on the homepage, T1 in the tour); also plays when called directly.
// From arm() the screen is a structured, populated form: "Mate understood" shows its keys with placeholder value bars,
// and the Mate panel shows its two question bubbles as placeholders; each resolves in place.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var ROWW = ['86%', '72%', '22%', '46%', '58%']; // placeholder widths of the five values (share of the value column)
  V7.define('M3', function (root, tl) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var field = q('.m-goal-field'), text = q('.m-goal-text'), goal = text ? text.textContent : '',
      uht = q('.m-goal-uht'), uhText = uht ? uht.textContent : '', rows = qa('.m-goal-row'), dds = rows.map(function (r) { return r.querySelector('dd'); }),
      base = q('.m-goal-base'), bubbles = qa('.m-goal-q'), qts = bubbles.map(function (b) { return b.querySelector('.m-goal-qt'); }), answers = qa('.m-goal-as'),
      picks = qa('.m-goal-a[data-selected]'), foot = q('.m-goal-foot'), fbtns = foot ? V7.$$(foot, '.v7-fbtn') : [], build = q('.m-goal-build'), rowSk = [], qSk = [];

    function bar(w) { var i = document.createElement('i'); i.className = 'm-goal-skb'; i.style.setProperty('--w', w); return i; }
    function chipsOf(i) { return answers[i] ? V7.$$(answers[i], '.m-goal-a') : []; }
    function bars(sk) { return sk ? V7.$$(sk, '.m-goal-skb') : []; }
    function dots(sk) { return sk ? sk.querySelector('.v7-thinking') : null; }
    // Mate is thinking: the placeholder's bars give way to the thinking dots
    function think(t, i) { V7.hide(t, bars(qSk[i]), { y: 0, duration: 140 }); V7.show(t, dots(qSk[i]), { y: 0, duration: 200, delay: 100 }); }
    // the question resolves: placeholder out, question text in, then its answer chips
    function ask(t, i) {
      V7.hide(t, qSk[i], { y: 0, duration: 200 });
      V7.show(t, qts[i], { y: 3, duration: 240 });
      V7.flash(t, bubbles[i], { tone: 'mate', duration: 600 });
      chipsOf(i).forEach(function (c, k) {
        t.after(100 + k * 60, function () { c.classList.remove('is-sk'); });
        t.anim(c, [{ scale: '.94' }, { scale: '1' }], { duration: 240, delay: 100 + k * 60, easing: 'pop', fill: 'backwards' });
      });
    }
    // one bar per rendered line of the hidden question (measured again at step 0, once fonts have settled)
    function fitBars(i) {
      var b = bubbles[i], qt = qts[i], sk = qSk[i], lh = 0, n = 1;
      if (!b || !sk) return;
      try { lh = parseFloat(getComputedStyle(b).lineHeight) || 0; } catch (e) {}
      if (qt && lh) n = Math.max(1, Math.min(3, Math.round(qt.offsetHeight / lh)));
      var have = bars(sk);
      if (have.length === n) return;
      have.forEach(function (x) { sk.removeChild(x); });
      for (var k = 0; k < n; k++) sk.insertBefore(bar(k === n - 1 && n > 1 ? '52%' : (i ? '88%' : '80%')), dots(sk));
    }
    function pick(t, chip) {
      if (!chip) return;
      V7.tap(t, chip);
      chip.setAttribute('data-selected', '');
      V7.pop(t, chip.querySelector('.v7-ic'), { duration: 240, from: .4 });
    }

    return {
      length: 6800, hold: 1400,
      arm: function () {
        if (field) field.classList.add('is-focus');
        if (text) text.innerHTML = '<span class="v7-caret"></span>';
        if (uht) uht.innerHTML = '<i class="m-goal-skb" style="--w:96px;display:inline-block;vertical-align:middle"></i>';
        rows.forEach(function (r, i) { var b = bar(ROWW[i] || '50%'); r.appendChild(b); rowSk.push(b); });
        V7.off(dds);
        if (base) base.textContent = '0%';
        bubbles.forEach(function (b, i) {
          var sk = document.createElement('span');
          sk.className = 'm-goal-qsk';
          sk.innerHTML = '<span class="v7-thinking"><i></i><i></i><i></i></span>';
          b.appendChild(sk); qSk.push(sk);
          V7.off(dots(sk));
          fitBars(i);
        });
        V7.off(qts);
        qa('.m-goal-a').forEach(function (c) { c.classList.add('is-sk'); });
        fbtns.forEach(function (b) { b.classList.add('is-disabled'); }); // the form's buttons wait, disabled, until it is complete
        picks.forEach(function (c) { c.removeAttribute('data-selected'); });
      },
      steps: [
        [0, function () { bubbles.forEach(function (_, i) { fitBars(i); }); }],
        [200, function (t) { V7.type(t, text, goal, { duration: 1700 }); }],
        [2000, function (t) { if (field) field.classList.remove('is-focus'); V7.roll(t, uht, uhText); }],
        [2100, function (t) {
          rows.forEach(function (r, i) {
            V7.hide(t, rowSk[i], { y: 0, duration: 200, delay: i * 90 });
            V7.show(t, dds[i], { y: 4, duration: 260, delay: i * 90 });
          });
        }],
        [2200, function (t) { V7.count(t, base, { from: 0, to: 6, suffix: '%', duration: 500 }); }],
        [2700, function (t) { think(t, 0); }],
        [3300, function (t) { ask(t, 0); }],
        [3500, function (t) { V7.cursorTo(t, picks[0], { duration: 500 }); }],
        [4050, function (t) { pick(t, picks[0]); }],
        [4300, function (t) { think(t, 1); }],
        [4900, function (t) { ask(t, 1); }],
        [5100, function (t) { V7.cursorTo(t, picks[1], { duration: 450 }); }],
        [5600, function (t) { pick(t, picks[1]); }],
        [5800, function (t) {
          fbtns.forEach(function (b, k) {
            b.classList.remove('is-disabled');
            t.anim(b, [{ opacity: .5 }, { opacity: 1 }], { duration: 260, delay: k * 60, easing: 'out', fill: 'backwards' });
          });
        }],
        [6000, function (t) { V7.cursorTo(t, build, { duration: 500 }); }],
        [6550, function (t) {
          if (!build) return;
          V7.tap(t, build);
          var c = '';
          try { c = getComputedStyle(build).getPropertyValue('--m-you-soft').trim(); } catch (e) {}
          if (c) t.anim(build, [{ boxShadow: '0 0 0 0 ' + c }, { boxShadow: '0 0 0 6px ' + c, offset: .45 }, { boxShadow: '0 0 0 0 ' + c }], { duration: 600, easing: 'ease-out', fill: 'none' });
        }]
      ]
    };
  });
})();
// <<< M3
;
// >>> M4 m-flow: flow builder (spec §6 M4). Host-driven (S1 on the homepage, T1 in the tour); also plays when called directly.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: M4.he.html
  var TX = HE ? { ready: 'מוכן לבדיקה', draft: 'טיוטה · לבדיקה לפני הפעלה', building: 'Mate בונה מ-<bdi>G-01</bdi>' }
    : { ready: 'Ready to review', draft: 'Draft · review before live', building: 'Mate is building from <bdi>G-01</bdi>' };
  V7.define('M4', function (root) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var nodes = qa('.m-flow-col .v7-node'), links = qa('.m-flow-link'), tiles = nodes.map(function (n) { return n.querySelector('.v7-node-tile'); }),
      br = q('.m-flow-br'), blink = q('.m-flow-blink'), bline = q('.m-flow-bline'), bpill = q('.m-flow-branch'),
      insp = q('.m-flow-insp'), irows = qa('.m-flow-idl > div, .m-flow-ifoot'), n3 = q('.m-flow-n3'),
      pill = q('.m-flow-state'), live = q('.m-flow-live'), mst = q('.m-flow-mstat'), fin = mst ? mst.innerHTML : '',
      think = q('.m-flow-mate .v7-thinking'), chk = q('.m-flow-mchk'), dot = q('.m-flow-dot'), side = true;

    var steps = [], HOP = 220, RUN = 4260;
    // 400 + n·300: grow the link above node n (160ms, ending as the node lands), then pop node n. Node 7 lands at 2200.
    nodes.forEach(function (node, n) {
      var t = 400 + n * 300;
      // narrow: the main line first runs past the branch row under node 4
      if (n === 4) steps.push([t - 260, function (tl) { if (!side) V7.grow(tl, blink, { axis: 'y', duration: 100 }); }]);
      if (n > 0) steps.push([t - 160, function (tl) { V7.grow(tl, links[n - 1], { axis: 'y', duration: 160 }); }]);
      steps.push([t, function (tl) { V7.pop(tl, node, { duration: 260 }); }]);
    });
    steps.push(
      [2500, function (tl) { V7.grow(tl, bline, { axis: side ? 'x' : 'y', duration: 220 }); }],
      [2700, function (tl) { V7.pop(tl, bpill, { duration: 260 }); }],
      [3000, function (tl) {
        V7.roll(tl, mst, fin, { html: true });
        V7.hide(tl, think, { y: 0, duration: 140 });
        V7.pop(tl, chk, { duration: 260, from: .4, delay: 100 });
      }],
      [3300, function (tl) { // wide only: the inspector opens on step 3 (CSS hides both in other modes)
        if (!insp || !insp.getClientRects().length) return;
        if (n3) n3.setAttribute('data-selected', '');
        V7.show(tl, insp, { x: 16, y: 0, duration: 320 });
        V7.show(tl, irows, { y: 6, stagger: 60, delay: 120 });
      }],
      [4200, function (tl) { // a test run: the dot visits every step and each one flashes as it passes
        if (!dot || !tiles[0]) return;
        V7.place(dot, tiles[0]);
        V7.pop(tl, dot, { duration: 200, from: .3 });
        V7.flash(tl, nodes[0], { tone: 'ok', duration: 500 });
        for (var i = 1; i < tiles.length; i++) (function (i) {
          tl.at(RUN + (i - 1) * HOP, function (t) { V7.travel(t, dot, tiles[i - 1], tiles[i], { duration: HOP, easing: 'inOut' }); });
          tl.at(RUN + i * HOP, function (t) { V7.flash(t, nodes[i], { tone: 'ok', duration: 500 }); });
        })(i);
      }],
      [5700, function (tl) { V7.hide(tl, dot, { y: 0, duration: 160 }); }],
      [5800, function (tl) {
        V7.status(tl, pill, 'ok', TX.ready);
        if (live) live.classList.remove('is-disabled');
      }]
    );

    return {
      length: 6600, hold: 1200,
      arm: function () {
        side = !!br && getComputedStyle(br).position === 'absolute';
        V7.off(nodes); V7.shrink(links, 'y'); V7.shrink(blink, 'y');
        V7.shrink(bline, side ? 'x' : 'y'); V7.off(bpill);
        V7.off(insp); V7.off(irows);
        if (n3) n3.removeAttribute('data-selected');
        if (pill) { pill.setAttribute('data-tone', 'mate'); pill.textContent = TX.draft; }
        if (live) live.classList.add('is-disabled');
        if (mst) mst.innerHTML = TX.building;
        V7.on(think); V7.off(chk); V7.off(dot);
      },
      steps: steps
    };
  });
})();
// <<< M4
;
// >>> M5 m-mon: monitor (spec §6 M5). Host-driven (S1 on the homepage, T1 in the tour); also plays when called directly.
// From arm() the alert card (and, wide, the flows card) holds static placeholders. At 1800ms, at every size, the forecast
// appears, the status flips to "At risk" and the alert resolves in the same moment, so no frame pairs "On track" with an
// at-risk forecast. Then the approve-and-fix beat.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: M5.he.html
  var TX = HE ? { slowing: 'מאט', atRisk: 'בסיכון: הזמנות גדולות מחכות לבדיקת מלאי.', approveFix: 'אישור התיקון', see: 'צפייה בשינוי', dismiss: 'דחייה',
    needs: 'ממתין לאישור · דנה ק.', risk: 'בסיכון', approved: 'אושר על ידי דנה ק.', ok: 'כמתוכנן', live: 'התיקון פעיל' }
    : { slowing: 'Slowing', atRisk: 'At risk: large orders wait for a stock check.', approveFix: 'Approve fix', see: 'See flow change', dismiss: 'Dismiss',
    needs: 'Needs approval · Dana K.', risk: 'At risk', approved: 'Approved by Dana K.', ok: 'On track', live: 'Fix live' };
  var FC_FINAL = 35.3, FC_ARM = 57.4;
  var RISK = 1800, AIM = 3300, TAP = 4000, FIX = 4300, OK = 5100;
  V7.define('M5', function (root) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var now = q('.m-mon-now'), fcv = q('.m-mon-fcv'), status = q('.m-mon-status'),
      glide = q('.m-mon-glide'), act = q('.m-mon-act'), endDot = q('.m-mon-end'), today = q('.m-mon-today'), todayL = q('.m-mon-tl'),
      fcl = q('.m-mon-fcl'), fc = q('.m-mon-fc'), rows = qa('.m-mon-flows li'), lrow = q('.m-mon-lrow'), large = q('.m-mon-large'),
      alert = q('.m-mon-alert'), atitle = q('.m-mon-atitle'), att = q('.m-mon-att'), atFinal = att ? att.textContent : '',
      abody = q('.m-mon-ab'), cmp = q('.m-mon-cmp'), afoot = q('.m-mon-afoot'),
      acts = q('.m-mon-acts'), approve = q('.m-mon-approve'), aicon = approve ? approve.querySelector('.v7-ic') : null,
      note = q('.m-mon-anote'), noteFinal = note ? note.innerHTML : '', ghosts = [],
      cfill = q('.m-mon-cfill'), cnew = q('.m-mon-cnew'), ask = null, rowSk = [], rowParts = [];

    function setY2(v) { if (fc) fc.setAttribute('y2', v.toFixed(1)); }
    function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
    function bar(w) { var b = el('i', 'm-mon-skb'); if (w) b.style.setProperty('--w', w); return b; }
    function ghost(label) { var g = el('span', 'v7-fbtn is-ghost m-mon-ghost'); g.textContent = label; return g; }

    return {
      length: 6800, hold: 1400,
      arm: function () {
        if (now) now.textContent = '0%';
        if (fcv) { fcv.textContent = '—'; fcv.classList.remove('is-ok', 'is-you'); }
        V7.off(glide); V7.clip(act); V7.clip(fcl); V7.off(endDot); V7.off(today); V7.off(todayL);
        if (fc) fc.classList.add('is-warn');
        setY2(FC_ARM);
        if (large) { large.setAttribute('data-tone', 'you'); large.textContent = TX.slowing; }
        // flows card (wide only): frame stays, each row is a placeholder until the at-risk moment
        rows.forEach(function (li) {
          var parts = V7.$$(li, ':scope > *'), sk = el('span', 'm-mon-fsk');
          sk.appendChild(bar(li === lrow ? '72%' : '48%')); sk.appendChild(bar());
          V7.off(parts); li.appendChild(sk); rowParts.push(parts); rowSk.push(sk);
        });
        // alert card: frame, avatar and placeholder bars; its content is hidden but keeps the final size
        if (alert) {
          alert.classList.add('is-sk'); alert.classList.remove('is-risk');
          ask = el('span', 'm-mon-ask');
          var h = el('span', 'm-mon-ask-h'); h.appendChild(bar('64%')); ask.appendChild(h);
          ['94%', '86%', '44%'].forEach(function (w) { ask.appendChild(bar(w)); });
          alert.appendChild(ask);
        }
        if (atitle && att) { var g = el('span', 'm-mon-atg'); g.textContent = atFinal; atitle.appendChild(g); att.textContent = TX.atRisk; }
        V7.off([att, abody, cmp, afoot]);
        if (approve) { approve.classList.remove('is-ok'); approve.classList.add('is-primary'); approve.lastChild.textContent = TX.approveFix; }
        if (aicon && aicon.parentNode) aicon.parentNode.removeChild(aicon); // it comes back inside the rolling label (no shift)
        if (acts) { ghosts = [ghost(TX.see), ghost(TX.dismiss)]; ghosts.forEach(function (g) { acts.appendChild(g); }); }
        if (note) { note.textContent = TX.needs; note.classList.add('is-you'); }
        if (cfill) cfill.style.setProperty('--v', 0);
        if (cnew) cnew.textContent = '—';
      },
      steps: [
        [0, function (t) { V7.count(t, now, { from: 0, to: 51, suffix: '%', duration: 900 }); }],
        [200, function (t) { V7.show(t, glide, { y: 0, duration: 400, easing: 'ease-out' }); }],
        [300, function (t) { V7.wipe(t, act, { duration: 900, easing: 'out' }); }],
        [1150, function (t) { V7.pop(t, endDot, { duration: 260, from: .3 }); }],
        [1250, function (t) { V7.show(t, today, { y: 0, duration: 240 }); V7.show(t, todayL, { y: 4, duration: 240 }); }],
        // the at-risk moment: the status turns first (its old label is gone before any forecast shows), then the
        // forecast and the alert in the same beat
        [RISK - 100, function (t) { V7.status(t, status, 'you', TX.risk); }],
        [RISK, function (t) {
          V7.wipe(t, fcl, { from: 51.6, duration: 600, easing: 'out' });
          if (fcv) fcv.classList.add('is-you');
          V7.count(t, fcv, { from: 0, to: 78, suffix: '%', duration: 500 });
          if (alert) { alert.classList.remove('is-sk'); alert.classList.add('is-risk'); }
          V7.hide(t, ask, { y: 0, duration: 200 });
          V7.show(t, [att, abody, afoot], { y: 4, duration: 300, stagger: 60, delay: 60 });
          V7.show(t, cmp, { y: 4, duration: 300, delay: 220 });
          V7.flash(t, alert, { tone: 'you', duration: 900, delay: 60 });
          // wide only: the flows rows resolve and the slow one is flagged (CSS hides the card in other modes: no-ops)
          rows.forEach(function (li, i) {
            V7.hide(t, rowSk[i], { y: 0, duration: 180, delay: 80 + i * 80 });
            V7.show(t, rowParts[i], { y: 3, duration: 240, delay: 80 + i * 80 });
          });
          V7.flash(t, lrow, { tone: 'you', duration: 1200, delay: 420 });
        }],
        [AIM, function (t) { V7.cursorTo(t, approve, { duration: 600 }); }],
        [TAP, function (t) {
          if (!approve) return;
          V7.tap(t, approve);
          approve.classList.remove('is-primary'); approve.classList.add('is-ok');
          // the ghosts leave first, so the wider "Approved by Dana K." never wraps the row
          V7.hide(t, ghosts, { y: 0, duration: 120 });
          t.after(120, function (t2) {
            V7.gone(ghosts);
            // the check icon rides inside the label, so the label's start never moves (no layout shift)
            V7.roll(t2, approve, '<svg class="v7-ic"><use href="#i-check"/></svg>' + TX.approved, { html: true });
          });
        }],
        [FIX, function (t) {
          if (fc) { fc.classList.remove('is-warn'); t.tween(800, V7.ease.inOutCubic, function (p) { setY2(FC_ARM + (FC_FINAL - FC_ARM) * p); }, function () { setY2(FC_FINAL); }); }
          if (fcv) { fcv.classList.remove('is-you'); fcv.classList.add('is-ok'); }
          V7.count(t, fcv, { from: 78, to: 91, suffix: '%', duration: 800 });
          V7.bar(t, cfill, .91, { duration: 800 }); // wide only: the alert's forecast comparison
          V7.count(t, cnew, { from: 0, to: 91, suffix: '%', duration: 800 });
        }],
        [OK, function (t) {
          V7.status(t, status, 'ok', TX.ok);
          V7.roll(t, att, atFinal);
          if (alert) alert.classList.remove('is-risk');
          if (note) note.classList.remove('is-you');
          V7.roll(t, note, noteFinal, { html: true });
          V7.status(t, large, 'ok', TX.live);
        }]
      ]
    };
  });
})();
// <<< M5
;
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
;
// >>> M7 m-phone: approval on the phone + mini audit card (spec §6 M7).
// One controller cycle holds three runs of the conversation (spec: 3 loops). Run 1 opens with Mate typing; runs 2 and 3
// start at the quote card. Between runs today's messages scroll away to yesterday's history (a transform), and the audit
// card keeps its earliest row, so the chat and the audit card are never empty and the mock is never faded out as a whole.
// The chat stack moves by transform only (fixed-height clip), so messages never shift layout.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: M7.he.html
  var TX = HE ? { approve: 'אישור', approved: 'אושר' } : { approve: 'Approve', approved: 'Approved' };
  var PAD = 12;                       // chat body padding under the last message
  var RUNS = [0, 11650, 22700];       // run starts; a run after the first skips the 600ms typing intro
  var RESET = 650;                    // scroll-back between runs, before the next run starts
  var LEN = RUNS[2] + 7200 + 3100;    // last event of run 3 at +7200, then a dwell
  V7.define('M7', function (root) {
    var q = function (s) { return root.querySelector(s); };
    var m = [1, 2, 3, 4, 5].map(function (i) { return q('.m-phone-m' + i); }), typing = q('.m-phone-typing'),
      body = q('.m-phone-body'), msgs = q('.m-phone-msgs'),
      card = q('.m-phone-m1 .m-phone-b'), lines = V7.$$(root, '.m-phone-m1 .m-phone-cr, .m-phone-m1 .m-phone-acts'),
      ok = q('.m-phone-ok'), ticks = q('.m-phone-m2 .m-phone-ticks'), src = q('.m-phone-m5 .m-phone-src'),
      audit = q('.m-phone-audit'), rows = V7.$$(root, '.m-phone-ar:not(.m-phone-ar0)'), floating = false, ty = 0;
    var live = m.filter(Boolean);
    function bubble(el) { return el ? el.querySelector('.m-phone-b') : null; }

    // --- chat stack: anchored to the top while it plays and moved with translateY so its bottom sits PAD above the input
    function curY() {
      try {
        var tr = getComputedStyle(msgs).transform, mm = tr && tr !== 'none' && tr.match(/matrix(3d)?\(([^)]+)\)/);
        if (mm) { var v = mm[2].split(',').map(parseFloat); return mm[1] ? v[13] : v[5]; }
      } catch (e) {}
      return ty;
    }
    function setY(y) { ty = y; msgs.style.transform = 'translateY(' + y + 'px)'; }
    function slide(t, to, o) {
      if (!msgs) return;
      var from = t ? curY() : to;
      setY(to);
      if (t && Math.abs(from - to) > .5) t.anim(msgs, [{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(' + to + 'px)' }],
        { duration: (o && o.duration) || 280, easing: (o && o.easing) || 'out', fill: 'backwards' });
    }
    function bottom(h) { return (body ? body.clientHeight : 0) - PAD - h; }
    function pin(t, extra, o) { if (msgs) slide(t, bottom(msgs.offsetHeight + (extra || 0)), o); }
    // insert a message (or the typing bubble) and keep the stack's bottom pinned while it grows (same duration and easing)
    function grow(t, el) {
      if (!el) return;
      el.removeAttribute('data-v7-gone'); el.removeAttribute('data-v7-collapsed');
      var h = el.offsetHeight; // its natural height, measured before the insert starts from 0fr (same task, never painted)
      V7.insert(t, el, { duration: 280 });
      pin(t, Math.max(0, h - el.offsetHeight), { duration: 280, easing: 'out' });
    }
    // Audit rows: inserted when the card floats beside the phone; faded in place when it sits in the page flow
    // under the phone (its height is reserved, so the page below never moves).
    function log(t, i, tone) {
      var r = rows[i];
      if (!r) return;
      if (floating) V7.insert(t, r, { duration: 280 }); else V7.show(t, r, { y: 4, duration: 260 });
      V7.flash(t, r.firstElementChild, { tone: tone, duration: 1400 });
    }
    function startLook() { // today's messages gone, buttons and ticks in their arm state (instant)
      V7.gone(live); V7.gone(typing);
      V7.off(lines);
      if (ok) { ok.classList.remove('is-ok'); ok.classList.add('is-primary'); V7.roll(null, ok, TX.approve); }
      if (ticks) ticks.classList.remove('is-read');
      V7.off(src);
    }

    var steps = [];
    RUNS.forEach(function (b, k) {
      var s = k ? 600 : 0;
      function at(ms, f) { steps.push([b + ms - s, f]); }
      if (k) {
        // scroll back: today's messages slide down and fade while yesterday's history comes back into view
        steps.push([b - RESET, function (t) {
          V7.gone(typing);
          var keep = m[0] ? m[0].offsetTop : 0; // history + the Today pill (everything above today's first message)
          V7.hide(t, live, { y: 0, duration: 300 });
          slide(t, bottom(keep), { duration: 600, easing: 'inOut' });
          // audit rows fade out first; a floating card then closes up (so no half-clipped row is ever legible)
          V7.hide(t, rows, { y: 0, duration: 200 });
          if (floating) t.after(200, function (t2) { V7.remove(t2, rows, { duration: 260 }); });
          t.after(620, function () { startLook(); });
        }]);
      } else {
        at(0, function () { pin(null); }); // re-measure once fonts have settled
        at(400, function (t) { grow(t, typing); });
      }
      at(1200, function (t) {
        V7.gone(typing); // the typing bubble gives way to the message it announced
        grow(t, m[0]);
        V7.pop(t, card, { delay: 60 });
        V7.show(t, lines, { y: 4, duration: 260, stagger: 60, delay: 180 });
      });
      at(2600, function (t) {
        V7.tap(t, ok);
        V7.roll(t, ok, TX.approved);
        if (ok) { ok.classList.remove('is-primary'); ok.classList.add('is-ok'); }
      });
      at(2900, function (t) { grow(t, m[1]); V7.show(t, bubble(m[1]), { x: 12, y: 0 }); });
      at(3300, function (t) { log(t, 0, 'you'); });
      at(3400, function () { if (ticks) ticks.classList.add('is-read'); });
      at(3800, function (t) { grow(t, typing); });
      at(4400, function (t) { V7.gone(typing); grow(t, m[2]); log(t, 1, 'mate'); });
      at(6000, function (t) { grow(t, m[3]); V7.show(t, bubble(m[3]), { x: 12, y: 0 }); });
      at(6600, function (t) { grow(t, typing); });
      at(7500, function (t) { V7.gone(typing); grow(t, m[4]); });
      at(7800, function (t) { V7.pop(t, src); log(t, 2, 'mate'); });
    });
    // the end: hand the stack back to its CSS bottom anchoring (same look; robust to later resizes)
    steps.push([LEN, function () { if (msgs) { msgs.style.top = msgs.style.bottom = msgs.style.transform = ''; } }]);

    return {
      length: LEN, hold: 500, loop: false,
      arm: function () {
        startLook();
        floating = !!audit && getComputedStyle(audit).position === 'absolute';
        if (floating) V7.gone(rows); else V7.off(rows);
        if (msgs) { msgs.style.top = '0'; msgs.style.bottom = 'auto'; pin(null); }
      },
      steps: steps
    };
  });
})();
// <<< M7
;
// >>> M8 m-rules: rules (spec §6 M8). Host-driven (T1). Length 4800, hold 1400.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  V7.define('M8', function (root) {
    var q = function (s) { return root.querySelector(s); };
    var wraps = V7.$$(root, '.m-rules-list > .v7-collapse'), c1 = wraps[0] || null, rest = wraps.slice(1),
      r1 = c1 && c1.querySelector('.m-rules-row'), tag = q('.m-rules-new'), list = q('.m-rules-list'), amt = q('.m-rules-amt'), r5 = q('.m-rules-r5'),
      meta3 = q('.m-rules-meta3'), redBox = q('.m-rules-red'), red = V7.$$(root, '.m-rules-red li'), count = q('.m-rules-count');
    // meta lines are wrap units (one span per part; CSS draws the separators), so they never break inside a part or end on '·'
    var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
    var M2 = HE ? '<span><bdi>R-03</bdi></span><span><bdi>v2</bdi></span><span>אתם</span><span>2 באוק׳</span>' : '<span>R-03</span><span>v2</span><span>You</span><span>Oct 2</span>',
      M3 = HE ? '<span><bdi>R-03</bdi></span><span><bdi>v3</bdi></span><span>אתם</span><span>עכשיו</span>' : '<span>R-03</span><span>v3</span><span>You</span><span>now</span>',
      N13 = HE ? '13 פעילים' : '13 active', N14 = HE ? '14 פעילים' : '14 active';
    // the list keeps its final height while R-14 inserts at the top, so the red lines below it never move
    function hold() {
      if (!list || !c1) return;
      list.style.minHeight = ''; V7.on(c1);
      var h = list.offsetHeight;
      V7.gone(c1);
      if (h) list.style.minHeight = h + 'px';
    }
    function carets() { V7.$$(amt, '.v7-caret').forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); }); }
    return {
      length: 4800, hold: 1400,
      arm: function () {
        hold(); V7.off(tag); V7.off(rest);
        if (amt) amt.textContent = '50,000';
        if (meta3) meta3.innerHTML = M2;
        if (count) count.textContent = N13;
        V7.off(redBox); V7.off(red);
      },
      steps: [
        [0, function (t) { hold(); V7.show(t, rest, { stagger: 60, duration: 260 }); }], // measured again now that fonts are in
        [600, function (t) {
          V7.insert(t, c1, { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }); // grows from 0px (padding sits inside)
          V7.flash(t, r1, { tone: 'you', duration: 1800 });
          V7.pop(t, tag, { delay: 140 });
          V7.roll(t, count, N14);
          t.after(320, function () { if (list) list.style.minHeight = ''; }); // inserted: the natural height is the final one again
        }],
        [1900, function (t) { V7.cursorTo(t, amt, { duration: 550 }); }],
        [2500, function (t) {
          V7.tap(t, amt);
          if (!amt) return;
          amt.classList.add('is-edit');
          var c = document.createElement('span'); c.className = 'v7-caret'; amt.appendChild(c);
        }],
        [2700, function (t) { V7.untype(t, amt, { duration: 240 }); }],
        [3000, function (t) { V7.type(t, amt, '40,000', { duration: 360 }); }],
        [3450, function (t) {
          if (amt) { amt.classList.remove('is-edit'); carets(); }
          V7.roll(t, meta3, M3, { html: true });
          V7.flash(t, r5, { tone: 'ok' });
        }],
        [3800, function (t) { V7.show(t, redBox, { y: 6, duration: 280 }); V7.show(t, red, { stagger: 60, delay: 80 }); }]
      ]
    };
  });
})();
// <<< M8
;
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
;
// >>> M10 m-goals goals overview, product P1 (spec §6 M10 + §0 A6). Plays once, 700ms start delay, starts at 5% visible.
// Rings, sparklines and pills play on load. The "Mate · today" beat (thinking, three typed lines, the G-01 pulse) waits until
// the strip itself is at least 60% in view: the controller holds on its own pause reason ('strip') until then.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var G0 = 1580, G1 = 2320; // the strip beat starts at G0 when the strip is in view; else at G1 (every on-load motion has ended) it holds
  V7.define('M10', function (root, tl, o) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var cards = $$('.m-goals-card'), arcs = $$('.m-goals-arc'), vals = $$('.m-goals-val'), sparks = $$('.m-goals-spark'),
      pills = $$('.m-goals-pill'), lines = $$('.m-goals-entry'), think = $('.m-goals-think'), strip = $('.m-goals-today'),
      narrow = (o && o.size) === 'narrow', ctrl = V7.get(root), go = 0;
    // final values come from the markup: arc p from stroke-dasharray, centre value "51%" / "64 d" → number + suffix.
    // data-from sets where the count starts (G-03 counts down from 72 d: fewer days is better).
    var P = arcs.map(function (a) { return parseFloat(a.getAttribute('stroke-dasharray')) || 0; });
    var N = vals.map(function (v) {
      var m = String(v.textContent).trim().match(/^([\d.,]+)(.*)$/) || [0, '0', ''], f = parseFloat(v.getAttribute('data-from'));
      return { to: parseFloat(m[1].replace(/,/g, '')) || 0, suffix: m[2], from: isNaN(f) ? 0 : f };
    });

    function ring(t, i) { // arc sweep and centre count, in sync (900ms, outCubic)
      var a = arcs[i];
      if (!a) return;
      V7.on(a); // the round cap of a "0 1" dash would show as a lone dot before the sweep
      t.tween(900, V7.ease.outCubic, function (p) { a.setAttribute('stroke-dasharray', (P[i] * p).toFixed(4) + ' 1'); });
      if (vals[i]) V7.count(t, vals[i], { from: N[i].from, to: N[i].to, suffix: N[i].suffix, duration: 900 });
    }
    function typeLine(t, i, ms) { // the time fades in, the message types over its ghost
      var l = lines[i], tx = l && $('.m-goals-txt', l);
      if (!tx) return;
      V7.show(t, $('.m-goals-time', l), { y: 0, duration: 200 });
      V7.on(tx);
      V7.type(t, tx, tx.textContent, { duration: ms });
    }
    function seen() { // at least 60% of the strip is inside the viewport
      if (!strip) return true;
      var r = strip.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      return !r.height || (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height >= .6;
    }
    function beat(t) { // the strip, timed from the gate (offsets are the spec times minus 1580)
      t.after(0, function (t2) { if (think) think.hidden = false; V7.show(t2, think, { y: 0, duration: 200 }); });
      t.after(120, function (t2) { typeLine(t2, 0, 900); });
      t.after(1080, function (t2) { V7.status(t2, pills[0], 'ok'); }); // the line names G-01: its pill answers with a pulse
      t.after(1220, function (t2) { typeLine(t2, 1, 1100); });
      t.after(2520, function (t2) { typeLine(t2, 2, 800); }); // hidden narrow: type() then just settles the text
      t.after(narrow ? 2420 : 3370, function (t2) { // the dots leave the layout once faded, so no CSS loop keeps running
        V7.hide(t2, think, { y: 0, duration: 200 });
        t2.after(220, function () { if (think) think.hidden = true; });
      });
    }
    function unwatch() { if (root.__v7strip) { root.__v7strip(); root.__v7strip = null; } }

    return {
      length: G1 + 3420,
      hold: 500, // the timeline keeps running through the hold, so the last caret (removed 400ms after typing) clears before 'done'
      arm: function () {
        unwatch(); if (ctrl && ctrl.R) delete ctrl.R.strip; // a replay never inherits the previous cycle's hold
        V7.off(cards); V7.off(pills); V7.clip(sparks);
        arcs.forEach(function (a) { a.setAttribute('stroke-dasharray', '0 1'); V7.off(a); });
        vals.forEach(function (v, i) { v.textContent = N[i].from + N[i].suffix; });
        lines.forEach(function (l) {
          var m = $('.m-goals-msg', l), tx = m && $('.m-goals-txt', m), g;
          if (!tx) return;
          g = tx.cloneNode(true); g.className = 'm-goals-ghost'; m.appendChild(g); // appended after, so the typed span keeps its snapshot path
          m.classList.add('is-armed');
          V7.off(tx); V7.off($('.m-goals-time', l));
        });
        if (think) { think.hidden = true; V7.off(think); } // out of the layout until it shows: no dots animate unseen
      },
      steps: [
        [200, function (t) { V7.show(t, cards, { y: 12, duration: 400, stagger: 120 }); }],
        [400, function (t) { arcs.forEach(function (a, i) { if (i) t.after(i * 120, function (t2) { ring(t2, i); }); else ring(t, 0); }); }],
        [600, function (t) { V7.wipe(t, sparks, { duration: 700, stagger: 120 }); }],
        [1300, function (t) {
          V7.pop(t, pills, { stagger: 80 });
          if (pills[2]) t.after(160 + 240, function (t2) { V7.status(t2, pills[2], 'you'); }); // G-03 at risk: one ring pulse once it has landed
        }],
        [G0, function (t) { if (seen()) { go = 1; beat(t); } }],
        [G1, function (t) {
          if (go) return;
          go = 1; beat(t);
          if (seen() || !strip || !ctrl || ctrl.noop) return;
          ctrl.pause('strip'); // everything on screen has settled; the strip waits, unstarted, until it is read
          root.__v7strip = V7.observe(strip, { enter: .6, leave: .6 }, function (v) { if (v) { unwatch(); ctrl.resume('strip'); } });
        }]
      ]
    };
  });
})();
// <<< M10
;
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
;
// >>> M12 m-loop learning loop, product P5 (spec §6 M12). Plays once, length 5600.
// From arm() the whole loop stands as a ghost: every label, card frame and lane row in its normal frame, with static
// placeholder bars where the text goes. The timeline then fills each one in place (bars out, text in), so the canvas is
// never empty and nothing moves. Connectors still grow between the steps.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var BARS = [['58%', '86%'], ['34%', '82%', '44%'], ['92%', '66%', '40%']]; // placeholder lines per card
  V7.define('M12', function (root) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    var cols = [1, 2, 3].map(function (n) { var k = $('.m-loop-k' + n); return { lbl: $('.m-loop-lbl', k), card: $('.m-loop-card', k) }; }),
      conns = $$('.m-loop-h').map(function (h) { return { line: $('.m-loop-line', h), chev: $('.v7-ic', h) }; }),
      down = $('.m-loop-down .m-loop-line'), dchev = $('.m-loop-down .v7-ic'), dl = $('.m-loop-dl'),
      lane = { lbl: $('.m-loop-lane > .m-loop-lbl') }, rows = $$('.m-loop-row').map(function (r) { return { el: r }; }),
      box = $('.m-loop-box'), tick = $('.m-loop-box path'), fig = root.closest('.v7-figure') || root;
    var axis = (fig.clientWidth || root.clientWidth) >= 760 ? 'x' : 'y'; // connectors run across in three columns, down in one

    function ph(host, widths, cls) { // shared placeholder look: static --m-line bars, 8px tall, radius 4px, no loop
      var s = document.createElement('span');
      s.className = 'm-loop-ph' + (cls ? ' ' + cls : '');
      widths.forEach(function (w) { var i = document.createElement('i'); i.style.width = w; s.appendChild(i); });
      host.appendChild(s);
      return s;
    }
    function ghost(o, widths) { // o.host keeps its frame; its content goes invisible and bars stand in
      if (!o.host) return;
      o.kids = $$(':scope > :not(.m-loop-ph)', o.host);
      V7.off(o.kids);
      o.ph = ph(o.host, widths, o.cls);
      if (o.cls === 'is-lbl') o.host.classList.add('is-ghost');
    }
    function fill(t, o, opt) { // bars out, content in, in place
      if (!o.host) return;
      opt = opt || {};
      o.host.classList.remove('is-ghost');
      V7.hide(t, o.ph, { y: 0, duration: 180 });
      V7.show(t, opt.only || o.kids, { x: opt.x || 0, y: opt.x ? 0 : 4, duration: 280, stagger: 60, delay: 80 });
      var p = o.ph; t.after(300, function () { if (p && p.parentNode) p.parentNode.removeChild(p); });
    }
    function col(t, i) { // a column's label and card fill together
      var c = cols[i];
      fill(t, c.L); fill(t, c.C);
    }
    function link(t, i) { // the line grows from the inline-start (or the top), then the chevron lands
      var c = conns[i];
      if (!c) return;
      V7.grow(t, c.line, { axis: axis, duration: 400 });
      t.after(260, function (t2) { V7.show(t2, c.chev, axis === 'x' ? { x: -4, y: 0, duration: 180 } : { y: -4, duration: 180 }); });
    }
    function row(t, i) { // a lane row fills: its line slides in, its check pops
      var r = rows[i];
      if (!r || !r.R.host) return;
      fill(t, r.R, { x: -8, only: r.txt });
      V7.pop(t, r.ic, { duration: 300, from: .4, delay: 140 });
    }

    return {
      length: 5600,
      arm: function () {
        cols.forEach(function (c, i) {
          c.L = { host: c.lbl, cls: 'is-lbl' }; c.C = { host: c.card };
          ghost(c.L, ['100%']); ghost(c.C, BARS[i]);
        });
        lane.L = { host: lane.lbl, cls: 'is-lbl' }; ghost(lane.L, ['100%']);
        rows.forEach(function (r, i) {
          r.ic = $('.v7-ic', r.el); r.txt = $(':scope > span', r.el); r.R = { host: r.el, cls: 'is-row' };
          ghost(r.R, [['74%', '70%', '62%'][i]]);
        });
        conns.forEach(function (c) { V7.shrink(c.line, axis); V7.off(c.chev); });
        V7.shrink(down, 'y'); V7.off([dchev, dl]);
        if (box) box.setAttribute('data-unchecked', '');
        V7.undraw(tick);
      },
      steps: [
        [0, function (t) { col(t, 0); }],
        [600, function (t) { link(t, 0); }],
        [1000, function (t) { col(t, 1); }],
        [1500, function (t) { if (box) box.removeAttribute('data-unchecked'); V7.draw(t, tick, { duration: 300 }); }],
        [1900, function (t) { link(t, 1); }],
        [2300, function (t) { col(t, 2); V7.flash(t, cols[2].card, { tone: 'you', duration: 1500, delay: 260 }); }],
        [3100, function (t) {
          V7.grow(t, down, { axis: 'y', duration: 400 });
          V7.show(t, dchev, { y: -4, duration: 180, delay: 260 });
          V7.show(t, dl, { x: -6, y: 0, duration: 280, delay: 160 });
        }],
        [3500, function (t) { fill(t, lane.L); row(t, 0); }], // the lane's label fills with its first row
        [4100, function (t) { row(t, 1); }],
        [4700, function (t) { row(t, 2); }]
      ]
    };
  });
})();
// <<< M12
;
// >>> M13 m-ctrl control settings (spec §6 M13). Screen in M0, plays once. 8000ms.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he';
  var RUN3 = HE ? '3 תהליכים רצים' : '3 flows running', RUN0 = HE ? '0 תהליכים רצים' : '0 flows running';
  function vis(list) { return list.filter(function (e) { return e.getClientRects().length; }); }
  V7.define('M13', function (root, tl) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var rows = qa('.m-ctrl-g, .m-ctrl-row'), oks = qa('.m-ctrl-list .v7-pill[data-tone=ok]'),
      tip = q('.m-ctrl-tip'), banner = q('.m-ctrl-banner'), write = q('.m-ctrl-write'), sw = q('.m-ctrl-write .m-ctrl-sw'),
      stop = q('.m-ctrl-stop'), resume = q('.m-ctrl-resume'), run = q('.m-ctrl-run-t'), live = q('.m-ctrl-run .v7-live');
    function shake(t, el) { // denied: 0, 3, -3, 3, -3, 0 px (× dir), 300ms
      if (!el) return;
      var k = 3 * V7.dir(el);
      t.anim(el, [0, k, -k, k, -k, 0].map(function (x) { return { transform: 'translateX(' + x + 'px)' }; }), { duration: 300, easing: 'linear', fill: 'none' });
    }
    function running(t, on) { // run label + live dot + the stop button's state
      V7.roll(t, run, on ? RUN3 : RUN0);
      if (live) { if (on) live.removeAttribute('data-state'); else live.setAttribute('data-state', 'off'); }
      if (stop) stop.classList.toggle('is-disabled', !on);
    }
    return {
      length: 8000,
      hold: 600,
      arm: function () {
        V7.off(rows); V7.off(oks); V7.gone(tip); V7.gone(banner);
        qa('.m-ctrl-group').forEach(function (g) { g.style.borderTopColor = 'transparent'; }); // each rule fades in with its section
      },
      steps: [
        [0, function (t) {
          vis(rows).forEach(function (el, i) {
            V7.show(t, el, { delay: i * 60 });
            if (el.classList.contains('m-ctrl-g')) t.after(i * 60, function () {
              var g = el.parentNode; g.style.borderTopColor = '';
              t.anim(g, [{ offset: 0, borderTopColor: 'transparent' }], { duration: 240, easing: 'out', fill: 'backwards' });
            });
          });
        }],
        [700, function (t) { V7.pop(t, vis(oks), { stagger: 150 }); }],
        [2200, function (t) { V7.cursorTo(t, sw, { duration: 550 }); }],
        [2800, function (t) { V7.tap(t, sw); shake(t, write); V7.show(t, tip, { y: 4, duration: 200 }); }],
        [4300, function (t) { V7.hide(t, tip, { y: 2 }); }],
        [4500, function (t) { V7.gone(tip); V7.cursorTo(t, stop, { duration: 550 }); }],
        [5100, function (t) { V7.tap(t, stop); V7.insert(t, banner, { duration: 280 }); running(t, false); }],
        [6600, function (t) { V7.cursorTo(t, resume, { duration: 450 }); }],
        [7100, function (t) { V7.tap(t, resume); V7.remove(t, banner, { duration: 280 }); running(t, true); }]
      ]
    };
  });
})();
// <<< M13
;
// >>> M14 m-xray sample X-ray (spec §6 M14): plays once, 2400ms
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  V7.define('M14', function (root) {
    var rows = V7.$$(root, '.m-xray-row'), fills = V7.$$(root, '.m-xray-row .v7-bar-fill'),
      top = V7.$(root, '.m-xray-top'), start = V7.$(root, '.m-xray-start'), foot = V7.$(root, '.m-xray-foot');
    // targets come from the final markup (--v on each fill)
    var to = fills.map(function (f) { return parseFloat(f.style.getPropertyValue('--v')) || 0; });
    return {
      length: 2400,
      hold: 0,
      arm: function () {
        V7.off(rows);
        fills.forEach(function (f) { f.style.setProperty('--v', '0'); });
        if (top) top.classList.add('is-off');
        V7.off(start);
        V7.off(foot);
      },
      steps: [
        [0, function (tl) { V7.show(tl, rows, { stagger: 80 }); }],
        [100, function (tl) { fills.forEach(function (f, i) { V7.bar(tl, f, to[i], { duration: 600, delay: i * 80 }); }); }],
        [1200, function (tl) { if (top) top.classList.remove('is-off'); V7.pop(tl, start); }],
        [1700, function (tl) { V7.show(tl, foot); }]
      ]
    };
  });
})();
// <<< M14
;
// >>> M15 m-tree goal tree (spec §6 M15) + the P2 Old way / MateOS way toggle and first view (§5 P2). Host mock.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var d = document;
  function treeOf(x) {
    if (!x || x.nodeType !== 1) return null;
    return x.classList.contains('m-tree') ? x : (x.closest('.m-tree') || x.querySelector('.m-tree'));
  }
  function norm(m) { return m === 'old' ? 'old' : 'new'; }
  function figMode(root) { var f = root && root.closest('.v7-figure'); return norm(f && f.getAttribute('data-v7-mode')); }
  // applyMode: swaps texts and styles instantly (CSS keys off data-mode). Used by arm() and by the static toggle.
  function applyMode(root, mode) { root = treeOf(root); if (root) root.setAttribute('data-mode', norm(mode)); }
  V7.treeMode = applyMode;

  function seen(list) { return list.filter(function (e) { return e.getClientRects().length; }); }
  function soft(el, n) { try { return getComputedStyle(el).getPropertyValue(n).trim(); } catch (e) { return ''; } }
  function alpha(c, a) { // '#17BEBB' or 'rgb(…)' → rgba with alpha a (falls back to teal-500)
    var m = /^#([0-9a-f]{6})$/i.exec(c || ''), p = m ? [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16); }) : (String(c).match(/[\d.]+/g) || []).slice(0, 3);
    if (p.length < 3) p = [23, 190, 187];
    return 'rgba(' + p.join(',') + ',' + a + ')';
  }

  V7.define('M15', function (root, tl, o) {
    var mode = norm(o.mode), q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var goal = q('.m-tree-goal'), qm = q('.m-tree-q'), stub = q('.m-tree-stub'), bus = q('.m-tree-bus'), sys = q('.m-tree-sys'), sig = q('.m-tree-sig'),
      vt = qa('.m-tree-v[data-k=top]'), vm = qa('.m-tree-v[data-k=mid]'), vb = qa('.m-tree-v[data-k=bot]'),
      ds = qa('.m-tree-d'), fs = qa('.m-tree-f'), d2 = q('.m-tree-d[data-i="2"]'), f2 = q('.m-tree-f[data-i="2"]');
    // grow the visible connectors with a stagger; settle hidden ones (other layout) instantly, so a resize never shows a gap
    function grow(t, list, opt) {
      var v = seen(list);
      V7.grow(null, list.filter(function (e) { return v.indexOf(e) < 0; }));
      return V7.grow(t, v, opt);
    }
    function arm() {
      applyMode(root, mode);
      V7.off([goal, qm, sys].concat(ds, fs));
      V7.shrink([stub].concat(vt, vm, vb), 'y');
      V7.shrink(bus, 'x');
      V7.off(sig);
    }
    if (mode === 'old') {
      // bottom-up: systems, flows, drivers, then the goal turns out to be a question mark
      var up = !(bus && bus.getClientRects().length); // stacked pairs: build them bottom-up too
      var rf = up ? fs.slice().reverse() : fs, rd = up ? ds.slice().reverse() : ds, rm = up ? vm.slice().reverse() : vm;
      return {
        length: 1800, hold: 400, arm: arm,
        steps: [
          [0, function (t) { V7.show(t, sys); }],
          [300, function (t) { grow(t, vb, { from: 'end', stagger: 80 }); }],
          [500, function (t) { V7.pop(t, rf, { stagger: 100 }); }],
          [800, function (t) { grow(t, rm, { from: 'end', stagger: 80 }); }],
          [1000, function (t) { V7.pop(t, rd, { stagger: 100 }); }],
          [1300, function (t) {
            grow(t, vt, { from: 'end', duration: 150 });
            V7.grow(t, bus, { axis: 'x', from: 'center', duration: 200 });
            V7.grow(t, stub, { from: 'end', duration: 150, delay: 100 });
          }],
          [1500, function (t) { V7.pop(t, qm); }]
        ]
      };
    }
    return {
      length: 3800, hold: 400, arm: arm,
      steps: [
        [0, function (t) { V7.pop(t, goal); }],
        [300, function (t) { V7.grow(t, stub, { duration: 300 }); V7.grow(t, bus, { axis: 'x', from: 'center', duration: 300 }); }],
        [500, function (t) { grow(t, vt, { stagger: 80 }); }],
        [700, function (t) { V7.pop(t, ds, { stagger: 100 }); }],
        [1100, function (t) { grow(t, vm, { stagger: 80 }); }],
        [1300, function (t) { V7.pop(t, fs, { stagger: 100 }); }],
        [1700, function (t) { grow(t, vb, { stagger: 80 }); }],
        [1900, function (t) { V7.show(t, sys); }],
        [2200, function (t) { // the signal: systems → through flow 2 → through driver 2 → goal, 3 hops of 300ms.
          // Hops land on the connectors (not on node text): under flow 2, under driver 2, then the goal.
          if (!sig || !sys || !goal) return;
          var m2 = q('.m-tree-v[data-k=mid][data-i="2"]'), t2 = q('.m-tree-v[data-k=top][data-i="2"]'),
            a = seen([m2]).length ? m2 : f2, b = seen([t2]).length ? t2 : (seen([stub]).length ? stub : d2);
          V7.on(sig); V7.place(sig, sys);
          t.anim(sig, [{ offset: 0, opacity: 0, transform: 'scale(.3)' }], { duration: 160, easing: 'out', fill: 'backwards' });
          V7.travel(t, sig, sys, a || goal, { duration: 300 });
          V7.travel(t, sig, a, b || goal, { duration: 300, delay: 300 });
          V7.travel(t, sig, b, goal, { duration: 300, delay: 600 });
          V7.hide(t, sig, { y: 0, duration: 150, delay: 750 }); // absorbed as it enters the pill: gone at 3100, never resting on the text
        }],
        [3100, function (t) { // the signal lands: status-style ring pulse on the goal (teal = on track)
          t.anim(goal, [{ boxShadow: '0 0 0 0 ' + alpha(soft(goal, '--m-ok'), .5) }, { boxShadow: '0 0 0 12px ' + alpha(soft(goal, '--m-ok'), 0) }], { duration: 800, easing: 'out', fill: 'none' });
        }]
      ]
    };
  });

  // Page behaviour (spec §5 P2, §6 M15): first view at 40% plays the MateOS way once; the toggle replays it in the chosen mode.
  V7.ready(function () {
    var roots = V7.$$(d, '.m-tree[data-v7-mock]');
    roots.forEach(function (root) {
      var c = V7.get(root), fig = root.closest('.v7-figure') || root;
      if (c.noop || c.state === 'final') { applyMode(root, figMode(root)); return; } // static: keep the shown mode in sync
      V7.observe(fig, { enter: .4, leave: .15 }, function (v) {
        if (!v) { c.pause('offscreen'); return; }
        c.resume('offscreen');
        if (!root.__v7seen) { root.__v7seen = 1; c.play(); }
      });
    });

    function target(g, btns) {
      for (var i = 0; i < btns.length; i++) {
        var id = btns[i].getAttribute('aria-controls'), el = id && d.getElementById(id);
        if (el && treeOf(el)) return treeOf(el);
      }
      var sec = g.closest('section');
      return treeOf(sec && sec.querySelector('.m-tree')) || d.querySelector('.m-tree');
    }
    V7.$$(d, '.m-tree-toggle').forEach(function (g) {
      var btns = V7.$$(g, 'button[data-mode]');
      if (!btns.length) return;
      var press = function (m) { btns.forEach(function (x) { x.setAttribute('aria-pressed', norm(x.getAttribute('data-mode')) === m ? 'true' : 'false'); }); };
      var r0 = target(g, btns);
      if (r0) press(figMode(r0));
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var root = target(g, btns);
          if (!root) return;
          var mode = norm(b.getAttribute('data-mode')), cur = figMode(root), fig = root.closest('.v7-figure'), c = V7.get(root);
          press(mode);
          if (fig) fig.setAttribute('data-v7-mode', mode);
          if (V7.static || c.noop || !c.root || c.state === 'final') { c.toFinal(); applyMode(root, mode); return; }
          if (mode === cur && /^(armed|running|paused)$/.test(c.state)) return; // already building this mode
          root.__v7seen = 1;
          c.restart({ mode: mode });
        });
      });
    });

    // Reduced motion switched on mid-session: C1 restores the final markup; keep the chosen mode.
    d.addEventListener('v7:static', function () { roots.forEach(function (r) { applyMode(r, figMode(r)); }); });
  });
})();
// <<< M15
;
// >>> M16 m-bars station chart (Industries spec §3 M16). Plays once at 40% visible.
// Data-driven: rows, values (--v), scale (--max on the root, else the largest --v) and the highlight (.is-hi) come from the
// markup. Armed: labels and tracks stand, bars at zero, values hidden (a structured chart, never an empty card).
// Then the bars grow from the inline-start (stagger 80) while each value rides its bar tip and counts up; the highlighted
// bar overshoots softly, settles, and pulses one soft amber glow. Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var GROW = 900, HI_GROW = 1240, HI_PEAK = .7, OVER = 1.025, STAGGER = 80;
  function num(el, name) { var v = el ? parseFloat(el.style.getPropertyValue(name)) : NaN; return isNaN(v) ? NaN : v; }
  function rgba(c, a) { // '#RRGGBB' or 'rgb(a)(…)' → rgba with alpha a
    var m, s = String(c || '').trim();
    if ((m = s.match(/^#([0-9a-f]{6})$/i))) return 'rgba(' + parseInt(m[1].slice(0, 2), 16) + ',' + parseInt(m[1].slice(2, 4), 16) + ',' + parseInt(m[1].slice(4, 6), 16) + ',' + a + ')';
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) { var p = m[1].split(/[\s,\/]+/); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
    return 'rgba(255,140,66,' + a + ')';
  }
  V7.define('M16', function (root) {
    var rows = V7.$$(root, '.m-bars-row').map(function (r) {
      return { row: r, fill: V7.$(r, '.m-bars-fill'), plot: V7.$(r, '.m-bars-plot'), n: V7.$(r, '.m-bars-n'), v: V7.$(r, '.m-bars-v'),
        val: num(r, '--v') || 0, hi: r.classList.contains('is-hi') };
    });
    var max = num(root, '--max');
    if (!(max > 0)) max = Math.max.apply(null, rows.map(function (o) { return o.val; }).concat([1]));
    var dir = V7.dir(root), fmt;
    try { fmt = new Intl.NumberFormat(document.documentElement.lang || 'en', { maximumFractionDigits: 0 }); } catch (e) { fmt = { format: String }; }
    var last = 0;
    rows.forEach(function (o, i) { var end = i * STAGGER + (o.hi ? HI_GROW : GROW); if (end > last) last = end; });

    function grow(t, o, i) {
      if (!o.fill) return;
      var dl = i * STAGGER, W = o.plot ? o.plot.clientWidth : 0, x = Math.min(o.val / max, 1) * W, s = dir;
      o.fill.style.transform = '';
      if (o.n) V7.on(o.n);
      if (o.hi) { // grow past the end, then settle (the value label rides the same keyframes, so it stays on the tip)
        var e1 = V7.ease.out, e2 = 'cubic-bezier(.45,0,.35,1)';
        t.anim(o.fill, [{ offset: 0, transform: 'scaleX(0)', easing: e1 }, { offset: HI_PEAK, transform: 'scaleX(' + OVER + ')', easing: e2 }, { offset: 1, transform: 'scaleX(1)' }],
          { duration: HI_GROW, delay: dl, easing: 'linear', fill: 'backwards' });
        if (o.n) t.anim(o.n, [{ offset: 0, transform: 'translateX(' + (-x * s) + 'px)', opacity: 0, easing: e1 }, { offset: .12, opacity: 1 },
          { offset: HI_PEAK, transform: 'translateX(' + ((OVER - 1) * x * s) + 'px)', easing: e2 }, { offset: 1, transform: 'translateX(0px)', opacity: 1 }],
          { duration: HI_GROW, delay: dl, easing: 'linear', fill: 'backwards' });
      } else {
        t.anim(o.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: GROW, delay: dl, easing: 'out', fill: 'backwards' });
        if (o.n) t.anim(o.n, [{ offset: 0, transform: 'translateX(' + (-x * s) + 'px)', opacity: 0 }, { offset: .15, opacity: 1 }, { offset: 1, transform: 'translateX(0px)', opacity: 1 }],
          { duration: GROW, delay: dl, easing: 'out', fill: 'backwards' });
      }
      // the value counts while its bar grows (it reaches the value at the bar's peak, never above it)
      if (o.v) {
        // While it counts, the unit (" h", the nodes after the number) rides in the number's own text node: the label's
        // start never moves and only its end grows, so there is no text shift and no gap before the unit. The markup's
        // nodes come back when the count lands.
        var to = Math.round(o.val), tail = [], nd = o.v.nextSibling;
        while (nd) { tail.push(nd); nd = nd.nextSibling; }
        var unit = tail.map(function (x) { return x.textContent; }).join('');
        var set = function (p) { o.v.textContent = fmt.format(Math.round(to * p)) + unit; };
        tail.forEach(function (x) { x.parentNode.removeChild(x); });
        set(0);
        t.after(dl, function (t2) {
          t2.tween(o.hi ? HI_GROW * HI_PEAK : GROW * .8, 'out', set, function () {
            o.v.textContent = fmt.format(to);
            tail.forEach(function (x) { o.n.appendChild(x); });
          });
        });
      }
    }
    function glow(t, o) { // one soft amber pulse around the highlighted bar
      if (!o || !o.fill) return;
      var c = '';
      try { c = getComputedStyle(o.fill).backgroundColor; } catch (e) {}
      t.anim(o.fill, [
        { boxShadow: '0 0 0 0 ' + rgba(c, .5) + ',0 0 0 0 ' + rgba(c, 0) },
        { offset: .3, boxShadow: '0 0 0 4px ' + rgba(c, .2) + ',0 0 18px 3px ' + rgba(c, .35) },
        { boxShadow: '0 0 0 9px ' + rgba(c, 0) + ',0 0 26px 6px ' + rgba(c, 0) }
      ], { duration: 1100, easing: 'out', fill: 'none' });
    }

    var steps = [[0, function (t) { rows.forEach(function (o, i) { grow(t, o, i); }); }]];
    rows.forEach(function (o, i) { if (o.hi) steps.push([i * STAGGER + Math.round(HI_GROW * HI_PEAK) - 60, function (t) { glow(t, o); }]); });
    return {
      length: last + 400, hold: 0,
      arm: function () {
        rows.forEach(function (o) {
          if (o.fill) o.fill.style.transform = 'scaleX(0)';
          V7.off(o.n);
        });
      },
      steps: steps
    };
  });
})();
// <<< M16
;
// >>> M17 m-ask phone Q&A (Industries spec §3 M17). Loops while visible: data-v7-runs runs (spec maxLoops 2) in one
// controller cycle, so the phone is never faded out as a whole: between runs today's messages slide down and fade back
// to yesterday's dimmed exchange, and the last run ends on the exact final markup.
// Data-driven from the markup: beats (.m-phone-msgs > [data-v7-at]) appear at their time; a Mate beat with
// data-v7-think shows the typing bubble that long first (and marks the rep's earlier messages read); [data-v7-pop]
// children pop after their beat; .m-ask-card rows check at their data-v7-at.
// Transform-only chat: the stack is top-anchored while it plays and moved with translateY so its bottom stays pinned
// above the input; a new message is laid out below the clip and slides up into view. Nothing above it moves in layout.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var PAD = 12, RESET = 650, SLIDE = 320;
  function n(el, a, d) { var v = el ? parseFloat(el.getAttribute(a)) : NaN; return isNaN(v) ? d : v; }
  V7.define('M17', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var body = $('.m-phone-body'), msgs = $('.m-phone-msgs'), typing = $('.m-ask-typing');
    var beats = $$('.m-phone-msgs > [data-v7-at]'), pops = $$('.m-phone-msgs [data-v7-pop]'),
      rows = $$('.m-ask-card [data-v7-at]'), checks = $$('.m-ask-card .m-ask-ok'),
      ticks = beats.reduce(function (a, b) { return a.concat(V7.$$(b, '.m-phone-ticks')); }, []);
    var RUN = n(root, 'data-v7-run', 9000), RUNS = Math.max(1, Math.round(n(root, 'data-v7-runs', 1))),
      LEN = (RUNS - 1) * (RUN + RESET) + RUN, ty = 0;

    // --- the stack: top-anchored while playing, translateY keeps its bottom PAD above the input
    function curY() {
      try {
        var tr = getComputedStyle(msgs).transform, m = tr && tr !== 'none' && tr.match(/matrix(3d)?\(([^)]+)\)/);
        if (m) { var v = m[2].split(',').map(parseFloat); return m[1] ? v[13] : v[5]; }
      } catch (e) {}
      return ty;
    }
    function slide(t, to, o) {
      if (!msgs) return;
      var from = t ? curY() : to;
      ty = to; msgs.style.transform = 'translateY(' + to + 'px)';
      if (t && Math.abs(from - to) > .5) t.anim(msgs, [{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(' + to + 'px)' }],
        { duration: (o && o.duration) || SLIDE, easing: (o && o.easing) || 'out', fill: 'backwards' });
    }
    function bottom(h) { return (body ? body.clientHeight : 0) - PAD - h; }
    function pin(t, o) { if (msgs) slide(t, bottom(msgs.offsetHeight), o); }
    function enter(t, el) { // lay the element out at the bottom (below the clip), then slide the stack up by its height
      if (!el) return;
      V7.on(el);
      pin(t);
      var b = el.querySelector('.m-phone-b, .m-ask-sys') || el;
      t.anim(b, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'out', fill: 'backwards' });
    }
    function startLook() { // today's beats gone, ticks unread, pops off, card rows waiting (instant)
      V7.gone(beats); V7.gone(typing); V7.off(pops); V7.off(checks);
      ticks.forEach(function (k) { k.classList.remove('is-read'); });
      rows.forEach(function (r) { r.classList.add('is-wait'); });
    }

    var steps = [];
    for (var k = 0; k < RUNS; k++) (function (b, k) {
      function at(ms, f) { steps.push([b + ms, f]); }
      if (k) {
        // scroll back: today's messages slide down and fade while yesterday's exchange comes back into view
        steps.push([b - RESET, function (t) {
          var live = beats.filter(function (e) { return !e.hasAttribute('data-v7-gone'); }), keep = beats[0] ? beats[0].offsetTop : 0;
          V7.gone(typing);
          V7.hide(t, live, { y: 0, duration: 300 });
          slide(t, bottom(keep), { duration: 600, easing: 'inOut' });
          V7.hide(t, checks, { y: 0, duration: 200 });
          rows.forEach(function (r) { r.classList.add('is-wait'); });
          t.after(620, function () { startLook(); });
        }]);
      } else at(0, function () { pin(null); }); // re-measure once fonts have settled
      beats.forEach(function (el, i) {
        var when = n(el, 'data-v7-at', 0), think = n(el, 'data-v7-think', 0);
        if (think > 0) at(when - think, function (t) {
          beats.slice(0, i).forEach(function (p) { V7.$$(p, '.m-phone-ticks').forEach(function (x) { x.classList.add('is-read'); }); });
          enter(t, typing);
        });
        at(when, function (t) {
          if (think > 0) V7.gone(typing); // the typing bubble gives way to the message it announced
          enter(t, el);
        });
        V7.$$(el, '[data-v7-pop]').forEach(function (p) { at(when + n(p, 'data-v7-pop', 0), function (t) { V7.pop(t, p); }); });
      });
      rows.forEach(function (r) {
        at(n(r, 'data-v7-at', 0), function (t) {
          r.classList.remove('is-wait');
          V7.pop(t, r.querySelector('.m-ask-ok'), { from: .6 });
          V7.flash(t, r, { tone: 'mate', duration: 900 });
        });
      });
    })(k * (RUN + RESET), k);
    // the end: every tick read, and the stack handed back to its CSS bottom anchoring (same look)
    steps.push([LEN, function () {
      ticks.forEach(function (x) { x.classList.add('is-read'); });
      if (msgs) msgs.style.top = msgs.style.bottom = msgs.style.transform = '';
    }]);

    return {
      length: LEN, hold: 600, loop: false,
      arm: function () {
        startLook();
        if (msgs) { msgs.style.top = '0'; msgs.style.bottom = 'auto'; pin(null); }
      },
      steps: steps
    };
  });
})();
// <<< M17
;
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
;
// >>> M19 m-eng engagement timeline (How We Work spec §2 M19), W1 hero. Loops while visible: maxLoops 2, selfExit.
// Armed: the five steps stand as dim ghosts (frame, number, name, artifact in its start look), never an empty window.
// A run dot rides the rail from number to number while the rail fills; each step lights (tone border, 300ms), then its
// artifact plays: the station blocks grow and the 44 h block turns amber, the checks draw, the pill pops (Run), the number
// counts and the bar fills (Measure), the exception rings, the arrow slides and the rule fills its dashed slot, then
// "Rule R-14 added" lands (Improve). Hold on all five lit, then restart. Each cycle ends on the final markup (all lit), so a later
// cycle or a replay starts with a copy of that lit look laid over the armed ghost and fades it out (no blank frame).
// Emits v7:stage {stage:'listen'|'build'|'run'|'measure'|'improve'} as each step lights (optional page sync).
// Transform, opacity and short colour changes only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var STUB = 4, LEAD = 700; // px every station block starts at · the fade a later cycle opens with
  function cs(el) { try { return getComputedStyle(el); } catch (e) { return null; } }
  function from(el, props) { // the current computed values of props, as a WAAPI start keyframe ([keyframe prop, computed prop])
    var s = cs(el), k = { offset: 0 };
    if (s) props.forEach(function (p) { k[p[0]] = s[p[1] || p[0]]; });
    return k;
  }
  function tok(el, name) { var s = cs(el); return s ? s.getPropertyValue(name).trim() : ''; } // a custom property's value
  function rm(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }

  V7.define('M19', function (root) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    // every element is looked up here, before arm() can add the lit copy (the veil) to the root
    var inner = $('.m-eng-in'), dot = $('.m-eng-dot');
    var S = $$('.m-eng-step').map(function (li) {
      return { li: li, num: $('.m-eng-num', li), n: $('.m-eng-n', li), card: $('.m-eng-card', li), kids: $$(':scope > .m-eng-card > *', li),
        fill: $('.m-eng-fill', li), tone: li.getAttribute('data-tone') || 'you', stage: li.getAttribute('data-stage') || '' };
    });
    var bars = $$('.m-eng-bar'), hi = $('.m-eng-bars > li.is-hi'), hiBar = hi && $('.m-eng-bar', hi), hiLbl = hi && $('.m-eng-bl', hi),
      chks = $$('.m-eng-chk'), boxes = $$('.m-eng-box'), ticks = $$('.m-eng-box path'),
      fromEl = $('.m-eng-from'), to = $('.m-eng-to'), mfill = $('.m-eng-mbar .v7-bar-fill'), mtick = $('.m-eng-mbar .v7-bar-tick'),
      pill = $('.m-eng-pill'), exc = $('.m-eng-exc'), larr = $('.m-eng-larr'), rule = $('.m-eng-rule'), rin = $('.m-eng-rin'),
      added = $('.m-eng-added');
    var mTo = mfill ? parseFloat(mfill.style.getPropertyValue('--v')) : NaN, mFrom = mtick ? parseFloat(mtick.style.getPropertyValue('--at')) : NaN,
      nTo = to ? parseFloat(to.textContent) : NaN, nFrom = fromEl ? parseFloat(fromEl.textContent) : NaN;
    if (isNaN(mTo)) mTo = .51;
    if (isNaN(mFrom)) mFrom = .06;
    if (isNaN(nTo)) nTo = 51;
    if (isNaN(nFrom)) nFrom = 6;
    var again = !!root.__m19ran, R = again ? LEAD : 0, veil = null;

    function lay() { // a copy of the lit look over the root's content; it fades out at step 0
      if (!inner) return;
      veil = inner.cloneNode(true);
      [veil].concat(V7.$$(veil, '[id]')).forEach(function (e) { e.removeAttribute('id'); });
      veil.style.cssText = 'position:absolute;inset:0 0 auto 0;margin:0;pointer-events:none';
      root.appendChild(veil);
    }
    function pulse(t, el, color, size) { // one soft ring out of el, in its tone
      if (el && color) t.anim(el, [{ boxShadow: '0 0 0 0 ' + color }, { boxShadow: '0 0 0 ' + size + 'px transparent' }], { duration: 700, easing: 'out', fill: 'none' });
    }
    function light(t, i) { // ghost → lit: tone border and number (300ms), content back to full strength, a ring off the number
      var s = S[i];
      if (!s || !s.card) return;
      var kc = from(s.card, [['borderColor', 'borderTopColor'], ['backgroundColor'], ['boxShadow']]),
        kn = s.n ? from(s.n, [['borderColor', 'borderTopColor'], ['backgroundColor'], ['color']]) : null, soft = tok(s.li, '--t-soft');
      s.li.removeAttribute('data-ghost');
      t.anim(s.card, [kc], { duration: 300, easing: 'out', fill: 'backwards' });
      if (kn) t.anim(s.n, [kn], { duration: 300, easing: 'out', fill: 'backwards' });
      s.kids.forEach(function (k) { t.anim(k, [{ offset: 0, opacity: .4 }], { duration: 300, easing: 'out', fill: 'backwards' }); });
      pulse(t, s.num, soft, 7);
      if (s.stage) V7.emit(root, 'v7:stage', { stage: s.stage });
    }
    function hop(t, i) { // the dot rides from number i to number i+1 (behind the discs) while segment i fills
      var a = S[i], b = S[i + 1];
      if (!a || !b || !dot) return;
      dot.setAttribute('data-tone', a.tone);
      V7.on(dot);
      V7.travel(t, dot, a.num, b.num, { duration: 560, easing: 'inOut' });
      V7.grow(t, a.fill, { axis: 'y', duration: 560, easing: 'inOut' });
    }
    function stations(t) { // every block grows from the shared stub to its hours, left to right
      bars.forEach(function (b, i) {
        var s = b.__m19s || 1;
        b.style.transform = '';
        t.anim(b, [{ offset: 0, transform: 'scaleY(' + s + ')' }], { duration: 440, delay: i * 70, easing: 'out', fill: 'backwards' });
      });
    }
    function bottleneck(t) { // the 44 h block turns amber and rings once
      if (!hi) return;
      var kb = hiBar ? from(hiBar, [['backgroundColor']]) : null, kl = hiLbl ? from(hiLbl, [['color']]) : null;
      hi.classList.add('is-hi');
      if (kb) t.anim(hiBar, [kb], { duration: 320, easing: 'out', fill: 'backwards' });
      if (kl) t.anim(hiLbl, [kl], { duration: 320, easing: 'out', fill: 'backwards' });
      if (hiBar) pulse(t, hiBar, tok(hiBar, '--m-you-soft'), 5);
    }
    function check(t, i) { // the box fills in teal, its check draws, the chip settles
      var b = boxes[i], p = ticks[i];
      if (!b) return;
      var k = from(b, [['borderColor', 'borderTopColor'], ['backgroundColor']]);
      b.removeAttribute('data-unchecked');
      t.anim(b, [k], { duration: 200, easing: 'out', fill: 'backwards' });
      t.anim(b, [{ offset: 0, transform: 'scale(.7)' }], { duration: 320, easing: 'pop', fill: 'backwards' });
      if (p) V7.draw(t, p, { duration: 280, delay: 90 });
    }
    function learn(t) { // the dashed slot fills: the rule chip takes its colour and its label pops in
      if (!rule) return;
      var k = from(rule, [['borderColor', 'borderTopColor'], ['backgroundColor']]);
      rule.removeAttribute('data-pending');
      t.anim(rule, [k], { duration: 260, easing: 'out', fill: 'backwards' });
      t.anim(rule, [{ offset: 0, transform: 'scale(.86)' }], { duration: 380, easing: 'pop', fill: 'backwards' });
      if (rin) t.anim(rin, [{ offset: 0, opacity: 0 }], { duration: 260, delay: 60, easing: 'out', fill: 'backwards' });
      pulse(t, rule, tok(rule, '--m-ok-soft'), 6);
    }

    return {
      length: R + 8600,
      hold: 2600,
      maxLoops: 2,
      selfExit: true,
      arm: function () {
        // a later cycle: the lit copy covers the root while it fades; the armed "—" stays hidden under it until it is gone,
        // or the fading "51%" and the dash would print over each other ("—51%")
        if (again) { lay(); if (veil && to) V7.off(to); }
        S.forEach(function (s) { s.li.setAttribute('data-ghost', ''); if (s.fill) V7.shrink(s.fill, 'y'); });
        bars.forEach(function (b) { var h = b.offsetHeight || STUB; b.__m19s = Math.min(1, STUB / h); b.style.transform = 'scaleY(' + b.__m19s + ')'; });
        if (hi) hi.classList.remove('is-hi');
        boxes.forEach(function (b) { b.setAttribute('data-unchecked', ''); });
        V7.undraw(ticks);
        if (to) to.textContent = '—'; // the target number is not known yet; the count starts from the baseline
        if (mfill) mfill.style.setProperty('--v', mFrom);
        if (pill) { pill.style.transition = 'none'; pill.setAttribute('data-tone', 'neutral'); }
        if (rule) rule.setAttribute('data-pending', '');
        V7.off(larr); V7.off(added);
        if (dot) { V7.gone(dot); dot.removeAttribute('data-tone'); }
      },
      steps: [
        [0, function (t) {
          root.__m19ran = true;
          if (!veil) return;
          var v = veil;
          t.anim(v, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
          t.after(440, function (t2) { rm(v); if (to) V7.show(t2, to, { y: 0, duration: 200 }); });
        }],
        // 1 · Listen
        [R, function (t) { light(t, 0); }],
        [R + 250, function (t) { stations(t); }],
        [R + 1000, function (t) { bottleneck(t); }],
        [R + 1450, function (t) { hop(t, 0); }],
        // 2 · Build
        [R + 2000, function (t) { light(t, 1); }],
        [R + 2200, function (t) { chks.forEach(function (c, i) { t.after(i * 170, function (t2) { check(t2, i); }); }); }],
        [R + 3050, function (t) { hop(t, 1); }],
        // 3 · Run
        [R + 3600, function (t) { light(t, 2); }],
        [R + 3800, function (t) {
          if (!pill) return;
          pill.style.transition = '';
          V7.status(t, pill, 'ok');
          t.anim(pill, [{ offset: 0, transform: 'scale(.86)' }], { duration: 380, easing: 'pop', fill: 'backwards' });
        }],
        [R + 4350, function (t) { hop(t, 2); }],
        // 4 · Measure
        [R + 4900, function (t) { light(t, 3); }],
        [R + 5100, function (t) {
          V7.count(t, to, { from: nFrom, to: nTo, duration: 1000, suffix: '%' });
          V7.bar(t, mfill, mTo, { duration: 1000, easing: 'cubic-bezier(.33,1,.68,1)' }); // the count's ease (outCubic), so number and bar move together
        }],
        [R + 6250, function (t) { hop(t, 3); }],
        // 5 · Improve
        [R + 6800, function (t) { light(t, 4); }],
        [R + 7000, function (t) { if (exc) pulse(t, exc, tok(exc, '--m-you-soft'), 6); }],
        [R + 7300, function (t) { V7.show(t, larr, { x: -6, y: 0, duration: 260 }); }],
        [R + 7500, function (t) { learn(t); }],
        [R + 8050, function (t) { V7.show(t, added, { y: 4, duration: 260 }); }],
        [R + 8500, function () { if (dot) { V7.gone(dot); dot.removeAttribute('data-tone'); } }]
      ]
    };
  });
})();
// <<< M19
;
// >>> M20 m-deal agreement card (How We Work spec §2 M20), W3. Plays once at 40% visible; the pause button replays it.
// Armed: a blank form, never an empty card. Header and labels stand; each value is a row of placeholder lines (one per
// line of its final text), the red-line chips are dashed outlines, the signature lines are blank, the stamp is away.
// Then: the success bar and the stop rule type in, the red-line chips pop, the two signatures draw, the stamp lands
// with a slight rotate and settles at -4°. A replay starts with a copy of the signed card fading out over the blank
// form, so the card never jumps to empty. Transform, opacity, stroke-dashoffset and short colour changes only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var LEAD = 560, PH = [['82%', '58%', '40%'], ['74%', '50%', '40%']]; // the replay fade · placeholder widths per line
  function rm(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }

  V7.define('M20', function (root) {
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    // every element is looked up here, before arm() can add the signed copy (the veil) to the root
    var inner = $('.m-deal-in');
    var vals = $$('.m-deal-v').map(function (dd) { var t = $(':scope > .m-deal-t', dd); return t ? { dd: dd, t: t } : null; }).filter(Boolean),
      chips = $$('.m-deal-chip'), inks = $$('.m-deal-ink path'), stamp = $('.m-deal-stamp');
    var again = !!root.__m20ran, R = again ? LEAD : 0, veil = null;

    function lay() { // a copy of the signed card over the root's content; it fades out at step 0
      if (!inner) return;
      veil = inner.cloneNode(true);
      [veil].concat(V7.$$(veil, '[id]')).forEach(function (e) { e.removeAttribute('id'); });
      veil.style.cssText = 'position:absolute;inset:0 0 auto 0;margin:0;pointer-events:none';
      root.appendChild(veil);
    }
    function blank(v, i) { // the value keeps its space; one placeholder line per line of its final text
      var lh = parseFloat(getComputedStyle(v.dd).lineHeight) || 20, n = Math.max(1, Math.round(v.dd.clientHeight / lh)),
        ph = document.createElement('span'), w = PH[i % PH.length];
      ph.className = 'm-deal-ph';
      ph.style.paddingTop = Math.max(0, (lh - 8) / 2) + 'px';
      ph.style.rowGap = Math.max(0, lh - 8) + 'px';
      for (var k = 0; k < n; k++) { var b = document.createElement('i'); b.style.width = n > 1 && k === n - 1 ? w[2] : w[k ? 1 : 0]; ph.appendChild(b); }
      var ty = document.createElement('span');
      ty.className = 'm-deal-ty';
      v.dd.appendChild(ph); v.dd.appendChild(ty);
      v.ph = ph; v.ty = ty; v.html = v.t.innerHTML; v.text = v.t.textContent;
      V7.off(v.t);
    }
    function write(t, i, dur) { // the placeholder lines fade, the text types over the hidden original, then they swap
      var v = vals[i];
      if (!v || !v.ty) return;
      V7.hide(t, v.ph, { y: 0, duration: 160 });
      V7.type(t, v.ty, v.text, { duration: dur, html: v.html, delay: 120 });
      t.after(120 + dur + 420, function () { V7.on(v.t); rm(v.ty); rm(v.ph); }); // after the caret has gone
    }
    function chip(t, c) { // dashed outline → the red line, popping in
      var kids = $$(':scope > *', c);
      c.removeAttribute('data-ghost');
      t.anim(c, [{ offset: 0, transform: 'scale(.92)', backgroundColor: 'transparent' }], { duration: 300, easing: 'pop', fill: 'backwards' });
      kids.forEach(function (k) { t.anim(k, [{ offset: 0, opacity: 0 }], { duration: 220, easing: 'out', fill: 'backwards' }); });
    }

    return {
      length: R + 5000,
      hold: 0,
      arm: function () {
        if (again) lay();
        vals.forEach(blank);
        chips.forEach(function (c) { c.setAttribute('data-ghost', ''); });
        V7.undraw(inks);
        V7.off(stamp);
      },
      steps: [
        [0, function (t) {
          root.__m20ran = true;
          if (!veil) return;
          var v = veil;
          t.anim(v, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
          t.after(440, function () { rm(v); });
        }],
        [R, function (t) { write(t, 0, 1050); }],                  // Success bar
        [R + 1250, function (t) { write(t, 1, 950); }],            // Stop rule
        [R + 2350, function (t) { chips.forEach(function (c, i) { t.after(i * 140, function (t2) { chip(t2, c); }); }); }],
        [R + 3000, function (t) { V7.draw(t, inks[0], { duration: 760, easing: 'cubic-bezier(.45,.05,.55,.95)' }); }],
        [R + 3800, function (t) { V7.draw(t, inks[1], { duration: 700, easing: 'cubic-bezier(.45,.05,.55,.95)' }); }],
        [R + 4520, function (t) { // the stamp lands: big and tilted, a little past, then -4°
          if (!stamp) return;
          V7.on(stamp);
          t.anim(stamp, [
            { offset: 0, opacity: 0, transform: 'rotate(-15deg) scale(1.55)' },
            { offset: .55, opacity: 1, transform: 'rotate(-2.5deg) scale(.96)' },
            { offset: 1, opacity: 1, transform: 'rotate(-4deg) scale(1)' }
          ], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
        }]
      ]
    };
  });
})();
// <<< M20
;
// >>> M21 m-bound data boundary (Security spec §2 M21) + its deployment toggle. Loop mock: one deployment mode per cycle.
// Every cycle (7s): read pulses run from the four systems into Mate (indigo), Mate calls the model API across the
// boundary (indigo, through the packet pill) and gets a plain reply, Mate hands the draft to the person (amber), the
// person's approval goes out (teal), and each step appends a line to the audit strip. The armed look is the complete
// diagram with the previous run's audit lines, never an empty frame. Autoplay walks cloud → DMZ → on-prem twice
// (maxLoops 6) and rests on cloud; a toggle pick (click, arrows, or focus on the toggle) stops the walk and keeps that
// mode (3 more cycles, then rest; a user pause stays in force). Pulses are dashes on a pixel overlay; only stroke-dashoffset, transform and opacity
// animate. The mode is the figure's data-v7-mode (outside the mock), so restoring the snapshot never resets it.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var d = document, NS = 'http://www.w3.org/2000/svg', MODES = ['cloud', 'dmz', 'onprem'];
  // Audit strings: <html lang> picks the table (Hebrew on /he/); the English values are the original literals.
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he';
  var T = HE ? { read: { cloud: 'קרא מה-ERP', dmz: 'קרא מה-ERP דרך API', onprem: 'קרא מהמחסן' }, mail: 'קרא את תיבת הדואר', dana: 'דנה ק.', ok: 'אישרה', sent: 'נשלח', logged: 'תועד' }
    : { read: { cloud: 'read ERP', dmz: 'read ERP via API', onprem: 'read Warehouse' }, mail: 'read Mailbox', dana: 'Dana K.', ok: 'approved', sent: 'sent', logged: 'logged' };
  var EARLIER = [['09:28', 'mate', 'Mate', T.mail], ['09:29', 'you', T.dana, T.ok], ['09:29', 'ok', T.sent, T.logged]];
  // pulse layers: [dash length, stroke width, opacity] — a faint long tail, a brighter middle, a bright head, a soft glow
  var LAYERS = [[46, 2, .22], [26, 2.25, .5], [10, 3, 1], [18, 8, .16]];

  function norm(m) { return MODES.indexOf(m) < 0 ? 'cloud' : m; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function rm(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function shown(el) { try { return !!(el && el.isConnected && el.getClientRects().length && getComputedStyle(el).display !== 'none'); } catch (e) { return false; } }
  function figOf(el) { return el && el.closest ? el.closest('.m-bound-fig') : null; }
  function modeOf(fig) { return norm(fig && fig.getAttribute('data-v7-mode')); }
  // The mode: the figure attribute (CSS swaps the labels) and the toggle's checked radio + roving tab stop.
  function setMode(fig, m) {
    if (!fig) return;
    m = norm(m);
    if (fig.getAttribute('data-v7-mode') !== m) fig.setAttribute('data-v7-mode', m);
    V7.$$(fig, '.m-bound-toggle [data-mode]').forEach(function (b) {
      var on = b.getAttribute('data-mode') === m;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }
  V7.boundMode = setMode;

  // A run's three audit lines. Minutes advance 3 per cycle (cycle 5 ends at 09:47); cycle 0 equals the final markup.
  function run(k, mode) {
    var m = 31 + 3 * k;
    return [['09:' + pad(m), 'mate', 'Mate', T.read[mode]], ['09:' + pad(m + 1), 'you', T.dana, T.ok], ['09:' + pad(m + 1), 'ok', T.sent, T.logged]];
  }
  function entry(e) {
    var li = d.createElement('li'), t = d.createElement('span'), b = d.createElement('b'), a = d.createElement('span');
    li.setAttribute('data-tone', e[1]); t.className = 'm-bound-t';
    t.textContent = e[0]; b.textContent = e[2]; a.textContent = e[3];
    li.appendChild(t); li.appendChild(b); li.appendChild(a);
    return li;
  }
  function fill(ol, list) { if (!ol) return; ol.textContent = ''; list.forEach(function (e) { ol.appendChild(entry(e)); }); }
  // Append: the new line enters below the three visible ones; the list slides up one row (transform), the oldest fades.
  function append(t, ol, e) {
    if (!ol) return;
    var li = entry(e), first = ol.firstElementChild;
    ol.appendChild(li);
    if (!first || !t || !shown(ol)) { if (ol.children.length > 3) rm(first); return; }
    var h = first.offsetHeight || 20,
      a = t.anim(ol, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-h) + 'px)' }], { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }),
      b = t.anim(first, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
    t.anim(li, [{ opacity: 0, transform: 'translateX(' + (-8 * V7.dir(ol)) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 80, easing: 'out', fill: 'backwards' });
    t.after(460, function () { rm(first); try { if (a) a.cancel(); if (b) b.cancel(); } catch (x) {} });
  }

  // ---------- routes: the static wires (0–100 boxes) mapped to the diagram's pixel space ----------
  function parse(s) { // M / L / C with absolute pairs only → [{c, p:[[x,y]…]}]
    var out = [], cur = null, x = null;
    (String(s || '').match(/[MLC]|-?\d*\.?\d+/g) || []).forEach(function (k) {
      if (k === 'M' || k === 'L' || k === 'C') { cur = { c: k, p: [] }; out.push(cur); x = null; return; }
      if (!cur) return;
      if (x === null) x = +k; else { cur.p.push([x, +k]); x = null; }
    });
    return out;
  }
  function reverse(cmds) {
    var segs = [], pt = null, out, i, s;
    cmds.forEach(function (c) {
      if (c.c === 'M') { if (!pt) pt = c.p[c.p.length - 1]; else c.p.forEach(function (q) { segs.push({ c: 'L', a: pt, p: [q] }); pt = q; }); return; }
      if (c.c === 'L') c.p.forEach(function (q) { segs.push({ c: 'L', a: pt, p: [q] }); pt = q; });
      if (c.c === 'C') for (var j = 0; j + 2 < c.p.length; j += 3) { segs.push({ c: 'C', a: pt, p: c.p.slice(j, j + 3) }); pt = c.p[j + 2]; }
    });
    if (!pt) return cmds;
    out = [{ c: 'M', p: [pt] }];
    for (i = segs.length - 1; i >= 0; i--) {
      s = segs[i];
      out.push(s.c === 'L' ? { c: 'L', p: [s.a] } : { c: 'C', p: [s.p[1], s.p[0], s.a] });
    }
    return out;
  }
  function str(cmds) { return cmds.map(function (c) { return c.c + c.p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); }).join(''); }
  // data-p tokens: key[:order][~]. The visible paths of one key, in order, joined into one stroke in dia pixels.
  function route(dia, key) {
    var parts = [], out = [];
    V7.$$(dia, '.m-bound-w path[data-p]').forEach(function (p) {
      if (!shown(p)) return;
      p.getAttribute('data-p').split(/\s+/).forEach(function (tok) {
        var m = /^([a-z0-9]+)(?::(\d+))?(~)?$/i.exec(tok);
        if (m && m[1] === key) parts.push({ el: p, n: +(m[2] || 1), rev: !!m[3] });
      });
    });
    if (!parts.length) return null;
    parts.sort(function (a, b) { return a.n - b.n; });
    var D = dia.getBoundingClientRect(), sx = dia.offsetWidth ? D.width / dia.offsetWidth : 1, sy = dia.offsetHeight ? D.height / dia.offsetHeight : 1;
    parts.forEach(function (pt, i) {
      var svg = pt.el.ownerSVGElement, r = svg.getBoundingClientRect(), flip = V7.dir(svg) < 0, cmds = parse(pt.el.getAttribute('d'));
      if (pt.rev) cmds = reverse(cmds);
      cmds.forEach(function (c, j) {
        out.push({ c: c.c === 'M' && i ? 'L' : c.c, p: c.p.map(function (q) {
          var u = flip ? 100 - q[0] : q[0];
          return [(r.left - D.left + u / 100 * r.width) / (sx || 1), (r.top - D.top + q[1] / 100 * r.height) / (sy || 1)];
        }) });
      });
    });
    return out;
  }
  function layer(dia) { // the pulse overlay, sized to the diagram in pixels (made per cycle; the snapshot restore drops it)
    var s = null;
    for (var i = 0; i < dia.children.length; i++) if (dia.children[i].classList.contains('m-bound-fx')) s = dia.children[i];
    if (!s) { s = d.createElementNS(NS, 'svg'); s.setAttribute('class', 'm-bound-fx'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); dia.appendChild(s); }
    s.setAttribute('viewBox', '0 0 ' + Math.max(1, dia.offsetWidth) + ' ' + Math.max(1, dia.offsetHeight));
    return s;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // One pulse along a route: a comet of dashes whose head runs from the start to past the end at constant speed.
  // o: {delay, dur:[msPerPx, min, max], back, at: element whose centre the head passes (→ o.pass(t) at that moment)}.
  // Returns the ms (from now) when the head reaches the end, or 0 when the route is not shown.
  function pulse(t, dia, key, tone, o) {
    o = o || {};
    var cmds = dia && shown(dia) ? route(dia, key) : null;
    if (!cmds || !t) return 0;
    if (o.back) cmds = reverse(cmds);
    var s = layer(dia), g = d.createElementNS(NS, 'g'), dstr = str(cmds), ps = [], L = 0, i;
    g.setAttribute('class', 'm-bound-pz'); g.setAttribute('data-tone', tone);
    for (i = 0; i < LAYERS.length; i++) {
      var p = d.createElementNS(NS, 'path');
      p.setAttribute('d', dstr); p.setAttribute('stroke-width', LAYERS[i][1]); p.setAttribute('opacity', LAYERS[i][2]);
      g.appendChild(p); ps.push(p);
    }
    s.appendChild(g);
    try { L = ps[0].getTotalLength(); } catch (e) { L = 0; }
    if (!(L > 1)) { rm(g); return 0; }
    var sc = Math.min(1, L * .6 / LAYERS[0][0]), Dm = LAYERS[0][0] * sc, sp = o.dur || [8, 520, 900],
      dur = clamp(L * sp[0], sp[1], sp[2]), del = +o.delay || 0, run = L + Dm + 4;
    ps.forEach(function (p, j) {
      var D = LAYERS[j][0] * sc;
      p.style.strokeDasharray = D + 'px ' + (L + Dm + 40) + 'px';
      t.anim(p, [{ strokeDashoffset: D + 'px' }, { strokeDashoffset: (D - run) + 'px' }], { duration: dur, delay: del, easing: 'linear', fill: 'both' });
    });
    t.after(del + dur + 30, function () { rm(g); });
    if (o.at && o.pass && shown(o.at)) { // when the head passes the element's centre (closest point of the route)
      var D0 = dia.getBoundingClientRect(), r = o.at.getBoundingClientRect(), k = dia.offsetWidth ? D0.width / dia.offsetWidth : 1,
        cx = (r.left + r.width / 2 - D0.left) / k, cy = (r.top + r.height / 2 - D0.top) / k, best = 0, bd = Infinity, n = 48;
      for (i = 0; i <= n; i++) {
        var q = ps[0].getPointAtLength(L * i / n), dd = (q.x - cx) * (q.x - cx) + (q.y - cy) * (q.y - cy);
        if (dd < bd) { bd = dd; best = L * i / n; }
      }
      t.after(del + dur * best / run, o.pass);
    }
    return del + dur * L / run;
  }
  // Ring: the node's .m-bound-ring grows ~7px on every side and fades (transform + opacity)
  function ring(t, node, o) {
    var r = null;
    o = o || {};
    if (node) for (var i = 0; i < node.children.length; i++) if (node.children[i].classList.contains('m-bound-ring')) r = node.children[i];
    if (!t || !r || !shown(r)) return;
    var w = r.offsetWidth || 40, h = r.offsetHeight || 40, gr = o.grow || 7;
    t.anim(r, [{ opacity: o.from || .75, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(' + (1 + 2 * gr / w).toFixed(3) + ',' + (1 + 2 * gr / h).toFixed(3) + ')' }],
      { duration: o.duration || 720, delay: o.delay || 0, easing: 'out', fill: 'none' });
  }
  function bump(t, el, s, o) {
    if (!t || !shown(el)) return;
    t.anim(el, [{ transform: 'scale(1)' }, { offset: .35, transform: 'scale(' + (s || 1.04) + ')' }, { transform: 'scale(1)' }],
      { duration: (o && o.duration) || 420, delay: (o && o.delay) || 0, easing: 'ease-out', fill: 'none' });
  }

  V7.define('M21', function (root, tl, o) {
    var fig = figOf(root), pick = fig && fig.__mbPick ? norm(fig.__mbPick) : '', k = o.cycle | 0, mode = pick || MODES[k % 3];
    var q = function (s) { return root.querySelector(s); };
    var dia = q('.m-bound-dia'), ol = q('.m-bound-log ol'), mate = q('.m-bound-mate'), api = q('.m-bound-api'),
      person = q('.m-bound-person'), sent = q('.m-bound-sent'), ok = q('.m-bound-ok'), lines = run(k, mode);
    function pill() { return q('.m-bound-pkt > [data-m~="' + modeOf(fig) + '"]'); }
    return {
      length: 6300, hold: 700, loop: true, selfExit: true, maxLoops: pick ? 3 : 6,
      arm: function () {
        // the previous run's lines (cycle 0: an earlier run), so the strip is never empty; the mode switches at 60ms,
        // after the restored markup has painted with the old one, so the labels cross-fade instead of jumping
        fill(ol, k ? run(k - 1, pick || MODES[(k - 1) % 3]) : EARLIER);
      },
      steps: [
        [60, function () { setMode(fig, (fig && fig.__mbPick) || mode); }], // a pick made since arm() wins
        [200, function (t) { // reads: the four systems → Mate
          var first = Infinity, last = 0;
          var tiles = V7.$$(root, '.m-bound-chip').map(function (ch) { return V7.$$(ch, '.m-bound-tile').filter(function (x) { return shown(x) && getComputedStyle(x).visibility !== 'hidden'; })[0] || null; });
          ['sys1', 'sys2', 'sys3', 'sys4'].forEach(function (key, i) {
            var e = pulse(t, dia, key, 'mate', { delay: i * 150, dur: [8, 560, 820] });
            if (e && tiles[i]) V7.flash(t, tiles[i], { tone: 'mate', duration: 700, delay: i * 150 }); // the source lights as its read leaves
            if (e) { first = Math.min(first, e); last = Math.max(last, e); }
          });
          if (first === Infinity) first = last = 700;
          t.after(first, function (t2) { ring(t2, mate, { from: .55 }); });
          t.after(first + 80, function (t2) { append(t2, ol, lines[0]); });
          t.after(last, function (t2) { ring(t2, mate); bump(t2, mate, 1.04); });
        }],
        [1680, function (t) { // the question crosses the boundary through the packet pill; the reply comes back plain
          var pl = pill(), out = pulse(t, dia, 'api', 'mate', { dur: [5.5, 700, 1100], at: pl, pass: function (t2) { bump(t2, pl, 1.06, { duration: 460 }); ring(t2, pl, { grow: 6, from: .7 }); } });
          if (!out) out = 900;
          t.after(out, function (t2) { ring(t2, api); });
          t.after(out + 220, function (t2) {
            var back = pulse(t2, dia, 'api', 'plain', { back: true, dur: [4.5, 600, 900] }) || 800;
            t2.after(back, function (t3) { ring(t3, mate, { from: .6 }); });
          });
        }],
        [3900, function (t) { // the draft goes to the person, who approves
          var e = pulse(t, dia, 'ok', 'you', { dur: [8, 480, 700] }) || 600;
          t.after(e, function (t2) { ring(t2, person); V7.pop(t2, ok, { from: .5, duration: 320 }); });
          t.after(e + 100, function (t2) { append(t2, ol, lines[1]); });
        }],
        [4900, function (t) { // the approved output is sent and logged
          var e = pulse(t, dia, 'sent', 'ok', { dur: [8, 420, 600] }) || 500;
          t.after(e, function (t2) { ring(t2, sent); });
          t.after(e + 80, function (t2) { append(t2, ol, lines[2]); });
        }]
      ]
    };
  });

  // The deployment toggle (spec §2 M21): role=radiogroup, arrow keys, roving tab stop, like the M15 toggle.
  V7.ready(function () {
    V7.$$(d, '.m-bound-fig').forEach(function (fig) {
      var root = fig.querySelector('.m-bound[data-v7-mock]'), c = V7.get(root), g = fig.querySelector('.m-bound-toggle'),
        btns = g ? V7.$$(g, 'button[data-mode]') : [];
      setMode(fig, modeOf(fig));
      if (!btns.length) return;
      var live = function () { return !V7.static && !c.noop && !!c.root && /^(armed|running|paused|holding)$/.test(c.state); };
      function choose(m, focus) {
        m = norm(m);
        var cur = modeOf(fig);
        fig.__mbPick = m;
        setMode(fig, m);
        if (focus) btns.forEach(function (b) { if (b.getAttribute('data-mode') === m) b.focus(); });
        if (V7.static || c.noop || !c.root || c.state === 'final') return; // reduced motion: the labels switch at once
        if (m === cur && live()) return; // already on screen: the walk stops, the beams keep running
        // A visitor who paused the motion keeps it paused (WCAG 2.2.2): restart() clears the 'user' reason, so set it
        // again at once. The new mode's labels still switch, the beams stay static and the button still says Play.
        var held = c.reasons().indexOf('user') >= 0;
        c.restart();
        if (held) c.pause('user');
      }
      btns.forEach(function (b) { b.addEventListener('click', function () { choose(b.getAttribute('data-mode')); }); });
      g.addEventListener('keydown', function (e) {
        var n = btns.length, i = 0, j, k = e.key, rtl = V7.dir(g) < 0;
        btns.forEach(function (b, x) { if (b.getAttribute('aria-checked') === 'true') i = x; });
        if (k === 'ArrowRight') j = i + (rtl ? -1 : 1);
        else if (k === 'ArrowLeft') j = i + (rtl ? 1 : -1);
        else if (k === 'ArrowDown') j = i + 1;
        else if (k === 'ArrowUp') j = i - 1;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = n - 1;
        else return;
        e.preventDefault();
        choose(btns[(j + n) % n].getAttribute('data-mode'), true);
      });
      // keyboard or pointer focus on the toggle stops the walk, so the selection never moves under the visitor
      g.addEventListener('focusin', function () { if (!fig.__mbPick && live()) fig.__mbPick = modeOf(fig); });
      // the walk rests on cloud; a picked mode stays
      c.on('state', function (det) { if (det && det.state === 'done' && !fig.__mbPick) setMode(fig, 'cloud'); });
    });
    // reduced motion switched on mid-session: C1 restores the final markup; the final mode is cloud unless picked
    d.addEventListener('v7:static', function () { V7.$$(d, '.m-bound-fig').forEach(function (f) { setMode(f, f.__mbPick || 'cloud'); }); });
  });
})();
// <<< M21
;
// >>> M22 m-team team constellation (About spec §2 M22): loops while visible, maxLoops 2, then rests on the final markup.
// Cycle 0 builds the picture: the mark pops on its light, the connectors draw out from the centre (stagger 90), the six
// photos pop in order while their tone rings draw, the chips settle. Then light pulses run along the connectors,
// centre → person → centre, one every ~600ms in the person's tone, for about 6s; each arrival rings the person (or the
// hub). Cycle 1 keeps the built picture and runs one more round of pulses (a rebuild would blank the hero).
// The armed look is never empty: the orbit and six dashed seats are there before anything moves. A replay (pause
// button, from done) starts with a copy of the finished picture fading out over the seats, so it never jumps.
// selfExit: every cycle ends on the final markup, so the controller swaps cycles (and rests) with no fade.
// Transform, opacity and stroke-dashoffset only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var d = document;
  // pulse order (person index, clockwise from the upper left); each cycle starts at a different point, never the same twice running
  var SEQ = [2, 4, 0, 5, 1, 3, 0, 4, 2, 5, 3, 1, 4, 0, 3, 5, 2, 1];
  function rm(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function shown(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // arrival ring: grows a few px and fades (transform + opacity)
  function ping(t, el, o) {
    o = o || {};
    if (!t || !shown(el)) return;
    var w = el.offsetWidth || 60, g = o.grow || 9;
    t.anim(el, [{ opacity: o.from || .95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(' + (1 + 2 * g / w).toFixed(3) + ')' }],
      { duration: o.duration || 760, easing: 'out', fill: 'none' });
  }

  V7.define('M22', function (root, tl, o) {
    var k = o.cycle | 0, build = k === 0, again = build && !!root.__m22ran, LEAD = again ? 380 : 0, veil = null;
    root.__m22ran = 1;
    var $ = function (s, r) { return V7.$(r || root, s); }, $$ = function (s, r) { return V7.$$(r || root, s); };
    var hub = $('.m-team-hub'), hubPing = $('.m-team-hub > .m-team-ping'), aura = $('.m-team-aura'),
      spokes = $$('.m-team-spoke'), people = $$('.m-team-p');
    var faces = people.map(function (p) { return $('.m-team-face', p); }),
      rings = people.map(function (p) { return $('.m-team-ring path', p); }),
      pings = people.map(function (p) { return $('.m-team-slot > .m-team-ping', p); }),
      chips = people.map(function (p) { return $('.m-team-chip', p); });

    // One pulse along connector i: out to the person, a ring there, back to the hub, a soft ring on the hub.
    function pulse(t, i) {
      var sp = spokes[i], slot = people[i] && $('.m-team-slot', people[i]);
      if (!sp || !shown(sp) || !slot) return;
      var L = sp.offsetWidth, hr = (hub ? hub.offsetWidth : 80) / 2, sr = slot.offsetWidth / 2, tone = people[i].getAttribute('data-tone') || '';
      var out = d.createElement('i'), C;
      out.className = 'm-team-pz';
      sp.appendChild(out);
      C = out.offsetWidth || 46;
      // out: the head leaves from under the hub and runs on until the whole comet is under the photo
      var a0 = -C, a1 = L - sr + 2, da = a1 - a0, du = clamp(da * 2.3, 380, 600), hit = du * (L - sr - a0 - C) / da;
      t.anim(out, [{ transform: 'translateX(' + a0 + 'px)' }, { transform: 'translateX(' + a1 + 'px)' }], { duration: du, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
      t.after(du + 20, function () { rm(out); });
      t.after(Math.max(0, hit), function (t2) { ping(t2, pings[i]); });
      // back: the head emerges from the ring edge (fading in) and runs into the hub
      t.after(du + 140, function (t2) {
        if (!shown(sp)) return;
        var bk = d.createElement('i');
        bk.className = 'm-team-pz is-back';
        sp.appendChild(bk);
        var b0 = L - sr - 4, b1 = -12, db = b0 - b1, dd = clamp(db * 2.3, 360, 580), hh = dd * (b0 - hr) / db;
        t2.anim(bk, [{ transform: 'translateX(' + b0 + 'px)', opacity: 0 }, { offset: .14, opacity: 1 }, { transform: 'translateX(' + b1 + 'px)', opacity: 1 }],
          { duration: dd, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
        t2.after(dd + 20, function () { rm(bk); });
        t2.after(Math.max(0, hh), function (t3) {
          if (hubPing) hubPing.style.setProperty('--tone', tone === 'you' ? 'var(--amber-500)' : tone === 'mate' ? 'var(--indigo-400)' : 'var(--teal-500)');
          ping(t3, hubPing, { from: .7, grow: 12, duration: 820 });
        });
      });
    }

    var steps = [], start = build ? 1900 + LEAD : 250, n = 10, gap = 600, s0 = (k * 7) % SEQ.length, i;
    if (again) steps.push([0, function (t) { // the finished picture fades off the seats
      if (!veil) return;
      t.anim(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
      t.after(440, function () { rm(veil); veil = null; });
    }]);
    if (build) {
      steps.push([LEAD, function (t) {
        V7.pop(t, hub, { from: .55, duration: 480 });
        if (aura) { V7.on(aura); t.anim(aura, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'out', fill: 'backwards' }); }
      }]);
      steps.push([LEAD + 260, function (t) { V7.grow(t, spokes, { axis: 'x', duration: 420, stagger: 90, easing: 'out' }); }]);
      steps.push([LEAD + 640, function (t) {
        people.forEach(function (p, j) {
          var at = j * 120;
          V7.pop(t, faces[j], { from: .6, duration: 420, delay: at });
          V7.draw(t, rings[j], { duration: 620, delay: at + 80, easing: 'cubic-bezier(.33,1,.68,1)' });
          V7.show(t, chips[j], { y: p.classList.contains('is-up') ? -6 : 6, duration: 320, delay: at + 260 });
        });
      }]);
    }
    for (i = 0; i < n; i++) (function (idx, at) {
      steps.push([at, function (t) { pulse(t, idx); }]);
    })(SEQ[(s0 + i) % SEQ.length], start + i * gap);

    return {
      length: start + (n - 1) * gap + 1350,
      hold: 1400,
      loop: true,
      maxLoops: 2,
      selfExit: true,
      arm: function () {
        if (!build) return; // later cycles start from the built picture
        var stage = $('.m-team-stage');
        if (again && stage) { // a copy of the finished picture over the seats (made before anything below is hidden)
          veil = stage.cloneNode(true);
          veil.className += ' m-team-veil';
          veil.style.cssText = 'position:absolute;inset:0 0 auto 0;margin:0;z-index:4;pointer-events:none';
          root.appendChild(veil);
        }
        V7.off([hub, aura].concat(faces, chips));
        V7.shrink(spokes, 'x');
        V7.undraw(rings);
      },
      steps: steps
    };
  });
})();
// <<< M22
;
// >>> M23 m-gap100 100 businesses (About spec §2 M23): plays once at 40% visible; the pause button replays it.
// Armed: the card with its header and legend, the 100 dots as faint outlines, the count at 0, the goal line away (never
// an empty frame). Then: the rows firm up in a quick wave, the first 39 dots light teal in reading order while "39"
// counts with them dot by dot, the 61 dim dots get one soft amber outline pulse, and the goal line comes in.
// A replay starts from the finished card: the lit dots go out in reverse (the count runs back), then the same sequence.
// Transform, opacity and short border-colour changes only; every dot exists from the start (no layout change).
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var FAINT = .28, STEP = 26;
  function tv(el, n) { try { return getComputedStyle(el).getPropertyValue(n).trim(); } catch (e) { return ''; } }

  V7.define('M23', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var again = !!root.__m23ran, grid = $('.m-gap100-grid'), rows = $$('.m-gap100-row'), fills = $$('.m-gap100-d > b'),
      dims = $$('.m-gap100-d:not(.is-on)'), num = $('.m-gap100-k.is-on .m-gap100-n'), goal = $('.m-gap100-goal');
    var N = fills.length, L0 = again ? 600 : 520, lit = L0 + (N - 1) * STEP + 340, P0 = lit + 100, G0 = P0 + 760;
    root.__m23ran = 1;
    function set(v) { if (num) num.textContent = String(v); }

    var steps = [];
    if (again) { // the finished card goes back to zero first, so a replay never jumps
      steps.push([0, function (t) {
        V7.hide(t, goal, { y: -4, duration: 200 });
        fills.slice().reverse().forEach(function (f, j) {
          V7.hide(t, f, { y: 0, duration: 180, delay: j * 8 });
          t.after(j * 8, function () { set(N - 1 - j); });
        });
      }]);
    } else {
      steps.push([0, function (t) { // the rows firm up, top to bottom
        if (grid) grid.removeAttribute('data-faint');
        rows.forEach(function (r, i) {
          t.anim(r, [{ opacity: FAINT, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 45, easing: 'out', fill: 'backwards' });
        });
      }]);
    }
    steps.push([L0, function (t) { // 39 light up in reading order; the count follows each dot
      V7.pop(t, fills, { from: .3, duration: 340, stagger: STEP });
      fills.forEach(function (f, i) { t.after(i * STEP, function () { set(i + 1); }); });
    }]);
    steps.push([P0, function (t) { // one soft amber pulse over the 61 still to go
      var base = dims[0] ? getComputedStyle(dims[0]).borderTopColor : '', amber = tv(root, '--m-you') || '#FF8C42';
      if (!base) return;
      dims.forEach(function (dm, j) {
        t.anim(dm, [{ borderColor: base, transform: 'scale(1)' }, { offset: .35, borderColor: amber, transform: 'scale(1.1)' }, { borderColor: base, transform: 'scale(1)' }],
          { duration: 720, delay: j * 9, easing: 'ease-in-out', fill: 'none' });
      });
    }]);
    steps.push([G0, function (t) { V7.show(t, goal, { y: 6, duration: 380 }); }]);

    return {
      length: G0 + 420,
      hold: 0,
      arm: function () {
        if (again) return; // a replay arms on the finished card (step 0 takes it back)
        if (grid) grid.setAttribute('data-faint', '');
        V7.off(fills);
        V7.off(goal);
        set(0);
      },
      steps: steps
    };
  });
})();
// <<< M23
;
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
;
// >>> K2 reverse-the-build toy blocks (homepage #reverse). Markup = final state (K2.html, from tools/k2frag.mjs).
// Act 1 (old way, ~6 s): with CRM already down, App, Bot, Excel and Dashboard are dropped on, each a little off; the
// tower rocks on its corners, "why?" appears, it tips over and the blocks tumble into a pile, which then fades.
// Act 2 (our way, ~6.5 s after a 1 s beat): the goal block (90%) appears alone, high up, where the top will be; then
// the tower builds DOWNWARD under it, block by block, until the base touches the ground and the shadow lands: On track.
// On a wide stage the pile then comes back small and faded beside the tower (the final markup). Rest 3 s, two cycles.
// Positions are in stage units (one block height, measured from .k2-probe each cycle); x and r mirror in RTL.
// At the end of each cycle every animation is dropped and the CSS (the final markup) takes over, so a later resize
// never leaves pixel positions behind. Transform and opacity only.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var T = {
    drop0: 400, dropStep: 700, drop: 650,
    rock: [[3100, 0], [3350, 1.4], [3600, 0], [3850, -2.2], [4100, 0], [4350, 2.8], [4600, 0], [4880, -5], [5150, -17]],
    why: 3700, whyOut: 5500, fall: 640, fallStep: 90, pileOut: 6350, capOut: 6550,
    capIn: 7600, goal: 7800, tag: 8400, build0: 9100, buildStep: 700, build: 640, ok: 12200, side: 13000, len: 14000
  };
  var nums = function (s) { return String(s || '').split(',').map(parseFloat); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };

  V7.define('K2', function (root) {
    var $ = function (s) { return V7.$(root, s); }, $$ = function (s) { return V7.$$(root, s); };
    var olds = $$('.k2-old .k2-b'), news = $$('.k2-new .k2-b'), oldG = $('.k2-old'), oldSh = $('.k2-old .k2-shadow'),
      newSh = $('.k2-new .k2-shadow'), capO = $('.k2-cap[data-act=old]'), capN = $('.k2-cap[data-act=new]'),
      why = $('.k2-why'), tag = $('.k2-tag'), ok = $('.k2-ok'), oldTag = $('.k2-oldtag'), probe = $('.k2-probe');
    if (olds.length < 3 || news.length < 2 || !oldG || !probe) throw new Error('K2 markup');
    var u = parseFloat(getComputedStyle(probe).width) || 60, d = V7.dir(root), pv = parseFloat(root.getAttribute('data-pivot')) || -1.25;
    var tower = olds.map(function (e) { return nums(e.getAttribute('data-tower')); }),
      pile = olds.map(function (e) { return nums(e.getAttribute('data-pile')); }),
      size = olds.map(function (e) { return [parseFloat(e.style.getPropertyValue('--w')), parseFloat(e.style.getPropertyValue('--h'))]; }),
      at = news.map(function (e) { return parseFloat(e.style.getPropertyValue('--y')) || 0; });
    var goal = news[news.length - 1], base = tower[0], bw = size[0][0];
    var tf = function (x, y, r) { return 'translate(' + (x * u * d).toFixed(2) + 'px,' + (-y * u).toFixed(2) + 'px) rotate(' + ((r || 0) * d).toFixed(2) + 'deg)'; };
    // block i of the tower rocked by a degrees (clockwise) about the base corner it leans on
    function rocked(i, a) {
      var p = tower[i], cx = a < 0 ? pv : base[0] + bw / 2;
      var rad = a * Math.PI / 180, dx = p[0] - cx, dy = -p[1];
      return [cx + dx * Math.cos(rad) - dy * Math.sin(rad), -(dx * Math.sin(rad) + dy * Math.cos(rad)), p[2] + a];
    }
    var made = [], touched = [];
    function A(tl, el, kf, o) { var a = tl.anim(el, kf, o); if (a) made.push(a); return a; }
    function fade(tl, el, from, to, ms, extra) {
      var k0 = { opacity: from }, k1 = { opacity: to };
      if (extra) { k0.transform = extra[0]; k1.transform = extra[1]; }
      return A(tl, el, [k0, k1], { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    }
    var steps = [];

    // ---- Act 1: drop App, Bot, Excel, Dashboard onto CRM
    olds.forEach(function (e, i) {
      if (!i) return;
      steps.push([T.drop0 + (i - 1) * T.dropStep, function (tl) {
        var p = tower[i], s = i % 2 ? 1 : -1;
        A(tl, e, [
          { opacity: 0, transform: tf(p[0] + s * .12, p[1] + 1.5, p[2] - s * 5), easing: 'cubic-bezier(.45,0,.8,.45)' },
          { opacity: 1, transform: tf(p[0] + s * .03, p[1] + .35, p[2] - s * 2), offset: .55, easing: 'cubic-bezier(.3,0,.8,.6)' },
          { opacity: 1, transform: tf(p[0], p[1], p[2]), offset: .8, easing: 'ease-out' },
          { opacity: 1, transform: tf(p[0], p[1] + .045, p[2] + s * .3), offset: .9, easing: 'ease-in' },
          { opacity: 1, transform: tf(p[0], p[1], p[2]) }
        ], { duration: T.drop, fill: 'both' });
      }]);
    });
    // rock on its corners, then tip over the inline-start corner and tumble into the pile
    var r0 = T.rock[0][0], r1 = T.rock[T.rock.length - 1][0];
    steps.push([r0, function (tl) {
      olds.forEach(function (e, i) {
        var fall = T.fall + i * T.fallStep, end = r1 + fall, span = end - r0, L = rocked(i, T.rock[T.rock.length - 1][1]), Pp = pile[i];
        var kf = T.rock.map(function (k, j) {
          var q = rocked(i, k[1]);
          return { transform: tf(q[0], q[1], q[2]), offset: (k[0] - r0) / span, easing: j >= T.rock.length - 3 ? 'cubic-bezier(.5,0,.9,.5)' : 'ease-in-out' };
        });
        var o = function (ms) { return (r1 - r0 + ms) / span; };
        kf.push({ transform: tf(lerp(L[0], Pp[0], .62), lerp(L[1], Pp[1], .38), lerp(L[2], Pp[2], .55)), offset: o(fall * .5), easing: 'cubic-bezier(.35,0,.85,.55)' });
        kf.push({ transform: tf(Pp[0], Pp[1], Pp[2]), offset: o(fall * .84), easing: 'ease-out' });
        kf.push({ transform: tf(Pp[0] + (Pp[0] < 0 ? -.03 : .02), Pp[1] + .05, Pp[2] + (Pp[2] < 0 ? -1.5 : 1.5)), offset: o(fall * .92), easing: 'ease-in' });
        kf.push({ transform: tf(Pp[0], Pp[1], Pp[2]), offset: 1 });
        kf[0].opacity = 1; kf[kf.length - 1].opacity = 1;
        A(tl, e, kf, { duration: span, easing: 'linear', fill: 'both' });
      });
    }]);
    steps.push([T.rock[T.rock.length - 2][0], function (tl) {
      if (oldSh) A(tl, oldSh, [{ transform: 'none' }, { transform: 'translateX(' + (-1 * u * d).toFixed(1) + 'px) scaleX(1.55)' }], { duration: 900, easing: 'ease-out', fill: 'both' });
    }]);
    steps.push([T.why, function (tl) { fade(tl, why, 0, 1, 520, ['translateY(8px) scale(.9)', 'none']); }]);
    steps.push([T.whyOut, function (tl) { fade(tl, why, 1, 0, 420); }]);
    steps.push([T.pileOut, function (tl) { fade(tl, oldG, 1, 0, 560); }]);
    steps.push([T.capOut, function (tl) { fade(tl, capO, 1, 0, 420, ['none', 'translateY(-6px)']); }]);

    // ---- Act 2: the goal first, alone and high; then the tower builds downward under it
    steps.push([T.capIn, function (tl) { fade(tl, capN, 0, 1, 520, ['translateY(6px)', 'none']); }]);
    steps.push([T.goal, function (tl) {
      var y = at[at.length - 1];
      A(tl, goal, [{ opacity: 0, transform: tf(0, y + .35, 0) + ' scale(.92)' }, { opacity: 1, offset: .5 }, { opacity: 1, transform: tf(0, y, 0) }],
        { duration: 820, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      if (newSh) fade(tl, newSh, 0, .3, 820, ['scale(.5)', 'scale(.55)']);
    }]);
    steps.push([T.tag, function (tl) { fade(tl, tag, 0, 1, 460, ['translateX(' + (8 * d) + 'px)', 'none']); }]);
    var order = news.slice(0, -1).reverse();      // just under the goal first, the base last
    order.forEach(function (e, k) {
      var i = news.indexOf(e), y = at[i], last = k === order.length - 1;
      steps.push([T.build0 + k * T.buildStep, function (tl) {
        A(tl, e, [{ opacity: 0, transform: tf(0, y - .7, 0) }, { opacity: 1, offset: .45 }, { opacity: 1, transform: tf(0, y, 0) }],
          { duration: T.build, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        if (newSh) {
          var f0 = (k + 1) / (order.length + 1), f1 = (k + 2) / (order.length + 1);
          if (last) A(tl, newSh, [{ opacity: .3 + .5 * f0, transform: 'scale(' + (.55 + .4 * f0) + ')' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 260, easing: 'ease-out', fill: 'both' });
          else A(tl, newSh, [{ opacity: .3 + .5 * f0, transform: 'scale(' + (.55 + .4 * f0) + ')' }, { opacity: .3 + .5 * f1, transform: 'scale(' + (.55 + .4 * f1) + ')' }], { duration: T.build, easing: 'ease-out', fill: 'both' });
        }
      }]);
    });
    steps.push([T.ok, function (tl) {
      A(tl, ok, [{ opacity: 0, transform: 'translateX(' + (-8 * d) + 'px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'both' });
    }]);
    // the pile returns small and faded beside the tower, when the CSS final state has room for it
    steps.push([T.side, function (tl) {
      [oldG, oldTag].forEach(function (el) {
        made.forEach(function (a) { if (a.effect && a.effect.target === el) a.cancel(); });
        el.style.opacity = ''; el.style.transform = '';
        var to = parseFloat(getComputedStyle(el).opacity) || 0;
        el.style.opacity = '0';
        if (to > 0) A(tl, el, [{ opacity: 0 }, { opacity: to }], { duration: 800, easing: 'ease-out', fill: 'both' });
      });
    }]);
    // hand over to the final markup
    steps.push([T.len, function () {
      made.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      made = [];
      touched.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; });
    }]);

    return {
      length: T.len,
      hold: 3000,
      loop: true,
      maxLoops: 2,
      arm: function () {
        var set = function (el, o, t) { if (!el) return; touched.push(el); el.style.opacity = o; el.style.transform = t == null ? '' : t; };
        olds.forEach(function (e, i) { var p = tower[i]; set(e, i ? '0' : '1', tf(p[0], p[1] + (i ? 1.5 : 0), p[2])); });
        set(oldG, '1', 'none'); set(oldSh, '1', 'none'); set(oldTag, '0');
        set(capO, '1', 'none'); set(capN, '0');
        news.forEach(function (e, i) { set(e, '0', tf(0, at[i], 0)); });
        set(newSh, '0'); set(why, '0'); set(tag, '0'); set(ok, '0');
      },
      steps: steps
    };
  });
})();
// <<< K2
;
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
;
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
;
// >>> P-HOME homepage effects (spec §4, §0 A1): the gap count-up, field-card effects, the ladder
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  var d = document;
  function onStatic(f) { d.addEventListener('v7:static', f); }
  function safe(name, f) { try { f(); } catch (e) { try { console.error('[V7] P-HOME ' + name + ':', e); } catch (x) {} } }

  // A1: the two numbers count 0 → 61% and 0 → 76% (1100ms, stagger 150) when the stat row is 40% visible.
  // Only the aria-hidden copy counts; the sr-only copy always reads the final number.
  function gap() {
    var ul = d.querySelector('.v7-gap');
    if (!ul || V7.static) return;
    var nums = V7.$$(ul, '.v7-gap-num').map(function (n) { return n.querySelector('[aria-hidden=true]') || n; }),
      fin = nums.map(function (n) { return n.textContent; }), tl = null, un = null;
    if (!nums.length) return;
    function settle() { if (tl) tl.kill(); if (un) un(); tl = un = null; nums.forEach(function (n, i) { n.textContent = fin[i]; }); }
    nums.forEach(function (n) { n.textContent = '0%'; });
    un = V7.observe(ul, { enter: .4, leave: 0 }, function (v) {
      if (!v || tl) return;
      if (un) { un(); un = null; }
      tl = V7.timeline();
      nums.forEach(function (n, i) { V7.count(tl, n, { from: 0, to: parseFloat(fin[i]) || 0, duration: 1100, suffix: '%', delay: i * 150 }); });
      tl.at(1100 + 150 * nums.length, function (t) { nums.forEach(function (n, i) { n.textContent = fin[i]; }); t.kill(); });
      tl.play();
    });
    onStatic(settle);
  }

  // H5: 300ms after each card is in (plus its reveal stagger), once. arm() sets the start look and returns run(tl).
  var FX = {
    clock: { // 03:56 → 03:57 → 03:58 → 03:59 → 04:00, one roll every 150ms
      length: 700,
      arm: function (el) {
        el.textContent = '03:56';
        return function (tl) {
          ['03:57', '03:58', '03:59', '04:00'].forEach(function (t, k) { V7.roll(tl, el, t, { duration: 150, delay: k * 150 }); });
        };
      }
    },
    count: { // the number counts 0 → 9,700 over 1200ms with its unit attached ("0 hours"); a hidden copy of the final
      // text ("9,700 hours") holds the width, so the rest of the line never moves
      length: 1300,
      arm: function (el) {
        var n = el.querySelector('.v7-fx-n');
        if (!n) throw new Error('no .v7-fx-n');
        var txt = n.textContent, m = txt.match(/^\s*([\d.,]+)(.*)$/);
        if (!m) throw new Error('no number in .v7-fx-n');
        var to = parseFloat(m[1].replace(/,/g, '')) || 0, unit = m[2], g = d.createElement('span'), live = d.createElement('span');
        g.className = 'v7-fx-ghost'; g.textContent = txt; live.textContent = '0' + unit;
        n.textContent = ''; n.appendChild(g); n.appendChild(live);
        return function (tl) { V7.count(tl, live, { from: 0, to: to, duration: 1200, suffix: unit }); };
      }
    },
    type: { // the quote types over 1000ms behind a caret, removed 600ms after; a hidden copy holds the card height
      length: 1700,
      arm: function (el) {
        var txt = el.textContent, g = d.createElement('span'), live = d.createElement('span');
        g.className = 'v7-fx-ghost'; g.textContent = txt;
        el.textContent = ''; el.appendChild(g); el.appendChild(live);
        function caret() { var c = d.createElement('span'); c.className = 'v7-caret'; live.appendChild(c); return c; }
        caret();
        return function (tl) {
          V7.type(tl, live, txt, { duration: 1000, caret: false });
          var c = caret();
          tl.after(1600, function () { if (c.parentNode) c.parentNode.removeChild(c); });
        };
      }
    }
  };
  function field() {
    if (V7.static) return;
    V7.$$(d, '.v7-story[data-v7-fx]').forEach(function (card) {
      var el = card.querySelector('.v7-fx'), fx = FX[card.getAttribute('data-v7-fx')];
      if (!el || !fx) return;
      var fin = el.innerHTML, tl = null, mo = null, run;
      try { run = fx.arm(el); } catch (e) { el.innerHTML = fin; return; }
      function settle() { if (tl) tl.kill(); tl = null; if (mo) { mo.disconnect(); mo = null; } el.innerHTML = fin; }
      function go() {
        if (tl) return;
        var at = 300 + (parseFloat(card.style.getPropertyValue('--v7-i')) || 0) * (parseFloat(card.style.getPropertyValue('--v7-stagger')) || 0);
        tl = V7.timeline();
        tl.at(at, function (t) { run(t); });
        tl.at(at + fx.length, function (t) { el.innerHTML = fin; t.kill(); }); // back to the shipped markup
        tl.play();
      }
      if (card.classList.contains('is-in')) go();
      else if ('MutationObserver' in window) {
        mo = new MutationObserver(function () { if (card.classList.contains('is-in')) { mo.disconnect(); mo = null; go(); } });
        mo.observe(card, { attributes: true, attributeFilter: ['class'] });
      } else el.innerHTML = fin;
      onStatic(settle);
    });
  }

  // H6: at 40% visible the rail grows, the dots pop and the steps come in (CSS transitions keyed to .is-on).
  function ladder() {
    var ol = d.querySelector('.v7-ladder');
    if (!ol || V7.static) return;
    var un = null;
    ol.setAttribute('data-v7-armed', '');
    // The section may have been skipped by content-visibility until this frame: compute the armed look first,
    // then switch on in the next frame, so the transitions always have a start state to run from.
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    un = V7.observe(ol, { enter: .4, leave: 0 }, function (v) {
      if (!v) return;
      if (un) { un(); un = null; }
      void ol.offsetWidth;
      raf(function () { raf(function () { ol.classList.add('is-on'); }); });
    });
    onStatic(function () { ol.classList.add('is-on'); if (un) { un(); un = null; } });
  }

  V7.ready(function () { safe('gap', gap); safe('field', field); safe('ladder', ladder); });
})();
// <<< P-HOME
;
// >>> P-IND industries hub (Industries spec §5): the four card goals (factory 'X2') and the hero stepper that follows them
// Each card's goal is a small mock root (data-v7-play="host"). Final markup: the goal typed, On track, the approver.
// Motion, once per card: the goal types in, Enter, the pill says Mate is building, the approver comes in, On track.
// A card plays once its goal bar is in view; cards that come into view together start 250ms apart.
// While cards play, the hub hero stepper (ol.v7-hub-steps) lights the stage the slowest playing card is in, then rests.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var d = document;
  // ms from the card's start
  var T = { type: 100, typeDur: 950, enter: 1150, busy: 1230, who: 1880, ok: 2360, len: 2600, hold: 500 };
  // pill labels by page language (<html lang>); the English strings are unchanged
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he';
  var TX = HE ? { newGoal: 'יעד חדש', building: 'בבנייה', onTrack: 'כמתוכנן' } : { newGoal: 'New goal', building: 'Building', onTrack: 'On track' };

  V7.define('X2', function (root) {
    var bar = V7.$(root, '.v7-hub-bar'), text = V7.$(root, '.v7-hub-text'), ph = V7.$(root, '.v7-hub-ph'),
      kbd = V7.$(root, '.v7-hub-kbd'), pill = V7.$(root, '.v7-hub-pill'), who = V7.$(root, '.v7-hub-who');
    if (!bar || !text || !pill) throw new Error('X2 markup incomplete');
    var full = text.textContent, dots;
    function stage(s) { V7.emit(root, 'v7:hubstage', { stage: s }); }
    return {
      length: T.len, hold: T.hold, loop: false,
      arm: function () { // a structured start: the bar with its placeholder, a neutral "New goal" pill
        text.textContent = '';
        V7.on(ph);
        pill.setAttribute('data-tone', 'neutral');
        pill.innerHTML = '<span class="v7-thinking" data-v7-gone><i></i><i></i><i></i></span><span class="v7-lbl">' + TX.newGoal + '</span>';
        dots = pill.firstChild;
        V7.off(who);
      },
      steps: [
        [0, function () { stage('goal'); }],
        [T.type, function (tl) { V7.gone(ph); bar.classList.add('is-typing'); V7.type(tl, text, full, { duration: T.typeDur }); }],
        [T.enter, function (tl) { V7.tap(tl, kbd); bar.classList.remove('is-typing'); }],
        // the dots replace the pill's dot as its label swaps (V7.roll swaps at 40% of 240ms)
        [T.busy, function (tl) { stage('flows'); V7.status(tl, pill, 'mate', TX.building); tl.after(96, function () { V7.on(dots); pill.classList.add('is-busy'); }); }],
        [T.who, function (tl) { V7.show(tl, who, { x: 8, y: 0, duration: 300 }); }],
        [T.ok, function (tl) { stage('track'); V7.status(tl, pill, 'ok', TX.onTrack); tl.after(96, function () { V7.gone(dots); pill.classList.remove('is-busy'); }); }]
      ]
    };
  });

  V7.ready(function () {
    var mocks = V7.$$(d, '[data-v7-mock="X2"]'), ol = d.querySelector('ol.v7-hub-steps');
    if (!mocks.length) return;

    /* Stepper: the lowest stage among the cards that are playing; data-sync rests (all pills white) once none plays. */
    var ORDER = { goal: 0, flows: 1, track: 2 }, st = [], rest = 0;
    function lis() { return ol ? V7.$$(ol, 'li[data-stage]') : []; }
    function clear() { if (!ol) return; ol.removeAttribute('data-sync'); lis().forEach(function (li) { li.removeAttribute('data-active'); }); }
    function render() {
      if (!ol) return;
      var min = 3;
      st.forEach(function (s) { if (s != null && s < min) min = s; });
      clearTimeout(rest);
      if (min > 2) { rest = setTimeout(clear, 900); return; }
      ol.setAttribute('data-sync', '');
      lis().forEach(function (li) { if (ORDER[li.getAttribute('data-stage')] === min) li.setAttribute('data-active', ''); else li.removeAttribute('data-active'); });
    }
    d.addEventListener('v7:hubstage', function (e) {
      var i = mocks.indexOf(e.target), s = e.detail && ORDER[e.detail.stage];
      if (i < 0 || s == null) return;
      st[i] = s; render();
    });
    d.addEventListener('v7:state', function (e) {
      var i = mocks.indexOf(e.target), s = e.detail && e.detail.state;
      if (i < 0 || (s !== 'done' && s !== 'final') || st[i] == null) return;
      st[i] = null; render();
    });
    d.addEventListener('v7:static', function () { st = []; clearTimeout(rest); clear(); });
    if (V7.static) return;

    /* Play each card once, when its goal bar (the part that types) is fully in view. Start after the font gate (like the
       reveals), so a card never types before it has faded in; cards entering together are spaced 250ms apart. */
    var next = 0, BASE = 420, GAP = 250, n = 0;
    function arm() {
      if (n++) return;
      mocks.forEach(function (m) {
        var c = V7.get(m), fired = false, un = null;
        un = V7.observe(V7.$(m, '.v7-hub-bar') || m, { enter: .95, leave: 0 }, function (v) {
          if (!v || fired) return;
          fired = true;
          if (un) un();
          var now = Date.now(), at = Math.max(now + BASE, next);
          next = at + GAP;
          setTimeout(function () { c.play(); }, at - now);
        });
      });
    }
    try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(arm, arm); } catch (e) {}
    setTimeout(arm, 600);
  });
})();
// <<< P-IND
;
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
;
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
;
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
;
// >>> ZZ-boot (spec §3.8; appended last, after every part has called V7.define / V7.ready)
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7._boot || V7.booted) return; // no core: the head gate fails open after 2500ms
  V7.booted = true;
  var B = V7._boot;
  function step(name, f) { try { f(); } catch (e) { try { console.error('[V7] boot ' + name + ':', e); } catch (x) {} } }
  step('gate', B.gate);   // 1. html.v7-ready, V7.static
  step('mount', B.mount); // 2. snapshot + arm every [data-v7-mock] (or mark final when static); prepare reveals
  step('init', B.init);   // 3. pause buttons, then V7.ready() initialisers in registration order (K1, S1, T1, M15 toggle, P-HOME, P-PROD)
  B.fonts(function () {   // 4. fonts ready, or 600ms
    step('watch', B.watch); // 5. reveal observer + autonomous mock observers (visible ones fire at once)
  });
})();
// <<< ZZ-boot
