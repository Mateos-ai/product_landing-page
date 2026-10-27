# Hebrew v7: glossary and rules (from the founder's existing Hebrew site and his edits)

**Voice:**
- Second person plural (אתם / שלכם), short and direct, like the current Hebrew site.
- No exclamation marks.
- Natural Israeli business Hebrew, not a literal translation. Each English line is a meaning to carry, not words to map.

## Names and terms

**Kept in Latin letters, inside `<bdi>`, or with natural bidi placement:**
- MateOS (the product)
- Mate (the agent; it takes masculine verbs: "Mate בונה")
- X-ray
- ERP
- WhatsApp: use **וואטסאפ** in running copy, as the existing site does; Latin is fine inside mocks next to logos-like chips
- Excel / אקסל: use אקסל in copy
- Copilot, Power Automate, SharePoint
- KPI, CTO, CEO
- SKU codes, IDs (Q-1042, R-01), times and money

**Company name in Hebrew copy:** **מתאוס**.

**Glossary:**

| English | Hebrew |
|---|---|
| Start with an X-ray | **מתחילים ב-X-ray** |
| Talk to us first | **קודם מדברים** |
| Take the tour | **לסיור במוצר** |
| From $990 | **החל מ-990 דולר** |
| Pilot | **פיילוט** |
| Processes on MateOS | **תהליכים על MateOS** |
| Scoped per process | **מתומחר לפי תהליך** |
| owner-led companies | **חברות בבעלות יזם** |
| the owner | **בעל העסק** |
| a person approves every output | **אדם מאשר כל פלט** |
| Mate proposes. Your people approve. | **Mate מציע. האנשים שלכם מאשרים.** |
| Read-only | **קריאה בלבד** |
| red lines | **קווים אדומים** |
| stop rule | **כלל עצירה** |
| success bar | **רף הצלחה** |
| Exceptions | **חריגים** |
| exception desk | **דלפק חריגים** |
| Rules | **כללים** |
| Audit / audit trail | **תיעוד מלא** / **יומן פעולות** |
| Goal | **יעד** |
| Flows | **תהליכים** (or **זרימות** inside the app UI, if clearer) |
| On track | **כמתוכנן** |
| At risk | **בסיכון** |
| Baseline | **נקודת פתיחה** |
| Target | **יעד** |
| Forecast | **תחזית** |
| Product preview | **תצוגה מקדימה של המוצר** (short tag: **תצוגה מקדימה**) |
| Sample data | **נתונים לדוגמה** |
| Example | **דוגמה** |
| Estimate | **הערכה** |
| Your company | **החברה שלכם** |
| Israel CBS | **הלמ"ס** |
| Israel's Privacy Amendment 13 | **תיקון 13 לחוק הגנת הפרטיות** |
| Field stories | removed. **One room we sat in** = **חדר אחד שישבנו בו** |
| Industries | **ענפים** |
| How we work | **איך אנחנו עובדים** |
| Security and control | **אבטחה ובקרה** |
| About | **אודות** |
| It's your company. Your move. | **זאת החברה שלכם. המהלך שלכם.** |

**Sample people:**
- Dana K. → **דנה ק.**
- Yossi M. → **יוסי מ.**
- Noa S. → **נועה ס.**
- "You" as approver → **אתם**; "Approved by you" → **אושר על ידיכם**

**Team (founder-approved, copy verbatim from the current `he/about`):**
- David is **דיוויד רייכר**.
- Titles: **שותף-מייסד ומנכ"ל**, **שותף-מייסד וסמנכ"ל טכנולוגיות**, **סמנכ"ל פיתוח עסקי**, **סמנכ"לית תפעול**, **סמנכ"ל שיווק**, **ראש תחום הנדסה**.
- Section label **הצוות המייסד**.

## Core lines (keep consistent everywhere)

- Hero: **הופכים את סדר הבנייה.** / **פי 10 מהר יותר.**
- Stepper:
  1. **מגדירים יעד.**
  2. **Mate בונה את התהליכים.**
  3. **Mate דואג שהכל מתקדם כמתוכנן.**
- K1 flip:
  - **Old way: קונים כלים. משרטטים תהליכים. מקווים שהמספר יזוז.**
  - **הדרך של MateOS** (then the three stepper lines)
  - Caption: **המספר מגיע ~~אחרון.~~ ראשון.**
- Gap stats:
  - **61% מהעסקים בישראל עדיין לא משתמשים ב-AI.**
  - **76% מהם אומרים שזה לא רלוונטי לעסק שלהם.**
  - Source **הלמ"ס, מרץ ויוני 2026**
- The `/he/` home "All industries" link: **כל הענפים**

## Rules
- FOUNDER CORRECTION (27 Oct): "on track" is **כמתוכנן**, never "במסלול". The stepper line is **Mate דואג שהכל מתקדם כמתוכנן.** Status pills read **כמתוכנן**.

- **RTL:**
  - `<html lang="he" dir="rtl">` is already in the originals.
  - Use logical CSS properties.
  - Numbers, percentages, IDs, times, Latin words and money go inside `<bdi>` where order could flip.
  - Typed (animated) Hebrew text must type in reading order.
  - Arrows and progress directions mirror.
- **Fonts:** Hebrew uses Heebo (`site.css` already sets `--font-display` and `--font-body` for `html[lang=he]`). Make sure the v7 type (`--v7-*` tokens, mono labels) looks right in Hebrew:
  - no letter-spacing on Hebrew
  - no uppercase transforms (they do nothing in Hebrew, but the mono font has no Hebrew glyphs, so use Heebo for Hebrew labels)
- **Never on the site:** no internal notes or meeting dates, no client names or counts, no pricing beyond "X-ray from $990" and "scoped per process". The same rules apply to English.
