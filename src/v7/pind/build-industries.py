import pathlib
#!/usr/bin/env python3
"""Build the four v7 industry pages (P-INDX, Industries spec §1 and §4) from their pristine originals.

Usage: python3 -I build-industries.py [slug ...] [--lang en] [--out-dir DIR]
  - no slug: all four industries.
  - --out-dir writes <DIR>/<slug>/index.html instead of the site (for previews).

What it does, per page (same rules as phome/build.py):
  - keeps <head> metadata, the header and the footer byte-for-byte from the pristine original,
  - adds the three v7 head additions (motion gate, v7.css, v7.js) with paths relative to the page,
  - replaces only the contents of <main id="main"> with MAIN_TPL, filled from UI[lang] (shared strings) and
    PAGES[lang][slug] (per-industry copy), plus the component fragments from v7parts/ (pasted as is).

Structure for a later Hebrew build: add UI['he'] and PAGES['he'] (same keys), an ORIG / OUT entry for 'he' and Hebrew
fragments (the fragment file names are per-page data). The template itself has no language-specific text.
Re-run after any change to a fragment it pastes (C2.sprite.html, M1.<slug>.html, M16.html, M17.html, M18.*.html).
"""
import html, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
P = S / 'v7parts'
SITE = S.parents[1] / 'site'  # repo/site

# Per language: where the pristine originals live, where the pages go, and the relative path to the site root.
LANGS = {
    'en': {'orig': S / 'pind' / 'orig', 'out': SITE / 'industries', 'root': '../../'},
    # 'he': {'orig': S / 'pind' / 'orig-he', 'out': SITE / 'he' / 'industries', 'root': '../../../'},
}

# ---------------------------------------------------------------------------------------------------------------------
# Shared strings (one set per language). Everything visible that is the same on every industry page.
# ---------------------------------------------------------------------------------------------------------------------
UI = {
    'en': {
        'stepper': [('goal', 'Set the goal.'), ('flows', 'Mate builds the flows.'), ('track', 'Mate keeps you on track.')],
        'cta_xray': 'Start with an X-ray',
        'cta_tour': 'Take the tour',
        'cta_talk': 'Talk to us first',
        # the bottom line's last two beats, in the homepage micro pattern ("For owner-led companies with no CTO. X-ray from $990.")
        # one sentence per line on phones (.v7-sent: inline-block), in both engines (WebKit otherwise re-balances mid-sentence)
        'micro': '<span class="v7-sent">A person approves every output.</span> <span class="v7-sent">X-ray&nbsp;from&nbsp;$990.</span>',
        'start_h2': 'Where we start.',
        'field_h2': 'One room we sat in.',
        'all_industries': 'All industries',
        'security': 'Security and control',
        'move_h2': ['It’s your company.', 'Your move.'],
        'move_p': 'Start with an X-ray. One day on site, every process ranked by payback. From&nbsp;$990.',
    },
}

