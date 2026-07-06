// Records each self-playing demo window on the landing page into a seamless,
// constant-size looping video (webm + mp4 + poster).
//
// Strategy: scroll a .pin-window into view so its loop starts, CDP-screencast
// the viewport for a while, resample frames to a constant fps, auto-detect the
// loop period by frame hashing (so any section type works with no per-section
// logic), then crop to the window's box and encode with ffmpeg.
//
// Usage:
//   NODE_PATH=$(npm root -g) node scripts/record-demos.mjs [--theme light|dark] [--only <name-substr>] [--seconds N]
//
// Requires: a running `npm run dev` (localhost:4321), global playwright, ffmpeg on PATH.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright"); // resolved via NODE_PATH (global install)
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const execFileP = promisify(execFile);

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const THEME = getArg("--theme", "light");
const ONLY = getArg("--only", null);
const FORCE_SECONDS = getArg("--seconds", null) ? Number(getArg("--seconds")) : null;

const URL = "http://localhost:4321/";
// physical viewport 2048x1400 + CSS zoom 2 => 1024-CSS *desktop* layout painted at
// 2x, so the ~460px window is rasterised crisply at ~920px for retina. (screencast
// ignores deviceScaleFactor and captures at CSS-pixel resolution, hence the zoom.)
const VIEWPORT = { width: 2048, height: 1400 };
const ZOOM = 2;
const CAPTURE_MS = Number(getArg("--capture", "30000")); // enough for ~2 cycles of the longest demo
const OUT_FPS = 24;
const OUT_DIR = path.resolve("public/demos");
const TMP_DIR = path.resolve(
  process.env.SCRATCH || "/tmp",
  "demo-frames"
);

// perceptual-ish hash: 16x16 grayscale raw bytes; distance = mean abs diff
async function hashFrame(buf) {
  const raw = await sharp(buf).greyscale().resize(16, 16, { fit: "fill" }).raw().toBuffer();
  return raw; // 256 bytes
}
function frameDist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: "no-preference",
  });
  // force theme before any page script runs
  await context.addInitScript((theme) => {
    try { localStorage.setItem("mateos-theme", theme); } catch {}
  }, THEME);
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(({ t, z }) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.zoom = String(z);
  }, { t: THEME, z: ZOOM });
  await page.waitForTimeout(400); // let the zoomed layout settle

  // enumerate windows with stable names: <sectionId>-<indexWithinSection>
  const targets = await page.evaluate(() => {
    const out = [];
    const perSection = {};
    document.querySelectorAll(".pin-window").forEach((el, gi) => {
      const sec = el.closest("section[id]");
      const sid = sec ? sec.id : "sec";
      perSection[sid] = (perSection[sid] ?? -1) + 1;
      el.setAttribute("data-rec-id", `${sid}-${perSection[sid]}`);
      out.push(`${sid}-${perSection[sid]}`);
    });
    return out;
  });

  const list = ONLY ? targets.filter((t) => t.includes(ONLY)) : targets;
  console.log(`[${THEME}] windows:`, targets.join(", "));
  console.log(`[${THEME}] recording:`, list.join(", ") || "(none)");

  for (const name of list) {
    await recordWindow(page, name);
  }

  await browser.close();
}

