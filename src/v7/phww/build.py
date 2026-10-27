#!/usr/bin/env python3
"""Build site/how-we-work/index.html (P-HWW) from the pristine original, phww/main.tpl.html and the v7parts fragments.

Usage: python3 -I build.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (the original has no stray wrapper document).
- Adds the three v7 head additions (motion gate, ../assets/v7.css, ../assets/v7.js), in the order of spec §2.2.
- Replaces only the contents of <main id="main"> with the template, filling @SPRITE @M19 @M14 @M20.
Re-run it whenever the template or a component fragment changes.
"""
import pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'how-we-work' / 'index.html'

doc = (S / 'phww' / 'orig.html').read_text()
tpl = (S / 'phww' / 'main.tpl.html').read_text()
assert doc.count('<!DOCTYPE html>') == 1 and doc.count('</html>') == 1, 'unexpected wrapper in the original'

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


main = tpl
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
for slot in ('M19', 'M14', 'M20'):
    tag = '<!--@' + slot + '-->'
    assert main.count(tag) == 1, slot
    main = main.replace(tag, indent(frag(slot + '.html'), 4))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert 'field-stories' not in main, 'never link to field-stories/ from <main>'

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
