// Hebrew P-PROD page assembler: builds site/he/mateos/index.html from the Hebrew original (head, header, footer kept
// byte-for-byte), the three §2.2 head additions, the Hebrew <main> template below and the Hebrew fragments
// (<ID>.he.html, M0.he.html, T1.he.html). Mirrors tools/pprod-build.mjs; no curly-apostrophe step for Hebrew.
// usage: node build-product.mjs [--out <file>]
import fs from 'fs';
const S = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, ''); // src/v7
const P = S + '/v7parts', SRC = S + '/phe/orig/mateos_index.html';
const args = process.argv.slice(2), oi = args.indexOf('--out');
const OUT = oi >= 0 ? args[oi + 1] : S + '/../../site/he/mateos/index.html';
const rd = (f) => fs.readFileSync(f, 'utf8');
const die = (m) => { console.error('build-product: ' + m); process.exit(1); };
const once = (s, a, b, what) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) die('expected exactly one ' + what); return s.slice(0, i) + b + s.slice(i + a.length); };
const stripLead = (s) => s.replace(/^\s*<!--[\s\S]*?-->\s*/, '');

// ---- fragments (Hebrew only: a missing .he.html is an error, never a silent English fallback) ----
const he = (id) => { const f = `${P}/${id}.he.html`; if (!fs.existsSync(f)) die('missing ' + f); return rd(f); };
function caption(id) { const m = he(id).match(/<!--\s*figcaption:\s*([\s\S]*?)\s*-->/); if (!m) die('no figcaption comment in ' + id); return m[1].trim(); }
const PAUSE = '<button class="v7-pause" type="button" aria-label="השהיית האנימציה"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>';
function screen(id, extra = '') {
  let s = he(id).replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  if (extra) s = s.replace(/^<div /, `<div ${extra} `);
  return s;
}
function shell({ h, nav, title, cap, screens, figAttrs = '', pause = false }) {
  let m = stripLead(he('M0')).trim();
  m = once(m, 'style="--v7-app-h:516px"', `style="--v7-app-h:${h}"${figAttrs ? ' ' + figAttrs : ''}`, 'app-h');
  m = m.replace(/(<span class="v7-nav-item" data-nav="[a-z]+") data-active>/g, '$1>');
  m = once(m, `<span class="v7-nav-item" data-nav="${nav}">`, `<span class="v7-nav-item" data-nav="${nav}" data-active>`, 'nav ' + nav);
  m = once(m, '<span class="v7-app-title">יעדים</span>', `<span class="v7-app-title">${title}</span>`, 'app title');
  m = once(m, '<!-- FIGCAPTION -->', cap, 'figcaption slot');
  if (pause) m = once(m, '<figcaption', PAUSE + '\n  <figcaption', 'figcaption');
  m = once(m, '<!-- SCREENS -->', '\n' + screens + '\n', 'screens slot');
  return m;
}
const addAttrs = (fig, attrs) => fig.trim().replace(/^<figure /, `<figure ${attrs} `);
const titleOf = (id) => { const m = he(id).match(/data-title="([^"]*)"/); if (!m) die('no data-title in ' + id); return m[1]; };

