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
