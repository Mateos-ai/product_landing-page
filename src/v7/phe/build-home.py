#!/usr/bin/env python3
"""Build site/he/index.html (Hebrew P-HOME, v7) from the Hebrew original, the Hebrew <main> template below and the
Hebrew v7parts fragments (<ID>.he.html, M0.he.html). Mirrors phome/build.py.

Usage: python3 -I build-home.py [--out PATH]
- Keeps <head> metadata, header and footer byte-for-byte from phe/orig/index.html.
- Adds the three v7 head additions (gate script, ../assets/v7.css, ../assets/v7.js).
- Replaces the contents of <main id="main"> with the template, filling @SPRITE @M1 @K1 @M7 @M14 and @HOW:n:ID.
  The shell title of each How window comes from the screen's Hebrew data-title.
Re-run it whenever a Hebrew fragment changes.
"""
import pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'he' / 'index.html'

orig = (S / 'phe' / 'orig' / 'index.html').read_text()

CHECK = '<svg class="v7-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>'
ARROW = '<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg>'

TPL = '''<!--@SPRITE-->

<section class="v7-band-dark v7-hero v7-home-hero" id="top" aria-labelledby="hero-h1">
  <div class="v7-wrap-wide v7-hero-grid">
    <div class="v7-hero-copy">
      <span class="eyebrow" data-v7-reveal>MateOS</span>
      <h1 id="hero-h1" class="v7-h1" data-v7-reveal="mask" data-v7-delay="80"><span class="v7-line"><span>הופכים את סדר הבנייה.</span></span><span class="v7-line"><span>פי 10 מהר יותר.</span></span></h1>
      <ol class="v7-stepper" data-v7-stagger="80" data-v7-delay="320">
        <li data-stage="goal" data-v7-reveal><span class="v7-stepper-dot"></span><span class="v7-stepper-t">מגדירים יעד.</span></li>
        <li data-stage="flows" data-v7-reveal><span class="v7-stepper-dot"></span><span class="v7-stepper-t">Mate בונה את התהליכים.</span></li>
        <li data-stage="track" data-v7-reveal><span class="v7-stepper-dot"></span><span class="v7-stepper-t">Mate דואג שהכל מתקדם כמתוכנן.</span></li>
      </ol>
      <div class="v7-actions" data-v7-reveal data-v7-delay="560"><a class="btn btn-primary btn-lg" href="../he/contact/">מתחילים ב-X-ray</a><a class="btn btn-lg v7-btn-ghost" href="../he/mateos/#tour">לסיור במוצר</a></div>
      <p class="v7-micro" data-v7-reveal="fade" data-v7-delay="640">לחברות בבעלות יזם, בלי CTO. <bdi>X-ray</bdi>&nbsp;החל&nbsp;מ-990&nbsp;דולר.</p>
    </div>
<!--@M1-->
  </div>
</section>

<section class="v7-sec" id="reverse" aria-labelledby="reverse-h">
  <div class="v7-wrap">
    <span class="eyebrow" data-v7-reveal>הפער</span>
    <h2 class="v7-h2" id="reverse-h" data-v7-reveal="mask" data-v7-delay="80"><span class="v7-line"><span>רוב פרויקטי ה-AI מתחילים בכלים.</span></span></h2>
    <ul class="v7-gap" data-v7-stagger="100" data-v7-delay="120">
      <li data-v7-reveal><span class="v7-gap-num"><span aria-hidden="true">61%</span><span class="sr-only">61%</span></span><span class="v7-gap-line">מהעסקים בישראל עדיין לא משתמשים ב-AI.</span></li>
      <li data-v7-reveal><span class="v7-gap-num"><span aria-hidden="true">76%</span><span class="sr-only">76%</span></span><span class="v7-gap-line">מהם אומרים שזה לא רלוונטי לעסק שלהם.</span></li>
    </ul>
    <p class="v7-source" data-v7-reveal="fade" data-v7-delay="320">הלמ"ס, מרץ ויוני 2026</p>
    <p class="v7-bridge" data-v7-reveal data-v7-delay="400">ב-MateOS מתחילים מהמספר שלכם.</p>
<!--@K1-->
  </div>
</section>

<section class="v7-sec v7-sec--subtle" id="how" aria-labelledby="how-h">
  <div class="v7-wrap-wide v7-how" data-v7-steps>
    <h2 id="how-h" class="v7-h2" data-v7-reveal="mask"><span class="v7-line"><span>איך זה עובד</span></span></h2>
    <div class="v7-how-step" data-step="1" data-v7-reveal>
      <p class="v7-label"><i data-tone="you"></i>יעד</p>
      <h3 class="v7-h3"><span class="v7-sent">מספר ותאריך.</span> <span class="v7-sent">זה כל האפיון.</span></h3>
    </div>
<!--@HOW:1:M3-->
    <div class="v7-how-step" data-step="2" data-v7-reveal>
      <p class="v7-label"><i data-tone="mate"></i>תהליכים</p>
      <h3 class="v7-h3">נבנים לאחור, מהיעד.</h3>
      <p class="v7-how-p">ב-ERP, במייל, בוואטסאפ ובאקסל שכבר יש לכם.</p>
    </div>
<!--@HOW:2:M4-->
    <div class="v7-how-step" data-step="3" data-v7-reveal>
      <p class="v7-label"><i data-tone="ok"></i>כמתוכנן</p>
      <h3 class="v7-h3">נבדק כל יום.</h3>
      <p class="v7-how-p">כשהמספר סוטה, Mate מראה למה ומציע תיקון.</p>
    </div>
<!--@HOW:3:M5-->
    <span class="v7-how-rail" aria-hidden="true"><i></i></span>
  </div>
</section>

<section class="v7-sec" id="control" aria-labelledby="control-h">
  <div class="v7-wrap v7-home-split">
    <div class="v7-home-copy" data-v7-stagger="80">
      <h2 class="v7-h2" id="control-h" data-v7-reveal>אדם מאשר כל פלט.</h2>
      <p class="v7-lead" data-v7-reveal>Mate מציע. האנשים שלכם מאשרים.</p>
      <ul class="v7-check-list" data-v7-stagger="80" data-v7-delay="240">
        <li data-v7-reveal>@CHECKקריאה בלבד כברירת מחדל</li>
        <li data-v7-reveal>@CHECKרץ בתוך הסביבה שלכם</li>
        <li data-v7-reveal>@CHECKתיעוד מלא של כל פעולה</li>
        <li data-v7-reveal>@CHECKבנוי לפי תיקון 13 לחוק הגנת הפרטיות</li>
        <li data-v7-reveal>@CHECKתמיד יש אדם שאפשר להתקשר אליו</li>
      </ul>
      <a class="v7-link-arrow" href="../he/security-and-control/" data-v7-reveal data-v7-delay="480">אבטחה ובקרה@ARROW</a>
    </div>
<!--@M7-->
  </div>
</section>

<section class="v7-sec v7-sec--subtle" id="field" aria-labelledby="field-h">
  <div class="v7-wrap">
    <h2 class="v7-h2" id="field-h" data-v7-reveal="mask"><span class="v7-line"><span>שלושה חדרים שישבנו בהם.</span></span></h2>
    <p class="v7-lead v7-field-lead" data-v7-reveal data-v7-delay="120">עובדים היום עם לקוחות בביטוח, בנדל"ן, בלוגיסטיקה ובתעשייה.</p>
    <div class="v7-stories" data-v7-stagger="100">
      <article class="v7-story" data-tone="you" data-v7-reveal data-v7-fx="clock">
        <h3 class="v7-story-big"><span class="v7-fx" aria-hidden="true">04:00</span><span class="sr-only">04:00</span></h3>
        <p class="v7-story-body">מסלולי ההפצה של מחר היו בראש של אדם אחד. המערכת שלנו בנתה את אותה תוכנית מההיסטוריה.</p>
        <p class="v7-story-q">מפיץ ציוד רפואי. אב-טיפוס שנבדק על נתוני עבר.</p>
      </article>
      <article class="v7-story" data-tone="ok" data-v7-reveal data-v7-fx="count">
        <h3 class="v7-story-big"><span class="v7-fx" aria-hidden="true"><span class="v7-fx-n">9,700 שעות</span> בשנה</span><span class="sr-only">9,700 שעות בשנה</span></h3>
        <p class="v7-story-body">של קריאה ידנית של תיקים רפואיים.</p>
        <p class="v7-story-q">סוכנות ביטוח, 800 עובדים. הערכה מראיונות עם הצוות. פיילוט בביצוע.</p>
      </article>
      <article class="v7-story" data-tone="mate" data-v7-reveal data-v7-fx="type">
        <h3 class="v7-story-big is-quote"><span class="v7-fx" aria-hidden="true">“רגע, אני בודק עם המשרד.”</span><span class="sr-only">“רגע, אני בודק עם המשרד.”</span></h3>
        <p class="v7-story-body">איש מכירות, בכל שאלה על מחיר. אנחנו בונים לו את התשובה בוואטסאפ.</p>
        <p class="v7-story-q">מפעל ייצור. בפיתוח.</p>
      </article>
    </div>
    <a class="v7-link-arrow v7-field-more" href="../he/industries/" data-v7-reveal>כל הענפים@ARROW</a>
  </div>
</section>

<section class="v7-sec v7-band-dark v7-cta" id="start" aria-labelledby="start-h">
  <div class="v7-wrap v7-home-cta">
    <div class="v7-home-cta-copy">
      <h2 class="v7-h2" id="start-h" data-v7-reveal="mask"><span class="v7-line"><span>זאת החברה שלכם.</span></span> <span class="v7-line"><span>המהלך שלכם.</span></span></h2>
      <ol class="v7-ladder">
        <li><h3 class="v7-ladder-name">X-ray <span class="v7-ladder-tag">החל מ-990 דולר</span></h3><p class="v7-ladder-body">יום אחד אצלכם עם האנשים שעושים את העבודה, או סוכן קטן אחד. כל תהליך מדורג לפי ההחזר שלו.</p></li>
        <li><h3 class="v7-ladder-name">פיילוט</h3><p class="v7-ladder-body">תהליך אחד. מספר אחד. באוויר תוך שבועות.</p></li>
        <li><h3 class="v7-ladder-name">תהליכים על MateOS</h3><p class="v7-ladder-body">התהליך הבא, על אותה מערכת.</p></li>
      </ol>
      <p class="v7-fine" data-v7-reveal>פיילוט ותהליכים מתומחרים לפי תהליך. חלק מהתשלום שלנו תלוי במספר שאתם מובילים. עוצרים בכל שלב.</p>
      <div class="v7-actions" data-v7-reveal data-v7-delay="80"><a class="btn btn-primary btn-lg" href="../he/contact/">מתחילים ב-X-ray</a><a class="btn btn-lg v7-btn-ghost" href="../he/contact/">קודם מדברים</a></div>
    </div>
<!--@M14-->
  </div>
</section>
'''.replace('@CHECK', CHECK).replace('@ARROW', ARROW)

