// Records each self-playing demo window into a seamless, constant-size looping
// video (webm + mp4 + poster) with CRISP full-resolution frames.
//
// Why v2 (vs the CDP-screencast v1):
//   * Softness  -> v1 screencast captured at CSS resolution and re-compressed the
//     whole viewport. v2 grabs full-res clipped screenshots at deviceScaleFactor 2
//     (native renders, encoded once at high quality).
//   * Resizing  -> the demo card reflows as it streams in and as actions add rows,
//     so a fixed crop made the window grow/shrink. v2 measures the window's MAX
//     height over a full loop and pins it, so content streams into a STABLE box.
//
// The animation itself is left to play in real time - it is designed for it and is
// reliable there (a virtual clock desyncs its CSS transitions / rAF cursor / nested
// timers). We just sample it faster and sharper.
//
// Usage:
//   NODE_PATH=$(npm root -g) node scripts/record-demos-v2.mjs [--theme light|dark] [--only <substr>]
//
// Requires: a running `npm run dev` with USE_VIDEO=false (live windows), global
// playwright, ffmpeg on PATH.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const execFileP = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const THEME = getArg("--theme", "light");
const ONLY = getArg("--only", null);

const URL = "http://localhost:4321/";
const DSF = 2;                                   // retina output (clip is CSS px, image is clip*DSF)
const OUT_FPS = 20;
const MEASURE_MS = 17000;                         // sample one full loop to find the max height
const CAPTURE_MS = 30000;                         // grab ~2 loops so a seamless period is present
const VIEWPORT = { width: 1440, height: 1240 };   // tall enough to keep a pinned window fully in view
const OUT_DIR = path.resolve("public/demos");
const TMP_DIR = path.resolve(process.env.SCRATCH || "/tmp", "demo-frames-v2");

async function hashFrame(buf) { return sharp(buf).greyscale().resize(16, 16, { fit: "fill" }).raw().toBuffer(); }
function frameDist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, reducedMotion: "no-preference" });
  await context.addInitScript((theme) => { try { localStorage.setItem("mateos-theme", theme); } catch {} }, THEME);

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), THEME);

  const targets = await page.evaluate(() => {
    const out = []; const per = {};
    document.querySelectorAll(".pin-window").forEach((el) => {
      const sec = el.closest("section[id]"); const sid = sec ? sec.id : "sec";
      per[sid] = (per[sid] ?? -1) + 1; el.setAttribute("data-rec-id", `${sid}-${per[sid]}`);
      out.push(`${sid}-${per[sid]}`);
    });
    return out;
  });
  const list = ONLY ? targets.filter((t) => t.includes(ONLY)) : targets;
  console.log(`[${THEME}] recording:`, list.join(", ") || "(none)");
  for (const name of list) await recordWindow(page, name);
  await browser.close();
}

