# mateos.ai

The site lives in [`web/`](web/) (Astro, English at `/`, Hebrew at `/he/`). It is deployed by Vercel: every push to
`main` goes live on mateos.ai. See [`web/README.md`](web/README.md) to work on it and
[`web/DEPLOY.md`](web/DEPLOY.md) for hosting, DNS and rollback.

- X-ray form: posts to Web3Forms. The public access key is in `data-key` on the form in the contact page.
- The old static site and its generators are kept at the git tag `legacy-site-final`.
- `mateos-design-system.html` and `mateos-tokens.css` are the brand design-system reference.
