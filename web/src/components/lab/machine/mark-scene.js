// LAB 3D1 scene: renders the mark model into a transparent canvas over the About hero's hub. Imported lazily by
// machine.js (its own chunk, with three), only on /lab/ pages, only when every gate in machine.js has passed.
import { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, NeutralToneMapping, SRGBColorSpace } from 'three';
import { createMateosMarkModel, triangles, MARK_SPEC } from './mark-model.js';

const TILT = (6 * Math.PI) / 180; // pointer tilt, at most 6 degrees
const FRAME = 1000 / 30; // 30 fps cap
const IDLE = 12000; // breathing settles and the loop stops after 12 s without pointer movement

export function mountMark(canvas, opts = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping; // keeps the brand hues; ACES would shift amber and indigo
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(20, 1, 0.1, 20);
  camera.position.set(0, 0, 4.5); // long lens: the dots keep the logo's round silhouettes
  // review cycle 2: the brand hue must read true where the sphere faces the viewer, so most light is frontal
  // (key + hemisphere); the rim only separates the dots from the dark hub.
  // three's lights are physical (Lambert = albedo / pi): key + sky add up to about pi facing the camera, so the lit
  // centre of each sphere shows its brand hex (cycle 3).
  const key = new DirectionalLight(0xffffff, 2.2); key.position.set(-1.2, 1.6, 4);
  const rim = new DirectionalLight(0xd9d7ff, 2.4); rim.position.set(2.5, 1.5, -3);
  const env = new HemisphereLight(0xffffff, 0x9a9ab4, 1.7);
  scene.add(key, rim, env);
  const mark = createMateosMarkModel();
  scene.add(mark);

  // compile the shaders off the first frame (KHR_parallel_shader_compile where available): no long task on mount
  let compiled = false;
  const ready = (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).catch(() => {}).then(() => { compiled = true; });
  const stats = { triangles: triangles(mark), frames: 0, fps: 0, avgFrameMs: 0, maxFrameMs: 0, running: false };
  let w = 0, h = 0;
  function size(px, py) {
    if (px === w && py === h) return;
    w = px; h = py;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (compiled) draw(performance.now());
  }

  let raf = 0, last = 0, t0 = performance.now(), act = performance.now(), paused = false, visible = true;
  let tx = 0, ty = 0, rx = 0, ry = 0; // target and current tilt
  let env1 = 1; // breathing envelope (1 = full, 0 = at rest)
  let fpsT = performance.now(), fpsN = 0, sum = 0;
  function draw(now) {
    const t = (now - t0) / 1000;
    const k = 0.12; rx += (tx - rx) * k; ry += (ty - ry) * k;
    mark.rotation.set(rx, ry, 0);
    const idle = now - act > IDLE;
    env1 += ((idle ? 0 : 1) - env1) * 0.08;
    for (const m of mark.children) {
      const b = m.userData.breathe, p = m.userData.base;
      // indigo leads, teal follows 0.9 s later; a 4.2 s breath, forward in z and a touch of scale; amber holds still
      const s = Math.sin(((t - b.phase) / 4.2) * Math.PI * 2) * b.amp * env1;
      m.position.set(p[0], p[1], p[2] + s * 2.2);
      m.scale.setScalar(1 + s * 0.35);
    }
    const a = performance.now();
    renderer.render(scene, camera);
    const ms = performance.now() - a;
    stats.frames++; fpsN++; sum += ms; stats.maxFrameMs = Math.max(stats.maxFrameMs, ms);
    stats.avgFrameMs = +(sum / stats.frames).toFixed(2);
    if (now - fpsT >= 1000) { stats.fps = Math.round((fpsN * 1000) / (now - fpsT)); fpsN = 0; fpsT = now; }
    return idle && env1 < 0.01 && Math.abs(tx - rx) < 1e-4 && Math.abs(ty - ry) < 1e-4;
  }
  function loop(now) {
    raf = 0;
    if (paused || !visible) { stats.running = false; return; }
    if (now - last >= FRAME - 2) { last = now; if (draw(now)) { stats.running = false; return; } }
    stats.running = true;
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!compiled) { ready.then(start); return; } if (!raf && !paused && visible) { stats.running = true; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; stats.running = false; }

  return {
    stats,
    ready,
    size,
    poke() { act = performance.now(); start(); },
    point(nx, ny) { // nx, ny in -1..1 from the hero centre
      tx = Math.max(-1, Math.min(1, ny)) * TILT; ty = Math.max(-1, Math.min(1, nx)) * TILT;
      act = performance.now(); start();
    },
    setVisible(v) { if (v === visible && (raf || !v)) return; visible = v; if (v) { act = performance.now(); start(); } else stop(); },
    setPaused(p) { if (p === paused) return; paused = p; if (p) stop(); else { act = performance.now(); start(); } },
    start,
    dispose() { stop(); mark.traverse((o) => { if (o.isMesh) o.material.dispose(); }); mark.children[0]?.geometry.dispose(); renderer.dispose(); },
    spec: MARK_SPEC,
  };
}
