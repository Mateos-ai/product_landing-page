import pathlib
#!/usr/bin/env python3
"""Build the four Hebrew v7 industry pages, site/he/industries/<slug>/index.html (P-INDX in Hebrew).

Usage: python3 -I build-industries-he.py [slug ...] [--out-dir DIR]

The English generator (pind/build-industries.py) is imported read-only: its MAIN_TPL, helpers and head additions are
reused as they are, so the Hebrew pages have exactly the English section structure, classes and motion hooks. Only the
data differs (UI_HE, PAGES_HE below) plus the Hebrew fragments (<ID>.he.html). The English file is never written.

Per page:
  - <head> metadata, header and footer byte-for-byte from the old Hebrew page (phe/orig/industries_<slug>_index.html),
  - the three v7 head additions with ../../../assets/ paths,
  - <main id="main"> replaced; links in the old Hebrew style (../../../he/...).
"""
import html, importlib.util, pathlib, re, sys

S = pathlib.Path(__file__).resolve().parents[1]  # src/v7
SITE = S.parents[1] / 'site'  # repo/site
ORIG = S / 'phe' / 'orig'
OUT = SITE / 'he' / 'industries'
ASSETS_ROOT = '../../../'          # he/industries/<slug>/ -> site root (assets)
LINK_ROOT = '../../../he/'         # links, the old Hebrew pages' style

spec = importlib.util.spec_from_file_location('en_ind', S / 'pind' / 'build-industries.py')
EN = importlib.util.module_from_spec(spec)
spec.loader.exec_module(EN)
EN_MASK = EN.mask_lines
_hs = importlib.util.spec_from_file_location('he_text', S / 'phe' / 'he_text.py')
HT = importlib.util.module_from_spec(_hs)
_hs.loader.exec_module(HT)

# Bidi: Latin product names, IDs and money sit in <bdi> where the order could flip in an RTL line.
X = '<bdi>X-ray</bdi>'

UI_HE = {
    'stepper': [('goal', 'מגדירים יעד.'), ('flows', 'Mate בונה את התהליכים.'), ('track', 'Mate דואג שהכל מתקדם כמתוכנן.')],
    'cta_xray': 'מתחילים ב-X-ray',
    'cta_tour': 'לסיור במוצר',
    'cta_connect': 'בואו נדבר',
    'micro': f'<span class="v7-sent">אדם בכל מקום שהוא הכרחי.</span> <span class="v7-sent">{X}&nbsp;החל&nbsp;מ-990&nbsp;דולר.</span>',
    'start_h2': 'מאיפה מתחילים.',
    'field_h2': 'חדר אחד שישבנו בו.',
    'all_industries': 'כל הענפים',
    'security': 'אבטחה ובקרה',
    'move_h2': ['זאת החברה שלכם.', 'המהלך שלכם.'],
    'move_p': 'מתחילים ב-X-ray. יום אחד אצלכם, וכל תהליך מדורג לפי ההחזר שלו. החל&nbsp;מ-990&nbsp;דולר.',
}

FAST = 'פי&nbsp;10 מהר&nbsp;יותר'