# ---------------------------------------------------------------------------------------------------------------------
# Per-industry copy (Industries spec §4). h1: mask lines, the last in amber (the homepage pattern); a line may instead hold
#     <span class="v7-ind-acc"> spans, and then only those are amber (lines set per phrase, see construction, logistics).
# h1_br: range-scoped H1 line breaks (see "H1 breaks" below the data), so the web font and the fallback fonts wrap the
#        same way at every width (QA lesson: no re-wrap on font swap).
# hurts.h2: a string, or a list of sentences (it then breaks between sentences first).
# hurts.fig: fragment file; hurts.rise: False to skip the figure's rise reveal; hurts.cap: optional visible caption under the figure (page copy).
# control.never: the insurance "never" variant (an ✕ instead of a check); items are (text, optional secondary text).
# field: the story card (homepage H5 component); fx = clock | count | type | None.
# ---------------------------------------------------------------------------------------------------------------------
PAGES = {
    'en': {
        'insurance': {
            'name': 'Insurance',
            'm1': 'M1.insurance.html',
            'eyebrow': 'Insurance · 10x&nbsp;faster',
            'h1': ['The claims department reads.', 'By hand.'],
            'h1_br': [(0, 'department', '596-866'), (0, 'reads.', '390-1023')],
            'lead': 'Opening, sorting, reading, writing letters. Most of the day is reading.',
            'hurts': {
                'label': 'Where the time goes',
                'h2': ['Six stations.', 'One eats the day.'],
                'line': 'Reading the case takes three times longer than any other station.',
                'fig': 'M16.html',
                'rise': False,  # plays once: the bars growing are the entrance (like M7 on the homepage)
                'cap': 'Estimate from team interviews.',  # spec: 'Hours a day per station. Estimate from team interviews.' (cut for the budget)
            },
            'start': [
                ('doc', 'Case summaries.', 'A summary per case, by policy chapter, before the adjuster opens the file.'),
                ('mail', 'Completion letters.', 'Drafted from the file. The adjuster approves.'),
                ('search', 'Readable or not.', 'Which document types the system reads, tested on your files, inside your tenant.'),
            ],
            'control': {
                'h2': 'What Mate never does.',
                'never': True,
                'items': [
                    ('Approves or rejects a claim.', None),
                    ('Writes to your core system.', None),
                    ('Replies to the insured on its own.', None),
                    ('Touches sensitive cases.', 'You name them before we start.'),
                ],
                'after': 'A person decides. Always.',
            },
            'field': {
                'tone': 'ok', 'fx': 'count', 'quote': False,
                'big': '<span class="v7-fx-n">9,700 hours</span> a year',
                'body': 'reading medical files by hand.',
                'q': 'Insurance agency, 800 employees. Estimate from team interviews. Pilot in delivery.',
            },
        },
        'manufacturing': {
            'name': 'Manufacturing',
            'm1': 'M1.manufacturing.html',
            'eyebrow': 'Manufacturing · 10x&nbsp;faster',
            'h1': ['A plant that runs on paper,', 'phone calls and memory.'],
            'h1_br': [(0, 'runs', '528-1023'), (1, 'and', '508-1023')],
            'lead': 'We don’t touch the machines. We take the typing, calls and copying around them.',
            'hurts': {
                'label': 'Where the time goes',
                'h2': 'The rep already lives on WhatsApp.',
                'line': 'Every attempt before us asked the rep to change. Ours doesn’t.',
                'fig': 'M17.html',
                'cap': None,
            },
            'start': [
                ('chat', 'An answer over the ERP.', 'A rep asks on WhatsApp. The answer comes from the ERP in seconds.'),
                ('inbox', 'Order intake.', 'Envelopes, PDFs and emails read into the order system.'),  # spec adds 'Exceptions go to a person.' (cut for the budget)
                ('doc', 'Quotes from drawings.', 'The drawing read, parts and operations listed, the quote drafted for the estimator.'),
            ],
            'control': {
                'h2': 'A person approves every exception.',
                'never': False,
                'items': [('Read-only on the ERP', None), ('Nothing keyed without approval', None),
                          ('No new app for the rep', None), ('Runs inside your environment', None)],
                'after': None,
            },
            'field': {
                'tone': 'mate', 'fx': 'type', 'quote': True,
                'big': '“Hold on, I’m checking with the office.”',
                'body': 'A sales rep, on every price. We’re building his answer on WhatsApp.',
                'q': 'Manufacturing plant. In development.',
            },
        },
        'construction-and-real-estate': {
            'name': 'Construction and real estate',
            'm1': 'M1.construction-and-real-estate.html',
            'eyebrow': 'Construction and real&nbsp;estate · 10x&nbsp;faster',  # phones: never 'real / estate'
            'eyebrow_br': ('real&nbsp;estate', '440-1023 1080-'),
            'h1': ['Finance and', 'marketing <span class="v7-ind-acc">run</span>', '<span class="v7-ind-acc">on documents.</span>'],
            'lead': 'Supplier payments, tenders, parking and storage, guarantees, handover. All by hand.',
            'hurts': {
                'label': 'Built on what you own',
                'h2': ['Copilot, Power&nbsp;Automate, SharePoint.', 'Already paid for.'],
                'line': 'No new database, no new servers. Your IT team sees every step.',
                'fig': 'M18.assign.html',
                'cap': None,
            },
            'start': [
                ('send', 'Supplier payment notices.', 'One email per supplier each month: paid, by which company, for which project.'),
                ('building', 'Parking and storage.', 'Assigned from the building files by your rules, with an exceptions list.'),
                ('shield', 'Guarantees and handover.', 'Tracked per apartment. Missing items surface early.'),
            ],
            'control': {
                'h2': 'A person approves every assignment.',
                'never': False,
                'items': [('Checked against the bank', None), ('Sent from your own domain', None),
                          ('Every message logged and archived', None), ('Inside your Microsoft environment', None)],
                'after': None,
            },
            'field': {
                'tone': 'you', 'fx': None, 'quote': False,
                'big': 'Two to three days. <span class="v7-ind-goal">Goal: half a day.</span>',
                'body': 'to assign parking and storage for one new building, by hand.',
                'q': 'Residential developer. Goal, not yet a measured result.',
            },
        },
        'logistics-and-distribution': {
            'name': 'Logistics and distribution',
            'm1': 'M1.logistics-and-distribution.html',
            'eyebrow': 'Logistics and distribution · 10x&nbsp;faster',
            'eyebrow_br': ('distribution', '440-'),
            'h1': ['The knowledge', 'in one person’s', 'head <span class="v7-ind-acc">at 4am.</span>'],
            'lead': 'Routes, capacity, receiving hours, who drives where. When he’s away, the plan is worse.',
            'hurts': {
                'label': 'Suggest, not decide',
                'h2': 'Tomorrow’s plan, drafted tonight.',
                'line': 'Mate drafts the routes from your rules and history. The manager approves before anything goes out.',
                'fig': 'M18.plan.html',
                'cap': None,
            },
            'start': [
                ('flow', 'The daily plan.', 'Drafted every evening, by driver and round, with a reason per stop.'),
                ('rules', 'Rules versus reality.', 'Where your history contradicts your stated rules.'),
                ('inbox', 'Order desk and collections.', 'Open lines, missing documents and late invoices, chased with approval.'),
            ],
            'control': {
                'h2': 'The manager approves every plan.',
                'never': False,
                'items': [('Runs inside your network', None), ('Read-only on warehouse and delivery systems', None),
                          ('Nothing sent without a person', None), ('Plan versus actual, every day', None)],
                'after': None,
            },
            'field': {
                'tone': 'you', 'fx': 'clock', 'quote': False,
                'big': '04:00',
                'body': 'One man’s head held tomorrow’s delivery routes. Our system built the same plan from history.',
                'q': 'Medical equipment distributor. Prototype tested on past data.',
            },
        },
    },
}

