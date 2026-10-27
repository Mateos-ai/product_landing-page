import pathlib
#!/usr/bin/env python3
"""Build site/he/industries/index.html (P-IND in Hebrew) from the old Hebrew page, phe/hub.he.tpl.html and the v7parts
fragments. Mirrors pind/build-hub.py (English, never written by this script).

Usage: python3 -I build-hub-he.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (checked below against phe/orig/industries_index.html).
- Adds the three v7 head additions with ../../assets/ paths.
- Replaces the contents of <main id="main"> with the template, filling @SPRITE and @CARDS.
The card motion is P-IND.js ('X2'); its pill labels follow <html lang>.
"""
import html, importlib.util, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
_hs = importlib.util.spec_from_file_location('he_text', S / 'phe' / 'he_text.py')
HT = importlib.util.module_from_spec(_hs)
_hs.loader.exec_module(HT)
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'he' / 'industries' / 'index.html'
A = '../../'            # he/industries/ -> site root (assets)
L = '../../he/'         # links, in the old Hebrew pages' style

orig = (S / 'phe' / 'orig' / 'industries_index.html').read_text()
tpl = (S / 'phe' / 'hub.he.tpl.html').read_text()
doc = orig

GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
SITE_CSS = f'<link rel="stylesheet" href="{A}assets/site.css">'
V7CSS = f'<link rel="stylesheet" href="{A}assets/v7.css">'
V7JS = f'<script src="{A}assets/v7.js" defer></script>'
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
assert doc[af_end:af_end + len(SITE_CSS)] == SITE_CSS, 'anti-flash script is not directly before site.css'
doc = doc[:af_end] + GATE + doc[af_end:]
assert doc.count(SITE_CSS) == 1
doc = doc.replace(SITE_CSS, SITE_CSS + V7CSS)
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert doc.index('</head>') == mod_end, 'module script is not the last thing in <head>'
doc = doc[:mod_end] + V7JS + doc[mod_end:]

# The four cards. goal = the metric of the same industry's hero goal A (tools/ind/m1data/m1-goals.he.json, the M1 chips),
# who = that goal's approver, so the hub and the industry page tell one story. Avatars use Hebrew initials (M3.he: דק).
CARDS = [
    dict(slug='insurance', name='ביטוח', icon='shield', tone='ok', pain='תביעות שנקראות ידנית.',
         goal='תביעות שנענו תוך יומיים', target='90%', who='נועה ס.', verb='מאשרת', ini='נס'),
    dict(slug='manufacturing', name='תעשייה', icon='settings', tone='mate', pain='הזמנות, הצעות מחיר ומחירים בטלפון.',
         goal='הזמנות שהוקלדו באותו יום', target='95%', who='יוסי מ.', verb='מאשר', ini='ימ'),
    dict(slug='construction-and-real-estate', name='בנייה ונדל"ן', icon='building', tone='you',
         pain='תשלומים, מכרזים ומסירות על נייר.', goal='הודעות לספקים עד ה-5', target='100%', who='דנה ק.', verb='מאשרת', ini='דק'),
    dict(slug='logistics-and-distribution', name='לוגיסטיקה והפצה', icon='flow', tone='you',
         pain='מסלולים מהזיכרון של אדם אחד.', goal='הזמנות שאושרו באותו יום', target='98%', who='יוסי מ.', verb='מאשר', ini='ימ'),
]


def card(c):
    e = {k: html.escape(v, quote=False) for k, v in c.items()}
    # where a narrow card wraps the goal, the tail stays one unit ("באותו יום · 95%"): no line starts or ends on "·"
    g = e['goal']
    for unit in ('באותו יום', 'עד ה-5'):
        g = g.replace(unit, unit.replace(' ', ' '))
    e['goal'] = g + ' ·'
    sr = f"יעד לדוגמה: {c['goal']}, {c['target']}. כמתוכנן, {c['who']} {c['verb']}."
    return f'''      <a class="v7-hub-card" href="{L}industries/{e['slug']}/" data-tone="{e['tone']}" data-v7-reveal>
        <span class="v7-hub-tile"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-{e['icon']}"/></svg></span>
        <div class="v7-hub-head"><h3 class="v7-hub-name">{e['name']}</h3><p class="v7-hub-pain">{e['pain']}</p></div>
        <div class="v7-mock v7-hub-goal" data-v7-mock="X2" data-v7-play="host" aria-hidden="true" inert>
          <div class="v7-hub-gtag"><span class="v7-preview-tag">יעד לדוגמה</span></div>
          <div class="v7-hub-bar"><svg class="v7-mark" viewBox="43 43 114 114"><use href="#i-mark"/></svg><span class="v7-hub-field"><span class="v7-hub-text">{e['goal']} <span class="v7-hub-hl">{e['target']}</span></span><span class="v7-hub-ph" data-v7-gone>הגדירו יעד…</span></span><kbd class="v7-kbd v7-hub-kbd">↵</kbd></div>
          <div class="v7-hub-status"><span class="v7-pill v7-hub-pill" data-tone="ok">כמתוכנן</span><span class="v7-hub-who"><span class="v7-avatar">{e['ini']}</span><span class="v7-hub-whot">{e['who']} {e['verb']}</span></span></div>
        </div>
        <span class="sr-only">{html.escape(sr, quote=False)}</span>
        <span class="v7-hub-more">ראו איך<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></span>
      </a>'''


def frag(name):
    return (P / name).read_text().strip()


main = re.sub(r'^\s*<!--.*?-->\s*', '', tpl, count=1, flags=re.S)
main = main.replace('{L}', L)
main = HT.nw(main)
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
main = main.replace('<!--@CARDS-->', '\n'.join(card(c) for c in CARDS))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert '{L}' not in main
assert 'field-stories' not in main

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
assert doc.count('<main id="main">') == 1 and doc.count('</main>') == 1
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

o0, o1 = orig.index('<main id="main">') + len('<main id="main">'), orig.index('</main>')
outside = doc[:doc.index('<main id="main">') + len('<main id="main">')] + doc[doc.index('</main>'):]
outside = outside.replace(GATE, '', 1).replace(V7CSS, '', 1).replace(V7JS, '', 1)
assert outside == orig[:o0] + orig[o1:], 'head/header/footer differ from the old Hebrew page'

out.parent.mkdir(parents=True, exist_ok=True)
tmp = out.with_suffix('.html.tmp')
tmp.write_text(doc)
tmp.replace(out)
print(f'wrote {out} ({len(doc)} bytes)')
