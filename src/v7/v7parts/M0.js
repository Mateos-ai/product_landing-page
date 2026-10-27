// >>> M0 v7-app shell (spec §6 M0). The shell has no timeline; navTo lives in C1.
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7) return;
  function appOf(el) { return el && el.closest ? (el.closest('.v7-app') || (el.querySelector ? el.querySelector('.v7-app') : null)) : null; }
  // 'none' (< 560px), 'rail' (560–879px) or 'full' (≥ 880px): the same bands as the container queries in M0.css.
  V7.shellMode = function (el) {
    var app = appOf(el), w = app ? app.clientWidth : 0;
    return !app ? '' : w < 560 ? 'none' : w < 880 ? 'rail' : 'full';
  };
  // A shell without an active nav item takes it (and its title) from its first screen's data-nav / data-title.
  V7.ready(function () {
    V7.$$(document, '.v7-app').forEach(function (app) {
      if (app.querySelector('.v7-nav-item[data-active]')) return;
      var s = app.querySelector('.v7-screen[data-nav]');
      if (s) V7.navTo(app, s.getAttribute('data-nav'), s.getAttribute('data-title'));
    });
  });
})();
// <<< M0