# Eyebrow break (eyebrow_br): (word, hidden ranges), the same <br class="v7-ind-br"> before that word. The two long eyebrows
# set as two lines on phones (< 440px) and, for construction, in the 1024–1079px column, where the web font fits one line
# but the fallback mono does not (WebKit: one line only from 428 / 1068px): a fixed break, so no re-wrap moves the H1.
# H1 breaks (h1_br): (line index, word, hidden ranges). Each is a <br class="v7-ind-br" data-v7-hide="..."> before that word,
# hidden in the listed viewport ranges (P-INDX.css enumerates them). They force the web font's own line breaks at every
# width where it has them, so the fallback fonts (narrower) wrap the same way and the H1 never re-wraps when Bricolage
# arrives (QA lesson). Ranges measured with tools/ind/pindx/breaks.mjs at 1px steps, 320-1600, Chromium and WebKit;
# re-measure after changing an H1 or the hero type scale.

# ---------------------------------------------------------------------------------------------------------------------
# Template. {R} = relative path to the site root. Placeholders in <!--@...--> are fragments.
# ---------------------------------------------------------------------------------------------------------------------
MAIN_TPL = '''<!--@SPRITE-->

<section class="v7-band-dark v7-hero v7-ind-hero" id="top" aria-labelledby="hero-h1">
  <div class="v7-wrap-wide v7-hero-grid">
    <div class="v7-hero-copy">
      <span class="eyebrow" data-v7-reveal>{eyebrow}</span>
      <h1 id="hero-h1" class="v7-h1{h1_cls}" data-v7-reveal="mask" data-v7-delay="80">{h1}</h1>
      <p class="v7-lead" data-v7-reveal data-v7-delay="240">{lead}</p>
      <ol class="v7-stepper" data-v7-stagger="80" data-v7-delay="320">
{stepper}
      </ol>
      <div class="v7-actions" data-v7-reveal data-v7-delay="560"><a class="btn btn-primary btn-lg" href="{R}contact/">{cta_xray}</a><a class="btn btn-lg v7-btn-ghost" href="{R}mateos/#tour">{cta_tour}</a></div>
      <p class="v7-micro" data-v7-reveal="fade" data-v7-delay="640">{micro}</p>
    </div>
<!--@M1-->
  </div>
</section>

<section class="v7-sec v7-ind-sec" id="hurts" aria-labelledby="hurts-h">
  <div class="v7-wrap v7-ind-split v7-ind-hurts">
    <div class="v7-ind-copy" data-v7-stagger="80">
      <span class="eyebrow" data-v7-reveal>{hurts_label}</span>
      <h2 class="v7-h2" id="hurts-h" data-v7-reveal>{hurts_h2}</h2>
      <p class="v7-lead" data-v7-reveal>{hurts_line}</p>
    </div>
    <div class="v7-ind-vis">
<!--@HURTS-->{hurts_cap}
    </div>
  </div>
</section>

<section class="v7-sec v7-sec--subtle v7-ind-sec" id="start-here" aria-labelledby="start-here-h">
  <div class="v7-wrap">
    <h2 class="v7-h2" id="start-here-h" data-v7-reveal="mask"><span class="v7-line"><span>{start_h2}</span></span></h2>
    <ol class="v7-ind-cards" data-v7-stagger="100" data-v7-delay="120">
{cards}
    </ol>
  </div>
</section>

<section class="v7-sec v7-ind-sec" id="control" aria-labelledby="control-h">
  <div class="v7-wrap v7-ind-trio v7-ind-ctrl">
    <h2 class="v7-h2" id="control-h" data-v7-reveal>{control_h2}</h2>
    <div class="v7-ind-trio-main">
      <ul class="v7-check-list v7-ind-checks{never_cls}" data-v7-stagger="80" data-v7-delay="120">
{checks}
      </ul>{control_after}
    </div>
    <a class="v7-link-arrow" href="{R}security-and-control/" data-v7-reveal data-v7-delay="200">{security}<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></a>
  </div>
</section>

<section class="v7-sec v7-sec--subtle v7-ind-sec" id="field" aria-labelledby="field-h">
  <div class="v7-wrap v7-ind-trio v7-ind-field">
    <h2 class="v7-h2" id="field-h" data-v7-reveal="mask"><span class="v7-line"><span>{field_h2}</span></span></h2>
    <div class="v7-ind-trio-main">
{story}
    </div>
    <a class="v7-link-arrow" href="../" data-v7-reveal data-v7-delay="200">{all_industries}<svg class="v7-ic v7-ic-flip" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></a>
  </div>
</section>

<section class="v7-sec v7-band-dark v7-cta v7-pp-cta v7-ind-cta" id="start" aria-labelledby="start-h">
  <div class="v7-wrap">
    <div class="v7-pp-ctacopy" data-v7-stagger="80">
      <h2 id="start-h" class="v7-h2" data-v7-reveal="mask">{move_h2}</h2>
      <p class="v7-lead" data-v7-reveal data-v7-delay="160">{move_p}</p>
      <div class="v7-actions" data-v7-reveal data-v7-delay="160"><a class="btn btn-primary btn-lg" href="{R}contact/">{cta_xray}</a><a class="btn btn-lg v7-btn-ghost" href="{R}contact/">{cta_talk}</a></div>
    </div>
  </div>
</section>'''

