# Design review: mateos.ai (Astro build, `web/dist`), the design review

This is an accessibility and craft review of the Astro build in `web/`. It uses the Apple design skill (`apple-design`),
adapted for a responsive marketing website. As the skill says for web apps, the review applies Apple's design
principles and foundations (accessibility, color, typography, layout, motion, writing). It does not apply Apple's
platform conventions such as tab bars, menu bars or sheets. Where a rule needs a web measure, the WCAG 2.2 AA
equivalent is used. The Mateos brand system comes first: no finding asks for an "Apple look".

- **Build reviewed:** `npm run build` on branch `site-v7-motion` (31 pages), served locally from `web/dist`.
- **Coverage:** 29 pages (14 page types in EN and HE, plus `/404.html`) at 1440x900 and 390x844, in light and
  dark. Automated passes ran in Chromium with `reducedMotion: reduce`, so every mock is measured in its final state.
  A separate pass ran with motion on.
- **What was measured:**
  - **Contrast:** computed for every visible text node, using the actual computed colors with opacity composited.
    When the background was an image, gradient or overlay, the background was sampled from a pixel screenshot taken
    with the text hidden.
  - **Tap targets:** the bounding box of every interactive element at 390px.
  - **Keyboard:** up to 220 Tab presses per page, recording the order and the computed focus style of each stop.
  - **Screen-reader structure:** headings, landmarks, accessible names, figures and captions, form labels and
    duplicate IDs.
  - **Text size:** browser zoom, emulated as the viewport at 720px (200% of 1440) and 320px (400% of 1280, the WCAG
    reflow width), plus a text-only zoom with `html{font-size:200%}`.
  - **Motion:** loops, pause controls, reduced-motion states and animation durations.
- **HIG files opened and cited:** `accessibility.md`, `typography.md`, `color.md`, `layout.md`, `dark-mode.md`,
  `motion.md`, `branding.md`, `buttons.md`, `voiceover.md`, `writing.md`.

Contrast ratios are WCAG 2.x relative-luminance ratios. "Pass" means 4.5:1 for text under 24px (or under 18.66px
bold), 3:1 for larger text, and 3:1 for focus indicators and control boundaries.

## Summary

**Overall rating: Critical issues.** One finding is Critical: in light mode, the keyboard focus ring on the header,
footer and contact form is effectively invisible. It is easy to fix. Everything else is High or lower, and the site
is close to **Good**.

- **Thesis:** "Give Mate a number and a date, and watch it run." Every page shows the product doing that.
- **What it will be remembered by:** the live product previews. They play a goal into flows and back to "On track",
  with one color grammar throughout: amber for people, indigo for Mate, teal for on track.
- **Structure:** solid. Every page has one `h1`, no skipped heading levels, a skip link, labelled landmarks and
  labelled inputs. Every mock is `aria-hidden` + `inert` and carries an sr-only caption that describes it.
- **Reduced motion and no-JS** both land on final states. Every looping preview has a pause control.

## Critical

### C1. Site focus ring is invisible in light mode and too faint in dark mode
- **What:** the site-wide focus style in `public/assets/site.css` is
  `:focus-visible{outline:none;box-shadow:var(--focus)}`.
  - Light: `--focus` is `0 0 0 4px #FFEDE1` on `#FFFFFF`, which is **1.14:1**.
  - Dark: `rgba(255,140,66,.35)` composited on `#14141E` is `#663E2B`, which is **1.99:1**.
  - Affected: the skip link, brand, the 5 nav links, the Industries chevron, the language switch, the theme toggle,
    the header CTA, every footer link (13), the contact form inputs and the FAQ `summary` items. That is 25 of 32
    focus stops on the home page and all 34 on the contact page.
  - Forced-colors mode (Windows High Contrast) removes `box-shadow`, so there the ring disappears completely.
  - The v7 sections already do this right: `outline:2px solid` amber-700, 4.28:1 on white, or amber-400, 9.45:1 on
    `#14141E`.
