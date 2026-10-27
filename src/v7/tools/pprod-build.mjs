// P-PROD page assembler: builds site/mateos/index.html from the pristine page (head, header, footer kept byte-for-byte),
// the three §2.2 head additions, and v7parts/P-PROD.html + T1.html with the component fragments pasted in.
// usage: node pprod-build.mjs [--out <file>]
import fs from 'fs';
const S = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, ''); // src/v7
const P = S + '/v7parts', SRC = S + '/mateos-index.orig.html';
const args = process.argv.slice(2), oi = args.indexOf('--out');
const OUT = oi >= 0 ? args[oi + 1] : S + '/../../site/mateos/index.html';
const rd = (f) => fs.readFileSync(f, 'utf8');
const die = (m) => { console.error('pprod-build: ' + m); process.exit(1); };
const once = (s, a, b, what) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) die('expected exactly one ' + what); return s.slice(0, i) + b + s.slice(i + a.length); };
const stripLead = (s) => s.replace(/^\s*<!--[\s\S]*?-->\s*/, '');

// ---- fragments ----
const frag = (id) => rd(`${P}/${id}.html`);
// typographic apostrophes in page copy (designer decision; the footer is outside <main> and keeps its straight one)
const curly = (t) => t.replace(/(?<=[A-Za-z])'(?=[A-Za-z])/g, '\u2019');
function caption(id) { const m = frag(id).match(/<!--\s*figcaption:\s*([\s\S]*?)\s*-->/); if (!m) die('no figcaption comment in ' + id); return curly(m[1].trim()); }
// the standard pause button (C1 binds any .v7-pause inside a .v7-figure); it goes before the figcaption, which stays last
const PAUSE = '<button class="v7-pause" type="button" aria-label="Pause animation"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>';
function screen(id, extra = '') {
  let s = frag(id).replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  if (extra) s = s.replace(/^<div /, `<div ${extra} `);
  return s;
}
function shell({ h, nav, title, cap, screens, figAttrs = '', pause = false }) {
  let m = stripLead(frag('M0')).trim();
  m = once(m, 'style="--v7-app-h:516px"', `style="--v7-app-h:${h}"${figAttrs ? ' ' + figAttrs : ''}`, 'app-h');
  m = m.replace(/(<span class="v7-nav-item" data-nav="[a-z]+") data-active>/g, '$1>');
  m = once(m, `<span class="v7-nav-item" data-nav="${nav}">`, `<span class="v7-nav-item" data-nav="${nav}" data-active>`, 'nav ' + nav);
  m = once(m, '<span class="v7-app-title">Goals</span>', `<span class="v7-app-title">${title}</span>`, 'app title');
  m = once(m, '<!-- FIGCAPTION -->', cap, 'figcaption slot');
  if (pause) m = once(m, '<figcaption', PAUSE + '\n  <figcaption', 'figcaption');
  m = once(m, '<!-- SCREENS -->', '\n' + screens + '\n', 'screens slot');
  return m;
}
const addAttrs = (fig, attrs) => fig.trim().replace(/^<figure /, `<figure ${attrs} `);

// ---- slots ----
const slots = {
  SPRITE: frag('C2.sprite').trim(),
  P1_FIG: shell({ h: '516px', nav: 'goals', title: 'Goals', cap: caption('M10'), screens: screen('M10'),
    figAttrs: 'data-v7-reveal="rise" data-v7-delay="400"', pause: true }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-pp-hfig"'),
  M15: addAttrs(frag('M15'), 'data-v7-reveal="rise" data-v7-delay="120"'),
  M11: addAttrs(frag('M11'), 'data-v7-reveal="rise" data-v7-delay="200"'),
  M12: addAttrs(frag('M12'), 'data-v7-reveal="rise" data-v7-delay="200"'),
  P6_FIG: shell({ h: '516px', nav: 'settings', title: 'Settings', cap: caption('M13'), screens: screen('M13'),
    figAttrs: 'data-v7-reveal="rise" data-v7-delay="120"', pause: true }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-pp-cfig"')
};
const TOUR = [['goal', 'M3'], ['flows', 'M4'], ['monitor', 'M5'], ['exceptions', 'M6'], ['rules', 'M8'], ['audit', 'M9']];
let tour = stripLead(frag('T1')).trim();
const tshell = shell({ h: '556px', nav: 'goals', title: 'New goal',
  cap: 'Product preview of six MateOS screens. The caption below describes the screen on display.',
  screens: TOUR.map(([k, id]) => screen(id, `data-screen="${k}"`)).join('\n'),
  figAttrs: 'data-v7-reveal="rise" data-v7-delay="200"' }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-tour-win"');
tour = once(tour, '<!--@TOUR_SHELL-->', tshell, 'tour shell slot');
TOUR.forEach(([, id]) => { tour = once(tour, `<!--@SR:${id}-->`, caption(id), 'sr slot ' + id); });
slots.TOUR = tour;

let main = stripLead(frag('P-PROD')).trim();
for (const [k, v] of Object.entries(slots)) main = once(main, `<!--@${k}-->`, v, 'slot ' + k);
if (/<!--@/.test(main)) die('unfilled slot');

// ---- page ----
let page = rd(SRC);
const GATE = `<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>`;
const SITE_CSS = '<link rel="stylesheet" href="../assets/site.css">';
// 1. gate directly after the anti-flash script (the inline script that sets data-theme), before any stylesheet
const af = page.indexOf('<!-- Anti-flash'), afEnd = page.indexOf('</script>', af) + '</script>'.length;
if (af < 0 || page.slice(afEnd, afEnd + SITE_CSS.length) !== SITE_CSS) die('anti-flash script not directly before site.css');
page = page.slice(0, afEnd) + GATE + page.slice(afEnd);
// 2. v7.css directly after site.css
page = once(page, SITE_CSS, SITE_CSS + '<link rel="stylesheet" href="../assets/v7.css">', 'site.css link');
// 3. v7.js after the existing module script
const mod = page.indexOf('<script type="module">'), modEnd = page.indexOf('</script>', mod) + '</script>'.length;
if (mod < 0 || page.indexOf('</head>', modEnd) !== modEnd) die('module script is not the last thing in <head>');
page = page.slice(0, modEnd) + '<script src="../assets/v7.js" defer></script>' + page.slice(modEnd);
// main contents
const mo = page.indexOf('<main id="main">'), mc = page.indexOf('</main>');
if (mo < 0 || mc < mo || page.indexOf('<main', mo + 1) >= 0) die('main not found exactly once');
page = page.slice(0, mo + '<main id="main">'.length) + '\n' + main + '\n' + page.slice(mc);
fs.writeFileSync(OUT, page);
console.log('wrote', OUT, page.length, 'bytes');