CHECK_SVG = '<svg class="v7-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>'
NEVER_SVG = ('<svg class="v7-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
             '<path d="M7 7l10 10" pathLength="1"/><path d="M17 7L7 17" pathLength="1"/></svg>')

GATE = ("<script>(function(d){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('v7-motion');"
        "setTimeout(function(){if(!d.classList.contains('v7-ready'))d.classList.remove('v7-motion')},2500)}}catch(e){}})(document.documentElement)</script>")


def frag(name):
    return (P / name).read_text().strip()


def strip_lead_comment(s):
    return re.sub(r'^\s*<!--.*?-->\s*', '', s, count=1, flags=re.S)


def indent(s, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l.strip() else l for l in s.split('\n'))


def add_fig_attrs(fig, attrs):
    """Add reveal attributes to the fragment's opening <figure> tag (the P-PROD assembler pattern)."""
    m = re.match(r'<figure\b([^>]*)>', fig)
    assert m, 'fragment does not start with <figure>'
    assert 'data-v7-reveal' not in m.group(1)
    return fig[:m.end() - 1] + ' ' + attrs + '>' + fig[m.end():]


def sentences(h):
    """A heading given as a list of sentences breaks between them first (.v7-sent, S1.css: inline-block)."""
    if isinstance(h, str):
        return h
    return ' '.join(f'<span class="v7-sent">{s}</span>' for s in h)


