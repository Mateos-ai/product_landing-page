import pathlib
#!/usr/bin/env python3
"""Build site/he/security-and-control/index.html (Hebrew P-SEC) from the Hebrew original (phe/orig/), phe/security.he.tpl.html
and the Hebrew v7parts fragments (M21.he.html, M20.he.html). Modelled on psec/build.py.

Usage: python3 -I build-security.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte from phe/orig/security-and-control_index.html.
- Adds the three v7 head additions (motion gate, ../../assets/v7.css, ../../assets/v7.js), in the order of spec §2.2.
- Replaces only the contents of <main id="main"> with the template, filling @SPRITE @M21 @M20.
- M21 gets the hero figure reveal (rise, 300ms), as on the English page; fragment files are not changed.
- Page copy goes through he_text.nw() (prefix + Latin word on one line); fragments and the team copy do not.
- Fragment asset paths written for a first-level page (../assets/) are rewritten for this page (../../assets/).
"""
import importlib.util, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
_hs = importlib.util.spec_from_file_location('he_text', S / 'phe' / 'he_text.py')
HT = importlib.util.module_from_spec(_hs)
_hs.loader.exec_module(HT)
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'he' / 'security-and-control' / 'index.html'

doc = (S / 'phe' / 'orig' / 'security-and-control_index.html').read_text()
tpl = (S / 'phe' / 'security.he.tpl.html').read_text()
assert doc.count('<!DOCTYPE html>') == 1 and doc.count('</html>') == 1, 'unexpected wrapper in the original'
assert doc.count('<main id="main">') == 1 and doc.count('</main>') == 1
assert '<html lang="he" dir="rtl">' in doc

# 1. Head additions, in order (§2.2).
GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
doc = doc[:af_end] + GATE + doc[af_end:]
CSS_OLD = '<link rel="stylesheet" href="../../assets/site.css">'
assert doc.count(CSS_OLD) == 1
doc = doc.replace(CSS_OLD, CSS_OLD + '<link rel="stylesheet" href="../../assets/v7.css">')
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert mod_end <= doc.index('</head>')
doc = doc[:mod_end] + '<script src="../../assets/v7.js" defer></script>' + doc[mod_end:]


def frag(name):
    s = (P / name).read_text().strip()
    s = re.sub(r'^<!--.*?-->\s*', '', s, count=1, flags=re.S) if s.startswith('<!--') else s  # the dev comment
    return s.replace('"../assets/', '"../../assets/')


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


m21 = frag('M21.he.html')
FIG = '<figure class="v7-figure m-bound-fig"'
assert m21.startswith(FIG), 'M21.he.html must start with its figure'
if 'data-v7-reveal' not in m21.split('>', 1)[0]:
    m21 = FIG + ' data-v7-reveal="rise" data-v7-delay="300"' + m21[len(FIG):]
m20 = frag('M20.he.html')
assert m20.startswith('<figure class="v7-figure m-deal-fig"'), 'M20.he.html must hold its figure'

main = HT.nw(tpl)  # page copy only: a Hebrew prefix stays on the line of its Latin word or number (ב-X-ray, ה-CTO)
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
for slot, html in (('M21', m21), ('M20', m20)):
    tag = '<!--@' + slot + '-->'
    assert main.count(tag) == 1, slot
    main = main.replace(tag, indent(html, 4))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert 'field-stories' not in main, 'never link to field-stories/ from <main>'
assert main.lstrip().startswith('<svg class="v7-sprite"'), 'the sprite must be the first child of <main>'
assert not re.search(r'href="\.\./(?!\.\./)', main), 'links from /he/<page>/ start with ../../'
# no English UI left in the Hebrew main (mock words that stay Latin on purpose are listed)
LATIN_OK = {'MateOS', 'Mate', 'ERP', 'API', 'DMZ', 'VPN', 'CTO', 'X', 'ray', 'Q', 'hello', 'mateos', 'ai', 'mailto', 'subject',
            'Security', 'questionnaire', 'R'}
vis = re.sub(r'<svg.*?</svg>|<!--.*?-->|<[^>]+>|&[a-z]+;', ' ', main, flags=re.S)
stray = sorted({w for w in re.findall(r'[A-Za-z]+', vis)} - LATIN_OK)
assert not stray, stray
LEGACY = {'person', 'cell', 'step', 'story', 'stat', 'role-card'}
for cls in re.findall(r'\sclass="([^"]*)"', main):
    assert not LEGACY & set(cls.split()), cls

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
