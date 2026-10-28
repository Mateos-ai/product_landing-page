#!/usr/bin/env node
// Parity harness: compares the live static site (reference, ../site) with the Astro build (candidate, ./dist).
//
//   npm run build && npm run parity                       # every page of the reference site
//   npm run parity -- --pages /,/he/                      # only these paths
//   npm run parity -- --only-built                        # skip pages the candidate does not have yet
//   npm run parity -- --motion                            # also the motion smoke check (slow, 1440x900, motion on)
//   npm run parity -- --motion-only --pages /             # only the motion smoke check
//   npm run parity -- --variants d-light,m-dark           # subset of screenshot variants
//   npm run parity -- --help                              # this text
//
// Options: --pages <a,b>, --only-built, --motion, --motion-only, --motion-wait <ms> (45000), --no-shots,
// --variants <list>, --jobs <n> (4), --tolerance <pct> (0.05), --keep-shots, --strict (no known exceptions),
// --ref <dir>, --cand <dir>, --out <dir>.
//
// Per page it checks: (a) full-page screenshots, reducedMotion 'reduce', 1440x900 and 390x844, light and dark,
// plus a no-JS desktop shot, pixel-diffed (% differing pixels; antialiasing ignored); (b) <html lang/dir>, <title>,
// meta description, canonical, hreflang, the whole head metadata (meta/link/JSON-LD) and the visible text of <main>;
// (c) console errors and page errors; (d) every link and asset (and #anchors) resolves on the candidate server.
// Output: tools/parity-out/report.json, tools/parity-out/summary.md, tools/parity-out/diffs/*.png.
//
// Playwright: the global install is used (PW env var, else `npm root -g`/playwright). Chromium only.

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, extname, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

