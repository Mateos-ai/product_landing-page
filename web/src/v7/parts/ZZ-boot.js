// >>> ZZ-boot (spec §3.8; appended last, after every part has called V7.define / V7.ready)
(function () {
  'use strict';
  var V7 = window.V7;
  if (!V7 || !V7._boot || V7.booted) return; // no core: the head gate fails open after 2500ms
  V7.booted = true;
  var B = V7._boot;
  function step(name, f) { try { f(); } catch (e) { try { console.error('[V7] boot ' + name + ':', e); } catch (x) {} } }
  step('gate', B.gate);   // 1. html.v7-ready, V7.static
  step('mount', B.mount); // 2. snapshot + arm every [data-v7-mock] (or mark final when static); prepare reveals
  step('init', B.init);   // 3. pause buttons, then V7.ready() initialisers in registration order (K1, S1, T1, M15 toggle, P-HOME, P-PROD)
  B.fonts(function () {   // 4. fonts ready, or 600ms
    step('watch', B.watch); // 5. reveal observer + autonomous mock observers (visible ones fire at once)
  });
})();
// <<< ZZ-boot
