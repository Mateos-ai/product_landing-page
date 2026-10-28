// LAB COPY of src/v7/parts/M1.js for prototype U1 ("the first frame is a real frame"). Registered as M1L, used only by
// src/components/lab/u1/M1Lab.astro on /lab/ pages. Lines up to the define are the shipped M1 data and helpers, unchanged.
// Loaded after v7.js (V7.define mounts late controllers), so it runs from DOMContentLoaded.
export function defineM1L() {
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


  /* ---- LAB U1 ----
     Frame 0 is the goal itself: on the first cycle the sentence is already set (highlights drawn, chips filled) and the
     flows and track cards hold the real steps as ghosts (a third of full opacity). There are no grey placeholder bars at
     any point: between goals the old content ghosts while the next goal is typed. Then Mate builds: each ghost step
     comes up to full ink top-down, the track counts from the baseline to today's value. Layout never changes (no CLS). */
  var GH = .36;
  function ghost(x) { [].concat(x).forEach(function (e) { if (e) e.setAttribute('data-lab-ghost', ''); }); }
  function unghostNow(x) { [].concat(x).forEach(function (e) { if (e) e.removeAttribute('data-lab-ghost'); }); }
  function unghost(tl, x, o) {
    o = o || {};
    [].concat(x).forEach(function (e, i) {
      if (!e) return;
      var go = function () {
        var was = e.hasAttribute('data-lab-ghost');
        e.removeAttribute('data-lab-ghost');
        if (was) tl.anim(e, [{ opacity: GH, transform: 'translateY(' + (o.y == null ? 3 : o.y) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: o.duration || 220, easing: 'out', fill: 'backwards' });
      };
      var dl = (o.delay || 0) + i * (o.stagger || 0);
      if (dl > 0) tl.after(dl, go); else go();
    });
  }
  function toGhost(tl, x, o) {
    o = o || {};
    [].concat(x).forEach(function (e) {
      if (!e || e.hasAttribute('data-lab-ghost')) return;
      var a = tl.anim(e, [{ opacity: 1 }, { opacity: GH }], { duration: o.duration || 220, easing: 'out', fill: 'forwards', delay: o.delay || 0 });
      tl.after((o.delay || 0) + (o.duration || 220), function () { e.setAttribute('data-lab-ghost', ''); try { a.cancel(); } catch (err) {} });
    });
  }

  V7.define('M1L', function (root, tl, opts) {
    var G = goals(root), OFF = [], EXIT = [], TOTAL = 0, first = !(opts && opts.cycle);
    var SH = 1100; // the first goal of the first cycle skips its typing: everything after Enter moves up by this much
    G.forEach(function (g, i) { OFF[i] = TOTAL; EXIT[i] = exitAt(g) - (!i && first ? SH : 0); TOTAL += EXIT[i] + 700; });
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var inEl = q('.m-hero-in'), goal = q('.m-hero-goal'), text = q('.m-hero-text'), ph = q('.m-hero-ph'), kbd = q('.m-hero-enter .v7-kbd'),
      chips = qa('.m-hero-chips > .v7-chip'), vals = chips.map(function (c) { return c.querySelector(':scope > span'); }),
      flows = q('.m-hero-flows'), fstat = q('.m-hero-fstat'), think = q('.m-hero-fhead .v7-thinking'),
      ready = q('.m-hero-ready'), nodes = q('.m-hero-nodes'), rows = qa('.m-hero-nodes > li'), dot = q('.m-hero-dot'), track = q('.m-hero-track'),
      trow = q('.m-hero-row'), name = q('.m-hero-name'), week = q('.m-hero-week'), val = q('.m-hero-val'), pill = q('.m-hero-status'),
      fill = q('.m-hero-track .v7-bar-fill'), tick = q('.m-hero-track .v7-bar-tick'), flag = q('.m-hero-track .v7-bar-flag'),
      spk = q('.m-hero-spark'), note = q('.m-hero-note'), approve = q('.m-hero-note .v7-fbtn.is-primary'), details = q('.m-hero-note .v7-fbtn.is-ghost');
    if (!inEl || !goal || !text || !flows || !nodes || !track || !trow || rows.length < MAXN || vals.length < 3 || vals.some(function (v) { return !v; })) throw new Error('M1L markup incomplete');
    var spath = spk && spk.querySelector('.m-hero-line'), sarea = spk && spk.querySelector('.m-hero-area'), sdot = spk && spk.querySelector('circle');
    var count = MAXN, dims = [];
    function link(li) { return li && li.querySelector('.m-hero-link'); }
    function stage(s) { V7.emit(root, 'v7:stage', { stage: s }); }
    function caret() { text.innerHTML = '<span class="v7-caret"></span>'; }
    function nocaret() { V7.$$(text, '.v7-caret').forEach(function (c) { c.parentNode.removeChild(c); }); }
    function prop(el, n) { try { return getComputedStyle(el).getPropertyValue(n).trim(); } catch (e) { return ''; } }
    function num(el, n, d) { var v = parseFloat(prop(el, n)); return isNaN(v) ? d : v; }
    function trackText() { return [name, week, val, pill].filter(Boolean); }
    function pct(f) { return Math.round(f * 100); }

    function setRow(li, n) {
      li.setAttribute('data-kind', n[0]);
      var u = li.querySelector('.v7-node-tile use'), t = li.querySelector('.v7-node-t'), m = li.querySelector('.v7-node-m');
      if (u) u.setAttribute('href', '#i-' + n[1]);
      if (t) t.textContent = n[2];
      if (m) m.textContent = n[3];
    }
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

    // The ghost look for goal g (instant). set: true on the very first frame (the goal is already set: sentence and chips at
    // full ink); false when a later goal loads behind the ghosts (the sentence is about to be typed, the old chips stay ghosted).
    function load(g, set) {
      var N = g.nodes.length;
      if (set) { goal.classList.remove('m-hero-typing'); text.innerHTML = g.html; vals.forEach(function (v, i) { v.textContent = g.chips[i]; }); unghostNow(vals); }
      else { goal.classList.add('m-hero-typing'); caret(); ghost(vals); }
      fstat.textContent = TX.building; ghost(fstat);
      V7.gone(think); V7.off(ready);
      rows.forEach(function (li, i) {
        var lk = link(li);
        li.classList.add('is-sk');
        if (i < N) { setRow(li, g.nodes[i]); V7.on(li); ghost(li); } else V7.gone(li);
        if (lk) { if (i < N - 1) { V7.on(lk); V7.shrink(lk, 'y'); } else V7.gone(lk); }
      });
      setCount(N);
      V7.gone(dot);
      name.textContent = g.name;
      week.textContent = g.week; week.classList.remove('is-fc');
      val.textContent = pct(g.base) + '%';
      pill.setAttribute('data-tone', 'neutral'); pill.textContent = TX.checking;
      ghost(trackText()); ghost([tick, flag]);
      if (fill) fill.style.setProperty('--v', g.base);
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
      var o = OFF[gi], N = g.nodes.length, f0 = !gi && first, sh = f0 ? SH : 0,
        built = T.row0 + (N - 1) * T.step + T.xf + 80, E = o + EXIT[gi], next = G[(gi + 1) % G.length], NN = next.nodes.length;
      var A = function (t) { return o + t - sh; }; // times after Enter
      at(o, function () { stage('goal'); });
      if (!f0) at(o + T.type, function () { V7.type(tl, text, g.text, { duration: T.typeDur, html: g.html }); });
      // Enter: on the first frame the goal is already set, so only the key and the border confirm it
      at(f0 ? o + 250 : o + T.enter, function () {
        if (!f0) text.innerHTML = g.html;
        V7.tap(tl, kbd);
        var line = prop(goal, 'border-top-color'), you = prop(root, '--m-you'), soft = prop(root, '--m-you-soft'), sh2 = prop(goal, 'box-shadow');
        sh2 = sh2 && sh2 !== 'none' ? sh2 : '0 0 0 0 transparent';
        if (you) tl.anim(goal, [{ borderColor: line, boxShadow: '0 0 0 0 transparent, ' + sh2 }, { offset: .2, borderColor: you, boxShadow: '0 0 0 3px ' + (soft || 'transparent') + ', ' + sh2 },
          { offset: .8, borderColor: you, boxShadow: '0 0 0 3px ' + (soft || 'transparent') + ', ' + sh2 }, { borderColor: line, boxShadow: '0 0 0 0 transparent, ' + sh2 }], { duration: 520, easing: 'linear', fill: 'none' });
      });
      if (!f0) at(o + T.hl, function () {
        nocaret();
        goal.classList.remove('m-hero-typing');
        V7.$$(text, '.m-hero-hl').forEach(function (h, k) {
          tl.anim(h, [{ backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px' }], { duration: 200, delay: k * 70, easing: 'out', fill: 'backwards' });
        });
        vals.forEach(function (v, i) { V7.roll(tl, v, g.chips[i], { delay: i * 90 }); });
        unghost(tl, vals, { y: 0, stagger: 90 });
      });
      // Mate builds the flows: each ghost step comes up to full ink, top-down
      at(A(T.flows), function () {
        stage('flows');
        unghost(tl, fstat, { y: 0 });
        V7.show(tl, think, { y: 0, duration: 200, delay: 160 });
      });
      at(A(T.row0), function () {
        rows.slice(0, N).forEach(function (li, n) {
          var d = n * T.step;
          if (n) V7.grow(tl, link(rows[n - 1]), { axis: 'y', duration: 110, delay: Math.max(0, d - 70) });
          unghost(tl, li, { duration: T.xf, delay: d, y: 2 });
          tl.after(d, function () { li.classList.remove('is-sk'); });
        });
      });
      at(A(built - 60), function () { V7.hide(tl, think, { y: 0, duration: 120 }); });
      at(A(built), function () { V7.roll(tl, fstat, TX.built(N)); V7.pop(tl, ready); });
      // On track: the track card comes up and counts from the baseline to today's value
      at(A(T.track), function () {
        stage('track');
        unghost(tl, [name, week, val], { duration: T.xf, y: 2 });
        unghost(tl, pill, { duration: 240, y: 0 });
        unghost(tl, [tick, flag], { duration: T.xf, delay: 80, y: 0 });
      });
      at(A(T.fill), function () {
        V7.bar(tl, fill, g.val / 100, { duration: 900 });
        V7.count(tl, val, { from: pct(g.base), to: g.val, duration: 900, suffix: '%' });
        if (spk) V7.wipe(tl, spk, { duration: 900 });
      });
      at(A(T.status), function () { V7.status(tl, pill, g.risk ? 'you' : 'ok', g.risk ? TX.risk : TX.ok); });

      if (!g.risk) {
        at(A(T.dot), function () {
          var Ts = rows.slice(0, N).map(function (li) { return li.querySelector('.v7-node-tile'); });
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
        var cover = function () { var c = Math.round(num(inEl, '--m-hero-cover', 2)); return rows.slice(Math.max(0, N - c), N); };
        at(A(4200), function () {
          V7.show(tl, note, { y: 8, duration: 300 });
          dims = cover().map(function (li) { return tl.anim(li, [{ opacity: 1 }, { opacity: .28 }], { duration: 260, easing: 'out', fill: 'forwards' }); });
        });
        at(A(4800), function () { V7.cursorTo(tl, approve, { duration: 500 }); });
        at(A(5400), function () {
          V7.tap(tl, approve);
          V7.hide(tl, details, { y: 0, duration: 120 });
          tl.after(124, function () { V7.gone(details); });
          V7.roll(tl, approve, TX.approved, { delay: 40 });
          tl.after(136, function () { approve.classList.remove('is-primary'); approve.classList.add('is-ok'); });
        });
        at(A(5700), function () { V7.roll(tl, week, g.fc, { html: true }); tl.after(96, function () { week.classList.add('is-fc'); }); });
        at(A(6000), function () { V7.status(tl, pill, 'ok', TX.ok); });
        at(A(7000), function () {
          V7.hide(tl, note, { y: 8, duration: 220 });
          V7.cursorHide(tl, approve);
          dims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
          dims = [];
          cover().forEach(function (li) { tl.anim(li, [{ opacity: .28 }, { opacity: 1 }], { duration: 260, easing: 'out', fill: 'backwards' }); });
        });
      }

      // exit: the content ghosts (it never becomes grey bars) while the goal untypes; the next goal loads behind the ghosts
      at(E, function () {
        goal.classList.add('m-hero-typing');
        V7.$$(text, '.m-hero-hl').forEach(function (h) {
          tl.anim(h, [{ backgroundSize: '100% 2px' }, { backgroundSize: '0% 2px' }], { duration: 160, easing: 'in', fill: 'forwards' });
        });
        toGhost(tl, vals, { duration: T.back });
        toGhost(tl, fstat, { duration: T.back });
        V7.hide(tl, ready, { y: 0, duration: 200 });
        rows.slice(0, N).forEach(function (li, i) {
          li.classList.add('is-sk');
          if (i < NN) toGhost(tl, li, { duration: T.back }); else V7.hide(tl, li, { y: 0, duration: T.back });
          if (i < N - 1) V7.hide(tl, link(li), { y: 0, duration: 200 });
        });
        toGhost(tl, trackText().concat([tick, flag]), { duration: T.back });
        V7.bar(tl, fill, next.base, { duration: T.back + 60, easing: 'inOut' });
        if (spk) V7.hide(tl, spk, { y: 0, duration: T.back });
        if (NN > N) {
          setCount(NN, tl, { duration: 300 });
          rows.slice(N, NN).forEach(function (li, i) {
            setRow(li, next.nodes[N + i]);
            li.classList.add('is-sk'); ghost(li);
            V7.show(tl, li, { y: 0, duration: T.back, delay: 120 });
          });
        }
      });
      if (NN < N) at(E + T.back + 10, function () { V7.gone(rows.slice(NN, N)); setCount(NN, tl, { duration: 300 }); });
      at(E + 160, function () { V7.untype(tl, text, { duration: T.untype }); });
      at(E + 160 + T.untype + 60, function () { load(next, false); });
    });

    return {
      length: TOTAL, hold: 0, loop: true, maxLoops: 2, selfExit: true,
      arm: function () {
        load(G[0], first);
        if (ph) V7.gone(ph);
        if (!first) { goal.classList.add('m-hero-typing'); caret(); }
      },
      steps: steps
    };
  });

  // Hero stepper sync, as in M1.js, for the lab id.
  V7.ready(function () {
    var d = document;
    function isM1(t) { return t && t.getAttribute && t.getAttribute('data-v7-mock') === 'M1L'; }
    function stepperFor(t) { var s = t && t.closest && (t.closest('.v7-hero') || t.closest('section')); return s && s.querySelector('ol.v7-stepper'); }
    function clear(ol) { if (!ol) return; ol.removeAttribute('data-sync'); V7.$$(ol, 'li[data-active]').forEach(function (li) { li.removeAttribute('data-active'); }); }
    d.addEventListener('v7:stage', function (e) {
      var t = e.target, st = e.detail && e.detail.stage, ol;
      if (!isM1(t) || V7.static || !st) return;
      var c = V7.get(t);
      if (c.state === 'done' || c.state === 'final') return;
      if (!(ol = stepperFor(t))) return;
      ol.setAttribute('data-sync', '');
      V7.$$(ol, ':scope > li').forEach(function (li) { if (li.getAttribute('data-stage') === st) li.setAttribute('data-active', ''); else li.removeAttribute('data-active'); });
    });
    d.addEventListener('v7:state', function (e) { var t = e.target, s = e.detail && e.detail.state; if (isM1(t) && (s === 'done' || s === 'final')) clear(stepperFor(t)); });
    d.addEventListener('v7:static', function () { V7.$$(d, 'ol.v7-stepper').forEach(clear); });
  });
})();
}