// ---------- CLI ----------
const FLAGS = ['--only-built', '--motion', '--motion-only', '--no-shots', '--keep-shots', '--strict', '--help', '-h'];
const OPTS = ['--pages', '--motion-wait', '--variants', '--jobs', '--tolerance', '--ref', '--cand', '--out'];
function usage() {
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  return src.slice(1, src.findIndex((l, i) => i > 0 && !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
}
if (flag('--help') || flag('-h')) { console.log(usage()); process.exit(0); }
for (let i = 0; i < args.length; i++) {
  if (FLAGS.includes(args[i])) continue;
  if (OPTS.includes(args[i]) && args[i + 1] != null && !args[i + 1].startsWith('--')) { i++; continue; }
  console.error(OPTS.includes(args[i]) ? `parity: ${args[i]} needs a value` : `parity: unknown argument ${args[i]}`);
  console.error('Run with --help for usage.');
  process.exit(2);
}

const REF = resolve(opt('--ref', join(WEB, '..', 'site')));
const CAND = resolve(opt('--cand', join(WEB, 'dist')));
const OUT = resolve(opt('--out', join(HERE, 'parity-out')));
const AA_TOLERANCE = parseFloat(opt('--tolerance', '0.05')); // % of pixels
const CONCURRENCY = parseInt(opt('--jobs', '4'), 10);
const MOTION = flag('--motion') || flag('--motion-only');
const SHOTS = !flag('--motion-only') && !flag('--no-shots');
// Long mocks (M1 hero, M7, M17) need ~30s to finish a first cycle; the wait ends as soon as a mock completes.
const MOTION_WAIT = parseInt(opt('--motion-wait', '45000'), 10);

// Known, reviewed differences: [path][text check] -> reason. They are reported but do not fail the page (--strict: they do).
const KNOWN = {
  '/404.html': {
    head: 'site/404.html wraps the page in a stray outer document (<html><head><meta charset=utf8><style>..</style></head><body>), '
      + 'so its real <title> and meta tags end up in <body>; the Astro 404 drops the wrapper. Needs founder sign-off.',
  },
};

const VARIANTS_ALL = {
  'd-light': { viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
  'd-dark': { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  'm-light': { viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  'm-dark': { viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  'd-nojs': { viewport: { width: 1440, height: 900 }, colorScheme: 'light', javaScriptEnabled: false },
};
const VARIANTS = (opt('--variants', Object.keys(VARIANTS_ALL).join(','))).split(',').filter((v) => VARIANTS_ALL[v]);

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  const pw = process.env.PW || join(execSync('npm root -g').toString().trim(), 'playwright');
  return req(pw);
}

// ---------- static server (GitHub Pages / Vercel-like: dir -> index.html, /dir -> /dir/, unknown -> 404.html) ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
function serve(root) {
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
      f = join(f, 'index.html');
    }
    if (!existsSync(f) || statSync(f).isDirectory()) {
      const nf = join(root, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(existsSync(nf) ? readFileSync(nf) : 'not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(f));
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}

// ---------- pages ----------
function htmlFiles(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) htmlFiles(f, acc); else if (e.name.endsWith('.html')) acc.push(f);
  }
  return acc;
}
const toPath = (root, f) => { const r = '/' + relative(root, f).split('\\').join('/'); return r.endsWith('/index.html') ? r.slice(0, -10) : r; };
const toFile = (root, p) => join(root, p.endsWith('/') ? p + 'index.html' : p);
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/[/.]/g, '_'));

let PAGES = htmlFiles(REF).map((f) => toPath(REF, f)).sort();
if (opt('--pages')) PAGES = opt('--pages').split(',').map((s) => s.trim());
const isRedirectPage = (html) => /http-equiv="refresh"/i.test(html);

// ---------- in-page extraction ----------
function extractInPage() {
  const q = (s) => document.querySelector(s);
  const main = q('main');
  const head = [];
  document.querySelectorAll('head meta, head link, head title, head script[type="application/ld+json"]').forEach((e) => {
    if (e.tagName === 'TITLE') head.push(['title', e.textContent]);
    else if (e.tagName === 'SCRIPT') head.push(['ld+json', e.textContent]);
    else if (e.tagName === 'META') head.push(['meta', e.getAttribute('name') || e.getAttribute('property') || e.getAttribute('http-equiv') || (e.hasAttribute('charset') ? 'charset' : '?'), e.getAttribute('content') || e.getAttribute('charset')]);
    else head.push(['link', e.getAttribute('rel'), e.getAttribute('hreflang') || '', e.getAttribute('type') || '', e.getAttribute('sizes') || '', e.getAttribute('href')]);
  });
  const urls = [];
  document.querySelectorAll('a[href], link[href], script[src], img[src], source[src], use[href], image[href], iframe[src], form[action]').forEach((e) => {
    const v = e.getAttribute('href') ?? e.getAttribute('src') ?? e.getAttribute('action');
    if (v != null) urls.push({ tag: e.tagName.toLowerCase(), rel: e.getAttribute('rel') || '', v, abs: e.tagName.toLowerCase() === 'use' ? v : new URL(v, location.href).href });
  });
  document.querySelectorAll('img[srcset], source[srcset]').forEach((e) => e.getAttribute('srcset').split(',').forEach((s) => { const v = s.trim().split(/\s+/)[0]; if (v) urls.push({ tag: 'srcset', rel: '', v, abs: new URL(v, location.href).href }); }));
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  return {
    lang: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir'),
    title: document.title,
    description: q('meta[name="description"]')?.getAttribute('content') ?? null,
    canonical: q('link[rel="canonical"]')?.getAttribute('href') ?? null,
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')]),
    head, urls, ids,
    mainText: main ? main.innerText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : null,
    bodyText: document.body ? document.body.innerText.trim() : null,
  };
}

// Serialisation-only differences (Astro writes <path/> as <path></path>, may reorder attributes, and escapes " as
// &quot; where the old builders wrote &#34;) are canonicalised away before the whole-HTML comparison.
const VOID_TAGS = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const TAG_RE = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s"'=\/>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
function canonHtml(html) {
  return html
    .replace(/&#34;|&#x22;/gi, '&quot;').replace(/&#39;|&#x27;|&apos;/gi, '&#39;')
    .replace(TAG_RE, (_, name, attrs, selfClose) => {
      const list = [...attrs.matchAll(ATTR_RE)].map(([, k, v]) => (v == null ? k : `${k}="${v.replace(/^["']|["']$/g, '')}"`)).sort();
      const open = `<${name}${list.length ? ' ' + list.join(' ') : ''}>`;
      return selfClose && !VOID_TAGS.has(name.toLowerCase()) ? `${open}</${name}>` : open;
    });
}

async function settle(page, js = true) {
  if (js) {
    await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} });
    // let lazy images / late layout settle: scroll to the bottom and back
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => r())); }
      window.scrollTo(0, 0);
    });
  }
  await page.waitForTimeout(250);
}

