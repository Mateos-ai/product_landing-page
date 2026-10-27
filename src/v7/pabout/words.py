import pathlib
# Word count for /about/ with the spec §4 rule: every visible token containing a letter or digit in page copy inside <main>,
# excluding sr-only text, everything inside .v7-mock, aria-labels and <svg>. Per-section totals by <section id>.
# --strict also counts aria-hidden visible text and the .v7-mock microcopy of the belief pictures (not M22/M23).
import re, sys
from html.parser import HTMLParser
src = str(pathlib.Path(__file__).resolve().parents[3] / 'site' / 'about' / 'index.html')
strict = '--strict' in sys.argv
html = open(src, encoding='utf-8').read()
main = html[html.index('<main id="main">'):html.index('</main>')]
VOID = {'br','img','input','meta','link','hr','source','use','path','circle','rect','ellipse','col','wbr'}
class P(HTMLParser):
    def __init__(s): super().__init__(); s.stack=[]; s.sec='_'; s.out={}; s.text={}
    def handle_starttag(s, tag, a):
        a = dict(a); cls = (a.get('class') or '').split()
        mock = 'v7-mock' in cls and not (strict and 'v7-about-viz' in cls)
        skip = tag in ('svg','script','style') or 'sr-only' in cls or mock
        if tag == 'section' and a.get('id'): s.sec = a['id']
        if tag in VOID: return
        s.stack.append((tag, skip))
    def handle_endtag(s, tag):
        if tag in VOID: return
        while s.stack:
            t,_ = s.stack.pop()
            if t == tag: break
    def handle_data(s, data):
        if any(k for _,k in s.stack): return
        toks = [t for t in data.split() if re.search(r'[A-Za-z0-9]', t)]
        if toks: s.out[s.sec] = s.out.get(s.sec,0)+len(toks); s.text.setdefault(s.sec,[]).append(' '.join(toks))
import html as H
p = P(); p.feed(main.replace('&nbsp;', ' '))
for k,v in p.out.items(): print(f'{k:10} {v:4}  ' + ' | '.join(p.text.get(k,[]))[:300])
print('TOTAL', sum(p.out.values()), '(budget 480)', '[strict]' if strict else '')