PAGES_HE = {
    'insurance': {
        'name': 'ביטוח',
        'm1': 'M1.insurance.he.html',
        'eyebrow': f'ביטוח · {FAST}',
        'h1': ['מחלקת', 'התביעות קוראת.', 'ידנית.'],
        'lead': 'פתיחה, מיון, קריאה, ניסוח מכתבים. רוב היום הולך על קריאה.',
        'hurts': {
            'label': 'לאן הזמן הולך',
            'h2': ['שש תחנות.', 'אחת מהן אוכלת את היום.'],
            'line': 'קריאת התיק לוקחת פי שלושה מכל תחנה אחרת.',
            'fig': 'M16.he.html',
            'rise': False,
            'cap': 'הערכה מראיונות עם הצוות.',
        },
        'start': [
            ('doc', 'סיכומי תיק.', 'סיכום לכל תיק, לפי פרקי הפוליסה, עוד לפני שמיישב התביעות פותח את התיק.'),
            ('mail', 'מכתבי השלמה.', 'טיוטה מתוך התיק. מיישב התביעות מאשר.'),
            ('search', 'קריא או לא.', 'אילו סוגי מסמכים המערכת קוראת, בבדיקה על הקבצים שלכם, בתוך הסביבה שלכם.'),
        ],
        'control': {
            'h2': 'מה Mate לעולם לא עושה.',
            'never': True,
            'items': [
                ('מאשר או דוחה תביעה.', None),
                ('כותב למערכת הליבה שלכם.', None),
                ('עונה למבוטח לבד.', None),
                ('נוגע במקרים רגישים.', 'אתם מגדירים אותם לפני שמתחילים.'),
            ],
            'after': 'אדם מחליט. תמיד.',
        },
        'field': {
            'tone': 'ok', 'fx': 'count', 'quote': False,
            'big': '<span class="v7-fx-n">9,700 שעות</span> בשנה',
            'body': 'של קריאה ידנית של תיקים רפואיים.',
            'q': 'סוכנות ביטוח, 800 עובדים. הערכה מראיונות עם הצוות. פיילוט בביצוע.',
        },
    },
    'manufacturing': {
        'name': 'תעשייה',
        'm1': 'M1.manufacturing.he.html',
        'eyebrow': f'תעשייה · {FAST}',
        'h1': ['מפעל שרץ', 'על נייר,', 'טלפונים וזיכרון.'],
        'lead': 'אנחנו לא נוגעים במכונות. אנחנו לוקחים את ההקלדות, הטלפונים וההעתקות שמסביבן.',
        'hurts': {
            'label': 'לאן הזמן הולך',
            'h2': 'איש השטח כבר חי בוואטסאפ.',
            'line': 'כל ניסיון לפנינו ביקש מאיש השטח לשנות הרגלים. שלנו לא.',
            'fig': 'M17.he.html',
            'cap': None,
        },
        'start': [
            ('chat', 'תשובה מעל ה-ERP.', 'איש שטח שואל בוואטסאפ. התשובה מגיעה מה-ERP תוך שניות.'),
            ('inbox', 'קליטת הזמנות.', 'מעטפות, PDF ומיילים נקראים לתוך מערכת ההזמנות.'),
            ('doc', 'הצעות מחיר משרטוטים.', 'השרטוט נקרא, החלקים והפעולות מפורטים, והצעת המחיר מוכנה למתמחר.'),
        ],
        'control': {
            'h2': 'אדם מאשר כל חריג.',
            'never': False,
            'items': [('קריאה בלבד מה-ERP', None), ('שום דבר לא מוקלד בלי אישור', None),
                      ('בלי אפליקציה חדשה לאיש השטח', None), ('רץ בתוך הסביבה שלכם', None)],
            'after': None,
        },
        'field': {
            'tone': 'mate', 'fx': 'type', 'quote': True,
            'big': '“רגע, אני בודק עם המשרד.”',
            'body': 'איש מכירות, בכל שאלה על מחיר. אנחנו בונים לו את התשובה בוואטסאפ.',
            'q': 'מפעל ייצור. בפיתוח.',
        },
    },
    'construction-and-real-estate': {
        'name': 'בנייה ונדל"ן',
        'm1': 'M1.construction-and-real-estate.he.html',
        'eyebrow': f'בנייה ונדל"ן · {FAST}',
        'h1': ['הכספים', 'והשיווק <span class="v7-ind-acc">רצים</span>', '<span class="v7-ind-acc">על מסמכים.</span>'],
        'lead': 'תשלומים לספקים, מכרזים, חניות ומחסנים, ערבויות, מסירת דירות. הכול ידני.',
        'hurts': {
            'label': 'על מה שכבר יש לכם',
            # each name isolated, so the list reads right to left: Copilot, Power Automate, SharePoint
            'h2': ['<bdi>Copilot</bdi>, <bdi>Power&nbsp;Automate</bdi> ו-<bdi>SharePoint</bdi>.', 'כבר שילמתם עליהם.'],
            'line': 'בלי מסד נתונים חדש, בלי שרתים חדשים. צוות ה-IT שלכם רואה כל שלב.',
            'fig': 'M18.assign.he.html',
            'cap': None,
        },
        'start': [
            ('send', 'הודעות תשלום לספקים.', 'מייל אחד לכל ספק בכל חודש: מה שולם, מאיזו חברה, על איזה פרויקט.'),
            ('building', 'חניות ומחסנים.', 'משובצים מקבצי הבניין לפי הכללים שלכם, עם רשימת חריגים.'),
            ('shield', 'ערבויות ומסירה.', 'מעקב לכל דירה. החוסרים עולים מוקדם.'),
        ],
        'control': {
            'h2': 'אדם מאשר כל שיבוץ.',
            'never': False,
            'items': [('מוצלב מול הבנק', None), ('נשלח מהדומיין שלכם', None),
                      ('כל הודעה מתועדת ונשמרת בארכיון', None), ('בתוך סביבת מיקרוסופט שלכם', None)],
            'after': None,
        },
        'field': {
            'tone': 'you', 'fx': None, 'quote': False,
            'big': 'יומיים-שלושה. <span class="v7-ind-goal">היעד: חצי יום.</span>',
            'body': 'לשבץ חניות ומחסנים לבניין חדש אחד, ידנית.',
            'q': 'יזם נדל"ן למגורים. יעד, עדיין לא תוצאה מדודה.',
        },
    },
    'logistics-and-distribution': {
        'name': 'לוגיסטיקה והפצה',
        'm1': 'M1.logistics-and-distribution.he.html',
        'eyebrow': f'לוגיסטיקה והפצה · {FAST}',
        'h1': ['הידע שבראש', 'של אדם אחד', 'בארבע בבוקר.'],
        'lead': 'מסלולים, קיבולת, שעות קבלה, איזה נהג לאן. כשהוא לא נמצא, התוכנית פחות טובה.',
        'hurts': {
            'label': 'מציע, לא מחליט',
            'h2': 'התוכנית של מחר, מוכנה הלילה.',
            'line': 'Mate מכין את המסלולים מהכללים ומההיסטוריה שלכם. המנהל מאשר לפני שמשהו יוצא.',
            'fig': 'M18.plan.he.html',
            'cap': None,
        },
        'start': [
            ('flow', 'התוכנית היומית.', 'מוכנה כל ערב, לפי נהג וסבב, עם נימוק לכל עצירה.'),
            ('rules', 'כללים מול מציאות.', 'איפה ההיסטוריה שלכם סותרת את הכללים המוצהרים.'),
            ('inbox', 'דלפק הזמנות וגבייה.', 'שורות פתוחות, מסמכים חסרים וחשבוניות באיחור. Mate עוקב ושולח תזכורות, באישור אדם.'),
        ],
        'control': {
            'h2': 'המנהל מאשר כל תוכנית.',
            'never': False,
            'items': [('רץ בתוך הרשת שלכם', None), ('קריאה בלבד ממערכות המחסן וההפצה', None),
                      ('שום דבר לא נשלח בלי אישור של אדם', None), ('תכנון מול ביצוע, כל יום', None)],
            'after': None,
        },
        'field': {
            'tone': 'you', 'fx': 'clock', 'quote': False,
            'big': '04:00',
            'body': 'מסלולי ההפצה של מחר היו בראש של אדם אחד. המערכת שלנו בנתה את אותה תוכנית מההיסטוריה.',
            'q': 'מפיץ ציוד רפואי. אב-טיפוס שנבדק על נתוני עבר.',
        },
    },
}