function diffPng(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
  const pad = (P) => { if (P.width === w && P.height === h) return P.data; const o = new PNG({ width: w, height: h }); o.data.fill(255); PNG.bitblt(P, o, 0, 0, P.width, P.height, 0, 0); return o.data; };
  const out = new PNG({ width: w, height: h });
  const n = pixelmatch(pad(A), pad(B), out.data, w, h, { threshold: 0.1, includeAA: false });
  return { pct: (n / (w * h)) * 100, pixels: n, size: { ref: [A.width, A.height], cand: [B.width, B.height] }, png: n ? PNG.sync.write(out) : null };
}

// ---------- link checking ----------
async function checkUrls(base, pageUrl, urls, ids, cache) {
  const bad = [];
  for (const u of urls) {
    if (/^(mailto|tel|javascript|data):/i.test(u.v)) continue;
    if (u.tag === 'use') { if (u.v.startsWith('#') && !ids.includes(u.v.slice(1))) bad.push({ ...u, why: 'missing sprite symbol' }); continue; }
    let abs = u.abs;
    if (abs.startsWith('https://mateos.ai/')) abs = base + abs.slice('https://mateos.ai'.length); // canonical, hreflang, og
    if (!abs.startsWith(base)) continue; // other external links are not checked
    const url = new URL(abs);
    const key = url.origin + url.pathname;
    if (u.v.startsWith('#') || (key === new URL(pageUrl).origin + new URL(pageUrl).pathname && url.hash)) {
      if (url.hash && url.hash !== '#' && !ids.includes(decodeURIComponent(url.hash.slice(1)))) bad.push({ ...u, why: 'missing anchor' });
      continue;
    }
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        try { const r = await fetch(key, { redirect: 'follow' }); const body = r.headers.get('content-type')?.includes('html') ? await r.text() : ''; return { status: r.status, body }; }
        catch (e) { return { status: 0, body: '' }; }
      })());
    }
    const r = await cache.get(key);
    if (r.status !== 200) {
      // a link to a page the reference has but the candidate has not ported yet: reported, not a failure
      const pend = r.status === 404 && existsSync(toFile(REF, url.pathname));
      bad.push({ ...u, why: pend ? 'pending: page not ported yet' : `HTTP ${r.status}`, pending: pend || undefined });
    }
    else if (url.hash && url.hash.length > 1 && r.body && !new RegExp(`id="${url.hash.slice(1)}"`).test(r.body)) bad.push({ ...u, why: 'missing anchor on target page' });
  }
  return bad;
}

// ---------- motion smoke ----------
async function motionRun(browser, base, path) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    window.__v7seen = [];
    new MutationObserver((ms) => ms.forEach((m) => { const e = m.target; if (e.hasAttribute('data-v7-mock')) { const i = [...document.querySelectorAll('[data-v7-mock]')].indexOf(e); window.__v7seen.push([i, e.getAttribute('data-v7-state')]); } }))
      .observe(document, { subtree: true, attributes: true, attributeFilter: ['data-v7-state'] });
  });
  await page.goto(base + path, { waitUntil: 'load' });
  const ready = await page.waitForFunction(() => document.documentElement.classList.contains('v7-ready'), null, { timeout: 5000 }).then(() => true, () => false);
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  const n = await page.evaluate(() => document.querySelectorAll('[data-v7-mock]').length);
  const mocks = [];
  for (let i = 0; i < n; i++) {
    // Bring the mock on screen. Screens in the home "How it works" windows are host-played by S1: their step becomes
    // active when its H3 crosses 55% of the viewport, so scroll that H3 to the centre instead.
    await page.evaluate((i) => {
      const el = document.querySelectorAll('[data-v7-mock]')[i];
      const win = el.closest('.v7-how-win[data-step]');
      const h3 = win && document.querySelector(`[data-v7-steps] .v7-how-step[data-step="${win.getAttribute('data-step')}"] h3`);
      (h3 || el).scrollIntoView({ block: 'center' });
    }, i);
    const t0 = Date.now();
    let st;
    for (;;) {
      st = await page.evaluate((i) => {
        const el = document.querySelectorAll('[data-v7-mock]')[i];
        const c = window.V7 && window.V7.get ? window.V7.get(el) : null;
        const seen = window.__v7seen.filter((x) => x[0] === i).map((x) => x[1]);
        return { id: el.getAttribute('data-v7-mock'), play: el.getAttribute('data-v7-play'), state: el.getAttribute('data-v7-state'), cycle: c ? c.cycle : null, seen: [...new Set(seen)] };
      }, i);
      if (st.state === 'done' || st.state === 'final' || st.state === 'holding' || (st.cycle || 0) >= 1) break;
      if (Date.now() - t0 > MOTION_WAIT) break;
      await page.waitForTimeout(300);
    }
    const ran = st.seen.includes('running');
    st.milestone = st.state === 'done' || (st.cycle || 0) >= 1 ? 'completed' : st.state === 'holding' ? 'completed' : st.state === 'final' ? (ran ? 'completed' : 'final') : ran ? 'running' : st.state || 'none';
    mocks.push(st);
  }
  await ctx.close();
  return { ready, motion: /\bv7-motion\b/.test(htmlClass), late: /\bv7-late\b/.test(htmlClass), mocks, errors };
}

