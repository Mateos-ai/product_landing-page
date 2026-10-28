# Visual direction: the next pass on mateos.ai

Scope: the Astro site in `web/`, EN and HE, light and dark, desktop and phone. This plan proposes upgrades and
does not change any code. The Mateos brand system comes first. The design references (taste skill, Linear, Stripe
and Vercel DESIGN.md, img2threejs) are there for craft and restraint. Nothing here copies another brand's look.

How this was made: `npm run build`, then dist screenshots in Chromium at 1440x900 and 390x844, for home, MateOS,
industries hub, insurance (dark), process, about, security and contact in EN, plus home and the insurance page in
HE. Each page was captured with normal motion, at a settled frame (6 s) and with `prefers-reduced-motion: reduce`.
The taste skill's review protocol was applied: inventory, argument, critique against its house rules.

## 0. The brief, inferred

- **What it is:** a service plus a product (MateOS and "Mate") for Israeli owner-led companies with 20 to 1,000
  people and no CTO. You set a number and a date, Mate builds the flows back from it, and a person stays in
  the loop.
- **What the visitor must do:** start with an X-ray (one day on site, from $990).
- **What belongs to Mateos and to no competitor** (the inventory):
  1. The reversed build: goal, then flows, then on track. Three colours carry it: amber is the person or goal,
     indigo is Mate, teal is on track.
  2. The three-dot mark, which is the same three roles. The About hero already calls it "the machine".
  3. One sentence as the spec: "Get 90% of quotes out within 4 hours by January 15."
  4. The human gate: Dana K. approves on WhatsApp.
  5. The rooms: an insurance claims desk, a distributor's 04:00 route plan, a sales rep's "Hold on, I'm checking
     with the office."
  6. Israel's non-technical industry: factories, insurers, builders, distributors. "8 use AI, 61 don't, yet."
  7. The systems the company already runs on (ERP, mailbox, WhatsApp, Excel), shown read-only.
  8. Hebrew as a first language, not a translation.
- **The idea sentence:** *On this site, the company's own number becomes the thread every section is built
  from.* The goal sentence typed in amber is that thread. The previews already do this. The marketing chrome
  around them does not yet.

## 1. Audit of today's visuals

### Strong. Keep it and build on it.

- **The animated product previews (M0 to M23, K1, T1) are the signature.** The settled hero (goal sentence,
  metric/baseline/target chips, "Mate built 7 steps", the orange Approve gate with Dana K., 51% On track) is the
  best picture on the site. It is a working-looking product with sample data that adds up, which is the
  strongest picture a software page can have. The reduced-motion final states are complete. In the "How it
  works" stepper they stack as full screens with nothing missing.
- **The colour grammar** (amber, indigo, teal mapped to goal, flows, on track), used the same way in the hero
  list, the stepper rail, the previews and the mark.
- **The About "machine" orbit**: real team photos ringed in role colours around the mark. It is the only
  place where real people and the brand idea meet.
- **"Israel first" with the 100-dot grid.** It turns a market statistic into a picture and it is specific.
- **Honest captions**: "Product preview", "Sample data", "Estimate from team interviews. Pilot in delivery."
- **The Hebrew build**: true RTL mirroring of the hero and preview, Heebo, `<bdi>` on IDs. The HE insurance hero
  reads as natively designed.
- **Type**: Bricolage at display size with tight tracking and large ratios ("Your company. 10x better.").

### Generic or templated. These are what make it read as "a SaaS site".

1. **The same page skeleton everywhere**: dark hero with the headline on the left and a preview on the right,
   then alternating text/preview bands, then the same dark "It's your company. Your move." band, then a
   sitemap footer. Home, Process, Industry, About and Security share it. Each page is good alone, but the set
   reads as one template.
2. **Small uppercase mono eyebrows above most headings.** The build has 56 `class="eyebrow"` uses (MATEOS,
   ABOUT, ISRAEL FIRST, THE WAY IN, THE BUILD, THREE STEPS...). The brand gives mono to data. An eyebrow is not
   data, and the heading under it usually says the same thing.
3. **Rows of identical cards**: the industries hub 2x2, "Four building blocks" (four icons in tinted squares),
   the six team cards and three advisor cards, the four "What we believe" cards, and the three "rooms" cards
   on home.
4. **Faint grey sketch illustrations** in "What we believe" and the first frames of the previews (grey skeleton
   bars). On a phone, or on a slow scroll, the first thing a visitor sees in the hero is a skeleton, which
   reads as "fake dashboard of grey bars". It only becomes the real preview a few seconds later.
