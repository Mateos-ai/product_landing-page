import pathlib
#!/usr/bin/env python3
"""Build site/he/how-we-work/index.html (P-HWW in Hebrew) from the old Hebrew page, phe/hww.he.tpl.html and the Hebrew
v7parts fragments (M19.he, M14.he, M20.he). Mirrors phww/build.py (English, never written by this script).

Usage: python3 -I build-hww-he.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (checked against phe/orig/how-we-work_index.html).
- Adds the three v7 head additions with ../../assets/ paths.
- Replaces only <main id="main">; links in the old Hebrew pages' style (../../he/...).
"""
import importlib.util, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
_hs = importlib.util.spec_from_file_location('he_text', S / 'phe' / 'he_text.py')
HT = importlib.util.module_from_spec(_hs)
_hs.loader.exec_module(HT)
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'he' / 'how-we-work' / 'index.html'
A = '../../'
L = '../../he/'

orig = (S / 'phe' / 'orig' / 'how-we-work_index.html').read_text()
tpl = (S / 'phe' / 'hww.he.tpl.html').read_text()
doc = orig
assert doc.count('<!DOCTYPE html>') == 1 and doc.count('</html>') == 1

GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
CSS_OLD = f'<link rel="stylesheet" href="{A}assets/site.css">'
V7CSS = f'<link rel="stylesheet" href="{A}assets/v7.css">'
V7JS = f'<script src="{A}assets/v7.js" defer></script>'
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
doc = doc[:af_end] + GATE + doc[af_end:]
assert doc.count(CSS_OLD) == 1
doc = doc.replace(CSS_OLD, CSS_OLD + V7CSS)
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert mod_end <= doc.index('</head>')
doc = doc[:mod_end] + V7JS + doc[mod_end:]


def frag(name):
    # Hebrew fragments may open with one dev comment before the <figure>: strip it, as the English fragments have none
    return re.sub(r'^\s*<!--.*?-->\s*', '', (P / name).read_text().strip(), count=1, flags=re.S)


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


main = tpl.replace('{L}', L)
main = HT.nw(main)
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
for slot in ('M19', 'M14', 'M20'):
    tag = '<!--@' + slot + '-->'
    assert main.count(tag) == 1, slot
    f = frag(slot + '.he.html')
    assert f.startswith('<figure'), slot
    main = main.replace(tag, indent(f, 4))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert '{L}' not in main and 'field-stories' not in main

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
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