// ---------- main ----------
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

async function main() {
  if (!existsSync(REF)) throw new Error('reference not found: ' + REF);
  if (!existsSync(CAND)) throw new Error('candidate not found (run npm run build): ' + CAND);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'diffs'), { recursive: true });
  const { chromium } = loadPlaywright();
  const [R, C] = await Promise.all([serve(REF), serve(CAND)]);
  const browser = await chromium.launch();
  const report = { generated: new Date().toISOString(), ref: REF, cand: CAND, tolerancePct: AA_TOLERANCE, variants: SHOTS ? VARIANTS : [], pages: [] };
  const linkCache = new Map();

  const pages = PAGES.filter((p) => {
    const has = existsSync(toFile(CAND, p));
    if (!has && !flag('--only-built')) report.pages.push({ path: p, status: 'missing', ok: false });
    return has;
  });

  for (const p of pages) {
    const rec = { path: p, ok: true, shots: {}, text: {}, console: [], links: [] };
    report.pages.push(rec);
    const refHtml = readFileSync(toFile(REF, p), 'utf8');
    const candHtml = readFileSync(toFile(CAND, p), 'utf8');
    const norm = (s) => canonHtml(s.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim());
    rec.htmlEqualNormalized = norm(refHtml) === norm(candHtml);
    rec.htmlByteEqual = refHtml === candHtml;

    if (isRedirectPage(refHtml)) {
      rec.kind = 'redirect';
      rec.text.html = rec.htmlEqualNormalized;
      rec.ok = rec.htmlEqualNormalized;
      const target = /url=([^"']+)/i.exec(candHtml)?.[1];
      if (target) {
        const t = new URL(target, C.base + p).href;
        const r = await fetch(t).catch(() => null);
        if (!r || r.status !== 200) { rec.links.push({ v: target, why: `redirect target HTTP ${r ? r.status : 0}` }); rec.ok = false; }
      }
      console.log(`${rec.ok ? 'ok  ' : 'FAIL'} ${p} (redirect page)`);
      continue;
    }

    // (b) text and metadata + (c) console + (d) links, from a default desktop load with JS on, motion reduced
    const load = async (base, collect) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await ctx.newPage();
      const errs = [];
      if (collect) {
        page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
        page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
        page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')));
        page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) errs.push(`HTTP ${r.status()}: ${r.url()}`); });
      }
      const resp = await page.goto(base + p, { waitUntil: 'load' });
      await settle(page);
      const data = await page.evaluate(extractInPage);
      data.status = resp ? resp.status() : 0;
      await ctx.close();
      return { data, errs };
    };
    const [ref, cand] = await Promise.all([load(R.base, true), load(C.base, true)]);
    const T = rec.text;
    for (const k of ['lang', 'dir', 'title', 'description', 'canonical']) T[k] = ref.data[k] === cand.data[k] ? true : { ref: ref.data[k], cand: cand.data[k] };
    T.hreflang = JSON.stringify(ref.data.hreflang) === JSON.stringify(cand.data.hreflang) ? true : { ref: ref.data.hreflang, cand: cand.data.hreflang };
    const hk = (h) => h.map((x) => JSON.stringify(x));
    const rh = hk(ref.data.head), ch = hk(cand.data.head);
    T.head = JSON.stringify(rh) === JSON.stringify(ch) ? true : { onlyRef: rh.filter((x) => !ch.includes(x)), onlyCand: ch.filter((x) => !rh.includes(x)), orderDiffers: rh.length === ch.length && rh.every((x) => ch.includes(x)) };
    T.main = ref.data.mainText === cand.data.mainText ? true : (() => {
      const a = (ref.data.mainText || '').split('\n'), b = (cand.data.mainText || '').split('\n');
      let i = 0; while (i < a.length && a[i] === b[i]) i++;
      return { firstDiffLine: i + 1, ref: a.slice(i, i + 3), cand: b.slice(i, i + 3) };
    })();
    T.status = ref.data.status === cand.data.status ? true : { ref: ref.data.status, cand: cand.data.status };
    rec.console = cand.errs;
    rec.consoleRef = ref.errs;
    rec.links = await checkUrls(C.base, C.base + p, cand.data.urls, cand.data.ids, linkCache);

    // (a) screenshots
    if (SHOTS) {
      await pool(VARIANTS, CONCURRENCY, async (v) => {
        const o = VARIANTS_ALL[v];
        const shot = async (base) => {
          const ctx = await browser.newContext({ ...o, reducedMotion: 'reduce' });
          const page = await ctx.newPage();
          await page.goto(base + p, { waitUntil: 'load' });
          await settle(page, o.javaScriptEnabled !== false);
          const buf = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
          await ctx.close();
          return buf;
        };
        const [a, b] = await Promise.all([shot(R.base), shot(C.base)]);
        const d = diffPng(a, b);
        const name = `${slug(p)}--${v}`;
        if (d.png) writeFileSync(join(OUT, 'diffs', name + '.png'), d.png);
        if (d.pct > 0 && flag('--keep-shots')) { writeFileSync(join(OUT, 'diffs', name + '.ref.png'), a); writeFileSync(join(OUT, 'diffs', name + '.cand.png'), b); }
        rec.shots[v] = { pct: +d.pct.toFixed(4), pixels: d.pixels, sizeRef: d.size.ref, sizeCand: d.size.cand, ok: d.pct < AA_TOLERANCE && d.size.ref.join() === d.size.cand.join() };
      });
    }

    const known = flag('--strict') ? {} : KNOWN[p] || {};
    const failedText = Object.keys(T).filter((k) => T[k] !== true && !known[k]);
    rec.knownExceptions = Object.fromEntries(Object.keys(T).filter((k) => T[k] !== true && known[k]).map((k) => [k, known[k]]));
    const textOk = failedText.length === 0;
    const shotsOk = Object.values(rec.shots).every((s) => s.ok);
    const hardLinks = rec.links.filter((l) => !l.pending);
    rec.pendingLinks = rec.links.length - hardLinks.length;
    rec.ok = textOk && shotsOk && rec.console.length === 0 && hardLinks.length === 0;
    const worst = Object.entries(rec.shots).map(([k, s]) => `${k} ${s.pct}%`).join(', ');
    console.log(`${rec.ok ? 'ok  ' : 'FAIL'} ${p}  ${worst}${textOk ? '' : '  text: ' + failedText.join(',')}${Object.keys(rec.knownExceptions).length ? '  (known: ' + Object.keys(rec.knownExceptions).join(',') + ')' : ''}${rec.console.length ? '  console: ' + rec.console.length : ''}${hardLinks.length ? '  broken links: ' + hardLinks.length : ''}${rec.pendingLinks ? '  (links to unported pages: ' + rec.pendingLinks + ')' : ''}`);
  }

  if (MOTION) {
    report.motion = [];
    for (const p of pages) {
      if (isRedirectPage(readFileSync(toFile(REF, p), 'utf8'))) continue;
      const [ref, cand] = await Promise.all([motionRun(browser, R.base, p), motionRun(browser, C.base, p)]);
      const sig = (r) => r.mocks.map((m) => `${m.id}:${m.milestone}`).join(' ');
      const m = { path: p, ref, cand, same: sig(ref) === sig(cand) && ref.ready === cand.ready && ref.motion === cand.motion };
      // Pages without the motion system (contact, careers, privacy, accessibility, 404) are not v7-ready on either site.
      m.v7 = ref.ready || ref.mocks.length > 0;
      // Every mock must finish a cycle ('completed'), or sit on its final frame where it has no animation ('final').
      m.ok = m.same && (cand.ready || !m.v7) && cand.errors.length === 0 && cand.mocks.every((x) => x.milestone === 'completed' || x.milestone === 'final');
      const pr = report.pages.find((x) => x.path === p);
      if (pr && !m.ok) { pr.ok = false; pr.motionFailed = true; }
      report.motion.push(m);
      console.log(`${m.ok ? 'ok  ' : 'FAIL'} motion ${p}${m.v7 ? '' : '  (no v7 on this page)'}  ready=${cand.ready} motion=${cand.motion} mocks: ${sig(cand)}${cand.errors.length ? '  errors: ' + cand.errors.length : ''}${m.same ? '' : '  (differs from reference: ' + sig(ref) + ')'}`);
    }
  }

  await browser.close();
  R.srv.close(); C.srv.close();
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, 'summary.md'), summary(report));
  const failed = report.pages.filter((x) => !x.ok && x.status !== 'missing').length;
  const known = report.pages.filter((x) => x.knownExceptions && Object.keys(x.knownExceptions).length).map((x) => x.path);
  const mot = report.motion ? `; motion ${report.motion.filter((m) => m.ok).length}/${report.motion.length} pass` : '';
  console.log(`\n${report.pages.filter((x) => x.ok).length}/${report.pages.length} pages pass${report.motion ? ' (motion included)' : ''}${mot}; ${report.pages.filter((x) => x.status === 'missing').length} missing in candidate${known.length ? '; known exceptions on ' + known.join(', ') : ''}. Report: ${relative(process.cwd(), join(OUT, 'summary.md'))}`);
  process.exitCode = failed ? 1 : 0;
}

