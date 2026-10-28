# Deploying `web/` to Vercel

Until DNS is switched, **`../site/` remains the deployed source of mateos.ai**. GitHub Pages serves it, and
`.github/workflows/deploy.yml` publishes it on every push to `main`. Nothing in this folder changes that. Vercel only
adds preview deployments next to it. Do not edit or remove the workflow or `../site/CNAME` before cutover: together
they are the rollback path.

## Settings (`vercel.json`)

| Setting | Value | Why |
| --- | --- | --- |
| Framework | `astro` | Static output, no adapter or SSR |
| Install | `npm ci` | Uses the lockfile |
| Build | `npm run build` | Runs `astro build`, which assembles and minifies v7.css and v7.js |
| Output | `dist` | |
| `trailingSlash` | `true` | Internal links are relative (`../`), so `/industries/insurance` must redirect to `/industries/insurance/` first, as GitHub Pages does |
| `cleanUrls` | `false` | Keeps `/404.html` and the `index.html` layout the same as today |
| Redirects | `/field-stories/` → `/industries/`, `/he/field-stories/` → `/he/industries/` (308) | The HTML redirect pages stay in `dist/` too, for GitHub Pages and as a fallback |
| Fonts `/assets/*.woff2` | `max-age=31536000, immutable` | File names are content-hashed |
| `v7.css`, `v7.js`, `site.css` | `max-age=0, must-revalidate` | File names are not hashed, so browsers must revalidate (ETag) after each deploy |
| Team photos, favicons, logo, OG image | `max-age=86400, stale-while-revalidate=604800` | Stable names that rarely change |
| All paths | `X-Content-Type-Options: nosniff` | |

The Root Directory cannot be set in `vercel.json`. It is a project setting (step 3 below).

## 1. Connect the repository

1. In Vercel, choose **Add New → Project → Import Git Repository** and pick the `landing` repo on GitHub. Install
   the Vercel GitHub app for the repo if asked.
2. Create a new project for the site. Do not reuse the project that the repo-root `.vercel/` folder is linked to;
   that link belongs to a different project and is ignored by git.
3. **Root Directory:** `web`. Leave "Include files outside the root directory" off. Framework preset: Astro (it is
   detected, and `vercel.json` sets it anyway). Do not override the build, install or output commands in the
   dashboard; `vercel.json` holds them.
4. **Node.js version:** 22.x or newer (`package.json` requires `>=22`).
5. No environment variables are needed. The Web3Forms access key is public by design and is in the page markup.
6. To work with the CLI, link from inside `web/`: `cd web && npx vercel link`.

## 2. Preview deployments

- Every push to any branch and every pull request gets its own preview URL
  (`<project>-git-<branch>-<team>.vercel.app`). The Vercel bot comments the URL on pull requests.
- Before Production is switched (section 3), set **Settings → Git → Production Branch** to `main`. Until DNS
  changes, a "production" deployment on Vercel only updates the `*.vercel.app` URL, not mateos.ai.
- Previews are not indexed: Vercel sends `X-Robots-Tag: noindex` on preview URLs. The canonical and hreflang tags
  point to `https://mateos.ai/` in every build anyway.
- Check a preview before merging:
  - Run the parity harness locally on the same commit: `npm run build && node tools/parity.mjs --motion`.
  - On the preview URL, `/industries/insurance` (no slash) redirects to `/industries/insurance/`.
  - `/field-stories/` and `/he/field-stories/` redirect to the Industries hubs.
  - An unknown path such as `/nope/` returns the 404 page with status 404.
  - The X-ray form on `/contact/` submits and shows the success panel.
  - EN/HE, the language switch, and dark mode look right.

## 3. Point mateos.ai to Vercel (cutover)

1. In the Vercel project, open **Settings → Domains** and add `mateos.ai` and `www.mateos.ai`. Make `www` redirect
   to the apex (canonical URLs use the apex).
2. Write down the current DNS records at the registrar first (today these are the GitHub Pages records: apex `A`
   records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and any `AAAA` records, plus
   `www` `CNAME` to the GitHub Pages host). These are the rollback values.
3. Lower the TTL of those records (for example to 300 seconds) a day ahead, so both cutover and rollback spread
   quickly.
4. Replace the records with the ones Vercel shows on the Domains page (an apex `A` record and a `www` `CNAME`). Keep
   MX, TXT (SPF, DKIM, site verification) and every other record unchanged.
5. Wait until Vercel shows the domain as valid and the certificate as issued. Then run the preview checks from
   section 2 against `https://mateos.ai/`, and confirm that Search Console can still fetch `/sitemap.xml`.
6. Keep `../site/`, `../site/CNAME` and the GitHub Pages workflow until the switch has held for a while. Keep the
   domain verified in the GitHub organisation's Pages settings so that nobody else can claim it on GitHub Pages.
   GitHub may report a DNS check warning for the Pages site in the meantime; that is expected.

## 4. Rollback

- **Bad deploy, DNS already on Vercel:** in **Deployments**, open the last good production deployment and choose
  **Promote** (or Instant Rollback). This takes seconds and does not touch DNS.
- **Back to GitHub Pages:** restore the DNS records written down in section 3, step 2. GitHub Pages still serves
  `../site/` from `main` (re-run the "Deploy to GitHub Pages" workflow if needed), so it is ready at once. Rollback
  serves `../site/`, not `web/dist/`. Remove the domain from the Vercel project afterwards if Vercel will not be
  used again.
- **Serving `web/dist/` from GitHub Pages:** `dist/` already contains `CNAME` and `.nojekyll`, so it can be uploaded
  in place of `./site` if that is ever needed. That would be a workflow change and is not part of this migration.

## Retiring GitHub Pages (later)

Once the switch has held: disable Pages for the repo, remove `.github/workflows/deploy.yml`, and decide whether
`../site/` and `../src/v7/` move into history. `web/src/v7/` is then the only source of the motion system.