5. **The dot-grid texture on almost every surface**: hero backgrounds, preview canvases, cards and the about
   orbit. Everywhere at once, it means nothing.
6. **No pictures of the world Mateos serves.** The only real photographs are team headshots. "Israel's
   industry to the forefront" is told in words and a dot grid, never shown.
7. **Surfaces separated by hairline plus shadow plus radius**, all at the same time, on cards at rest. Linear
   and Vercel get their calm from a tone ladder (canvas, surface-1, surface-2), with lines only where a
   table needs them.

### Where the taste skill's house rules do NOT apply (brand wins)

The taste skill bans indigo, monospace and eyebrows outright. Mateos keeps indigo (it is Mate) and JetBrains Mono
for data: IDs, timestamps, the "X-ray from $990" line and everything inside the previews, which are `data-ui`
fragments. Its "4+ real pictures" floor is used here as direction (U4), not as a gate. Its gradient and
glass bans already match the site.

## 2. Upgrades, ranked by impact over effort

Constraint for all of them: until cutover, `src/v7/parts/` must match `../src/v7/v7parts`
(`npm run check:parts`), and `npm run parity` compares `dist/` with `../site`. A change to a v7 part or to
`site.css` is an intentional divergence. Land these after cutover, or record each divergence in the parity
report. Changes to views, components and new CSS in `web/` are free.

Every upgrade has the same acceptance base: Lighthouse performance not worse than today; no CLS from it; WCAG
2.2 AA contrast in light and dark (amber text stays `#C24C00` on light); keyboard and screen-reader output
unchanged or better; `prefers-reduced-motion` and no-JS show the final state; mirrored correctly in HE (logical
properties, `<bdi>` for Latin and numbers); checked at 1440, 768 and 390.

### U1: The first frame is a real frame (high impact, low effort). Prototype now.

- **Where:** home hero (M1), industry heroes (M1 variants), MateOS hero (M0), Process hero, and every preview
  that starts from skeleton bars.
- **What changes:** before play, the preview shows a meaningful first state instead of grey bars: the goal
  sentence already set and the chips filled. The animation then plays the build (steps appear, Approve lights,
  the number moves) rather than the loading. Cap any skeleton phase at about 300 ms, or remove it. The poster
  frame and the reduced-motion frame become the same picture.
- **Why Mateos:** the goal sentence is the spec ("a number and a date"). Showing it at frame 0 is the reversed
  build itself: goal first, flows next. Today the first frame says "loading".
- **Acceptance:** a screenshot at t=0 and at t=6 s both show the goal sentence. No layout shift between them.
  The phone first screen (390x844) shows the sentence above the fold.

### U2: Mono for data only, and an eyebrow diet (medium-high impact, low effort). Prototype now.

- **Where:** all pages, the `eyebrow` class (56 uses) and the mono captions under headings ("Founded in 2026...",
  "Built in Hebrew...").
- **What changes:** remove the eyebrow wherever the heading already names the section. Where the label carries
  information, fold it into the heading or the first sentence. Keep at most one per page, the hero kicker
  where it adds a fact ("Insurance · 10x faster"). Sentence-case small notes go to Hanken at full ink-2. Mono
  stays for prices, IDs, timestamps and everything inside previews.
- **Why Mateos:** the brand rule is "JetBrains Mono for data". Mono on chrome dilutes the signal that mono
  means real numbers from your systems. With less mono outside, the previews read as more real.
- **Acceptance:** the eyebrow count drops from 56 to 10 or fewer. No heading loses its meaning. HE gets the
  same edits (Hebrew has no uppercase, so HE eyebrows are already weaker and can go first).

### U3: The goal sentence is the thread through each page (high impact, medium effort). Prototype now.

- **Where:** home "Reverse the build" statement, the industry pages and the closing CTA band on every page.
- **What changes:** each page owns one goal sentence (home: quotes within 4 h; insurance: claims answered in 2
  days; manufacturing: orders keyed same day, and so on, all already in the copy). It appears in the hero
  preview, comes back set large in amber-on-ink in the closing band ("Your number: ___. Your move."), and the
  closing band changes per page instead of repeating. The underline treatment from the preview chips
  (metric, target and date underlined) becomes the one typographic device of the marketing pages too.
- **Why Mateos:** "Start with the number" is the thesis. A page that opens and closes on its number is built
  backwards, the way the product is. A competitor cannot reuse it, because the sentence is the client's own.
