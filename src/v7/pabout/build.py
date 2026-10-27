#!/usr/bin/env python3
"""Build site/about/index.html (P-ABOUT) from the current About page (pabout/orig.html), pabout/main.tpl.html and the
v7parts fragments.

Usage: python3 -I build.py [--out PATH]
- Keeps <head> metadata, the header and the footer byte-for-byte (the original has no stray wrapper document).
- Adds the three v7 head additions (motion gate, ../assets/v7.css, ../assets/v7.js), in the order of spec §2.2.
- Replaces only the contents of <main id="main"> with the template, filling @SPRITE @M22 @M23 @TEAM @ADVISORS @SEATS.
- The six team cards and the three advisor cards are generated from the original's markup, so every name, title, bio
  and photo is copied verbatim (entities included). Nothing in the copy is retyped here.
Re-run it whenever the template, the original or a component fragment changes.
"""
import pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else SITE / 'about' / 'index.html'

doc = (S / 'pabout' / 'orig.html').read_text()
tpl = (S / 'pabout' / 'main.tpl.html').read_text()
assert doc.count('<!DOCTYPE html>') == 1 and doc.count('</html>') == 1, 'unexpected wrapper in the original'
orig_main = doc[doc.index('<main id="main">'):doc.index('</main>')]

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


# 2. People, verbatim from the original: [(slug, name, role, bio)] per section, in the original order.
ART = re.compile(r'<article class="person"[^>]*>.*?<img src="\.\./assets/team/([a-z]+)\.jpg".*?<h3[^>]*>(.*?)</h3>'
                 r'<p class="role"[^>]*>(.*?)</p><p[^>]*>(.*?)</p></article>', re.S)


def people(after):
    i = orig_main.index(after)
    j = orig_main.index('</section>', i)
    return ART.findall(orig_main[i:j])


team = people('>The founding team<')
advisors = people('>Advisors<')
assert [t[0] for t in team] == ['yair', 'david', 'aviv', 'shayna', 'matan', 'almog'], team
assert [a[0] for a in advisors] == ['schrage', 'mantel', 'eisikovits'], advisors
for slug, *_ in team + advisors:
    assert (SITE / 'assets' / 'team' / f'{slug}.jpg').exists(), slug

# Ring tones (About spec A3): amber for Yair and Aviv, indigo for David and Almog, teal for Shayna and Matan.
TONE = {'yair': 'you', 'aviv': 'you', 'david': 'mate', 'almog': 'mate', 'shayna': 'ok', 'matan': 'ok'}
# Machine-part chips (About spec A4), drawn from each advisor's "On the machine:" line.
# The chip reads "On the machine" (it replaces those words); the icon names the part, and the verbatim line names it in
# words. Chips named after the part ('Learning loop') made the line stutter ('Learning loop the learning loop.').
PART = {'schrage': ('i-flow', 'On the machine'), 'mantel': ('i-goal', 'On the machine'), 'eisikovits': ('i-shield', 'On the machine')}
RING = ('<svg class="v7-about-ring" viewBox="0 0 116 116" focusable="false"><circle class="v7-about-track" cx="58" cy="58" r="57"/>'
        '<circle class="v7-about-halo" cx="58" cy="58" r="57"/><path pathLength="1" d="M58 1a57 57 0 1 1 0 114a57 57 0 1 1 0-114"/></svg>'
        '<span class="v7-about-orb"><i></i></span>')


def photo(slug, px, ring=True):
    img = f'<span class="v7-about-face"><img src="../assets/team/{slug}.jpg" alt="" width="{px}" height="{px}" loading="lazy" decoding="async"></span>'
    return f'<span class="v7-about-ph" aria-hidden="true">{img}{RING if ring else ""}</span>'


cards = []
for slug, name, role, bio in team:
    cards.append(
        f'<article class="v7-about-member" data-tone="{TONE[slug]}" data-v7-reveal>\n'
        f'  {photo(slug, 104)}\n'
        f'  <h3 class="v7-about-name">{name}</h3>\n'
        f'  <p class="v7-about-role">{role}</p>\n'
        f'  <p class="v7-about-bio">{bio}</p>\n'
        f'</article>')
TEAM = '\n'.join(cards)

LEAD = 'On the machine: '
cards = []
for slug, name, role, line in advisors:
    assert line.startswith(LEAD), line
    icon, chip = PART[slug]
    rest = line[len(LEAD):]
    cards.append(
        f'<article class="v7-about-adv" data-v7-reveal>\n'
        f'  {photo(slug, 88, ring=False)}\n'
        f'  <h3 class="v7-about-name">{name}</h3>\n'
        f'  <p class="v7-about-role">{role}</p>\n'
        # the chip takes the place of "On the machine:" on screen; assistive tech reads the original line
        f'  <p class="v7-about-on"><span class="sr-only">{LEAD.strip()} </span><span class="v7-about-part" aria-hidden="true">'
        f'<svg class="v7-ic" focusable="false"><use href="#{icon}"/></svg>{chip}</span> {rest}</p>\n'
        f'</article>')
ADVISORS = '\n'.join(cards)

# The join row: the six founders as a row of seats, and one empty seat (decorative).
SEATS = ''.join(f'<span class="v7-about-seat" data-tone="{TONE[s]}"><img src="../assets/team/{s}.jpg" alt="" width="40" height="40" loading="lazy" decoding="async"></span>'
                for s, *_ in team)

main = tpl
main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
for slot, body, n in (('M22', frag('M22.html'), 4), ('M23', frag('M23.html'), 6), ('TEAM', TEAM, 6), ('ADVISORS', ADVISORS, 6), ('SEATS', SEATS, 0)):
    tag = '<!--@' + slot + '-->'
    assert main.count(tag) == 1, slot
    main = main.replace(tag, indent(body, n).lstrip(' ') if n == 0 else indent(body, n))
assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
assert 'field-stories' not in main, 'never link to field-stories/ from <main>'
# the legacy reveal (site module script) targets these class tokens: v7 markup must not carry them
LEGACY = {'person', 'cell', 'step', 'story', 'stat', 'role-card'}
for cls in re.findall(r'\sclass="([^"]*)"', main):
    assert not LEGACY & set(cls.split()), cls

m0 = doc.index('<main id="main">') + len('<main id="main">')
m1 = doc.index('</main>')
doc = doc[:m0] + '\n' + main.strip() + '\n' + doc[m1:]

out.write_text(doc)
print(f'wrote {out} ({len(doc)} bytes)')
