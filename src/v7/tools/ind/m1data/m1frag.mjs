#!/usr/bin/env node
// Build the industry M1 fragments (v7parts/M1.<slug>.html) from m1-goals.json and the homepage fragment v7parts/M1.html.
// usage: node m1frag.mjs [slug ...]   (default: every industry in m1-goals.json)
//        node m1frag.mjs --he [slug ...]   Hebrew: m1-goals.he.json → v7parts/M1.<slug>.he.html, and the "home" entry →
//        v7parts/M1.he.html (the Hebrew homepage figure carries its three goals as data too). The Hebrew template is M1.html
//        with its fixed UI strings swapped (HE_UI below, each must match exactly once), so M1.html stays the one template.
// Each fragment = M1.html with goal A's final state as markup (the static, no-JS and reduced-motion look), the goal data
// as <script type="application/json" class="m-hero-data"> (what M1.js plays: goal A, then goal B), and the industry's
// sr-only figcaption. The helpers below mirror M1.js (highlight spans, sparkline mapping) so markup == JS goal A.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = path.resolve(HERE, '../../../v7parts');
const ARGS = process.argv.slice(2), HE = ARGS.includes('--he');
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, HE ? 'm1-goals.he.json' : 'm1-goals.json'), 'utf8'));
// Fixed UI strings of the template (English, as in M1.html and M1.js) and their Hebrew (M1.js uses the same Hebrew).
const HE_UI = [
  ['<span class="m-hero-label">MateOS · new goal</span>', '<span class="m-hero-label">MateOS · יעד חדש</span>'],
  ['<span class="v7-preview-tag">Product preview</span>', '<span class="v7-preview-tag">תצוגה מקדימה</span>'],
  ['data-v7-gone>Set a goal…</span>', 'data-v7-gone>הגדירו יעד…</span>'],
  ['<span>Set goal</span>', '<span>הגדרת יעד</span>'],
  ['<b>Metric</b>', '<b>מדד</b>'], ['<b>Baseline</b>', '<b>נקודת פתיחה</b>'], ['<b>Target</b><span>', '<b>יעד</b><span>'],
  ['>Mate built 7 steps<', '>Mate בנה 7 שלבים<'],
  ['data-tone="ok">Ready</span>', 'data-tone="ok">מוכן</span>'],
  ['<span class="v7-fbtn is-primary">Approve</span><span class="v7-fbtn is-ghost">Details</span>', '<span class="v7-fbtn is-primary">אישור</span><span class="v7-fbtn is-ghost">פרטים</span>'],
  ['data-tone="ok">On track</span>', 'data-tone="ok">כמתוכנן</span>'],
  ['<i class="v7-bar-flag" style="--at:.9"><b>Target</b></i>', '<i class="v7-bar-flag" style="--at:.9"><b>יעד</b></i>'],
  ['aria-label="Pause animation"', 'aria-label="השהיית האנימציה"']
];
function heTemplate(s) {
  for (const [en, he] of HE_UI) {
    const n = s.split(en).length - 1;
    if (n !== 1) throw new Error(`Hebrew template: "${en}" matched ${n} times in M1.html`);
    s = s.replace(en, () => he);
  }
  return s;
}
const L = HE
  ? { chips: ['מדד', 'נקודת פתיחה', 'יעד'], fstat: /(<span class="m-hero-fstat">)Mate בנה \d+ שלבים(<\/span>)/, built: (n) => `Mate בנה ${n} שלבים`, ok: 'כמתוכנן' }
  : { chips: ['Metric', 'Baseline', 'Target'], fstat: /(<span class="m-hero-fstat">)Mate built \d+ steps(<\/span>)/, built: (n) => `Mate built ${n} steps`, ok: 'On track' };
const TPL = (HE ? heTemplate : (s) => s)(fs.readFileSync(path.join(P, 'M1.html'), 'utf8'));
const MAXN = 7, HK = ['metric', 'target', 'date'];
const SX = [2, 25.2, 48.4, 71.6, 94.8, 118];
const SHAPE = { ok: [0, .044, .289, .6, .844, 1], risk: [0, .269, .577, .769, .885, 1] };
const sy = (v) => Math.round((26 - .24 * v) * 10) / 10;
const spark = (vals) => vals.map((v, i) => (i ? 'L' : 'M') + SX[i] + ' ' + sy(v)).join(' ');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hl = (k, s) => '<span class="m-hero-hl" data-k="' + k + '">' + s + '</span>';
const num = (v) => String(+v).replace(/^0\./, '.'); // .22, .9, 1 (the style the homepage markup uses)

