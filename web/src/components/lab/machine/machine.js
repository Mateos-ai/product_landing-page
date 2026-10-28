// LAB 3D1 loader: "the machine", the three-dot mark in 3D at the centre of the About hero's team orbit (M22).
// The SVG mark stays in the DOM as the poster (and the LCP stays text/SVG). The canvas is added only when all of these
// hold: JS on, prefers-reduced-motion: no-preference, viewport >= 900 px, no Save-Data, deviceMemory >= 4 when known,
// and a WebGL context is created (low-power, no major performance caveat). Otherwise, or on context loss, the SVG remains.
// three.js is imported lazily (its own chunk) after the hero is visible and the browser is idle. The loop is paused
// off-screen, when the tab is hidden and when the orbit's pause button is pressed; it runs at 30 fps at most and
// stops after 12 s without pointer movement. The canvas is aria-hidden; the figure keeps its caption.
export function initMachine() {
  const fig = document.querySelector('.m-team-fig');
  const root = fig && fig.querySelector('[data-v7-mock="M22"]');
  if (!fig || !root) return;
  const N = navigator, W = window;
  const why = [];
  if (!W.matchMedia('(prefers-reduced-motion: no-preference)').matches) why.push('reduced-motion');
  if (W.innerWidth < 900) why.push('narrow');
  if (N.connection && N.connection.saveData) why.push('save-data');
  if (typeof N.deviceMemory === 'number' && N.deviceMemory < 4) why.push('low-memory');
  if (why.length) { fig.setAttribute('data-lab-3d', 'poster:' + why.join(',')); return; }
  fig.setAttribute('data-lab-3d', 'waiting');

  let api = null, canvas = null, loading = false, inView = false, ro = null;
  const hub = () => root.querySelector('.m-team-hub');

  function fail(e) {
    if (e) try { console.warn('[lab 3D1] fallback to SVG:', e && e.message ? e.message : e); } catch (x) {}
    if (api) try { api.dispose(); } catch (x) {}
    api = null;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    fig.classList.remove('lab-3d-live');
    fig.setAttribute('data-lab-3d', 'fallback');
  }
  function attach() { // into the hub, so the canvas rides the hub's own pop and stays centred at every width
    const h = hub();
    if (!h || !canvas) return;
    if (canvas.parentNode !== h) h.insertBefore(canvas, h.firstChild);
    if (ro) ro.disconnect();
    ro = new ResizeObserver(() => { if (api) api.size(Math.max(1, Math.round(h.clientWidth)), Math.max(1, Math.round(h.clientHeight))); });
    ro.observe(h);
  }
  function mount(mod) {
    canvas = document.createElement('canvas');
    canvas.className = 'lab-3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('context lost'); });
    attach();
    try { api = mod.mountMark(canvas); } catch (e) { fail(e); return; }
    attach();
    W.__labMachine = api.stats;
    // the v7 controller restores its snapshot on replay: put the canvas back into the new hub
    new MutationObserver(() => { if (api && canvas.parentNode !== hub()) attach(); }).observe(root, { childList: true });
    api.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (api) { fig.classList.add('lab-3d-live'); fig.setAttribute('data-lab-3d', 'live'); } })));
    api.setVisible(inView && !document.hidden);
    // pointer tilt: from anywhere in the hero, relative to the hub centre
    const hero = fig.closest('section') || fig;
    hero.addEventListener('pointermove', (e) => {
      const h = hub(); if (!h || !api) return;
      const r = h.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      api.point((e.clientX - (r.left + r.width / 2)) / (hr.width / 2), (e.clientY - (r.top + r.height / 2)) / (hr.height / 2));
    }, { passive: true });
    hero.addEventListener('pointerleave', () => api && api.point(0, 0), { passive: true });
    document.addEventListener('visibilitychange', () => api && api.setVisible(inView && !document.hidden));
    // the orbit's pause button pauses the mark too (C1 sets data-v7-state="paused" on the mock root)
    root.addEventListener('v7:state', (e) => { if (!api) return; const s = e.detail && e.detail.state; api.setPaused(s === 'paused'); });
  }
  // Probe WebGL with the renderer's own attributes before downloading three.js: a software or blocklisted GPU fails here
  // (failIfMajorPerformanceCaveat) and the page keeps the SVG without fetching the chunk.
  function webgl() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true, powerPreference: 'low-power' });
      if (!gl) return false;
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }
  function load() {
    loading = true;
    if (!webgl()) { fail(); fig.setAttribute('data-lab-3d', 'poster:no-webgl'); return; }
    const idle = W.requestIdleCallback || ((f) => setTimeout(f, 200));
    idle(() => { import('./mark-scene.js').then(mount).catch(fail); }, { timeout: 1500 });
  }
  new IntersectionObserver((es) => {
    inView = es[es.length - 1].isIntersecting;
    if (inView && !api && !loading) load();
    if (api) api.setVisible(inView && !document.hidden);
  }, { threshold: 0.15 }).observe(fig);
}
