"""Shared Hebrew text helpers for the Hebrew page builders (build-hub-he.py, build-industries-he.py, build-hww-he.py).

nw(html): keeps a Hebrew prefix on the line of the Latin word or number it attaches to (ב-X-ray, ה-ERP, מ-990, ה-5), and
X-ray itself whole, with <span class="v7-nw"> (white-space:nowrap; the rule is in P-HE.css and P-HE2.css). Only text
between tags changes; tags and attribute values are left alone. Run it on page copy only, never on mock fragments.
"""
import re

TOKEN = re.compile(r'(?<![א-ת\w-])((?:[א-ת]{1,3}-)?X-ray|[א-ת]{1,3}-[A-Za-z0-9][A-Za-z0-9,%]*)')


# left alone: buttons and flex labels already keep one line, and in a flex box the space beside a span would collapse
SKIP = re.compile(r'(<a class="btn[^"]*"[^>]*>.*?</a>|<span class="v7-hww-tag">.*?</span>)', re.S)


def nw(s):
    return ''.join(p if SKIP.fullmatch(p) else _nw(p) for p in SKIP.split(s))


def _nw(s):
    out = []
    for part in re.split(r'(<[^>]+>)', s):
        if part.startswith('<'):
            out.append(part)
        else:
            out.append(TOKEN.sub(lambda m: f'<span class="v7-nw">{m.group(1)}</span>', part))
    return ''.join(out)


def nw_data(v, skip=('m1', 'fig', 'big', 'tone', 'fx', 'name', 'cta_xray', 'cta_tour', 'cta_connect')):
    """nw() on every string of a nested copy structure, except the keys in skip (file names, effect text)."""
    if isinstance(v, str):
        return nw(v)
    if isinstance(v, dict):
        return {k: (x if k in skip else nw_data(x, skip)) for k, x in v.items()}
    if isinstance(v, list):
        return [nw_data(x, skip) for x in v]
    if isinstance(v, tuple):
        return tuple(nw_data(x, skip) if isinstance(x, (str, list, dict, tuple)) else x for x in v)
    return v


if __name__ == '__main__':
    for t in ['מתחילים ב-X-ray.', 'צוות ה-IT שלכם', 'החל&nbsp;מ-990&nbsp;דולר', '<a href="x-ray">X-ray</a>', 'עד ה-5',
              'יומיים-שלושה', 'אב-טיפוס', '<i aria-label="ו-2">ו-2</i>', 'תשובה מעל ה-ERP.']:
        print(t, '=>', nw(t))