- **Why:** `accessibility.md › Speech`: "Let people use the keyboard alone to navigate and interact with your app."
  `accessibility.md › Vision`: "Strive to meet color contrast minimum standards." A focus position you cannot see
  breaks keyboard use (WCAG 2.4.7, 1.4.11).
- **Fix (in `public/assets/site.css`):** replace the ring with the v7 outline:
  `:focus-visible{outline:2px solid #C24C00;outline-offset:2px;box-shadow:none;border-radius:var(--radius-sm)}`
  and `[data-theme=dark] :focus-visible{outline-color:var(--amber-400)}`. That gives 4.85:1 on white, 4.54:1 on
  `#F7F7FB` and 9.45:1 on `#14141E`.
  - For the form fields (`.field input:focus, .field textarea:focus`), keep the amber border and add
    `outline:2px solid #C24C00;outline-offset:1px`. The amber-400 border alone is only 1.94:1 on white.
  - Parity screenshots do not show focus, so pixel parity is not affected.

## Improvements

### H1. "From $990" price tag fails contrast in light mode (High)
- **What:** `/how-we-work/` and `/he/how-we-work/`, `.v7-hww-stop[data-tone=you] .v7-hww-tag` (12px/500) is
  `#C24C00` on `--amber-100 #FFEDE1`, which is **4.26:1**. It needs 4.5:1. The text is a price, which is exactly the
  kind of information that has to be readable.
- **Why:** `accessibility.md › Vision`, the contrast table: "Up to 17 pts, All, 4.5:1".
- **Fix (in `src/v7/parts/P-HWW.css`):** in light mode only, set the tag's text to `var(--amber-800)` `#8F512E`
  (**5.45:1** on `#FFEDE1`). Dark mode already passes. A brand-palette alternative is to keep `#C24C00` on
  `--amber-50 #FFF7F2` (4.58:1). Expect a small parity pixel diff on that tag.

### H2. Mobile menu and Industries submenu lose keyboard focus on Escape (High)
- **What:** `site.js` hides the open menu on Escape but leaves focus on the link that is now hidden:
  - Mobile: opened with Enter on the Menu button, then Tab to `Insurance`, then Escape. Focus stays on
    `.m-sublink` inside `#mobile-menu[hidden]`.
  - Desktop: the same happens with `.nav-sublink` after Escape.
  - In both cases the next Tab starts from an element that is not on screen.
- **Why:** `voiceover.md › Navigation`: "Inform VoiceOver when visible content or layout changes occur." Also
  `accessibility.md › Speech`, on keyboard-only use.
- **Fix (in `src/scripts/site.js`):** on Escape, if `#mobile-menu` was open, call `.menu-btn.focus()`. If a
  `.nav-sub` was open and focus is inside it, focus its `.nav-more` button. Click behavior is unchanged.

### H3. Hebrew pages announce English landmark names and garble the footer legal lines (High)
- **What:** on every `/he/` page, the landmarks are `<nav aria-label="Main">` and `<nav aria-label="Footer">`
  (`src/i18n/he/common.json` keys `navLabel` and the footer `label`). A Hebrew screen-reader user hears English
  landmark names.
  - The footer lines `© 2026 Mateos AI, Inc. כל הזכויות שמורות.` and `Mateos AI, Inc., חברה רשומה…` are rendered
    without `<bdi>`. In RTL the Latin run's trailing period and the year reorder, so the line displays as
    "© Mateos AI, Inc 2026." (seen in the 390px dark screenshot).
- **Why:** `voiceover.md › Navigation`: "Use titles and headings to help people navigate your information
  hierarchy." `writing.md › Getting started`: "Write for everyone… with accessibility and localization in mind."
  The README's own Hebrew rule says to wrap Latin words, numbers and IDs in `<bdi>`.
