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
