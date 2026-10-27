#!/usr/bin/env python3
"""Build site/index.html (P-HOME) from the pristine original, phome/main.tpl.html and the v7parts fragments.

Usage: python3 -I build.py [--out PATH]
- Strips the stray wrapper document (spec §2.2), keeps <head> metadata, header and footer byte-for-byte.
- Adds the three head additions (gate script, v7.css, v7.js).
- Replaces the contents of <main id="main"> with the template, filling @SPRITE @M1 @K1 @M7 @M14 and @HOW:n:ID:nav:title.
Re-run it whenever a component fragment changes.
"""
import pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'index.html'

orig = (S / 'phome' / 'index.orig.html').read_text()
tpl = (S / 'phome' / 'main.tpl.html').read_text()

# 1. Drop the stray wrapper: everything before the real doctype, and the extra </body></html> after the real </html>.
start = orig.index('<!DOCTYPE html>')
end = orig.index('</html>', start) + len('</html>')
doc = orig[start:end] + '\n'

# 2. Head additions, in order (§2.2).
GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")
af = doc.index('<!-- Anti-flash')
af_end = doc.index('</script>', af) + len('</script>')
doc = doc[:af_end] + GATE + doc[af_end:]
CSS_OLD = '<link rel="stylesheet" href="assets/site.css">'
assert doc.count(CSS_OLD) == 1
doc = doc.replace(CSS_OLD, CSS_OLD + '<link rel="stylesheet" href="assets/v7.css">')
mod = doc.index('<script type="module">')
mod_end = doc.index('</script>', mod) + len('</script>')
assert mod_end <= doc.index('</head>')
doc = doc[:mod_end] + '<script src="assets/v7.js" defer></script>' + doc[mod_end:]


def frag(name):
    return (P / name).read_text().strip()


def no_comments(s):
    return re.sub(r'<!--.*?-->\s*', '', s, flags=re.S).strip()


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


M0 = re.sub(r'^\s*<!--.*?-->\s*', '', frag('M0.html'), count=1, flags=re.S)


def how_figure(step, sid, nav, title):
    f = frag(sid + '.html')
    cap = re.search(r'<!--\s*figcaption:\s*(.*?)\s*-->', f, re.S).group(1)
    root = no_comments(f)
    sh = M0
    old_fig = '<figure class="v7-figure v7-fig-app" style="--v7-app-h:516px">'
    assert sh.count(old_fig) == 1
    sh = sh.replace(old_fig, f'<figure class="v7-figure v7-fig-app v7-how-win" data-step="{step}" style="--v7-app-h:516px">')
    sh = re.sub(r'(<span class="v7-nav-item" data-nav="[a-z]+") data-active>', r'\1>', sh)
    tgt = f'<span class="v7-nav-item" data-nav="{nav}">'
    assert sh.count(tgt) == 1, nav
    sh = sh.replace(tgt, f'<span class="v7-nav-item" data-nav="{nav}" data-active>')
    sh = re.sub(r'<span class="v7-app-title">[^<]*</span>', f'<span class="v7-app-title">{title}</span>', sh, count=1)
    assert '<!-- FIGCAPTION -->' in sh and '<!-- SCREENS -->' in sh
    sh = sh.replace('<!-- FIGCAPTION -->', cap)
    sh = sh.replace('<!-- SCREENS -->', root)
    return sh


main = tpl
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
main = main.replace('<!--@M1-->', indent(frag('M1.html'), 4))
main = main.replace('<!--@K1-->', indent(frag('K1.html'), 4))
main = main.replace('<!--@M7-->', indent(frag('M7.html'), 4))
main = main.replace('<!--@M14-->', indent(frag('M14.html'), 4))
main = re.sub(r'<!--@HOW:(\d):(M\d+):([a-z]+):([^>]*?)-->',
              lambda m: indent(how_figure(m.group(1), m.group(2), m.group(3), m.group(4)), 4), main)
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
