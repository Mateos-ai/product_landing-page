# v7 parts: conventions, API and lab (foundation: C1, C2, M0)

Everything here builds into `site/assets/v7.css` and `site/assets/v7.js` through
`scratchpad/assemble.sh` (order: C1 C2 M0 M1 M3 … M15 K1 S1 T1 P-HOME P-PROD, then `ZZ-boot.js` last).
The spec (`scratchpad/spec.md`) wins over this file; this file adds the concrete conventions and the
small API additions the foundation made.

Paths below are relative to the scratchpad:
`src/v7/`

## 1. Your files

| File | Rules |
|---|---|
| `v7parts/<ID>.css` | Wrapped in `/* >>> <ID> … */` … `/* <<< <ID> */`. Every class prefixed (`m-goal-`, `k-`, `v7-how-` …). Colours only from `--m-*`, `--v7-*` or site tokens. |
| `v7parts/<ID>.js` | Classic script: `// >>> <ID>` … `// <<< <ID>` around one IIFE. No modules, imports, globals (except through `V7`), external requests or `localStorage`. **Must not throw when its elements are absent**: both pages load the same v7.js. |
| `v7parts/<ID>.html` | The fragment a page assembler pastes (format below). |

JS skeleton:

```js
// >>> M4 m-flow
(function () {
  var V7 = window.V7; if (!V7) return;
  V7.define('M4', function (root, tl, o) { /* … */ return { length: 6600, hold: 1200, arm: function () {}, steps: [] }; });
})();
// <<< M4
```

Page-level initialisers (K1, S1, T1, the M15 toggle, P-HOME effects, P-PROD, the M1 stepper sync, §8) register with
`V7.ready(fn)`; boot calls them in registration order after every mock is mounted (spec §3.8 step 3).
`fn` receives `V7`. Errors inside `fn` are caught and logged, so one broken initialiser cannot stop the others.

## 2. Fragment format (`<ID>.html`)

**Screens hosted in M0** (M3 M4 M5 M6 M8 M9 M10 M13): the file contains only the `.v7-screen` root,
preceded by one HTML comment holding the sr-only caption text. An optional second comment gives the
shell height the lab should use (default 516px).

```html
<!-- figcaption: Product preview: setting a goal. The owner types … -->
<!-- app-h: 516px -->
<div class="v7-screen m-goal" data-v7-mock="M3" data-v7-play="host" data-nav="goals" data-title="New goal">
  …final markup…
</div>
```

- `data-nav` = the M0 nav key the shell activates for this screen (`goals flows monitor exceptions rules audit settings`).
- `data-title` = the shell title (`.v7-app-title`, shown only in the narrow shell).
- Do **not** add `.v7-mock`, `aria-hidden` or `inert` to a screen: the shell's `.v7-app` carries them.
- The page assembler drops the screen into `M0.html` at `<!-- SCREENS -->`, sets the active nav item,
  the title and `--v7-app-h`, and copies the figcaption comment into `<figcaption class="sr-only">`.

**Frameless components** (M1 M7 M11 M12 M14 M15 K1): the file is the whole `<figure>`:

```html
<figure class="v7-figure">
  <div class="v7-mock m-surf v7-cursor-host" data-v7-mock="M11" data-v7-play="loop" aria-hidden="true" inert>…</div>
  <figcaption class="sr-only">Product preview: …</figcaption>
  <button class="v7-pause" type="button" aria-label="Pause animation"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>
</figure>
```

The pause button is optional (only where the spec shows one); C1 binds it automatically. It is a label swap
(Pause / Play / Replay animation, with the matching icon), never a toggle: C1 removes any `aria-pressed` at bind time.
It has an invisible 46 x 46 hit area (C2 `::before`), so do not use `::before` on it yourself.

**Markup is always the final state.** Arm the start state in `arm()`, never in markup.

## 3. Tokens, atoms and icons (C2)

- Page tokens `--v7-*` live on `:root` (dark overrides on `[data-theme=dark]`, `--v7-dir` on `[dir=rtl]`).
- Mock tokens `--m-*` exist inside `.v7-mock` (and on `.v7-pause`). Dark values come from `[data-theme=dark] .v7-mock`.
  Never hard-code colours; the dark theme works through these tokens alone.