- **Acceptance:** the closing band is unique per page (no two pages share a heading and line). The sentence
  is real text, not an image. The amber underline passes 3:1 against both grounds. In HE the sentence uses
  `<bdi>` for numbers and dates.

### U4: Israel's industry, shown (high impact, medium effort; needs sourcing). Decide first.

- **Where:** About "Israel first", the industries hub and the four industry heroes' second band ("the room").
- **What changes:** add real pictures of the world Mateos serves, used large and square-cornered, one per
  section. Two sources, in order:
  1. **Mateos's own photography** from X-ray days on site: hands on a dispatch board, a claims binder, a
     loading dock at 04:00. This needs the client's written consent, no faces without release, and no
     legible client data.
  2. **Open archive pictures of Israeli industry** with licences that allow commercial use (Wikimedia
     Commons, the National Library of Israel's open collections, the GPO photo archive where the licence
     allows it). For example: Haifa port, a 1950s textile mill, a kibbutz factory floor. Each one is
     downloaded into `public/`, captioned with what it is ("Haifa port, 1958"), and credited in the footer.
     They are never presented as a client.
- **Why Mateos:** "Israel's industry to the forefront" and "Three rooms we sat in" are claims about real rooms.
  Today those rooms are drawn as cards. One true picture of the room carries the claim better than any UI.
- **Acceptance:** each image is AVIF/WebP with `srcset`, at most 120 KB at 1440 wide, lazy-loaded below the
  fold with width and height set (no CLS). Alt text says what the picture shows, in both languages. A credit
  line sits in the footer. The honesty rule is unchanged: no client logos or quotes are invented, and no stock
  "business people".

### U5: One room, set large (medium impact, low-medium effort). Prototype now.

- **Where:** home "Three rooms we sat in" (three equal bordered cards with coloured top rules).
- **What changes:** break the row of equal cards. One dominant story is set at display size: "04:00",
  Bricolage at about 8vw, with its one-sentence story. The other two follow as a quieter typographic list.
  The provenance notes ("Prototype tested on past data") move from mono to the text face in ink-2. The
  role-colour top rules go. Colour comes back only as the status dot.
- **Why Mateos:** "One man's head held tomorrow's delivery routes" is the most human line on the site. It
  deserves the scale the hero gets, and it is where "a person wherever it is needed" becomes concrete.
- **Acceptance:** at most two lines per headline at every width. At 390 the large figure does not overflow,
  `clamp()` handles it. The HE version is mirrored with `<bdi>04:00</bdi>`.

### U6: Replace icon cards and grey sketches with real preview crops (medium impact, medium effort)

- **Where:** industries hub "Four building blocks" (icon-in-tinted-square cards) and About "What we believe"
  (four cards with faint grey sketch illustrations).
- **What changes:** each building block shows a small static crop of a real preview part that already exists:
  document capture from the K1 inbox, "Notify and send" from the WhatsApp thread in M-parts, "Answers over the
  ERP" from the read-only ERP table, "Plan and approve" from the human gate. Each crop carries a "Product
  preview" tag. "What we believe" becomes a typographic list of four statements, set large, with no
  illustrations.
- **Why Mateos:** a fragment of the actual product beats an icon. These parts already ship, so the cost is
  composition, not new art.
- **Acceptance:** the crops are static HTML (no extra JS), `aria-hidden` with a text equivalent, and the same
  in HE.

### U7: Surface ladder instead of line, shadow and dots everywhere (medium impact, low effort; touches site.css)

- **Where:** cards at rest site-wide, section backgrounds, the dot-grid texture.
- **What changes:** add three tone tokens per theme to `mateos-tokens.css` (canvas, surface-1, surface-2),
  using the cool neutrals that already exist, and separate cards from the ground by tone. Drop the hairline or
  the shadow on cards at rest; keep shadows only for what floats (menus, the hero preview). Keep the dot grid
  in one meaning only: the preview canvas where Mate builds flows ("the machine's workbench"). Remove it from
  page backgrounds and cards.
- **Why Mateos:** calm and restraint (the lesson from Linear and Vercel), while the colours stay amber,
  indigo and teal. When the dots only appear where Mate is building, they mean something.
- **Acceptance:** contrast between surfaces is at least 1.1:1 for edges, and text contrast is unchanged.
  Windows High Contrast / `forced-colors` keeps a visible border (`@media (forced-colors: active)`). Both
  themes are checked.

### U8: A designed close, not a sitemap (low-medium impact, low effort)