async function recordWindow(page, name) {
  const sel = `.pin-window[data-rec-id="${name}"]`;
  console.log(`\n=== ${name} (${THEME}) ===`);

  // clear any prior pin, center this window, let its IntersectionObserver start the loop
  await page.evaluate((s) => {
    document.querySelectorAll(".pin-window-body").forEach((b) => { b.style.height = ""; b.style.minHeight = ""; b.style.overflow = ""; });
    document.querySelector(s).scrollIntoView({ block: "center", inline: "center" });
  }, sel);
  const handle = await page.$(sel);
  await sleep(700); // real warmup: rendering lifecycle fires IO -> self-player start()

  // ── pass 1: sample the window height across one loop, capture its max ─────────
  let maxH = 0;
  const t1 = Date.now();
  while (Date.now() - t1 < MEASURE_MS) {
    const h = await handle.evaluate((el) => el.getBoundingClientRect().height);
    if (h > maxH) maxH = h;
    await sleep(60);
  }
  maxH = Math.ceil(maxH) + 2;
  // pin the body to a FIXED height so the window neither grows nor shrinks
  await handle.evaluate((el, mh) => {
    const body = el.querySelector(".pin-window-body");
    const chrome = el.querySelector(".pin-window-chrome");
    const ch = chrome ? chrome.getBoundingClientRect().height : 0;
    body.style.height = Math.max(0, mh - ch) + "px";
    body.style.minHeight = "0";
    body.style.overflow = "hidden";
    body.style.boxSizing = "border-box";
  }, maxH);
  await sleep(120);

  // stable clip rect (CSS px) now that the size is pinned
  const box = await handle.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.floor(box.w), height: Math.floor(box.h) };
  console.log(`  pinned ${clip.width}x${clip.height} CSS px (window max ${maxH}px)`);

  // ── pass 2: capture full-res clipped frames in real time with timestamps ──────
  const frames = [];
  const t2 = Date.now();
  while (Date.now() - t2 < CAPTURE_MS) {
    const buf = await page.screenshot({ clip, animations: "allow", type: "png" });
    frames.push({ t: Date.now() - t2, buf });
  }
  const eff = (frames.length / (CAPTURE_MS / 1000)).toFixed(1);
  console.log(`  captured ${frames.length} frames (${eff} fps effective)`);

  // ── resample to constant OUT_FPS (nearest previous frame) ─────────────────────
  const totalDur = frames[frames.length - 1].t / 1000;
  const nTicks = Math.floor(totalDur * OUT_FPS);
  const ticks = []; let fi = 0;
  for (let k = 0; k < nTicks; k++) {
    const tt = (k / OUT_FPS) * 1000;
    while (fi + 1 < frames.length && frames[fi + 1].t <= tt) fi++;
    ticks.push(fi);
  }

  // hash the referenced frames, detect the seamless loop period
  const cache = new Map();
  for (const idx of ticks) if (!cache.has(idx)) cache.set(idx, await hashFrame(frames[idx].buf));
  const H = ticks.map((idx) => cache.get(idx));
  const minL = Math.round(2.0 * OUT_FPS);
  const maxL = Math.floor(H.length / 2);
  let best = { L: H.length, d: Infinity };
  for (let L = minL; L <= maxL; L++) {
    const overlap = H.length - L; if (overlap < OUT_FPS) break;
    let s = 0; for (let i = 0; i < overlap; i++) s += frameDist(H[i], H[i + L]);
    const d = s / overlap; if (d < best.d - 0.15) best = { L, d };
  }
  const loopLen = best.L;
  console.log(`  detected loop = ${(loopLen / OUT_FPS).toFixed(2)}s (dist ${best.d.toFixed(2)})`);

  // ── write one period (even dims) ──────────────────────────────────────────────
  const frameDir = path.join(TMP_DIR, `${name}-${THEME}`);
  await rm(frameDir, { recursive: true, force: true }); await mkdir(frameDir, { recursive: true });
  const m0 = await sharp(frames[ticks[0]].buf).metadata();
  const W = m0.width - (m0.width % 2), Hh = m0.height - (m0.height % 2);
  for (let k = 0; k < loopLen; k++) {
    await sharp(frames[ticks[k]].buf).extract({ left: 0, top: 0, width: W, height: Hh })
      .toFile(path.join(frameDir, `f${String(k).padStart(5, "0")}.png`));
  }

  // poster: richest long-static frame (the finished state)
  const runs = []; let rs = 0;
  for (let i = 1; i <= loopLen; i++) { const same = i < loopLen && frameDist(H[i], H[i - 1]) < 4.0; if (!same) { runs.push({ start: rs, len: i - rs }); rs = i; } }
  const variance = (h) => { let m = 0; for (const v of h) m += v; m /= h.length; let s = 0; for (const v of h) s += (v - m) * (v - m); return s / h.length; };
  const maxLen = Math.max(...runs.map((r) => r.len));
  const posterK = runs.filter((r) => r.len >= Math.max(3, maxLen * 0.4))
    .map((r) => { const k = r.start + Math.floor(r.len / 2); return { k, v: variance(H[k]) }; })
    .sort((a, b) => b.v - a.v)[0].k;

  const base = path.join(OUT_DIR, name);
  const inPat = path.join(frameDir, "f%05d.png");
  await sharp(path.join(frameDir, `f${String(posterK).padStart(5, "0")}.png`)).jpeg({ quality: 84 }).toFile(`${base}-${THEME}.poster.jpg`);
  await execFileP("ffmpeg", ["-y", "-framerate", String(OUT_FPS), "-i", inPat,
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-pix_fmt", "yuv420p", "-an", `${base}-${THEME}.webm`]);
  await execFileP("ffmpeg", ["-y", "-framerate", String(OUT_FPS), "-i", inPat,
    "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${base}-${THEME}.mp4`]);
  const { stdout: sz } = await execFileP("bash", ["-c",
    `ls -l ${base}-${THEME}.webm ${base}-${THEME}.mp4 ${base}-${THEME}.poster.jpg | awk '{printf "%.0fKB %s\\n",$5/1024,$9}'`]);
  console.log("  " + sz.trim().replace(/\n/g, "\n  "));
  await rm(frameDir, { recursive: true, force: true });

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  let manifest = {}; try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch {}
  manifest[name] = { w: Math.round(W / DSF), h: Math.round(Hh / DSF) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  await handle.dispose();
}

main().catch((e) => { console.error(e); process.exit(1); });