- Context overrides (C2): inside `.v7-band-dark` (both themes) `--m-shadow` is the dark shadow (no warm haze on the band);
  the rule is `:where(.v7-band-dark) …`, so any page rule with two classes wins (P1's straddling window keeps its own).
  In dark theme on `.v7-sec--subtle` the window lifts one step: `--m-bg #23233B`, `--m-sunken #1E1E34`, `--m-raised #2A2A4A`.
- Mock type base is 13px/1.4 Hanken on `.v7-mock`; 12.5px inside a narrow `screen` container. Never below 11px.
- Inside a screen, size modes are container queries: `@container screen (min-width:480px)` = medium,
  `(min-width:760px)` = wide. Mobile-first: write the narrow layout first.
  Frameless mocks that need modes declare their own container (`container: <name> / inline-size`) on an inner wrapper.
- Icons: `<svg class="v7-ic" aria-hidden="true"><use href="#i-goal"/></svg>` (16px; set your own size with width/height).
  Arrows and chevrons add `.v7-ic-flip`. The mark: `<svg class="v7-mark" viewBox="43 43 114 114"><use href="#i-mark"/></svg>`.
  Icons are `display:inline-block` (site.css makes every svg `display:block`; `.v7-ic` and `.v7-mark` undo that).
- The sprite is `v7parts/C2.sprite.html`; pages paste it as the first child of `<main>`.
  `i-mark` has no `viewBox` of its own (the outer `svg.v7-mark` carries `viewBox="43 43 114 114"`; a second
  viewBox on the symbol offsets the dots). Always use the mark markup above.

Atoms (all in C2.css; see spec §2.7 for the visual spec):

| Atom | Markup |
|---|---|
| Mate avatar | `<span class="v7-avatar is-mate"><svg class="v7-mark" viewBox="43 43 114 114"><use href="#i-mark"/></svg></span>` |
| Person avatar | `<span class="v7-avatar">DK</span>` · owner: `<span class="v7-avatar is-you"><svg class="v7-ic"><use href="#i-person"/></svg></span>` |
| Thinking | `<span class="v7-thinking"><i></i><i></i><i></i></span>` |
| Pill | `<span class="v7-pill" data-tone="ok">On track</span>` tones `ok you mate neutral` (default neutral) |
| Chip | `<span class="v7-chip"><b>Target</b>90% by Jan 15</span>`, `.is-you` |
| Source | `<span class="v7-src"><svg class="v7-ic"><use href="#i-db"/></svg>ERP · read-only</span>` |
| Fake button | `<span class="v7-fbtn is-primary">Approve fix</span>` `.is-primary .is-ghost .is-ok .is-disabled`, optional leading `svg.v7-ic` |
| Key cap | `<kbd class="v7-kbd">↵</kbd>` |
| Card | `.v7-card` |
| Live dot | `<span class="v7-live"></span>` |
| Progress bar | `<span class="v7-bar" data-tone="mate"><i class="v7-bar-fill" style="--v:.51"></i><i class="v7-bar-tick" style="--at:.06"></i><i class="v7-bar-flag" style="--at:.9"><b>Target</b></i></span>` tones `mate ok you` |
| Toast | `<span class="v7-toast"><svg class="v7-ic"><use href="#i-check"/></svg>Rule R-14 added to Rules</span>` (absolute, bottom inline-end of its `.v7-screen`) |
| Caret | `<span class="v7-caret"></span>` (`V7.type` adds and removes it for you) |
| Cursor + tap | last children of a `.v7-cursor-host`: `<span class="v7-cursor"><svg viewBox="0 0 24 24"><use href="#i-cursor"/></svg></span><span class="v7-tap"></span>` |
| Collapse (for insert/remove) | `<div class="v7-collapse"><div>…row…</div></div>` (exactly one child) |
| Node card | see below |
| Preview tag | `<span class="v7-preview-tag">Product preview</span>` (also "Sample X-ray", "Example") |

Node card (`.v7-node`, spec M4; compact variant for M1). Tile colour by `data-kind` = `trigger mate rule person action`:

```html
<li class="v7-node" data-kind="mate">
  <span class="v7-node-tile"><svg class="v7-ic"><use href="#i-db"/></svg></span>
  <span class="v7-node-body"><b class="v7-node-t">Check stock</b><span class="v7-node-m">ERP · read-only</span></span>
  <!-- optional third column (tag, pill …) -->
</li>
```

`.v7-node.is-compact` = 34px row, 22px tile, meta at the inline-end (below the title in a narrow container:
add `.is-stacked` or let your own container query do it). `[data-kind=person]` also gets the 1.5px `--m-you` border.
`[data-selected]` gets the 2px `--m-you` outline. Mock-specific sizes (width 280px etc.) stay in your part.

Page components (C2): `.v7-wrap .v7-wrap-wide .v7-sec .v7-sec--subtle .v7-band-dark .v7-cta .v7-h1 .v7-h2 .v7-h3
.v7-lead .v7-label .v7-btn-ghost .v7-actions .v7-micro .v7-check-list .v7-link-arrow .v7-figure .v7-pause .v7-note`.

```html
<ul class="v7-check-list">
  <li><svg class="v7-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>Read-only by default</li>
</ul>
<a class="v7-link-arrow" href="security-and-control/">Security and control<svg class="v7-ic v7-ic-flip" aria-hidden="true"><use href="#i-arrow"/></svg></a>
```

`.v7-check-list` draws each check (300ms, stagger 120) when its `li` has `data-v7-reveal` and gets `.is-in`. The undrawn
state is the custom property `--v7-check-off:1.01` on the not-yet-in `li` (the path reads `var(--v7-check-off,0)`), so no
rule depends on a class change matching `path[pathLength]` (Chromium missed that invalidation).
`.v7-link-arrow` and `.v7-pause` carry an invisible `::before` hit area of at least 46 x 46 px.
Mask headings: `<h1 class="v7-h1" data-v7-reveal="mask"><span class="v7-line"><span>Reverse the build.</span></span><span class="v7-line"><span>10x faster.</span></span></h1>`.

## 4. The M0 shell

`v7parts/M0.html` is the template. A page sets: `style="--v7-app-h:516px"` on the figure, `data-active` on one
`.v7-nav-item`, the `.v7-app-title` text, the figcaption, and pastes screens at `<!-- SCREENS -->`.
Shell modes are container queries on the `app` container (`.v7-app`): `< 560px` none (no nav, tap only),
`560–879px` rail (52px icon nav), `≥ 880px` full (188px nav, search pill). `.v7-app-main` is the `screen`
container; screens stack in one grid cell (`grid-area:1/1`), so the tallest sets the height.
`.v7-screen` is `position:relative` (toasts anchor to it) and stretches to the visible area, so a toast sits at the
bottom of the window. In rail/full the body has the fixed height `--v7-app-h` and clips; design screens to fit it.
In the narrow shell the body grows with the content, so a toast that is visible in the final state covers the last
row: reserve room for it (for example `padding-bottom` on your screen in the narrow container).
In dark theme the shell has a `rgba(255,255,255,.12)` ring and a faint top highlight on `.v7-app-top`.

JS helpers: `V7.navTo(appOrChild, key, title?)` (C1) and `V7.shellMode(el)` → `'none'|'rail'|'full'` (M0).

## 5. Motion API cheat sheet (C1; spec §3 is normative)

```js
V7.static                 // true = reduced motion / failed gate: render final, no timelines
V7.dir(el?)  V7.coarse    V7.ease.{out,inOut,pop,in,outCubic,inOutCubic}
V7.define(id, factory)    V7.get(elOrSelector) → controller   V7.all() → controllers
V7.ready(fn)              // page initialisers, run at boot step 3 in registration order
V7.observe(el, {enter:.35, leave:.15}, cb) → unobserve()     // cb(true|false, ratio), hysteresis
V7.navTo(app, key, title?)   V7.emit(el, name, detail)   V7.$(root, sel)   V7.$$(root, sel) → array
V7.timeline(opts?)        // free-standing Timeline for page effects (T1 dwell, K1, P-HOME counts). You call play()/pause()/kill(); check V7.static yourself.
                          // opts.owner: any string id. The timeline then carries an owner record (tl.own = {id, owner:true}):
                          // errors are reported as [V7] <owner>, and a cursor it moves (V7.cursorTo) stays owned by it, so a
                          // mock that reaches 'done' underneath does not fade that cursor. It is not a controller (no toFinal).
V7.reveal(scope?)         // prepare + observe reveals inserted after boot
V7.hasCursor(el)          // true when the fake cursor of el's host is rendered (host ≥ 560px, fine pointer)
V7.shellMode(el)          // M0
```

Factory: `V7.define('M4', function (root, tl, opts) { return { length, hold, loop, maxLoops, selfExit, arm(), steps:[[ms, fn(tl)], …] }; })`.
- `opts = { mode, size, cycle, host, …restart(opts) }`. `size` is always `'narrow'|'medium'|'wide'` (measured per cycle
  from `.v7-app-main` content width, or the figure). `mode` equals `size`, **except** when the figure carries
  `data-v7-mode` (M15): then `mode` defaults to that attribute, and `restart({mode})` overrides it.
- `host` is `'home'` inside `[data-v7-steps]`, `'tour'` inside `[data-v7-tour]`, else `'auto'`.
- `root` is restored from the snapshot before every cycle, so query elements inside the factory, every cycle.
- Steps run in time order on the controller's timeline; `tl.at(ms, fn)` / `tl.after(ms, fn)` add more.
- A thrown error in a factory, `arm()` or a step logs `[V7] <id>` and drops that mock to its final markup.

Controller (`V7.get(root)`; never null: an absent element gives an inert controller with `.noop === true`): `play()` (clears the `host` reason), `pause(reason='host')`, `resume(reason='host')`,
`restart(opts?)` (clears `host` and `user`, restores, arms, plays when nothing else blocks), `toFinal()`,
`on('end'|'state', fn)`, `off(name, fn)`, `reasons()`, and fields `state`, `cycle`, `root`, `id`.
Reasons: `offscreen tab user hover focus host`. `data-v7-state` = `armed running paused holding done final`;
`data-v7-paused` is present while paused. DOM events bubble from the root: `v7:state {id,state}`, `v7:end {id,cycle,done}`.
`document` gets `v7:static` when the reduced-motion preference switches on mid-session (S1 → stacked, T1 → stop autoplay,
page timelines → settle to final).

Timeline (`tl`): `tl.time`, `tl.at(ms, fn)`, `tl.after(ms, fn)`, `tl.anim(el, keyframes, {duration, easing, delay, fill='both'})`
(easing accepts CSS strings or `'out' 'inOut' 'pop' 'in'`), `tl.tween(ms, easing, onUpdate(p), onDone)`, `tl.play() tl.pause() tl.kill()`.
Animations made with `tl.anim` pause and resume with the timeline; `fill:'both'` ones are committed to inline style at cycle end.

Primitives (all: first arg `tl` (null = instant end state); no-op on null or `display:none` targets; options also take
`delay` (ms on the timeline); `show hide pop insert remove flash grow wipe draw` also take a NodeList/array plus `stagger`):

| Instant (use in `arm()`) | Effect | Undone by |
|---|---|---|
| `V7.off(el)` / `V7.on(el)` | `data-v7-off` (opacity 0, keeps space) | `show`, `pop`, `on` |
| `V7.gone(el)` | `data-v7-gone` (display none) | `show`, `pop`, `insert`, `on` |
| `V7.collapse(el)` | `data-v7-collapsed` on a `.v7-collapse` (0 rows) | `insert` |
| `V7.shrink(el, 'x'|'y')` | `data-v7-shrunk` (scale 0 on that axis) | `grow` |
| `V7.clip(el)` | `data-v7-clip` (`clip-path: inset(0 100% 0 0)`) | `wipe` |
| `V7.undraw(el)` | `data-v7-undrawn` (path with `pathLength="1"` undrawn) | `draw` |

Animated: `show(tl, el, {x, y=8, duration=240})`, `hide(tl, el, {y=-4, duration=160})`, `pop(tl, el, {duration=260, from=.9})`,
`insert(tl, el, {duration=280})`, `remove(tl, el, {duration=220})`, `type(tl, el, text, {duration, caret=true})`,
`untype(tl, el, {duration=500})`, `count(tl, el, {from=0, to, duration=900, decimals, prefix, suffix})`,
`roll(tl, el, text, {duration=240, html})` (on a `.v7-pill` or `.v7-fbtn` it rolls the label only and keeps icons and the dot),
`status(tl, pill, tone, text)`, `flash(tl, el, {tone='you', duration=1200})` (a soft tint washed over the element's own background),
`bar(tl, fill, to, {duration=900})`, `grow(tl, el, {axis='y', from='start'|'end'|'center', duration=200})`,
`wipe(tl, el, {from=0, duration=900})`, `draw(tl, path, {duration=300})`, `cursorTo(tl, target, {duration=600})`,
`cursorHide(tl, el)`, `tap(tl, target)`, `travel(tl, dot, fromEl, toEl, {duration=700})`, `place(dot, el)` (instant),
`flip(tl, els, mutate, {duration=800})`.

Gotchas:
- `[data-v7-off]` and `[data-v7-gone]` are `!important`. To animate an element yourself, call `V7.on(el)` first.
- `.v7-collapse` must have exactly one child; it clips only while moving or collapsed, so shadows survive in the final state.
- `[data-v7-paused] *` freezes CSS keyframe loops (thinking dots, live dot, caret). WAAPI animations pause with the timeline.
- Never use `will-change` globally, and never animate width/height/top/left.
- A `selfExit` loop (M1) rests on the final markup when it reaches `done`. If the root is a positioned frame around one
  content child (cursor and tap excluded), C1 cross-fades that child (400ms): a clone of the outgoing content sits over the
  restored markup and fades out, so the frame never blanks. Otherwise the whole root fades in from 0.
- Mask lines start at `translate: 0 120%`: the inner span must clear its own height plus the `.v7-line` bottom padding (.14em).
- Charts stay `dir="ltr"`; directional offsets use `V7.dir()` (JS) or `var(--v7-dir)` (CSS).
- The fake cursor only shows on hosts ≥ 560px with a fine pointer; `cursorTo` silently skips otherwise (tap rings still show).
  When a mock reaches `done`, C1 fades out the cursor it moved last. A page timeline that moves the cursor (the T1
  handoff) takes ownership when it is made with `V7.timeline({ owner: 'T1' })`, so the outgoing screen does not hide it.
  Never assign `tl.ctrl` yourself.
- CSS keyframe loops (thinking dots, live dot ring, caret) pause while their `.v7-figure` is off screen (C1 sets
  `data-v7-offscreen` from an observer), inside `[data-v7-paused]` and `[data-v7-state=armed]` roots, and stop
  (`animation:none`, the reduced-motion look) inside `done` / `final` roots. A loop of your own outside a figure must
  stop itself when it cannot be seen.
- `site.css` sets `html{scroll-behavior:smooth}`: in your own Playwright scripts scroll with `{behavior:'instant'}`
  before measuring or clipping.

## 6. Reveal (page copy)

`data-v7-reveal="up|fade|mask|rise"`, optional `data-v7-delay="ms"`, and `data-v7-stagger="80"` on a parent
(direct children that carry `data-v7-reveal` get `i × 80ms`). Mask lines also stagger 80ms per `.v7-line`.
One observer (threshold .15, rootMargin `0px 0px -8% 0px`) adds `.is-in` once. Static: everything gets `.is-in` at boot.
- At boot (watch step) every pending reveal whose top is above the bottom of the first viewport comes in at once (with its
  delay and stagger), so a figure that only peeks into a short viewport is not stuck at opacity 0. Below the fold the observer decides.
- Keyboard focus reveals at once: a capture `focusin` listener adds `.is-in` to every pending reveal around the focused
  element and drops its transition; CSS backs this with `:focus-within`. Focus never lands on something invisible.
- Hero copy (`[data-v7-reveal]` inside `.v7-hero`, not in a `.v7-figure`) reveals with CSS keyframes at first paint
  (C1.css), so it never waits for the deferred v7.js; C1 only marks it `.is-in`. The keyframes read the delay from
  `data-v7-delay` through a fixed list of values (80 160 240 300 320 380 400 480 560 640) and `data-v7-stagger` 80 / 100:
  add a rule in C1.css if a hero needs another value.

## 7. Lab: build, look, screenshot

```sh
S=src/v7
node $S/tools/labgen.mjs m3 M3                      # → $S/lab/m3.html
node $S/tools/labgen.mjs tour M3 M4 M5 M6 M8 M9     # several ids on one page
node $S/tools/labgen.mjs demo $S/lab/src/x.html --js $S/lab/src/x.js --css $S/lab/src/x.css   # lab-only fragments
```

- Re-run labgen after you edit an `.html` fragment (fragments are inlined). CSS and JS parts are linked, so edits to
  those show up on reload.
- Screens hosted in M0 render inside M0 shells at three widths: wide 1120px (full shell), medium 720px (rail),
  narrow 390px (none). Frameless figures render at their natural width (max 1120px) and at 390px.
- Each lab page loads `assets/site.css`, `parts/C1.css C2.css M0.css <ids>.css`, the sprite, the fragments, then
  `parts/C1.js M0.js <ids>.js`, `lab.js` (lab harness) and `parts/ZZ-boot.js` last, all `defer`.
- Query params: `?theme=dark|light` (default follows `prefers-color-scheme`, like the real anti-flash script, so
  `shot.mjs … dark` works), `?dir=rtl`, `?static` (no `.v7-motion`), `?host=manual` (do not auto-play host mocks),
  `?band=dark` (page background = dark band, for M1/M14), `?bar=0` (hide the toolbar). Combine: `?theme=dark&dir=rtl`.
- The harness plays `data-v7-play="host"` mocks when ≥ 35% visible (stand-in for S1/T1) and shows a small state label
  above each figure. The fixed toolbar has **Replay all** (calls `restart()` on every controller), theme and RTL toggles.

Screenshots (Playwright is global; scripts set `PW` themselves if you export it):

```sh
export PW="$(npm root -g)/playwright"
node $S/shot.mjs $S/lab /m3.html $S/shots/<label>/m3.png 1280 light no      # full page after scrolling, prints errors + overflow
node $S/tools/frames.mjs --page /m3.html --out $S/shots/<label> --at 0,800,2500,9000 \
     [--width 1280] [--theme dark] [--dir rtl] [--rm] [--clip '#lab-M3-wide'] [--name m3]
```

`frames.mjs` scrolls the clip target into view, waits until a mock inside it reports `running`, then captures at each
`--at` time (ms after that moment), and prints console errors, horizontal overflow and the mock states.
`--rm` emulates reduced motion, `--scale 2` gives retina-sharp crops for detail checks, `--from load --wait commit`
times frames from navigation start (reveals, page effects), `--full` takes the full page instead of the clip.
Element ids in lab pages: `#lab-<ID>-wide`, `#lab-<ID>-medium`, `#lab-<ID>-narrow` (M0 screens),
`#lab-<ID>-natural`, `#lab-<ID>-390` (frameless).

Test harness for the core: `node $S/tools/c1test.mjs` (49 checks: arm, play when visible, offscreen pause/resume,
maxLoops → done, `on('end')`, pause button pause/play/replay, tab visibility, host play/pause/resume/restart/toFinal,
selfExit loops with start delay, `data-v7-mode`, `V7.ready` order and isolation, every primitive's final state,
reveal, live reduced-motion switch, reduced motion from load, JS off, fail-open gate, boot safety net).
Fixtures: `lab/src/c1-dummy.html`, `lab/src/c1-dummy.js`. Other lab-only sources: `lab/src/c2-atoms.html`,
`lab/src/m0-sample.*`, `lab/src/reveal-demo.html` (copy these patterns for your own demos).
`lab/c1test-assembled.html` loads the assembled `assets/v7.css` + `assets/v7.js` instead of the parts.

## 8. M1 goal data (industry heroes) and the shared stepper sync

M1 plays the goals in `<script type="application/json" class="m-hero-data">` inside its `<figure>` when that script is
present; without it, it plays the built-in G1–G3 (homepage, unchanged). The fragments `M1.insurance.html`,
`M1.manufacturing.html`, `M1.construction-and-real-estate.html` and `M1.logistics-and-distribution.html` are complete
figures: goal A's final state as markup (static, no-JS and reduced-motion look), the data script right after the mock
root, the pause button, then the sr-only figcaption (last). Paste one as is into an industry hero, like `M1.html` on the
homepage.

**Edit the data in one place:** `tools/ind/m1data/m1-goals.json`, then run `node tools/ind/m1data/m1frag.mjs` (all
industries, or pass slugs). It regenerates each fragment from `M1.html` (the template), so the markup always equals what
M1.js renders for goal A. Re-run it after any change to `M1.html`, then rebuild the pages that paste the fragments.

```json
{ "goals": [
  { "text": "Key 95% of orders the same day by February 1.",
    "highlight": { "metric": "orders the same day", "target": "95%", "date": "February 1" },
    "chips": ["Orders keyed same day", "58% today", "95% by Feb 1"],
    "nodes": [ { "kind": "trigger", "icon": "mail", "title": "Order arrives", "meta": "Email, scan" }, … ],
    "track": { "name": "Orders keyed same day", "period": "Week 3 of 10", "value": 76, "baseline": 0.58, "target": 0.95 },
    "status": "ok" },
  { …, "status": "risk", "note": "Large drawings wait in line. Fix: draft them first.", "forecast": "Forecast 72% → 90% by Mar 1" }
] }
```

| Field | Rule |
|---|---|
| `text` | The typed goal (plain text). |
| `highlight` | Optional `metric`, `target`, `date`: exact substrings of `text`, each underlined in amber. A phrase that is not in `text` is an error. |
| `chips` | Exactly 3 values: metric, baseline, target. Industry baselines read "N% today" (Industries spec §2; the homepage's "N% at start" is one character too wide for two-digit baselines on 375px phones). Use the same metric name as the hub card for goal A. |
| `nodes` | 2–7 steps (use 6 or 7; the window reserves 7 rows). `kind` = `trigger mate rule person action`; `icon` = a sprite id with or without `i-`; `meta` optional. Also accepted as `[kind, icon, title, meta]`. "Mate built N steps" counts them. |
| `track` | `value` in percent (47), `baseline` and `target` as fractions (.22, .9); `name` defaults to the metric chip; `period` is the mono label ("Week 4 of 12", "Month 2 of 4"); optional `spark` = 6 weekly values (default: the G1 climb for `ok`, the G3 flattening for `risk`, from baseline to value). |
| `status` | `ok`: on track, the run dot walks the flow. `risk`: at risk → `note` (Mate's proposal, covers the last 2 rows, 3 narrow) → Approve → `forecast` (the `A% → B%` pair is wrapped in `bdi`) → on track. `forecast` is required for `risk`. |
| `exit` | Optional ms at which the goal steps back to placeholders (default 7700 `ok`, 8700 `risk`; the goal lasts exit + 700). |

- Goal A (first) must be `ok`: it is the shipped markup. Goals play in order and loop (`maxLoops: 2`, `selfExit`), so an
  `ok` + `risk` pair lasts 8.4 s + 9.4 s, the homepage's rhythm.
- A target of 97% or more gets `.m-hero-flag-end` on its `.v7-bar-flag` (the generator writes it for goal A; M1.js sets it
  per goal), so the "Target" label ends on the flag instead of crossing the card edge.
- Bad data (invalid JSON, a missing highlight phrase, 3 chips missing, 8 nodes …) throws in the factory: C1 logs
  `[V7] M1: M1 data: …` and the figure rests on its final markup. Check the console after editing.
- Fit budget (measured, Chromium and WebKit, the same as the homepage goals): the goal text must stay within about 440 px
  at 17px display (one line from a 590 px window: "Answer 90% of complete claims in 2 days by March 31." is 438 px), and
  the three chips within about 541 px in one row (the homepage's widest set). A meta longer than about 16 characters is
  cut on 390 px phones. `tools/ind/m1data/fit.mjs <labRoot> <page.html>` sweeps widths 280–760 and lists every reflow
  or truncation; `tools/ind/m1data/chipw.mjs` measures candidate strings.

**Stepper sync (shared, in M1.js):** any `ol.v7-stepper` with `li[data-stage=goal|flows|track]` in the same `.v7-hero` (or
the same `section`) as an M1 follows its `v7:stage` events: `data-sync` on the `ol` from the first cycle until done/final,
`data-active` on the current stage's `li`. Steppers anywhere else (for example the Industries hub's inline row) are never
touched. The stepper's look is in M1.css; page parts only set its margins (P-HOME: `.v7-home-hero .v7-stepper`).