// ---- Hebrew <main> template (same structure, classes, ids and reveal attributes as v7parts/P-PROD.html) ----
const CHECK = '<svg class="v7-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>';
const ARROW = '<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg>';
const fact = (t, l) => `        <li data-v7-reveal>${CHECK}<div><strong>${t}</strong><span>${l}</span></div></li>`;
const TPL = `<!--@SPRITE-->

<section class="v7-band-dark v7-hero v7-hero--center v7-pp-hero" id="top" aria-labelledby="hero-h1">
  <div class="v7-wrap">
    <div class="v7-pp-hcopy">
         <h1 id="hero-h1" class="v7-h1" data-v7-reveal="mask" data-v7-delay="80"><span class="v7-line"><span>נותנים יעד. <br class="v7-h1-br">מקבלים תהליכים.</span></span><span class="v7-line v7-pp-ok"><span>כמתוכנן.</span></span></h1>
      <p class="v7-lead" data-v7-reveal data-v7-delay="300">תנו ל-Mate מספר ותאריך. Mate בונה את התהליכים במערכות שכבר עובדות אצלכם, ובודק את המספר כל יום.</p>
      <div class="v7-actions" data-v7-reveal data-v7-delay="380"><a class="btn btn-primary btn-lg" href="../../he/contact/">מתחילים ב-X-ray</a><a class="btn btn-lg v7-btn-ghost" href="#tour">לסיור במוצר</a></div>
    </div>
<!--@P1_FIG-->
  </div>
</section>

<section class="v7-sec v7-pp-sec" id="backwards" aria-labelledby="backwards-h">
  <div class="v7-wrap v7-pp-split v7-pp-split--tree">
    <h2 id="backwards-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>בונים מהסוף להתחלה, בכוונה.</span></span></h2>
    <div class="v7-pp-copy">
      <p class="v7-lead" data-v7-reveal>רוב הפרויקטים מתחילים בכלים ומגיעים למספר בסוף. Mate מתחיל מהמספר ובונה ממנו לאחור.</p>
      <div class="v7-pp-toggle" data-v7-reveal data-v7-delay="80">
        <div class="m-tree-toggle" role="group" aria-label="השוואה בין הדרך הישנה לדרך של MateOS">
          <button type="button" data-mode="old" aria-pressed="false">הדרך הישנה</button>
          <button type="button" data-mode="new" aria-pressed="true">הדרך של MateOS</button>
        </div>
      </div>
    </div>
<!--@M15-->
  </div>
</section>

<section class="v7-sec v7-sec--subtle v7-pp-sec v7-pp-tour" id="tour" aria-labelledby="tour-h">
  <div class="v7-wrap-wide">
    <div class="v7-pp-center">
      <h2 id="tour-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>שישה מסכים. יעד אחד.</span></span></h2>
      <p class="v7-note" data-v7-reveal data-v7-delay="120">תצוגה מקדימה. המסכים והמספרים הם נתונים לדוגמה.</p>
    </div>
<!--@TOUR-->
  </div>
</section>

<section class="v7-sec v7-pp-sec" id="surfaces" aria-labelledby="surfaces-h">
  <div class="v7-wrap">
    <div class="v7-pp-center">
      <h2 id="surfaces-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>כלי AI אחרים עונים על שאלות.</span></span><span class="v7-line"><span>Mate עושה את העבודה.</span></span></h2>
      <p class="v7-lead" data-v7-reveal data-v7-delay="120">בלי מסך חדש. הצוות שלכם ממשיך לעבוד ב-ERP, במייל, בוואטסאפ ובאקסל.</p>
    </div>
<!--@M11-->
  </div>
</section>

<section class="v7-sec v7-sec--subtle v7-pp-sec" id="loop" aria-labelledby="loop-h">
  <div class="v7-wrap">
    <div class="v7-pp-center">
      <h2 id="loop-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>כל חריגה הופכת לכלל.</span></span></h2>
      <p class="v7-lead" data-v7-reveal data-v7-delay="120">חריג שנפתר פעם אחת נשאר פתור. המערכת לומדת את העסק שלכם, ולא להפך.</p>
    </div>
<!--@M12-->
  </div>
</section>

<section class="v7-sec v7-pp-sec" id="control" aria-labelledby="control-h">
  <div class="v7-wrap v7-pp-split v7-pp-split--ctrl">
    <div class="v7-pp-copy">
      <h2 id="control-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>אתם נשארים בשליטה.</span></span></h2>
      <ul class="v7-facts" data-v7-stagger="80" data-v7-delay="120">
${fact('אדם בכל מקום שהוא הכרחי.', 'Mate מאוטמט את השגרה. אדם שבחרתם מאשר את מה שחשוב.')}
${fact('קריאה בלבד כברירת מחדל.', 'הרשאת כתיבה רק אם תחליטו, לכל מערכת בנפרד.')}
${fact('בתוך הסביבה שלכם.', 'בענן שלכם, ב-DMZ שלכם או על שרת אצלכם.')}
${fact('תיעוד מלא.', 'בנוי לפי תיקון 13 לחוק הגנת הפרטיות.')}
${fact('עוצרים בכל שלב.', 'הכללים והרשומות שלכם נשארים אצלכם.')}
${fact('תמיד יש אדם שאפשר להתקשר אליו.', 'Mate עובד מאחורי הקלעים. האנשים נשארים בחדר.')}
      </ul>
      <a class="v7-link-arrow" href="../../he/security-and-control/" data-v7-reveal>אבטחה ובקרה${ARROW}</a>
    </div>
<!--@P6_FIG-->
  </div>
</section>

<section class="v7-sec v7-sec--subtle v7-pp-sec" id="faq" aria-labelledby="faq-h">
  <div class="v7-wrap v7-pp-faq">
    <h2 id="faq-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>שאלות של בעלי עסקים.</span></span></h2>
    <div class="v7-pp-qs" data-v7-stagger="80">
      <details class="v7-pp-q" open data-v7-reveal>
        <summary>ומה אם Mate לא בטוח?<span class="v7-pp-plus" aria-hidden="true"></span></summary>
        <p>הוא עוצר ושואל את האדם שהגדרתם. התשובה שלו יכולה להפוך לכלל.</p>
      </details>
      <details class="v7-pp-q" data-v7-reveal>
        <summary>ומה אם הוא טועה?<span class="v7-pp-plus" aria-hidden="true"></span></summary>
        <p>בפיילוט, אדם מאשר כל פלט לפני שהוא יוצא. כלל עצירה, שמסוכם מראש, עוצר אותו. שלבי אישור יורדים רק איפה שהמספרים מראים שזה בטוח.</p>
      </details>
    </div>
  </div>
</section>

<section class="v7-sec v7-band-dark v7-cta v7-pp-cta" id="start" aria-labelledby="start-h">
  <div class="v7-wrap">
    <div class="v7-pp-ctacopy" data-v7-stagger="80">
      <h2 id="start-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>זאת החברה שלכם.</span></span> <span class="v7-line"><span>המהלך שלכם.</span></span></h2>
      <p class="v7-lead" data-v7-reveal data-v7-delay="160">לחברות בבעלות יזם, מ-20 עד <bdi>1,000</bdi> עובדים. באוויר תוך שבועות.</p>
      <p class="v7-lead" data-v7-reveal data-v7-delay="160">מתחילים ב-X-ray: יום אחד אצלכם עם האנשים שעושים את העבודה, או סוכן קטן אחד. כל תהליך מדורג לפי ההחזר שלו. החל מ-990 דולר.</p>
      <p class="v7-fine" data-v7-reveal data-v7-delay="160">פיילוט ותהליכים מתומחרים לפי תהליך. חלק מהתשלום שלנו תלוי במספר שאתם מובילים.</p>
      <div class="v7-actions" data-v7-reveal data-v7-delay="160"><a class="btn btn-primary btn-lg" href="../../he/contact/">בואו נדבר</a></div>
    </div>
  </div>
</section>`;