- **Where:** the footer on all pages, EN and HE.
- **What changes:** the footer opens with the wordmark and mark at full width (Bricolage, very large, ink on
  surface), followed by the page's goal sentence from U3. The four link columns stay, quieter, and lose the
  mono uppercase column titles.
- **Why Mateos:** the mark is the three roles. Ending each page on it, at scale, closes the
  goal-to-flows-to-on-track loop.
- **Acceptance:** links and their order are unchanged (parity on hrefs). The landmark is still `contentinfo`.
  The HE mirror is checked.

## 3. 3D proposal

What img2threejs is: a staged, gated pipeline that rebuilds an object from a reference image as procedural
Three.js code (TypeScript `Group` factory, no textures, no downloaded meshes). It runs from blockout to
material to lighting to optimisation, with a screenshot-review loop and a triangle budget
(`performanceBudget.targetTriangles`). The licence is Apache-2.0. Its own cost model is about 80k to 180k model
tokens per object, mostly in the review cycles. It is built for detailed objects and characters. For a mark
made of three spheres it is more process than the shape needs, but its spec and review gates are still
useful as a discipline.

Runtime cost: Three.js is not a dependency today. A tree-shaken `three` core (WebGLRenderer, scene, sphere
geometry, one physical material, no loaders or controls) is roughly 110 to 150 KB gzip. That is about the size
of all of today's v7 JS (46 KB gzip) times three. A hand-written WebGL fragment shader (signed-distance
spheres) does the same three-sphere job in about 3 to 6 KB gzip. Pick the smaller path unless the model needs
real geometry.

### 3D1: "The machine": the three-dot mark in 3D on the About hero. Prototype now.

- **Where:** the centre of the About hero orbit, which today is the flat SVG mark inside the ring of team
  photos.
- **What it is:** three satin spheres in amber, teal and indigo with a soft clearcoat. They sit in the logo
  arrangement and breathe slowly: the indigo sphere (Mate) moves first, the teal one settles (on track), and
  the amber one (the person) holds still. On pointer move, a tilt of at most 6 degrees. The ring lines to
  the team photos stay in SVG.
- **Why it earns its place:** the About page already calls the team "the machine". The mark is the only
  object Mateos owns, and the About hero is the one place without a product preview competing for attention.
  It is never placed next to a preview.
- **img2threejs approach:** reference image `public/logo.png` (or a 1024 px render of `favicon.svg`),
  `generic` profile, complexity `simple`. The quality contract fixes three components (sphere radii and
  centres measured from the SVG), PBR materials in brand hex (roughness 0.45, clearcoat 0.3, no metalness),
  one key light, one rim light and a neutral environment colour (no HDR file), and
  `targetTriangles` ≤ 6k. Use the factory it generates as the source of truth. If the review loop shows the
  same result can be drawn as an SDF shader, ship the shader and keep the spec as documentation. The review
  loop should be capped at 3 cycles.
- **Degradation:** the current SVG mark is the poster and stays in the DOM. The canvas is added only when all
  of these hold: JS is on, `prefers-reduced-motion: no-preference`, viewport ≥ 900 px,
  `navigator.connection.saveData` is not set, `deviceMemory` ≥ 4 when known, and the WebGL context is created
  successfully. Otherwise, or on context loss, the SVG remains. On phones it is always the SVG.
- **Load strategy:** a dynamic `import()` after `requestIdleCallback`, only when the hero is visible
  (IntersectionObserver), with the render loop paused off-screen and when the tab is hidden. It holds 30 fps
  at most and stops after 12 s idle (the existing pause control covers it).
- **Budget:** ≤ 8 KB gzip (shader path) or ≤ 150 KB gzip (three path, About page only, never on Home). No
  main-thread task over 50 ms. LCP unchanged, because the SVG is the LCP candidate. The canvas is
  `aria-hidden="true"` and the SVG keeps its accessible name. It is identical in RTL (the mark does not
  mirror).

### 3D2: "Your move": the mark assembling at the close (later, only if 3D1 proves the budget)

- **Where:** home only, the closing dark band "It's your company. Your move."
- **What it is:** as the band enters, three spheres drift in from scattered positions and settle into the mark
  next to the X-ray call to action. It plays once.
- **Why:** the close is the visitor's move. The pieces come together when they act.
- **Degradation, load and budget:** as in 3D1. It reuses the same module, so its own cost is close to zero.
  It is not shipped on Home if 3D1 needed the three.js path.

