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
