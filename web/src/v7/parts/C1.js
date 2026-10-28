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