def mask_lines(lines, brs=()):
    out = []
    for i, t in enumerate(lines):
        for li, word, hide in brs:
            if li != i:
                continue
            pat = r'(?<= )' + re.escape(word) + r'(?= |$)'
            assert len(re.findall(pat, t)) == 1, (t, word)
            t = re.sub(pat, f'<br class="v7-ind-br" data-v7-hide="{hide}">' + word, t)
        out.append(f'<span class="v7-line"><span>{t}</span></span>')
    return ''.join(out)


def head_additions(doc, root):
    af = doc.index('<!-- Anti-flash')
    af_end = doc.index('</script>', af) + len('</script>')
    doc = doc[:af_end] + GATE + doc[af_end:]
    css_old = f'<link rel="stylesheet" href="{root}assets/site.css">'
    assert doc.count(css_old) == 1, css_old
    doc = doc.replace(css_old, css_old + f'<link rel="stylesheet" href="{root}assets/v7.css">')
    mod = doc.index('<script type="module">')
    mod_end = doc.index('</script>', mod) + len('</script>')
    assert mod_end <= doc.index('</head>')
    return doc[:mod_end] + f'<script src="{root}assets/v7.js" defer></script>' + doc[mod_end:]


def build_main(lang, slug):
    ui, pg, R = UI[lang], PAGES[lang][slug], LANGS[lang]['root']
    stepper = '\n'.join(
        f'        <li data-stage="{k}" data-v7-reveal><span class="v7-stepper-dot"></span><span class="v7-stepper-t">{t}</span></li>'
        for k, t in ui['stepper'])
    cards = '\n'.join(
        f'      <li class="v7-ind-card" data-v7-reveal>\n'
        f'        <div class="v7-ind-card-top"><span class="v7-ind-tile"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-{ic}"/></svg></span><span class="v7-ind-num" aria-hidden="true">{i + 1:02d}</span></div>\n'
        f'        <h3 class="v7-ind-card-t">{t}</h3>\n'
        f'        <p class="v7-ind-card-p">{b}</p>\n'
        f'      </li>'
        for i, (ic, t, b) in enumerate(pg['start']))
    c = pg['control']
    svg = NEVER_SVG if c['never'] else CHECK_SVG
    checks = '\n'.join(
        f'        <li data-v7-reveal>{svg}<span>{t}' + (f' <span class="v7-ind-sub">{sub}</span>' if sub else '') + '</span></li>'
        for t, sub in c['items'])
    after = f'\n      <p class="v7-ind-after" data-v7-reveal data-v7-delay="480">{c["after"]}</p>' if c['after'] else ''
    f = pg['field']
    fx_attr = f' data-v7-fx="{f["fx"]}"' if f['fx'] else ''
    big_cls = 'v7-story-big is-quote' if f['quote'] else 'v7-story-big'
    if f['fx']:
        plain = html.unescape(re.sub(r'<[^>]+>', '', f['big']))
        big = f'<span class="v7-fx" aria-hidden="true">{f["big"]}</span><span class="sr-only">{plain}</span>'
    else:
        big = f['big']
    story = (f'      <article class="v7-story" data-tone="{f["tone"]}" data-v7-reveal data-v7-delay="120"{fx_attr}>\n'
             f'        <h3 class="{big_cls}">{big}</h3>\n'
             f'        <p class="v7-story-body">{f["body"]}</p>\n'
             f'        <p class="v7-story-q">{f["q"]}</p>\n'
             f'      </article>')
    h = pg['hurts']
    hurts_fig = strip_lead_comment(frag(h['fig']))
    if h.get('rise', True):
        hurts_fig = add_fig_attrs(hurts_fig, 'data-v7-reveal="rise" data-v7-delay="120"')
    hurts_cap = (f'\n      <p class="v7-note m-bars-cap" data-v7-reveal="fade" data-v7-delay="200">{h["cap"]}</p>' if h['cap'] else '')

    eyebrow = pg['eyebrow']
    if pg.get('eyebrow_br'):
        word, hide = pg['eyebrow_br']
        assert eyebrow.count(' ' + word) == 1, (eyebrow, word)
        eyebrow = eyebrow.replace(' ' + word, f' <br class="v7-ind-br" data-v7-hide="{hide}">' + word)
    main = MAIN_TPL.format(
        R=R, eyebrow=eyebrow, h1=mask_lines(pg['h1'], pg.get('h1_br', ())), lead=pg['lead'], stepper=stepper,
        h1_cls=' v7-ind-h1acc' if any('v7-ind-acc' in l for l in pg['h1']) else '',
        cta_xray=ui['cta_xray'], cta_tour=ui['cta_tour'], cta_talk=ui['cta_talk'], micro=ui['micro'],
        hurts_label=h['label'], hurts_h2=sentences(h['h2']), hurts_line=h['line'], hurts_cap=hurts_cap,
        start_h2=ui['start_h2'], cards=cards,
        control_h2=c['h2'], never_cls=' v7-ind-never' if c['never'] else '', checks=checks, control_after=after,
        security=ui['security'], field_h2=ui['field_h2'], story=story, all_industries=ui['all_industries'],
        move_h2=mask_lines(ui['move_h2']), move_p=ui['move_p'])
    main = main.replace('<!--@SPRITE-->', frag('C2.sprite.html'))
    main = main.replace('<!--@M1-->', indent(frag(pg['m1']), 4))
    main = main.replace('<!--@HURTS-->', indent(hurts_fig, 6))
    assert '<!--@' not in main, re.findall(r'<!--@[^>]*-->', main)
    assert 'field-stories' not in main
    return main


def build(lang, slug, out_dir=None):
    L = LANGS[lang]
    orig = (L['orig'] / f'{slug}.html').read_text()
    start = orig.index('<!DOCTYPE html>')
    doc = orig[start:]
    doc = head_additions(doc, L['root'])
    m0 = doc.index('<main id="main">') + len('<main id="main">')
    m1 = doc.index('</main>')
    doc = doc[:m0] + '\n' + build_main(lang, slug).strip() + '\n' + doc[m1:]
    out = (pathlib.Path(out_dir) if out_dir else L['out']) / slug / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix('.html.tmp')
    tmp.write_text(doc)
    tmp.replace(out)
    print(f'wrote {out} ({len(doc)} bytes)')


if __name__ == '__main__':
    args = sys.argv[1:]
    lang = args[args.index('--lang') + 1] if '--lang' in args else 'en'
    out_dir = args[args.index('--out-dir') + 1] if '--out-dir' in args else None
    skip = {i + 1 for i, a in enumerate(args) if a in ('--lang', '--out-dir')}
    slugs = [a for i, a in enumerate(args) if not a.startswith('--') and i not in skip] or list(PAGES[lang])
    for s in slugs:
        build(lang, s, out_dir)
