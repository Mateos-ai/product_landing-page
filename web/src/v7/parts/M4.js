// >>> M4 m-flow: flow builder (spec §6 M4). Host-driven (S1 on the homepage, T1 in the tour); also plays when called directly.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7.define) return;
  var HE = (document.documentElement.lang || '').slice(0, 2) === 'he'; // Hebrew markup: M4.he.html
  var TX = HE ? { ready: 'מוכן לבדיקה', draft: 'טיוטה · לבדיקה לפני הפעלה', building: 'Mate בונה מ-<bdi>G-01</bdi>' }
    : { ready: 'Ready to review', draft: 'Draft · review before live', building: 'Mate is building from <bdi>G-01</bdi>' };
  V7.define('M4', function (root) {
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return V7.$$(root, s); };
    var nodes = qa('.m-flow-col .v7-node'), links = qa('.m-flow-link'), tiles = nodes.map(function (n) { return n.querySelector('.v7-node-tile'); }),
      br = q('.m-flow-br'), blink = q('.m-flow-blink'), bline = q('.m-flow-bline'), bpill = q('.m-flow-branch'),
      insp = q('.m-flow-insp'), irows = qa('.m-flow-idl > div, .m-flow-ifoot'), n3 = q('.m-flow-n3'),
      pill = q('.m-flow-state'), live = q('.m-flow-live'), mst = q('.m-flow-mstat'), fin = mst ? mst.innerHTML : '',
      think = q('.m-flow-mate .v7-thinking'), chk = q('.m-flow-mchk'), dot = q('.m-flow-dot'), side = true;

    var steps = [], HOP = 220, RUN = 4260;
    // 400 + n·300: grow the link above node n (160ms, ending as the node lands), then pop node n. Node 7 lands at 2200.
    nodes.forEach(function (node, n) {
      var t = 400 + n * 300;
      // narrow: the main line first runs past the branch row under node 4
      if (n === 4) steps.push([t - 260, function (tl) { if (!side) V7.grow(tl, blink, { axis: 'y', duration: 100 }); }]);
      if (n > 0) steps.push([t - 160, function (tl) { V7.grow(tl, links[n - 1], { axis: 'y', duration: 160 }); }]);
      steps.push([t, function (tl) { V7.pop(tl, node, { duration: 260 }); }]);
    });
    steps.push(
      [2500, function (tl) { V7.grow(tl, bline, { axis: side ? 'x' : 'y', duration: 220 }); }],
      [2700, function (tl) { V7.pop(tl, bpill, { duration: 260 }); }],
      [3000, function (tl) {
        V7.roll(tl, mst, fin, { html: true });
        V7.hide(tl, think, { y: 0, duration: 140 });
        V7.pop(tl, chk, { duration: 260, from: .4, delay: 100 });
      }],
      [3300, function (tl) { // wide only: the inspector opens on step 3 (CSS hides both in other modes)
        if (!insp || !insp.getClientRects().length) return;
        if (n3) n3.setAttribute('data-selected', '');
        V7.show(tl, insp, { x: 16, y: 0, duration: 320 });
        V7.show(tl, irows, { y: 6, stagger: 60, delay: 120 });
      }],
      [4200, function (tl) { // a test run: the dot visits every step and each one flashes as it passes
        if (!dot || !tiles[0]) return;
        V7.place(dot, tiles[0]);
        V7.pop(tl, dot, { duration: 200, from: .3 });
        V7.flash(tl, nodes[0], { tone: 'ok', duration: 500 });
        for (var i = 1; i < tiles.length; i++) (function (i) {
          tl.at(RUN + (i - 1) * HOP, function (t) { V7.travel(t, dot, tiles[i - 1], tiles[i], { duration: HOP, easing: 'inOut' }); });
          tl.at(RUN + i * HOP, function (t) { V7.flash(t, nodes[i], { tone: 'ok', duration: 500 }); });
        })(i);
      }],
      [5700, function (tl) { V7.hide(tl, dot, { y: 0, duration: 160 }); }],
      [5800, function (tl) {
        V7.status(tl, pill, 'ok', TX.ready);
        if (live) live.classList.remove('is-disabled');
      }]
    );

    return {
      length: 6600, hold: 1200,
      arm: function () {
        side = !!br && getComputedStyle(br).position === 'absolute';
        V7.off(nodes); V7.shrink(links, 'y'); V7.shrink(blink, 'y');
        V7.shrink(bline, side ? 'x' : 'y'); V7.off(bpill);
        V7.off(insp); V7.off(irows);
        if (n3) n3.removeAttribute('data-selected');
        if (pill) { pill.setAttribute('data-tone', 'mate'); pill.textContent = TX.draft; }
        if (live) live.classList.add('is-disabled');
        if (mst) mst.innerHTML = TX.building;
        V7.on(think); V7.off(chk); V7.off(dot);
      },
      steps: steps
    };
  });
})();
// <<< M4