- **Fix:**
  - Set HE `navLabel` to `"ראשי"` and the footer `label` to `"כותרת תחתונה"`. These are suggested wording for
    labels that only screen readers hear. The founder can adjust them.
  - Wrap the Latin runs in `<bdi>` (`<bdi>© 2026 Mateos AI, Inc.</bdi> כל הזכויות שמורות.`, and
    `<bdi>Mateos AI, Inc.</bdi>, חברה רשומה…`).
  - Render `footer.legal` and `footer.copy` with `set:html` in `Footer.astro`.
  - The English text is unchanged.

### M1. Small v7 text ignores the browser's default font-size setting (Medium)
- **What:** browser zoom works well. There is **no horizontal overflow at 720px or 320px** on any of 17 pages
  checked. The only overflow at 320px is the product-tour tab strip on `/mateos/`, which is a deliberate
  `overflow-x:auto` `role=tablist`.
  - With the user's default font size raised (`html{font-size:200%}`), body copy and leads scale, but these do not:
    - `.v7-label` (12px)
    - `.v7-micro` (12.5px)
    - `.v7-story-q` (12px)
    - `.v7-hww-fine` (12px; 13px in HE)
    - the HE `.v7-label` (13px)
  - On the home page, 41 of 78 sampled text elements scaled. The rest are display headings capped by px `clamp()`,
    which is acceptable at 52 to 88px, and the px microcopy above. That microcopy is the smallest text on the site,
    so it is the text that most needs to grow.
- **Why:** `accessibility.md › Vision`: "Support larger text sizes… enlarge text by at least 200 percent."
  `typography.md › Supporting Dynamic Type`: "Make sure your app's layout adapts to all font sizes." On the web, the
  equivalent of Dynamic Type is the user's default font size.
- **Fix:**
  - `C2.css`: `.v7-label{font-size:.75rem}`, `.v7-micro{font-size:.78125rem}`, and
    `html[lang=he] .v7-label{font-size:.8125rem}`.
  - `P-HOME.css`: `.v7-story-q{font-size:.75rem}`.
  - `P-HWW.css`: `.v7-hww-fine{font:400 .75rem/1.5 var(--font-mono)}`.
  - `P-HE2.css`: `.v7-hww-fine{font-size:.8125rem}`.
  - These are identical at the default 16px, so parity holds. Mock interiors can stay in px, because they are
    `aria-hidden` illustrations that browser zoom still scales.

### M2. Touch targets in the header and footer are under 44px (Medium)
- **What:** at 390px:
  - Header: theme toggle **36x36**, Menu button **40x40**, language switch **57x35**, brand link **119x29**.
  - Footer: every link is **20px** tall (22px in HE) on a 34px vertical pitch, so they meet WCAG 2.5.8 AA only
    through its spacing exception.
  - The contact page's `hello@mateos.ai` link is 119x21.
  - Preview pause buttons are 32x32.
  - All are above Apple's 28pt minimum and below its 44pt default.
- **Why:** `accessibility.md › Mobility`: "Offer sufficiently sized controls… iOS, iPadOS 44x44 pt default, 28x28 pt
  minimum." `buttons.md › Best practices`: "include enough space around a button."
- **Fix (no visual change):**
  - Inside `@media (pointer:coarse)`, add `position:relative` and a `::after{content:"";position:absolute;inset:-4px}`
    hit-area extension to `.theme-toggle`, `.menu-btn`, `.lang` and `.v7-pause`. This takes them to 44px (40 to 44
    for the pause button). It is invisible and does not move the layout.
  - For footer links, use `display:inline-block;padding-block:7px;margin-block:-7px`, which makes them 34px tall
    with identical layout.

### M3. The Industries chevron button has the same name as the link beside it and no `aria-controls` (Medium)
- **What:** in the header, `<button class="nav-more" aria-label="Industries" aria-expanded>` sits next to
  `<a>Industries</a>`. A screen reader hears "Industries, link" and then "Industries, button, collapsed", with no
  hint of what the button does. The button also has no `aria-controls`.
