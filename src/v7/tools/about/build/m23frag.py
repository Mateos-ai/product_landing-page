# Generates v7parts/M23.html (10 rows of 10 dots: the first 39 lit, in reading order).
import os
S = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
rows = []
n = 0
for r in range(10):
    ds = []
    for c in range(10):
        n += 1
        ds.append('<i class="m-gap100-d is-on"><b></b></i>' if n <= 39 else '<i class="m-gap100-d"></i>')
    rows.append('        <span class="m-gap100-row">' + ''.join(ds) + '</span>')
html = '''<figure class="v7-figure m-gap100-fig">
  <div class="v7-mock m-gap100" data-v7-mock="M23" data-v7-play="once" data-v7-threshold=".4" aria-hidden="true" inert>
    <div class="m-gap100-head">
      <p class="m-gap100-title">100 Israeli businesses</p>
      <span class="m-gap100-src">Israel CBS, March 2026</span>
    </div>
    <div class="m-gap100-body">
      <div class="m-gap100-grid" dir="ltr">
''' + '\n'.join(rows) + '''
      </div>
      <div class="m-gap100-legend">
        <p class="m-gap100-k is-on"><span class="m-gap100-n v7-num">39</span><span class="m-gap100-l"><i class="m-gap100-sw"></i>use AI</span></p>
        <p class="m-gap100-k"><span class="m-gap100-n v7-num">61</span><span class="m-gap100-l"><i class="m-gap100-sw"></i>don’t, yet</span></p>
      </div>
    </div>
    <p class="m-gap100-goal"><svg class="v7-ic"><use href="#i-goal"/></svg><span>Our goal: the other 61.</span></p>
  </div>
  <button class="v7-pause" type="button" aria-label="Pause animation"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>
  <figcaption class="sr-only">Of 100 Israeli businesses, 39 use AI and 61 do not yet (Israel CBS, March 2026). Our goal: the other 61.</figcaption>
</figure>
'''
open(os.path.join(S, 'v7parts', 'M23.html'), 'w', encoding='utf-8').write(html)
print(html.count('is-on"><b>'), html.count('m-gap100-d'))
