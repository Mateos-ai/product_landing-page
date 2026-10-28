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
