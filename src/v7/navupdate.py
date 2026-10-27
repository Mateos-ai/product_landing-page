#!/usr/bin/env python3
"""Site-wide nav change (founder, 27 Oct 2026): 'Security and control' takes the 'Field stories' slot in the
top nav and the mobile menu; the footer 'Field stories' item is removed (Security and control is already there);
body links to field-stories/ are retargeted to the Industries hub. Works on site pages and generator originals.
Usage: python3 -I navupdate.py [--apply] FILE...   (dry run by default)"""
import re, sys
apply = '--apply' in sys.argv
files = [a for a in sys.argv[1:] if a != '--apply']
NAV = re.compile(r'(<li class="nav-item"[^>]*>\s*<a class="nav-link)( is-active)?(" href=")([^"]*)field-stories/("[^>]*>)[^<]*(</a>)')
MOB = re.compile(r'(<li\b[^>]*>\s*<a class="m-link)( is-active)?(" href=")([^"]*)field-stories/("[^>]*>)[^<]*(</a>)')
FOOT = re.compile(r'<li\b[^>]*>\s*<a href="[^"]*field-stories/"[^>]*>[^<]*</a>\s*</li>')
BODY_EN = re.compile(r'(<a class="v7-link-arrow v7-field-more" href=")field-stories/("[^>]*>)All field stories')
BODY_HE = re.compile(r'(<a class="link-arrow" href=")\.\./he/field-stories/(">)כל הסיפורים מהשטח')
def is_he(f, s): return re.search(r'<html[^>]*\slang="he"', s[:2000]) is not None
def is_sec(f): return 'security-and-control' in f or f.endswith('psec/orig.html')
bad = 0
for f in files:
    s = open(f, encoding='utf-8').read()
    he = is_he(f, s); label = 'אבטחה ובקרה' if he else 'Security'          # top bar: short, fits at 1024px
    mlabel = 'אבטחה ובקרה' if he else 'Security and control'                  # mobile menu: full name
    act_nav = ' is-active' if is_sec(f) else ''
    def nav(m):
        attrs = m.group(5)
        if act_nav and 'aria-current' not in attrs: attrs = '" aria-current="page"' + attrs[1:]
        return f'{m.group(1)}{act_nav}{m.group(3)}{m.group(4)}security-and-control/{attrs}{label}{m.group(6)}'
    def mob(m):
        return f'{m.group(1)}{act_nav}{m.group(3)}{m.group(4)}security-and-control/{m.group(5)}{mlabel}{m.group(6)}'
    t, a = NAV.subn(nav, s); t, b = MOB.subn(mob, t); t, c = FOOT.subn('', t)
    t, d = BODY_EN.subn(r'\1industries/\2All industries', t); t, e = BODY_HE.subn(r'\1../he/industries/\2כל הענפים', t)
    left = len(re.findall(r'field-stories/', t))
    print(f'nav {a} mob {b} foot {c} body {d+e} left {left}  {f}')
    bad += left
    if apply: open(f, 'w', encoding='utf-8').write(t)
print('files with field-stories leftovers:', bad)