function marks(text, h) {
  const m = []; let out = '', at = 0;
  for (const k of HK) {
    const p = h && h[k]; if (!p) continue;
    const i = text.indexOf(p); if (i < 0) throw new Error(`highlight "${p}" not in "${text}"`);
    m.push([i, i + p.length, k]);
  }
  m.sort((a, b) => a[0] - b[0]);
  for (const x of m) { if (x[0] < at) continue; out += esc(text.slice(at, x[0])) + hl(x[2], esc(text.slice(x[0], x[1]))); at = x[1]; }
  return out + esc(text.slice(at));
}
function sp(g) {
  const t = g.track, risk = g.status === 'risk';
  return Array.isArray(t.spark) && t.spark.length === 6 ? t.spark : SHAPE[risk ? 'risk' : 'ok'].map((f) => Math.round(t.baseline * 100 + (t.value - t.baseline * 100) * f));
}
function one(s, re, rep, what) { // replace exactly one match
  const n = (s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
  if (n !== 1) throw new Error(`template: ${what} matched ${n} times`);
  // rep: a string where $1..$3 stand for the groups (only those tokens; data text is inserted literally)
  return s.replace(re, (...a) => rep.replace(/\$([1-3])/g, (_, i) => a[+i]));
}

function build(slug, ind) {
  const A = ind.goals[0], B = ind.goals.find((g) => g.status === 'risk');
  if (!A || A.status === 'risk') throw new Error(slug + ': goal A must be an on-track goal');
  const N = A.nodes.length;
  if (N < 2 || N > MAXN) throw new Error(slug + ': goal A needs 2 to 7 nodes');
  let h = TPL;
  // goal text
  h = one(h, /<p class="m-hero-text">[\s\S]*?<\/p>/, `<p class="m-hero-text">${marks(A.text, A.highlight)}</p>`, 'goal text');
  // chips (metric, baseline, target)
  L.chips.forEach((k, i) => {
    h = one(h, new RegExp(`(<b>${k}</b><span>)[^<]*(</span>)`), `$1${esc(A.chips[i])}$2`, 'chip ' + k);
  });
  // flows header
  h = one(h, L.fstat, `$1${L.built(N)}$2`, 'fstat');
  // nodes: N rows, links on all but the last; a 6-step goal A keeps a 7th row gone and hugs 6 rows (as M1.js setCount)
  const li = (n, i) => {
    const link = i < N - 1 ? '<i class="m-hero-link"></i>' : '';
    return `          <li class="v7-node is-compact" data-kind="${n.kind}"><span class="v7-node-tile"><svg class="v7-ic"><use href="#i-${String(n.icon).replace(/^i-/, '')}"/></svg></span><span class="v7-node-body"><b class="v7-node-t">${esc(n.title)}</b><span class="v7-node-m">${esc(n.meta || '')}</span></span>${link}</li>`;
  };
  let rows = A.nodes.map(li);
  for (let i = N; i < MAXN; i++) rows.push(li(A.nodes[N - 1], i).replace('<li class', '<li data-v7-gone class'));
  const olAttr = N < MAXN ? ` style="height:calc(${N} * var(--m-hero-row))"` : '';
  h = one(h, /<ol class="m-hero-nodes">[\s\S]*?<\/ol>/, `<ol class="m-hero-nodes"${olAttr}>\n${rows.join('\n')}\n        </ol>`, 'nodes');
  if (N < MAXN) h = one(h, /<div class="m-hero-in">/, `<div class="m-hero-in" style="padding-bottom:calc(var(--m-hero-pb) + ${MAXN - N} * var(--m-hero-row))">`, 'm-hero-in');
  // note (hidden in the final state; the risk goal's text, so the markup reads right without JS too)
  if (B && B.note) h = one(h, /(<div class="m-hero-note v7-card" data-v7-gone>[\s\S]*?<p>)[^<]*(<\/p>)/, `$1${esc(B.note)}$2`, 'note');
  // track card
  const t = A.track;
  h = one(h, /(<b class="m-hero-name">)[^<]*(<\/b>)/, `$1${esc(t.name || A.chips[0])}$2`, 'track name');
  h = one(h, /(<span class="m-hero-week">)[^<]*(<\/span>)/, `$1${esc(t.period || '')}$2`, 'week');
  h = one(h, /(<span class="m-hero-val">)[^<]*(<\/span>)/, `$1${Math.round(t.value)}%$2`, 'value');
  h = one(h, /(<span class="v7-pill m-hero-status" data-tone=")[a-z]+(">)[^<]*(<\/span>)/, '$1ok$2' + L.ok + '$3', 'status');
  h = one(h, /(<i class="v7-bar-fill" style="--v:)[^"]*(")/, `$1${num(t.value / 100)}$2`, 'bar fill');
  h = one(h, /(<i class="v7-bar-tick" style="--at:)[^"]*(")/, `$1${num(t.baseline)}$2`, 'bar tick');
  h = one(h, /(<i class="v7-bar-flag" style="--at:)[^"]*(")/, `$1${num(t.target)}$2`, 'bar flag');
  if (t.target >= .97) h = one(h, /<i class="v7-bar-flag" style=/, '<i class="v7-bar-flag m-hero-flag-end" style=', 'flag end');
  const path_ = spark(sp(A)), last = sp(A)[5];
  h = one(h, /(<path class="m-hero-area" d=")[^"]*(")/, `$1${path_} L118 28 L2 28 Z$2`, 'spark area');
  h = one(h, /(<path class="m-hero-line" d=")[^"]*(")/, `$1${path_}$2`, 'spark line');
  h = one(h, /(<circle cx=")[^"]*(" cy=")[^"]*(")/, `$1118$2${sy(last)}$3`, 'spark dot');
  // goal data for M1.js, right after the mock root (before the pause button); figcaption stays last
  const json = JSON.stringify({ goals: ind.goals }).replace(/</g, '\\u003c');
  h = one(h, /(\n  <button class="v7-pause")/, `\n  <script type="application/json" class="m-hero-data">${json}</script>$1`, 'pause button');
  h = one(h, /(<figcaption class="sr-only">)[^<]*(<\/figcaption>)/, `$1${esc(ind.caption)}$2`, 'figcaption');
  return h;
}

const picked = ARGS.filter((x) => x !== '--he');
const slugs = picked.length ? picked : Object.keys(DATA);
for (const slug of slugs) {
  if (!DATA[slug]) throw new Error('unknown industry ' + slug);
  const out = path.join(P, HE ? (slug === 'home' ? 'M1.he.html' : `M1.${slug}.he.html`) : `M1.${slug}.html`);
  fs.writeFileSync(out, build(slug, DATA[slug]));
  console.log('wrote', out);
}