## 4. What NOT to do

- **Do not replace or crowd the product previews.** No 3D, video or illustration in the home, MateOS, Process
  or industry heroes. The previews are the proof.
- **Do not Apple-ify, Linear-ify or Stripe-ify.** No near-black Linear canvas as the default, no Stripe
  gradient meshes or weight-300 display, no Vercel monochrome with Geist. Borrow restraint and the tone
  ladder, not a look.
- **No gradients, glass panels, glows or blobs.** No shadows on cards at rest.
- **No stock photos of "business people",** and no AI-generated photos of factories presented as real. No
  client logos, quotes or numbers that are not real. Archive pictures are captioned as what they are.
- **Do not drop indigo or mono** because a generic rule says so. They are brand roles.
- **No scroll-jacking or pinned scenes** beyond the existing "How it works" stepper. No new motion that ignores
  reduced motion or leaves content hidden without JS.
- **No 3D on phones, and no 3D as the LCP element.** No WebGL that runs while off-screen.
- **Do not change copy, routes or class names** that the v7 parts depend on without recording the parity
  divergence.
- **Do not design EN first and "flip" HE later.** Every upgrade is reviewed in HE in the same pass.

## 5. Lab prototypes (on the Vercel preview)

The prototypes of U1, U2, U3, U5 and 3D1 are hidden pages under `/lab/`, so they can be judged on the preview
before any real page changes. They are EN only, `noindex, nofollow`, and not in the nav, the footer or
`sitemap.xml`. Each one renders a copy of a real view with one upgrade on (`src/components/lab/LabHome.astro`,
`LabIndustry.astro`, `LabAbout.astro`). The real header, footer, copy and previews stay. Every prototype has its own
component and CSS in `src/components/lab/<id>/`, scoped to classes that only lab markup carries, so nothing on the
real pages changes. The parity harness does not look at `/lab/`. The header's language switch on a lab page points
to `/he/lab/...`, which does not exist.

Start at **`/lab/`**. It links every prototype next to the live page to compare it with. Use the theme switch for
light and dark.

| Prototype | URL | What to look at |
|---|---|---|
| U1 The first frame is a real frame | `/lab/u1-first-frame/`, `/lab/u1-first-frame-insurance/` | Reload and watch the hero preview from its first frame. The goal sentence (highlights drawn) and the three chips are set at once. The steps, the "Mate is building the flows" line and the track card wait as ghosts at 36% opacity, with real titles and no grey bars. Then the steps come up to full ink top-down, and the track counts from the baseline (6%) to today (51%). Between goals the content ghosts while the next goal is typed, so no skeleton phase remains. The layout does not move. Reduced motion and no-JS show the shipped final frame. |
| U2 Mono for data only | `/lab/u2-mono-for-data/` (About), `/lab/u2-mono-for-data-insurance/` | About goes from 5 eyebrows to 0. "The founding team" becomes part of the heading: "Six founders on the machine." Insurance goes from 2 to 1: "Insurance · 10x faster" stays because it states a fact, set in Hanken. Hero micro lines, notes, the team roles, the "Goal / Flows / On track" labels and the footer column titles move from JetBrains Mono uppercase to Hanken. The 01/02/03 card numbers go. Mono remains for prices ("From $990"), IDs and everything inside a preview. |
| U3 The goal as the close | `/lab/u3-goal-close/#start`, `/lab/u3-goal-close-insurance/#start` | The closing band's heading is the page's own goal sentence from its hero preview. The number, the metric and the date carry the preview's amber underline, which draws in on reveal. Under it: "Yours: your number by your date. Your move." with blanks, then the page's own offer (home keeps the ladder and the X-ray preview). Home and insurance no longer share a closing band. The insurance sentence is read from `M1.insurance.html`, so each industry page gets its own. |
| U5 One room, set large | `/lab/u5-one-room/#field` | 04:00 in Bricolage at up to 176 px (96 px on a phone) next to its sentence at statement size. The other two rooms follow as a three-column typographic list: figure, sentence, note. The cards, top rules and mono notes are gone, and colour stays on the status dots only. The shipped clock, count-up and typing effects still run. |
| 3D1 "The machine" | `/lab/3d-machine/` | The About orbit's hub holds the mark as three satin spheres in the brand hex colours. Mate (indigo) breathes first, on track (teal) follows 0.9 s later, and you (amber) hold still. The mark tilts up to 6° toward the pointer. The orbit's pause button stops it, and so do 12 s without pointer movement. Try a window under 900 px, reduced motion or no-JS: the SVG mark stays and three.js is never downloaded. |
| All together | `/lab/all/` | Home with U1, U2, U3 and U5 on. |