// Keep a Hebrew prefix and its hyphen with the Latin word or number it attaches to ("ה-AI", "ב-X-ray", "מ-990"):
// browsers may break after the hyphen, which strands "ב-" at a line end. Text nodes of the template only.
const NW = /([\u05D0-\u05EA]+-[A-Za-z0-9$][A-Za-z0-9$,]*(?:-[A-Za-z0-9]+)*)/g;
// Buttons are skipped: .btn is a flex box, so a span would become its own item with a gap (and buttons never wrap).
const TPLX = TPL.replace(/(<[^<>]+>)([^<>]+)(?=<)/g, (m, tag, t) => tag + (/class="(btn|v7-ladder-tag)/.test(tag) ? t : t.replace(NW, '<span class="v7-nw">$1</span>')));

// ---- slots ----
const slots = {
  SPRITE: rd(`${P}/C2.sprite.html`).trim(),
  P1_FIG: shell({ h: '516px', nav: 'goals', title: titleOf('M10'), cap: caption('M10'), screens: screen('M10'),
    figAttrs: 'data-v7-reveal="rise" data-v7-delay="400"', pause: true }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-pp-hfig"'),
  M15: addAttrs(he('M15'), 'data-v7-reveal="rise" data-v7-delay="120"'),
  M11: addAttrs(he('M11'), 'data-v7-reveal="rise" data-v7-delay="200"'),
  M12: addAttrs(he('M12'), 'data-v7-reveal="rise" data-v7-delay="200"'),
  P6_FIG: shell({ h: '516px', nav: 'settings', title: titleOf('M13'), cap: caption('M13'), screens: screen('M13'),
    figAttrs: 'data-v7-reveal="rise" data-v7-delay="120"', pause: true }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-pp-cfig"')
};
const TOUR = [['goal', 'M3'], ['flows', 'M4'], ['monitor', 'M5'], ['exceptions', 'M6'], ['rules', 'M8'], ['audit', 'M9']];
let tour = stripLead(he('T1')).trim();
const tshell = shell({ h: '556px', nav: 'goals', title: titleOf('M3'),
  cap: 'תצוגה מקדימה של שישה מסכים ב-MateOS. הכיתוב שמתחת מתאר את המסך שמוצג.',
  screens: TOUR.map(([k, id]) => screen(id, `data-screen="${k}"`)).join('\n'),
  figAttrs: 'data-v7-reveal="rise" data-v7-delay="200"' }).replace(/^<figure class="v7-figure v7-fig-app"/, '<figure class="v7-figure v7-fig-app v7-tour-win"');
tour = once(tour, '<!--@TOUR_SHELL-->', tshell, 'tour shell slot');
TOUR.forEach(([, id]) => { tour = once(tour, `<!--@SR:${id}-->`, caption(id), 'sr slot ' + id); });
slots.TOUR = tour;

let main = TPLX;
for (const [k, v] of Object.entries(slots)) main = once(main, `<!--@${k}-->`, v, 'slot ' + k);
if (/<!--@/.test(main)) die('unfilled slot');

// ---- page ----
let page = rd(SRC);
const GATE = `<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>`;
const SITE_CSS = '<link rel="stylesheet" href="../../assets/site.css">';
const af = page.indexOf('<!-- Anti-flash'), afEnd = page.indexOf('</script>', af) + '</script>'.length;
if (af < 0 || page.slice(afEnd, afEnd + SITE_CSS.length) !== SITE_CSS) die('anti-flash script not directly before site.css');
page = page.slice(0, afEnd) + GATE + page.slice(afEnd);
page = once(page, SITE_CSS, SITE_CSS + '<link rel="stylesheet" href="../../assets/v7.css">', 'site.css link');
const mod = page.indexOf('<script type="module">'), modEnd = page.indexOf('</script>', mod) + '</script>'.length;
if (mod < 0 || page.indexOf('</head>', modEnd) !== modEnd) die('module script is not the last thing in <head>');
page = page.slice(0, modEnd) + '<script src="../../assets/v7.js" defer></script>' + page.slice(modEnd);
const mo = page.indexOf('<main id="main">'), mc = page.indexOf('</main>');
if (mo < 0 || mc < mo || page.indexOf('<main', mo + 1) >= 0) die('main not found exactly once');
page = page.slice(0, mo + '<main id="main">'.length) + '\n' + main + '\n' + page.slice(mc);
fs.writeFileSync(OUT, page);
console.log('wrote', OUT, page.length, 'bytes');
