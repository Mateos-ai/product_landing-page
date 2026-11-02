# SEO

How mateos.ai handles search, and the steps that live outside the code.

## What the build does

- **Titles and descriptions**: `meta.title` / `meta.description` in each `src/i18n/<locale>/<page>.json`
  (industry pages: `pages.<slug>.meta` in `industry.json`). Keep titles under ~60 characters and descriptions under ~160.
  Lead with what the page is about; the tagline lives in `og:title` on home (`meta.ogTitle`).
- **Canonical, hreflang, Open Graph, Twitter**: `src/layouts/Layout.astro`, on every page.
- **hreflang** is written only when every locale is indexable. Hebrew is `noindex, nofollow` today
  (`meta.robots` in `src/i18n/he/common.json`), so English pages carry no alternates pointing at it.
- **Structured data** (JSON-LD `@graph`, Layout.astro): Organization + WebSite on every page, WebPage
  (AboutPage / ContactPage where it fits) and BreadcrumbList per page, Service on industry pages, FAQPage on home.
  Views add their own nodes with the `schema` prop.
- **sitemap.xml** is generated at build time (`src/v7/integration.mjs`): every built page with a canonical URL and no
  `noindex`. It can't list a redirect or a lab page. Don't add a `public/sitemap.xml`; it would be overwritten.
- **robots.txt**: `public/robots.txt`, allows everything and points at the sitemap. `/lab/` is kept out with
  `noindex` on the page (blocking it in robots.txt would stop Google from seeing that noindex).
- **HTTPS**: Vercel redirects http → https and www → apex (308) and sends HSTS (2 years).

## Turning on the Hebrew site

When the Hebrew copy is ready to be found on Google, delete `"robots"` from `src/i18n/he/common.json`. That one change:
removes `noindex` from every `/he/` page, adds the `/he/` URLs to the sitemap, and turns hreflang on for both languages.
Before doing it, give the Hebrew titles the same treatment as the English ones (say what the page is about, not just its name).

## Google Search Console (one-time)

1. search.google.com/search-console → Add property → **Domain** → `mateos.ai`.
2. Add the TXT record it gives you at the DNS provider for mateos.ai. Verify.
3. Sitemaps → submit `https://mateos.ai/sitemap.xml`.
4. Also add the site to Bing Webmaster Tools (it can import from Search Console in one click). Bing feeds ChatGPT search and Copilot.
5. After each big content change: URL Inspection → Request indexing on the changed pages.

Check monthly: Pages (why anything is "not indexed"), Core Web Vitals, Enhancements (Breadcrumbs, FAQ), Performance (queries).

## Backlink plan

Quality over count: a handful of links from sites our buyers read beats hundreds from directories.

1. **Profiles we control (week 1)**: Crunchbase, Google Business Profile, G2/Capterra listing for
   MateOS, the founders' LinkedIn and X bios. Add each to the Organization `sameAs` in Layout.astro (LinkedIn is already there).
2. **Partners**: the ERP/CRM vendors and integrators our customers run (whichever systems Mate works inside most often)
   usually list implementation partners. Ask for a partner-page listing.
3. **Customers**: with permission, a case study we write together that the customer also publishes or links to.
   Each industry page is the natural landing page for its case study.
4. **Israeli tech and business press**: Geektime, Calcalist Tech, Globes, TheMarker. Pitch the data angle: what an X-ray
   finds (hours per process, payback) across N companies. Original numbers get linked.
5. **Industry associations and trade media**: insurance agents' association, manufacturers' association, builders',
   logistics, plus their newsletters and events. Speak, sponsor a session, or contribute an article.
6. **Guest posts and podcasts** on owner-led business, operations and AI adoption, each linking to the industry page it fits.
7. **Linkable assets on our own site**: a short public report or calculator (e.g. "hours lost to manual claims handling")
   that others cite. This is what turns one-off links into steady ones.

Avoid paid link schemes and link farms; they cost more than they bring.
