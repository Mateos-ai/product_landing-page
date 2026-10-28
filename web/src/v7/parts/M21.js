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