# Keep a Hebrew prefix and its hyphen with the Latin word or number it attaches to ("ה-AI", "ב-X-ray", "מ-990"):
# browsers may break after the hyphen, which strands "ה-" at a line end. Text nodes of the template only.
NW = re.compile(r'([\u05D0-\u05EA]+-[A-Za-z0-9$][A-Za-z0-9$,]*(?:-[A-Za-z0-9]+)*)')
# Buttons are skipped: .btn is a flex box, so a span would become its own item with a gap (and buttons never wrap).
TPL = re.sub(r'(<[^<>]+>)([^<>]+)(?=<)', lambda m: m.group(1) + (m.group(2) if re.search(r'class="(btn|v7-ladder-tag)', m.group(1)) else NW.sub(r'<span class="v7-nw">\1</span>', m.group(2))), TPL)

# 1. The document (the Hebrew original has no stray wrapper; slice defensively anyway).
start = orig.index('<!DOCTYPE html>')
end = orig.index('</html>', start) + len('</html>')
doc = orig[start:end] + orig[end:]

# 2. Head additions, in order (spec §2.2).
GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
CSS_OLD = '<link rel="stylesheet" href="../assets/site.css">'
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
assert doc[af_end:af_end + len(CSS_OLD)] == CSS_OLD, 'anti-flash script not directly before site.css'
doc = doc[:af_end] + GATE + doc[af_end:]
assert doc.count(CSS_OLD) == 1
doc = doc.replace(CSS_OLD, CSS_OLD + '<link rel="stylesheet" href="../assets/v7.css">')
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert doc.index('</head>') == mod_end, 'module script is not the last thing in <head>'
doc = doc[:mod_end] + '<script src="../assets/v7.js" defer></script>' + doc[mod_end:]