# a Hebrew prefix never parts from its Latin word or number at a line break (ב-X-ray, ה-ERP, מ-990)
UI_HE = HT.nw_data(UI_HE)
PAGES_HE = HT.nw_data(PAGES_HE)


def mask_lines_he(lines, brs=()):
    """The English helper, with a space between lines (block lines: no layout change; the accessible name keeps a space)."""
    return ' '.join(EN_MASK([l], ()) for l in lines)


def build_main_he(slug):
    # Hebrew fragments have one dev comment before the <figure>: strip it (M1 fragments have none).
    real_frag = EN.frag
    EN.frag = lambda name: EN.strip_lead_comment(real_frag(name))
    EN.mask_lines = mask_lines_he
    EN.UI['he'], EN.PAGES['he'] = UI_HE, PAGES_HE
    EN.LANGS['he'] = {'orig': ORIG, 'out': OUT, 'root': LINK_ROOT}
    try:
        main = EN.build_main('he', slug)
    finally:
        EN.frag = real_frag
        EN.mask_lines = EN_MASK
    # "All industries": the hub, in the old Hebrew pages' link style
    assert main.count('href="../"') == 1
    main = main.replace('href="../"', f'href="{LINK_ROOT}industries/"')
    return main


def build(slug, out_dir=None):
    orig = (ORIG / f'industries_{slug}_index.html').read_text()
    assert orig.count('<!DOCTYPE html>') == 1 and orig.startswith('<!DOCTYPE html>')
    doc = EN.head_additions(orig, ASSETS_ROOT)
    m0 = doc.index('<main id="main">') + len('<main id="main">')
    m1 = doc.index('</main>')
    doc = doc[:m0] + '\n' + build_main_he(slug).strip() + '\n' + doc[m1:]
    # outside <main>: the old Hebrew page plus exactly the three head additions
    o0, o1 = orig.index('<main id="main">') + len('<main id="main">'), orig.index('</main>')
    outside = doc[:doc.index('<main id="main">') + len('<main id="main">')] + doc[doc.index('</main>'):]
    outside = (outside.replace(EN.GATE, '', 1)
               .replace(f'<link rel="stylesheet" href="{ASSETS_ROOT}assets/v7.css">', '', 1)
               .replace(f'<script src="{ASSETS_ROOT}assets/v7.js" defer></script>', '', 1))
    assert outside == orig[:o0] + orig[o1:], 'head/header/footer differ from the old Hebrew page'
    assert 'field-stories' not in doc[m0:doc.index('</main>')]
    out = (pathlib.Path(out_dir) if out_dir else OUT) / slug / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix('.html.tmp')
    tmp.write_text(doc)
    tmp.replace(out)
    print(f'wrote {out} ({len(doc)} bytes)')


if __name__ == '__main__':
    args = sys.argv[1:]
    out_dir = args[args.index('--out-dir') + 1] if '--out-dir' in args else None
    skip = {i + 1 for i, a in enumerate(args) if a == '--out-dir'}
    slugs = [a for i, a in enumerate(args) if not a.startswith('--') and i not in skip] or list(PAGES_HE)
    for s in slugs:
        build(s, out_dir)
