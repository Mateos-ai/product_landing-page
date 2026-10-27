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
