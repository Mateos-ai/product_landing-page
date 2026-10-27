// >>> P-IND industries hub (Industries spec §5): the four card goals (factory 'X2') and the hero stepper that follows them
// Each card's goal is a small mock root (data-v7-play="host"). Final markup: the goal typed, On track, the approver.
// Motion, once per card: the goal types in, Enter, the pill says Mate is building, the approver comes in, On track.
// A card plays once its goal bar is in view; cards that come into view together start 250ms apart.
// While cards play, the hub hero stepper (ol.v7-hub-steps) lights the stage the slowest playing card is in, then rests.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var d = document;
  // ms from the card's start
  var T = { type: 100, typeDur: 950, enter: 1150, busy: 1230, who: 1880, ok: 2360, len: 2600, hold: 500 };
  // pill labels by page language (<html lang>); the English strings are unchanged
  var HE = (d.documentElement.lang || '').slice(0, 2) === 'he';
  var TX = HE ? { newGoal: 'יעד חדש', building: 'בבנייה', onTrack: 'כמתוכנן' } : { newGoal: 'New goal', building: 'Building', onTrack: 'On track' };

  V7.define('X2', function (root) {
    var bar = V7.$(root, '.v7-hub-bar'), text = V7.$(root, '.v7-hub-text'), ph = V7.$(root, '.v7-hub-ph'),
      kbd = V7.$(root, '.v7-hub-kbd'), pill = V7.$(root, '.v7-hub-pill'), who = V7.$(root, '.v7-hub-who');
    if (!bar || !text || !pill) throw new Error('X2 markup incomplete');
    var full = text.textContent, dots;
    function stage(s) { V7.emit(root, 'v7:hubstage', { stage: s }); }
    return {
      length: T.len, hold: T.hold, loop: false,
      arm: function () { // a structured start: the bar with its placeholder, a neutral "New goal" pill
        text.textContent = '';
        V7.on(ph);
        pill.setAttribute('data-tone', 'neutral');
        pill.innerHTML = '<span class="v7-thinking" data-v7-gone><i></i><i></i><i></i></span><span class="v7-lbl">' + TX.newGoal + '</span>';
        dots = pill.firstChild;
        V7.off(who);
      },
      steps: [
        [0, function () { stage('goal'); }],
        [T.type, function (tl) { V7.gone(ph); bar.classList.add('is-typing'); V7.type(tl, text, full, { duration: T.typeDur }); }],
        [T.enter, function (tl) { V7.tap(tl, kbd); bar.classList.remove('is-typing'); }],
        // the dots replace the pill's dot as its label swaps (V7.roll swaps at 40% of 240ms)
        [T.busy, function (tl) { stage('flows'); V7.status(tl, pill, 'mate', TX.building); tl.after(96, function () { V7.on(dots); pill.classList.add('is-busy'); }); }],
        [T.who, function (tl) { V7.show(tl, who, { x: 8, y: 0, duration: 300 }); }],
        [T.ok, function (tl) { stage('track'); V7.status(tl, pill, 'ok', TX.onTrack); tl.after(96, function () { V7.gone(dots); pill.classList.remove('is-busy'); }); }]
      ]
    };
  });

  V7.ready(function () {
    var mocks = V7.$$(d, '[data-v7-mock="X2"]'), ol = d.querySelector('ol.v7-hub-steps');
    if (!mocks.length) return;

    /* Stepper: the lowest stage among the cards that are playing; data-sync rests (all pills white) once none plays. */
    var ORDER = { goal: 0, flows: 1, track: 2 }, st = [], rest = 0;
    function lis() { return ol ? V7.$$(ol, 'li[data-stage]') : []; }
    function clear() { if (!ol) return; ol.removeAttribute('data-sync'); lis().forEach(function (li) { li.removeAttribute('data-active'); }); }
    function render() {
      if (!ol) return;
      var min = 3;
      st.forEach(function (s) { if (s != null && s < min) min = s; });
      clearTimeout(rest);
      if (min > 2) { rest = setTimeout(clear, 900); return; }
      ol.setAttribute('data-sync', '');
      lis().forEach(function (li) { if (ORDER[li.getAttribute('data-stage')] === min) li.setAttribute('data-active', ''); else li.removeAttribute('data-active'); });
    }
    d.addEventListener('v7:hubstage', function (e) {
      var i = mocks.indexOf(e.target), s = e.detail && ORDER[e.detail.stage];
      if (i < 0 || s == null) return;
      st[i] = s; render();
    });
    d.addEventListener('v7:state', function (e) {
      var i = mocks.indexOf(e.target), s = e.detail && e.detail.state;
      if (i < 0 || (s !== 'done' && s !== 'final') || st[i] == null) return;
      st[i] = null; render();
    });
    d.addEventListener('v7:static', function () { st = []; clearTimeout(rest); clear(); });
    if (V7.static) return;

    /* Play each card once, when its goal bar (the part that types) is fully in view. Start after the font gate (like the
       reveals), so a card never types before it has faded in; cards entering together are spaced 250ms apart. */
    var next = 0, BASE = 420, GAP = 250, n = 0;
    function arm() {
      if (n++) return;
      mocks.forEach(function (m) {
        var c = V7.get(m), fired = false, un = null;
        un = V7.observe(V7.$(m, '.v7-hub-bar') || m, { enter: .95, leave: 0 }, function (v) {
          if (!v || fired) return;
          fired = true;
          if (un) un();
          var now = Date.now(), at = Math.max(now + BASE, next);
          next = at + GAP;
          setTimeout(function () { c.play(); }, at - now);
        });
      });
    }
    try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(arm, arm); } catch (e) {}
    setTimeout(arm, 600);
  });
})();
// <<< P-IND