async function recordWindow(page, name) {
  const sel = `.pin-window[data-rec-id="${name}"]`;
  console.log(`\n=== ${name} (${THEME}) ===`);

  // center it so its IntersectionObserver (>=0.95) starts the loop; pause others
  await page.$eval(sel, (el) => el.scrollIntoView({ block: "center", inline: "center" }));
  await page.waitForTimeout(1200); // settle scroll + let the loop kick off

  const box = await page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });

  // ---- CDP screencast ----
  const client = await page.context().newCDPSession(page);
  const frames = []; // {t, buf}
  client.on("Page.screencastFrame", async (f) => {
    frames.push({ t: f.metadata.timestamp, buf: Buffer.from(f.data, "base64") });
    try { await client.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });
  await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  await page.waitForTimeout(CAPTURE_MS);
  await client.send("Page.stopScreencast");
  await client.detach();

  if (frames.length < 10) throw new Error(`${name}: too few frames (${frames.length})`);
  const t0 = frames[0].t;
  for (const fr of frames) fr.t -= t0;
  const totalDur = frames[frames.length - 1].t;
  console.log(`  captured ${frames.length} frames over ${totalDur.toFixed(1)}s`);

  // ---- resample to constant fps (nearest-previous frame) ----
  const settle = 0.5; // skip lead-in
  const usable = totalDur - settle;
  const nTicks = Math.floor(usable * OUT_FPS);
  const ticks = []; // frame index per tick
  let fi = 0;
  for (let k = 0; k < nTicks; k++) {
    const tt = settle + k / OUT_FPS;
    while (fi + 1 < frames.length && frames[fi + 1].t <= tt) fi++;
    ticks.push(fi);
  }

  // ---- hash unique frames referenced by ticks ----
  const hashCache = new Map();
  for (const idx of ticks) {
    if (!hashCache.has(idx)) hashCache.set(idx, await hashFrame(frames[idx].buf));
  }
  const H = ticks.map((idx) => hashCache.get(idx));

  // ---- detect loop period (in ticks) ----
  let loopTicks;
  if (FORCE_SECONDS) {
    loopTicks = Math.round(FORCE_SECONDS * OUT_FPS);
    console.log(`  forced loop = ${FORCE_SECONDS}s (${loopTicks} ticks)`);
  } else {
    const minL = Math.round(2.0 * OUT_FPS);   // demos are at least ~2s
    const maxL = Math.round((usable / 2) * OUT_FPS);
    let best = { L: minL, d: Infinity };
    for (let L = minL; L <= maxL; L++) {
      const overlap = H.length - L;
      if (overlap < OUT_FPS) break;
      let s = 0;
      for (let i = 0; i < overlap; i++) s += frameDist(H[i], H[i + L]);
      const d = s / overlap;
      if (d < best.d - 0.15) best = { L, d }; // prefer the smallest strong period
    }
    loopTicks = best.L;
    console.log(`  detected loop = ${(loopTicks / OUT_FPS).toFixed(2)}s (dist ${best.d.toFixed(2)})`);
  }

  // ---- write one period of cropped PNGs ----
  const frameDir = path.join(TMP_DIR, `${name}-${THEME}`);
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });

  // crop rect in device px; derive scale from the ACTUAL frame size (screencast
  // dims aren't always viewport*DPR), then clamp inside bounds + round to even
  const meta = await sharp(frames[ticks[0]].buf).metadata();
  const scale = meta.width / VIEWPORT.width;
  let cx = Math.max(0, Math.round(box.x * scale));
  let cy = Math.max(0, Math.round(box.y * scale));
  let cw = Math.round(box.w * scale);
  let ch = Math.round(box.h * scale);
  cw = Math.min(cw, meta.width - cx); cw -= cw % 2;
  ch = Math.min(ch, meta.height - cy); ch -= ch % 2;
  console.log(`  frame ${meta.width}x${meta.height}, scale ${scale.toFixed(2)}, crop ${cw}x${ch} @ ${cx},${cy}`);

  for (let k = 0; k < loopTicks; k++) {
    const fr = frames[ticks[k]];
    const outPath = path.join(frameDir, `f${String(k).padStart(5, "0")}.png`);
    await sharp(fr.buf).extract({ left: cx, top: cy, width: cw, height: ch }).toFile(outPath);
  }
  console.log(`  wrote ${loopTicks} frames @ ${cw}x${ch}px`);

  // ---- encode ----
  const base = path.join(OUT_DIR, name);
  const inPat = path.join(frameDir, "f%05d.png");
  // poster: the "finished" state is the longest static stretch of the loop (the
  // ~2.6s hold before it wraps). It reads far better as a static preview than the
  // blank/typing frames - and it's what prefers-reduced-motion users see, since
  // the video won't autoplay for them. Find the longest run of near-identical
  // consecutive frames and take its middle.
  const runs = [];
  let runStart = 0;
  for (let i = 1; i <= loopTicks; i++) {
    const same = i < loopTicks && frameDist(H[i], H[i - 1]) < 4.0; // tolerate capture noise
    if (!same) { runs.push({ start: runStart, len: i - runStart }); runStart = i; }
  }
  // "ink" = variance of the frame's grayscale hash -> a busy/full card scores higher
  // than an empty greeting. Among the longer static runs, pick the richest one.
  const variance = (h) => { let m = 0; for (const v of h) m += v; m /= h.length;
    let s = 0; for (const v of h) s += (v - m) * (v - m); return s / h.length; };
  const maxLen = Math.max(...runs.map((r) => r.len));
  const posterK = runs
    .filter((r) => r.len >= Math.max(3, maxLen * 0.4))
    .map((r) => { const k = r.start + Math.floor(r.len / 2); return { k, v: variance(H[k]) }; })
    .sort((a, b) => b.v - a.v)[0].k;
  await sharp(path.join(frameDir, `f${String(posterK).padStart(5, "0")}.png`))
    .jpeg({ quality: 82 }).toFile(`${base}-${THEME}.poster.jpg`);
  // webm (VP9)
  await execFileP("ffmpeg", ["-y", "-framerate", String(OUT_FPS), "-i", inPat,
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-pix_fmt", "yuv420p",
    "-an", `${base}-${THEME}.webm`]);
  // mp4 (H.264) - width must be even (already) ; yuv420p for Safari
  await execFileP("ffmpeg", ["-y", "-framerate", String(OUT_FPS), "-i", inPat,
    "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-an", `${base}-${THEME}.mp4`]);

  const { stdout: sz } = await execFileP("bash", ["-c",
    `ls -l ${base}-${THEME}.webm ${base}-${THEME}.mp4 ${base}-${THEME}.poster.jpg | awk '{print $5, $9}'`]);
  console.log(sz.trim());
  await rm(frameDir, { recursive: true, force: true });

  // record intrinsic dimensions so the page can reserve space (no layout shift).
  // dims are theme-independent (same layout), so last writer wins harmlessly.
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  let manifest = {};
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch {}
  manifest[name] = { w: cw, h: ch };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