function summary(r) {
  const L = [`# Parity report`, ``, `Generated ${r.generated}. Reference \`${r.ref}\`, candidate \`${r.cand}\`. Pixel tolerance ${r.tolerancePct}% (antialiasing ignored).`, ``];
  if (r.variants.length) {
    L.push(`| Page | OK | ${r.variants.join(' | ')} | text/meta | console | links | HTML (ws-normalized) |`, `|---|---|${r.variants.map(() => '---').join('|')}|---|---|---|---|`);
    for (const p of r.pages) {
      if (p.status === 'missing') { L.push(`| \`${p.path}\` | missing | ${r.variants.map(() => '').join(' | ')} | | | | |`); continue; }
      if (p.kind === 'redirect') { L.push(`| \`${p.path}\` | ${p.ok ? 'yes' : '**no**'} | ${r.variants.map(() => 'n/a').join(' | ')} | redirect | | ${p.links.length} | ${p.htmlEqualNormalized ? 'equal' : 'differs'} |`); continue; }
      const bad = Object.keys(p.text).filter((k) => p.text[k] !== true).map((k) => (p.knownExceptions?.[k] ? k + ' (known)' : k));
      L.push(`| \`${p.path}\` | ${p.ok ? 'yes' : '**no**'} | ${r.variants.map((v) => (p.shots[v] ? `${p.shots[v].pct}%${p.shots[v].sizeRef.join() !== p.shots[v].sizeCand.join() ? ' (size ' + p.shots[v].sizeRef.join('x') + ' vs ' + p.shots[v].sizeCand.join('x') + ')' : ''}` : '')).join(' | ')} | ${bad.length ? bad.join(', ') : 'equal'} | ${p.console.length} | ${p.links.filter((l) => !l.pending).length}${p.pendingLinks ? ' (+' + p.pendingLinks + ' pending)' : ''} | ${p.htmlEqualNormalized ? 'equal' : 'differs'} |`);
    }
  }
  if (r.motion) {
    L.push('', '## Motion smoke (1440x900, motion on)', '', '| Page | OK | v7-ready | mocks (candidate) | errors | same as reference |', '|---|---|---|---|---|---|');
    for (const m of r.motion) L.push(`| \`${m.path}\` | ${m.ok ? 'yes' : '**no**'} | ${m.v7 ? m.cand.ready : 'n/a (no v7)'} | ${m.cand.mocks.map((x) => `${x.id}:${x.milestone}`).join(' ')} | ${m.cand.errors.length} | ${m.same} |`);
  }
  const withKnown = r.pages.filter((p) => p.knownExceptions && Object.keys(p.knownExceptions).length);
  if (withKnown.length) {
    L.push('', '## Known exceptions (reported, not failing; `--strict` fails them)');
    for (const p of withKnown) for (const [k, why] of Object.entries(p.knownExceptions)) L.push(`- \`${p.path}\` ${k}: ${why}`);
  }
  const issues = r.pages.filter((p) => !p.ok && p.status !== 'missing');
  if (issues.length) {
    L.push('', '## Details');
    for (const p of issues) {
      L.push('', `### \`${p.path}\``);
      if (p.motionFailed) L.push('- motion smoke failed (see the motion table)');
      for (const [k, v] of Object.entries(p.text || {})) if (v !== true && !p.knownExceptions?.[k]) L.push(`- ${k}: \`${JSON.stringify(v).slice(0, 600)}\``);
      for (const e of p.console || []) L.push(`- console: ${e}`);
      for (const l of (p.links || []).filter((l) => !l.pending)) L.push(`- link ${l.tag || ''} \`${l.v}\`: ${l.why}`);
    }
  }
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error(e); process.exit(2); });