### Checked

- Built with `npm run build`. Screenshots in Chromium at 1440x900 and 390x844, light and dark, at the first frame
  (U1 at 0.9 s and at the moment the preview scrolls into view), mid-animation (U1 at 2.6, 3.5, 7.5 and 8.3 s, and
  the goal change) and settled. No console errors on any lab page.
- 3D1 with a GPU (ANGLE Metal, Apple M5 Pro): 30 fps, held by the cap. Each render call takes 0.2 to 0.3 ms on
  average, and the longest frame is 3.5 to 5 ms because the shaders compile with `compileAsync`, off the first frame.
  The model has 3,648 triangles in 3 draw calls. Off-screen it renders 0 frames, and it also stops when paused and
  after 12 s idle. Pointer movement starts it again.
- 3D1 degradation, checked: under 900 px (`poster:narrow`), reduced motion (`poster:reduced-motion`), no-JS, and
  software WebGL (SwiftShader fails the `failIfMajorPerformanceCaveat` probe, giving `poster:no-webgl`). In every
  case the SVG stays and the three.js chunk is not requested. The figure's `data-lab-3d` attribute says which gate
  applied.
- 3D1 cost: the lazy chunk (three.js core plus the scene) is **131.5 KB gzip** (534 KB raw), loaded only on this
  lab page, after the hero is visible and the browser is idle. The loader is 2 KB gzip. That is inside the ≤ 150 KB
  three.js budget in section 3, but about 16x the ≤ 8 KB shader route. Vite's chunk-size warning in the build log
  comes from this chunk.
- The taste skill's inspector ran on `/lab/u5-one-room/`. Its FAILs are about the page around the prototype: the
  previews' shadows, hairlines and mono (brand and `data-ui` exceptions), the home eyebrow that U2 removes, and
  "few pictures" (U4). One FAIL is an artifact of the effect: it reads the typing effect's hidden copy and counts
  the quote as 3 lines, while the screenshots show 2. The lab strip's link contrast was fixed after its report.

### 3D1 build record (img2threejs)

The run used profile `generic`, complexity `simple` and reference `public/logo.png`. The state file and the sculpt
spec were kept outside the repo.

- Image analysis: three equal discs (r 27 in a 200 box) at (130,70) amber, (70,130) teal and (130,130) indigo,
  with a 6-unit gap. The identity is the L layout, the equal radii, the equal gaps and the exact hues. The logo is
  flat, so depth is a stylization: all three spheres sit on z = 0.
- Spec: a root group and three `sphere` components (r 0.27, centres 0.6 apart). `MeshPhysicalMaterial` in brand hex
  with roughness 0.45, metalness 0, clearcoat 0.3 and clearcoat roughness 0.35. A key light, a lavender rim and a
  hemisphere fill, with no HDR. Neutral tone mapping, because ACES shifts amber and indigo. `targetTriangles` 6,000
  and 3 draw calls. Base validation passes.
- The strict-quality gate and the generated factory were **not** used. The strict gate requires texture frequency
  bands, roughness maps and reference PBR from pixels, which a flat brand colour does not have, and the factory
  generator only writes after strict passes. The factory was written by hand from the spec instead:
  `src/components/lab/machine/mark-model.js` (`createMateosMarkModel`, with the data in `MARK_SPEC`). Steps that do
  not apply were recorded as skipped, with reasons, in the local state.
- Review loop, capped at 3. Cycle 1: the hues read too dark and the mark sat small in the hub. Cycle 2: frontal
  lighting, a closer camera, and the shader compile moved off the first frame. Cycle 3: physical light intensities
  (three's Lambert is albedo / π). The final isolated render matches the layout, the equal radii and the gaps.
  **Still not matched:** indigo reads a little bluer than `#5B53E8` on its shaded side, and amber reads deeper than
  `#FF8C42` toward its lower edge. The lit centres are close. The deterministic silhouette gate cannot measure this
  subject: its mask keeps only the largest blob and drops two of the three dots, so it reports IoU 0. Its result was
  recorded and not used for the decision. The multi-angle, part-coverage and emission steps were not run.
- Recommendation: if 3D1 is approved, ship it as the ≤ 8 KB SDF shader with the same spec (three spheres, the same
  lights and materials). The model needs no real geometry, and that saves about 125 KB gzip.
