import pathlib
#!/usr/bin/env python3
"""Build site/industries/index.html (P-IND, Industries spec §5) from the pristine original, pind/hub.tpl.html and the
v7parts fragments.

Usage: python3 -I build-hub.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (checked below against the original).
- Adds the three v7 head additions (gate script, ../assets/v7.css, ../assets/v7.js).
- Replaces the contents of <main id="main"> with the template, filling @SPRITE and @CARDS.
Re-run it whenever the template, the card data below or the sprite changes. The card motion is P-IND.js ('X2').
"""
import html, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'industries' / 'index.html'

orig = (S / 'pind' / 'orig' / 'index.html').read_text()
tpl = (S / 'pind' / 'hub.tpl.html').read_text()
doc = orig

# 1. Head additions, in order (spec §2.2), with ../assets/ paths.
GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
SITE_CSS = '<link rel="stylesheet" href="../assets/site.css">'
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
assert doc[af_end:af_end + len(SITE_CSS)] == SITE_CSS, 'anti-flash script is not directly before site.css'
doc = doc[:af_end] + GATE + doc[af_end:]
assert doc.count(SITE_CSS) == 1
doc = doc.replace(SITE_CSS, SITE_CSS + '<link rel="stylesheet" href="../assets/v7.css">')
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert doc.index('</head>') == mod_end, 'module script is not the last thing in <head>'
doc = doc[:mod_end] + '<script src="../assets/v7.js" defer></script>' + doc[mod_end:]

# 2. The four cards (§5 X2). Mini goals are sample data inside a .v7-mock (aria-hidden); the sr-only line carries them.
#    who = the approver of the same industry's hero goal A (tools/ind/m1data/m1-goals.json), so the hub and the industry
#    page tell one story.
CARDS = [
    dict(slug='insurance', name='Insurance', icon='shield', tone='ok', pain='Claims read by hand.',
         goal='Claims answered in 2 days', target='90%', who='Noa S.', ini='NS'),
    dict(slug='manufacturing', name='Manufacturing', icon='settings', tone='mate', pain='Orders, quotes and prices by phone.',
         goal='Orders keyed same day', target='95%', who='Yossi M.', ini='YM'),
    dict(slug='construction-and-real-estate', name='Construction and real estate', icon='building', tone='you',
         pain='Payments, tenders and handover on paper.', goal='Supplier notices by the 5th', target='100%', who='Dana K.', ini='DK'),
    dict(slug='logistics-and-distribution', name='Logistics and distribution', icon='flow', tone='you',
         pain='Routes from one person’s memory.', goal='Orders confirmed same day', target='98%', who='Yossi M.', ini='YM'),
]


def card(c):
    e = {k: html.escape(v, quote=True) for k, v in c.items()}
    # where a narrow card wraps the goal, the tail stays one unit ("2 days · 90%"): no line starts or ends on "·"
    g = e['goal']
    for unit in ('2 days', 'same day', 'the 5th'):
        g = g.replace(unit, unit.replace(' ', '\u00a0'))
    e['goal'] = g + '\u00a0·'
    sr = f"Sample goal: {c['goal'][0].lower() + c['goal'][1:]}, {c['target']}. On track, {c['who']} approves."
    return f'''      <a class="v7-hub-card" href="{e['slug']}/" data-tone="{e['tone']}" data-v7-reveal>
        <span class="v7-hub-tile"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-{e['icon']}"/></svg></span>
        <div class="v7-hub-head"><h3 class="v7-hub-name">{e['name']}</h3><p class="v7-hub-pain">{e['pain']}</p></div>
        <div class="v7-mock v7-hub-goal" data-v7-mock="X2" data-v7-play="host" aria-hidden="true" inert>
          <div class="v7-hub-gtag"><span class="v7-preview-tag">Sample goal</span></div>
          <div class="v7-hub-bar"><svg class="v7-mark" viewBox="43 43 114 114"><use href="#i-mark"/></svg><span class="v7-hub-field"><span class="v7-hub-text">{e['goal']}\u00a0<span class="v7-hub-hl">{e['target']}</span></span><span class="v7-hub-ph" data-v7-gone>Set a goal…</span></span><kbd class="v7-kbd v7-hub-kbd">↵</kbd></div>
          <div class="v7-hub-status"><span class="v7-pill v7-hub-pill" data-tone="ok">On track</span><span class="v7-hub-who"><span class="v7-avatar">{e['ini']}</span><span class="v7-hub-whot">{e['who']} approves</span></span></div>
        </div>
        <span class="sr-only">{html.escape(sr)}</span>
        <span class="v7-hub-more">See how<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></span>
      </a>'''


def frag(name):
    return (P / name).read_text().strip()


main = re.sub(r'^\s*<!--.*?-->\s*', '', tpl, count=1, flags=re.S)
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
main = main.replace('<!--@CARDS-->', '\n'.join(card(c) for c in CARDS))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert 'field-stories' not in main, 'never link to field-stories/ (Industries spec §0)'

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
assert doc.count('<main id="main">') == 1 and doc.count('</main>') == 1
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

# 3. Outside <main>, the page equals the original plus exactly the three head additions.
o0, o1 = orig.index('<main id="main">') + len('<main id="main">'), orig.index('</main>')
outside = doc[:doc.index('<main id="main">') + len('<main id="main">')] + doc[doc.index('</main>'):]
outside = outside.replace(GATE, '', 1).replace('<link rel="stylesheet" href="../assets/v7.css">', '', 1).replace('<script src="../assets/v7.js" defer></script>', '', 1)
assert outside == orig[:o0] + orig[o1:], 'head/header/footer differ from the pristine original'

out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