- **Why:** `voiceover.md › Descriptions`: "Provide alternative labels for all key interface elements."
  `writing.md › Best practices`: "When labeling buttons and links, it's almost always best to use a verb."
- **Fix (in `Header.astro`):** add `aria-controls={`menu-${it.menu}`}` and an aria-label built from a new common
  key, e.g. EN `"Industries pages"` / HE `"עמודי ענפים"`. The new strings are only heard by screen readers and the
  founder can adjust them.

### M4. The mobile menu does not mark the current page (Medium)
- **What:** the desktop nav sets `aria-current="page"`, but the mobile menu's `.m-link` and `.m-sublink` only get
  the visual `.is-active` class. On a phone, a screen-reader user is not told where they are (0 `aria-current` in
  `#mobile-menu`).
- **Why:** `voiceover.md › Navigation`, on helping people know where they are in the information hierarchy.
- **Fix (in `Header.astro`):** add the same
  `aria-current={here === it.href ? 'page' : undefined}` (and the same for `c.href`) to the mobile links.

### M5. Muted microtext inside product previews is below 4.5:1 (Medium, judgment)
- **What:** inside the previews, several states are dimmed on purpose:
  - Older phone messages in M7: `.m-phone-old` at 0.55 opacity. 12.5px text is 4.05:1; 11px timestamps are
    2.32:1 in light and 2.9 to 3.0:1 in dark.
  - The goal breadcrumb separator in M3: 2.33:1.
  - Older audit-log rows on `/security-and-control/`: `.v7-sec-row:not(.is-new){opacity:.72}`. Timestamps are
    3.1:1 in light and 3.8 to 4.2:1 in dark; the actor and action text is 3.5 to 4.0:1.
  - Inactive buttons in M11: `.v7-fbtn.is-disabled` at 0.5 opacity, 1.96 to 4.29:1.
  - Inactive controls are exempt under WCAG. Every preview is `aria-hidden`/`inert` and has a full sr-only
    caption, so screen-reader users lose nothing. Low-vision readers do see these pixels.
- **Why:** `accessibility.md › Vision`, the contrast table. `dark-mode.md › Dark Mode colors`: "strive for a
  contrast ratio of 7:1, especially in small text."
- **Fix (option, not applied):** raise the old-row and old-message dimming from 0.72 and 0.55 to about 0.85, and
  drop the extra opacity on `.m-phone-meta` and `.v7-sec-t`. That would bring the timestamps to at least 4.5:1. The
  trade-off is that the "new versus settled" hierarchy in the motion design gets flatter. This is the founder's or
  designer's call.

### L1. No reduced-transparency answer for the sticky header blur (Low)
- **What:** `.site-header{background:var(--nav-bg);backdrop-filter:blur(14px)}`. The background is 86 to 88%
  opaque, so the text stays legible, but no `prefers-reduced-transparency` branch exists. There is also no
  `prefers-contrast: more` branch anywhere. `forced-colors` is handled in M15, M21 and T1 only.
