#!/usr/bin/env python3
"""Build site/security-and-control/index.html (P-SEC) from the pristine original, psec/main.tpl.html and the v7parts fragments.

Usage: python3 -I build.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (the original has no stray wrapper document).
- Adds the three v7 head additions (motion gate, ../assets/v7.css, ../assets/v7.js), in the order of spec §2.2.
- Replaces only the contents of <main id="main"> with the template, filling @SPRITE @M21 @M20.
- M21 (hero visual) gets the hero figure reveal the homepage gives M1 (rise, 300ms); the fragment file is not changed.
Re-run it whenever the template or a component fragment changes.
"""
import pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'security-and-control' / 'index.html'

doc = (S / 'psec' / 'orig.html').read_text()
tpl = (S / 'psec' / 'main.tpl.html').read_text()
assert doc.count('<!DOCTYPE html>') == 1 and doc.count('</html>') == 1, 'unexpected wrapper in the original'
assert doc.count('<main id="main">') == 1 and doc.count('</main>') == 1

# 1. Head additions, in order (§2.2).
GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
doc = doc[:af_end] + GATE + doc[af_end:]
CSS_OLD = '<link rel="stylesheet" href="../assets/site.css">'
assert doc.count(CSS_OLD) == 1
doc = doc.replace(CSS_OLD, CSS_OLD + '<link rel="stylesheet" href="../assets/v7.css">')
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert mod_end <= doc.index('</head>')
doc = doc[:mod_end] + '<script src="../assets/v7.js" defer></script>' + doc[mod_end:]


def frag(name):
    return (P / name).read_text().strip()


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


m21 = frag('M21.html')
FIG = '<figure class="v7-figure m-bound-fig"'
assert m21.startswith(FIG), 'M21.html must start with its figure'
if 'data-v7-reveal' not in m21.split('>', 1)[0]:
    m21 = FIG + ' data-v7-reveal="rise" data-v7-delay="300"' + m21[len(FIG):]

main = tpl
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
for slot, html in (('M21', m21), ('M20', frag('M20.html'))):
    tag = '<!--@' + slot + '-->'
    assert main.count(tag) == 1, slot
    main = main.replace(tag, indent(html, 4))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert 'field-stories' not in main, 'never link to field-stories/ from <main>'
assert main.lstrip().startswith('<svg class="v7-sprite"'), 'the sprite must be the first child of <main>'

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
