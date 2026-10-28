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
