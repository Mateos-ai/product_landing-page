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