- **Why:** `accessibility.md › Cognitive`, on reducing motion and transparency effects ("Avoiding animating into
  and out of blurs"). `dark-mode.md › Best practices`: "Test your content… with Increase Contrast and Reduce
  Transparency turned on."
- **Fix:** add
  `@media (prefers-reduced-transparency: reduce){.site-header{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--surface)}}`.
  A `prefers-contrast: more` theme is a separate design decision and is not proposed here.

### L2. The footer tagline differs from the hero promise (Low, copy)
- **What:** the home hero says "Your company. 10x better." The footer on every page says "It's your company. 10x
  faster." (HE: "זאת החברה שלכם. מהירה פי 10."). The OG image alt text uses the footer line.
- **Why:** `writing.md › Best practices`: "Build language patterns. Consistency builds familiarity."
- **Fix:** none applied. This is founder copy. Flagged so the choice is deliberate.

### L3. The Hebrew OG image alt text is in English (Low)
- **What:** HE `meta.ogImageAlt` is "Mateos. It's your company. 10x faster."
- **Fix:** keep it if the shared image itself is English. Otherwise add a Hebrew alt with the Hebrew image. This is
  a founder decision.

### L4. The token file's comment overstates amber-700 contrast (Low, outside `web/`)
- **What:** `mateos-tokens.css` sets `--color-primary-text: var(--amber-700)` with the comment "accessible on
  white". `#B66535` on white is **4.28:1**, which fails for body-size text. The built site already overrides it to
  `#C24C00` (4.85:1), so nothing on the site is affected.
- **Fix:** update the token source of truth when the brand file is next revised. This review does not touch it.

## Craft notes

- **Point of view (strong).** The site is not a template. It avoids all three of the looks that currently dominate
  generated sites:
  - no cream with a serif and a terracotta accent;
  - no near-black with a single acid accent;
  - no broadsheet of hairline rules.
  - Its identity comes from the product itself: real-feeling previews with `Product preview`, `Example` and
    `Sample data` tags, and one strict color grammar (amber for you, indigo for Mate, teal for done). Bricolage
    display type carries the brand voice. JetBrains Mono is kept for data, which is "structure that encodes
    information" (the skill's craft lens).
- **Restraint (Medium, judgment).** On the home page, the three-step promise appears three times before the reader
  reaches "How it works": as the hero bullets, as the giant "Set the goal. / Mate builds the flows. / Mate keeps
  you on track." list, and as the three step headers. `branding.md` and the Simplicity principle ask "has every
  element earned its place?". The giant list is the one candidate to remove. This is a taste call and is not
  applied.
- **Eyebrow "MATEOS" on the home hero (Low, judgment).** It repeats the logo directly above it. `branding.md ›
  Best practices`: "Resist the temptation to display your logo throughout your app." It is harmless, and it could
  carry information instead (for example the category). Not applied.
- **Small truncation in M7 (Low).** In the phone quote card, "safety gloves M" and the "09:4" timestamp are clipped
  by the overlapping audit card at 1440px. A 4 to 8px nudge of the audit card, or an ellipsis, would look finished.
  This is a craft fix in a motion part, so it is left for a designer pass.

## What works (keep these)

- **Preview accessibility pattern.** Every mock root is `aria-hidden="true" inert` inside a `<figure>` with a
  precise sr-only `<figcaption>` ("Product preview: …"). This is exactly `voiceover.md › Descriptions`: "Describe
  meaningful images". It keeps decorative UI out of the screen-reader path.
- **Motion system.** It honors `prefers-reduced-motion`: 0 running animations and every mock is `final` with
  reduce on. Every looping preview has a localized pause button ("Pause animation" / "השהיית האנימציה").
  Previews pause offscreen, and blinking carets stop when a mock finishes. Animations are short: site
  transitions are 0.15 to 0.6s, and mock micro-loops are 0.9 to 2s. This meets `motion.md › Best practices`:
  "Make motion optional" and "Let people cancel motion".
- **Product tour tabs.** These are proper ARIA tabs: roving `tabindex`, arrow-key selection, `aria-selected` and
  `aria-controls`, and 6 tabpanels.
- **Structure.** One `h1` per page, no skipped heading levels on 29 pages, a skip link to `#main`, one each of
  `header`/`main`/`footer`, labelled navs, no unnamed controls, no images without `alt`, and no duplicate IDs.
- **Contact form.** Every field has a visible `<label>`, with `autocomplete="email"`/`organization`. The
  honeypot is `aria-hidden` with `tabindex=-1`. Success uses `role=status` and errors use `role=alert`.
- **Contrast of the brand system.** `#C24C00` amber text is 4.85:1 on white and 4.54:1 on `#F7F7FB`. Muted text
  `#62627A` is 5.92:1. In dark mode, amber-400 is 9.45:1 and neutral-400 is 7.12:1. Apart from H1, every text node
  outside the previews passes in both modes. (The `.ai` in the wordmark is part of the logotype, and logotypes are
  exempt.)
- **Reflow.** No horizontal scroll at 720px or 320px in EN or HE.

## Platform notes (web)

- **Appearance toggle.** `dark-mode.md › Best practices` says "Avoid offering an app-specific appearance setting".
  That advice is for native apps. On the web, the site follows the system by default
  (`prefers-color-scheme`, with no stored choice) and the toggle only overrides it, which is a common and
  reasonable pattern. Keep it.
- **Apple platform conventions do not apply.** Tab bars, toolbars, sheets, menu bar and Liquid Glass were
  intentionally not reviewed.
- **Browser coverage.** All audits ran in Chromium. Before the cutover, spot-check C1, H2 and M2 in WebKit
  (Safari, iOS).

## Applying the fixes

- **Objective and brand-safe, proposed to apply now:** C1, H1, H2, H3, M1, M2, M3, M4 and L1.
- **Left for the founder, as taste or copy decisions:** M5, L2, L3, the restraint and eyebrow notes, and the M7
  nudge.
- **Outside `web/`:** L4.
- **After applying:**
  - Run `npm run build && npm run parity`. Expect intended pixel diffs only on the H1 tag and the HE footer lines
    (H3).
  - `npm run check:parts` will list the edited v7 parts (C2, P-HOME, P-HWW, P-HE2) as differing from
    `../src/v7/v7parts`. That is expected now that design work happens only in `web/`.

## Applied (2026-10-28)

Applied: C1, H1, H2, H3, M1, M2, M3, M4 and L1. Everything was done in `web/` only, for EN and HE. M5, L2, L3, L4, the
craft notes and the M7 nudge were not applied (see "Applying the fixes").

| ID | What changed | Before | After |
|---|---|---|---|
| C1 | `public/assets/site.css`: `:focus-visible` now uses `outline:2px solid #C24C00; outline-offset:2px; box-shadow:none`, and dark mode uses `outline-color: var(--amber-400)`. The contact form fields keep the amber-400 border and add a 2px outline at offset 1px, amber-400 in dark mode. | ring 1.14:1 light, 1.99:1 dark; no ring in forced colors | 4.85:1 on white (4.54:1 on `#F7F7FB`), 9.45:1 on `#14141E`; an outline, so it stays visible in forced colors |
| H1 | `P-HWW.css`: the `.v7-hww-stop[data-tone=you] .v7-hww-tag` text is `var(--amber-800)` in light mode, with an explicit dark rule that keeps `--v7-you-ink` (amber-400). | `#C24C00` on `#FFEDE1`, 4.26:1 | `#8F512E` on `#FFEDE1`, 5.45:1 (dark unchanged) |
| H2 | `src/scripts/site.js`: on Escape, focus goes back to `.menu-btn` if the mobile menu was open, or to the submenu's `.nav-more` if focus was inside an open `.nav-sub`. | focus left on a hidden link | Chromium and WebKit: focus on `menu-btn` with the menu hidden. Chromium: focus on `nav-more` (`aria-expanded=false`). |
| H3 | `he/common.json`: `navLabel` is "ראשי" and `footer.label` is "כותרת תחתונה". `<bdi>` wraps "Mateos AI, Inc." in `footer.legal` and "© 2026 Mateos AI, Inc." in `footer.copy`. `Footer.astro` renders both with `set:html`. | English landmark names; "© Mateos AI, Inc 2026." scrambled in RTL | Hebrew landmark names; both lines read correctly in RTL. The EN HTML is unchanged. |
| M1 | px to rem: C2 `.v7-label` `.75rem`, `.v7-micro` `.78125rem`, HE `.v7-label` `.8125rem`; P-HOME `.v7-story-q` `.75rem`; P-HWW `.v7-hww-fine` `.75rem`; P-HE2 HE `.v7-hww-fine` `.8125rem`. | fixed 12px at a 32px browser default | 12px at 16px (no pixel change), 24px at 200% |
| M2 | `site.css`, inside `@media (pointer:coarse)`: `.theme-toggle`, `.menu-btn` and `.lang` get `position:relative` and an invisible `::after{inset:-4px}`. Footer links get `position:relative` and an `::after{inset:-7px 0}` hit strip. `.v7-pause` was left as it is, because C2 already gives it a 46x46 `::before` hit area. | toggle 36x36, Menu 40x40, language switch 57x35, footer links 20px tall | 44x44, 48x48, 65x43, footer links 34px tall (neighbours overlap by 6px, so each link has at least a 28px pitch). Nothing moves visually. |
| M3 | `Header.astro`: `.nav-more` has `aria-controls="menu-industries"` and `aria-label` from the new `common.navMoreLabel` key. | "Industries" twice | "Industries pages" / "עמודי ענפים" |
| M4 | `Header.astro`: `.m-link` and `.m-sublink` set `aria-current="page"` on an exact route match. | visual only | e.g. `/industries/insurance/`: the Insurance `.m-sublink` has `aria-current="page"` |
| L1 | `site.css`: `@media (prefers-reduced-transparency: reduce)` turns off the header blur and uses `background: var(--surface)`. | 14px blur always | no blur, solid surface (checked in Chromium by emulating the media feature) |

A note on M2: the first version (footer links set to `display:inline-block` with padding and a negative margin) made
the mobile pages 4 to 5px taller, because of baseline and strut effects. It was replaced with the `::after` strip,
which does not change layout.

**Verification** (`npm run build`, `npm run parity` on all 31 paths, then Playwright in Chromium and WebKit):

- **Parity:** 27/31 pass the 0.05% tolerance. The only pixel differences are the intended ones:
  - All EN pages are 0% in every mode, except `/how-we-work/`: d-light 0.0013%, m-light 0.0037% and d-nojs 0.0013%.
    That is the "From $990" tag (H1) and appears only in light mode; dark is 0%.
  - All `/he/` pages show the footer's two lines re-ordered by `<bdi>` (H3). The diff images contain nothing else.
    On short pages the footer is a larger share of the page, so four of them go over the 0.05% tolerance:
    `/he/accessibility/` m 0.125%, `/he/privacy/` m 0.089%, `/he/contact/` m 0.086% and `/he/careers/` m 0.079%.
    The rest are 0.008 to 0.043%.
  - `/he/how-we-work/` also includes the H1 tag in light mode.
  - text/meta: equal on every page. Landmark labels are attributes, so they are not part of `<main>` text.
  - Console: 0 errors, 0 failed requests.
- **Reduced motion and no-JS:** the parity shots are taken with `reducedMotion: reduce`, and `d-nojs` matches as
  above.
- **RTL:** `/he/` has `dir=rtl`. The nav is labelled "ראשי" and the footer nav "כותרת תחתונה". In the screenshots,
  the footer's legal and copyright lines read correctly.
- **`npm run check:parts`:** lists C2, P-HE2, P-HOME and P-HWW as differing from `../src/v7/v7parts`. That is
  expected, since the live `site/` and `src/v7` were not touched.
  Later (2026-10-28, parity with the K2 homepage): the H1 and M1 part edits moved to `src/v7/web-patches.mjs`, which
  applies them while assembling, so `parts/` is a byte copy of `../src/v7/v7parts` again and `check:parts` reads in sync.
- **WebKit:** C1 (outline color in both modes), the H2 mobile Escape and the M2 hit areas were confirmed. WebKit does
  not move focus to links on Tab by default, so the desktop Industries Escape was checked in Chromium only.
