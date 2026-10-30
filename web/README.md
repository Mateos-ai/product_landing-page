# mateos.ai on Astro (`web/`)

The source of mateos.ai, served by Vercel (see `DEPLOY.md`). Every push to `main` deploys it.
The old static site (`../site/`) and its generators (`../src/v7/`) were removed after the DNS cutover on 2026-10-30;
they are kept at the git tag `legacy-site-final`.

- Astro 7, static output to `web/dist/`, no SSR, no UI framework. Pages are plain `.astro` files.
- English at `/`, Hebrew at `/he/`. Every path has a trailing slash (`/industries/insurance/`, `/he/industries/insurance/`).
- `site: https://mateos.ai`. The canonical, hreflang and og:url tags are built from it.

## Run

```sh
cd web
npm install
npm run dev        # http://localhost:4321. Astro 7 may start the dev server in the background: `npx astro dev stop`
npm run build      # -> dist/ (v7.css / v7.js assembled and minified into dist/assets/)
npm run preview    # serve dist/
```

`V7_MINIFY=0 npm run build` ships unminified v7 assets, which helps with debugging.

## Layout

| Path | What |
|---|---|
| `src/pages/` | Route files only. Each one renders a view: `pages/index.astro` and `pages/he/index.astro` both render `<Home />`. |
| `src/views/<Page>.astro` | One per page, locale-agnostic. Wraps its content in `<Layout>` and composes components. |
| `src/layouts/Layout.astro` | The only layout: `<html lang dir>`, all head metadata, header, footer, inline scripts, v7 assets. |
| `src/components/site/` | Header, Footer, and small shared pieces: `Arrow`, `Check` (`variant="never"` for the cross, `focusable` adds `focusable="false"`), `ProsePage` (the privacy and accessibility body: eyebrow, title, last-updated, lead, titled sections). |
| `src/components/v7/<ID>.astro` | One component per product preview (M0, M1, M3 to M23, K1, K2, T1). K2 is the home "Reverse the build" cubes; K1 is no longer on any page. There is no M2 part, and S1 (the home "How it works" stepper) is CSS/JS only. |
| `src/components/v7/Frag.astro` | The base the frameless previews use: pastes `parts/<id>[.<variant>][.he].html`, with `attrs` and `indent`. |
| `src/components/v7/ProductTour.astro` | The T1 tour on `/mateos/`: one 556px M0 shell hosting M3 M4 M5 M6 M8 M9, with each screen's sr-only caption. English captions get typographic apostrophes (`curly()` in `src/i18n/index.ts`). |
| `src/components/v7/X2.astro` | The sample-goal mock inside an industries-hub card (played by its host card). All copy comes in as props. |
| `src/components/v7/Sprite.astro` | The inline SVG icon sprite (C2) that `<use href="#i-...">` points at. |
| `src/components/Bdi.astro` | `<Bdi>X-ray</Bdi>` for Latin words, numbers and IDs inside Hebrew. |
| `src/i18n/<locale>/<namespace>.json` | All copy. `common.json` holds header, footer and meta defaults; one file per page (`home.json`). |
| `src/i18n/index.ts`, `src/i18n/page.ts` | `useT`, `pageCtx`, link and locale helpers. |
| `src/v7/parts/` | The v7 motion system parts (CSS/JS/HTML), edited here directly. See `parts/README.md`. |
| `src/v7/web-patches.mjs` | The web-only design-review fixes to the v7 part CSS (`docs/design-review-apple.md`, H1 and M1), applied as exact string replacements while assembling. A patch that no longer matches fails the build. They can now be folded into the parts. |
| `src/v7/assemble.mjs`, `src/v7/integration.mjs` | Concatenate the parts in the fixed order (byte-identical to `assemble.sh`, plus the web patches). Served live in dev and written minified (esbuild) to `dist/assets/` on build. |
| `src/v7/fragments.ts` | Loads the HTML fragments and composes the M0 app shell (a port of the old page assemblers). |
| `src/scripts/` | The inline scripts: `anti-flash.js` (theme before first paint), `v7-gate.js`, `site.js` (module: theme toggle, menus, X-ray form) and `xray-done.js` (the contact page's animated success panel and "Send another request"). |
| `src/styles/xray-done.css` | The success panel's styles, inlined in the contact page's head (`slot="head-end"`). |
| `public/` | Copied as is: `assets/site.css`, fonts, team photos, favicons, `logo.png`, `og-v6.png`, `robots.txt`, `sitemap.xml`, `CNAME`, `.nojekyll` (so `dist/` can also be served by GitHub Pages). |
| `vercel.json` | Vercel settings for this directory (see Hosting). |

## How copy and i18n work

Copy lives in `src/i18n/en/<ns>.json` and `src/i18n/he/<ns>.json`, which have the same keys. In a view:

```astro
---
import { pageCtx } from '../i18n/page';
const { locale, t, u } = pageCtx(Astro, 'home');   // namespace = src/i18n/<locale>/home.json
---
<h2 set:html={t('field.title')} />                  <!-- string; throws at build time if the key is missing -->
{t.raw<string[]>('control.checks').map(...)}        <!-- arrays and objects -->
<a href={u('/contact/')}>{t('common:cta')}</a>      <!-- 'ns:key' reaches another namespace -->
```

- Strings may contain inline HTML: `&nbsp;`, `<bdi>G-01</bdi>`, `<span class="v7-nw">ב-ERP,</span>`. Render
  those with `set:html`. Plain strings can use `{t(...)}`, which escapes like Astro does.
- Hebrew: wrap Latin words, numbers and IDs in `<bdi>`. Keep a Hebrew prefix on the line of the word after it with
  `<span class="v7-nw">ב-X-ray</span>`. `nw()` in `src/i18n/index.ts` adds those spans (the same rule as
  `src/v7/phe/he_text.py`), but the JSON keeps the final markup so a diff shows exactly what ships.
- Where the Hebrew structure differs, not only the words, give that section its own component and branch on
  `locale` in the view: `{locale === 'he' ? <PricingHe /> : <Pricing />}`. Keep these overrides rare.
- Small per-locale separators live in the copy, not in the views: `industry.json` `ui.lineSep` and
  `how-we-work.json` `*.titleSep` are `""` in English and `" "` in Hebrew (the Hebrew pages put a space between
  `v7-line` spans).
- Use CSS logical properties (`margin-inline-start`, `inset-inline-end`) in new CSS so one component works in both
  directions.

### Links

`u(route, locale?)` returns a link **relative to the current page**, the way the live site writes links (from
`/about/`, `u('/mateos/')` gives `../mateos/`; from `/he/`, `u('/contact/')` gives `../he/contact/`). Pass the
locale-agnostic route. The current locale is added for you. `asset('assets/x.png')` does the same for root files.
On the 404 page, which is served at any depth, both return absolute paths.
The header's language switch maps every page to its counterpart (`/industries/insurance/` <-> `/he/industries/insurance/`).
Active nav state comes from the route: an exact match gets `aria-current="page"`, and a parent section gets `is-active`.

Two links keep the live English short form instead of `u()`, because the reference spells them that way: the
industries hub cards (`cardHref` in `Industries.astro`: `insurance/` in English, the full `u()` path such as
`../../he/industries/insurance/` in Hebrew) and the industry pages' back link to the hub (`hubHref` in `Industry.astro`: `../` in English). Both
resolve to the same URLs. After cutover they can move to `u()` with a one-time raw-HTML diff.

## How to add a page

1. Add the copy: `src/i18n/en/<ns>.json` and `src/i18n/he/<ns>.json`, with `meta.title` and `meta.description`
   exactly as in `../site/<path>/index.html` and `../site/he/<path>/index.html`.
2. Write `src/views/<Page>.astro`:
   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   import Sprite from '../components/v7/Sprite.astro';
   import { pageCtx } from '../i18n/page';
   const { t, u } = pageCtx(Astro, '<ns>');
   ---
   <Layout title={t('meta.title')} description={t('meta.description')}>
   <Sprite />
   ...sections, copied from the reference <main> with the copy replaced by t(...)...
   </Layout>
   ```
   Layout props: `v7={false}` for pages without the motion system (contact, careers, privacy, accessibility),
   `notFound` for the 404 head, `ogTitle` and `robots` overrides. Slots: `slot="head"` (end of the head metadata,
   before the scripts), `slot="head-end"` (last in `<head>`, after the stylesheets; the contact page's
   `xray-done-css`) and `slot="after-footer"` (page scripts after the footer, such as the contact page's `xray-done-js`).
3. Add the two route files: `src/pages/<path>/index.astro` and `src/pages/he/<path>/index.astro`, each with
   `import V from '<relative>/views/<Page>.astro'` and `<V />`.
4. `npm run build && npm run preview` and check the page in EN/HE, light and dark, desktop and phone.

The reference markup is the spec. Copy class names, `data-v7-*` attributes and element structure exactly: v7.js and
site.css depend on them. Header, footer and the older page styles in `site.css` are scoped with literal
`data-astro-cid-*` attributes, so keep those attributes on any markup that has them in the reference.

## How components work

- Product previews: `<M1 />`, `<M7 indent={4} />`, `<M1 variant="insurance" />` (renders `parts/M1.insurance[.he].html`),
  `<M15 attrs='data-v7-reveal="rise" data-v7-delay="120"' />` (attributes added to the root `<figure>`). The locale
  defaults to the page's locale. Pass `locale` to override it.
- Screens in the app shell: `<M0 screens={['M3']} figClass="v7-how-win" preAttrs='data-step="1"' />`, or the
  single-screen shortcut `<M3 figClass=... />`. Options (`ShellOpts` in `src/v7/fragments.ts`): `h` (shell height,
  516px by default, 556px for the tour), `nav`/`title` (by default, the first screen's `data-nav`/`data-title`), `cap`,
  `figAttrs`, `pause`, `newlineScreens`, and `screensHtml` for screens with extra attributes (build these with
  `screen(id, locale, 'data-screen="goal"')`).
- Today, each preview renders its locale's fragment from `src/v7/parts/<ID>[.variant][.he].html`. To move
  microcopy into `src/i18n`, change only that component. The page API stays the same.
- Fragments that contain relative URLs (M22 team photos `../assets/...`) are rebased to the page depth by their
  component (`M22.astro` calls `rebase()` from `src/v7/fragments.ts` itself). A new fragment with relative URLs
  should do the same.
- Change motion or styles in `src/v7/parts/*.css|js`. They are assembled in the fixed `ORDER` in `assemble.mjs`.
  New parts must be added to `ORDER`. The runtime contract (class names, `data-v7-*`, markup the JS reads) must
  not change.

## Hosting

`mateos.ai` is served by Vercel; every push to `main` deploys it. `vercel.json` here holds the settings (including
redirects and cache headers); [`DEPLOY.md`](DEPLOY.md) has the setup, DNS and rollback.

- **Vercel project:** Root Directory `web/`, framework Astro, install `npm ci`, build `npm run build`, output
  `dist`. Link the project from inside `web/` (`cd web && npx vercel link`); a `.vercel/` link at the repo root
  belongs to a different setup and is not used. Every branch and pull request gets a preview deploy.
- **Trailing slashes:** `"trailingSlash": true` and `"cleanUrls": false`. Every internal link is relative to the
  page (`../`, `insurance/`, `../../assets/...`), so `/industries/insurance` must redirect to
  `/industries/insurance/` before it renders, as GitHub Pages does. Without the slash, the industry page's hub link
  `../` would resolve to `/` instead of `/industries/`. Files with an extension (`/404.html`, `/assets/v7.js`) are not
  redirected.
- **404:** Vercel serves `dist/404.html` with status 404 for unknown paths at any depth. The page uses absolute
  links, so it works anywhere.
- **`CNAME`** is only read by GitHub Pages. On Vercel the domain is set in the project settings.