def frag(name):
    return (P / name).read_text().strip()


def no_comments(s):
    return re.sub(r'<!--.*?-->\s*', '', s, flags=re.S).strip()


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


M0 = re.sub(r'^\s*<!--.*?-->\s*', '', frag('M0.he.html'), count=1, flags=re.S)


def how_figure(step, sid):
    f = frag(sid + '.he.html')
    cap = re.search(r'<!--\s*figcaption:\s*(.*?)\s*-->', f, re.S).group(1)
    root = no_comments(f)
    nav = re.search(r'data-nav="([a-z]+)"', root).group(1)
    title = re.search(r'data-title="([^"]*)"', root).group(1)
    sh = M0
    old_fig = '<figure class="v7-figure v7-fig-app" style="--v7-app-h:516px">'
    assert sh.count(old_fig) == 1
    sh = sh.replace(old_fig, f'<figure class="v7-figure v7-fig-app v7-how-win" data-step="{step}" style="--v7-app-h:516px">')
    sh = re.sub(r'(<span class="v7-nav-item" data-nav="[a-z]+") data-active>', r'\1>', sh)
    tgt = f'<span class="v7-nav-item" data-nav="{nav}">'
    assert sh.count(tgt) == 1, nav
    sh = sh.replace(tgt, f'<span class="v7-nav-item" data-nav="{nav}" data-active>')
    assert len(re.findall(r'<span class="v7-app-title">[^<]*</span>', sh)) == 1
    sh = re.sub(r'<span class="v7-app-title">[^<]*</span>', f'<span class="v7-app-title">{title}</span>', sh, count=1)
    assert '<!-- FIGCAPTION -->' in sh and '<!-- SCREENS -->' in sh
    sh = sh.replace('<!-- FIGCAPTION -->', cap)
    sh = sh.replace('<!-- SCREENS -->', root)
    return sh


main = TPL
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
main = main.replace('<!--@M1-->', indent(frag('M1.he.html'), 4))
main = main.replace('<!--@K1-->', indent(frag('K1.he.html'), 4))
main = main.replace('<!--@M7-->', indent(frag('M7.he.html'), 4))
main = main.replace('<!--@M14-->', indent(frag('M14.he.html'), 4))
main = re.sub(r'<!--@HOW:(\d):(M\d+)-->', lambda m: indent(how_figure(m.group(1), m.group(2)), 4), main)
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)

assert doc.count('<main id="main">') == 1
m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
