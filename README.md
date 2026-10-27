# mateos.ai

The live site is the static v6 build in `site/` (English at `/`, Hebrew at `/he/`, Hebrew pages `noindex` for now).
Every push to `main` deploys `site/` to GitHub Pages as is, with no build step.

- Previous Astro site ("Your AI Partner"): tag `pre-v6`. To roll back, revert the v6 commit or redeploy that tag.
- v6 Astro source: branch `site-v6-10x-faster` (not yet pushed). When it lands, restore an Astro build step that outputs this same site.
- X-ray form: posts to Web3Forms. The access key lives in `data-key` on the form in `site/contact/index.html` and `site/he/contact/index.html`. While the key is empty, submitting opens a prefilled email to hello@mateos.ai instead.

## v7 site sources
The pages in `site/` are generated from `src/v7/`. See [`src/v7/README.md`](src/v7/README.md) for how to change a page and rebuild. Do not hand-edit `site/assets/v7.*` or the `<main>` of v7 pages.
