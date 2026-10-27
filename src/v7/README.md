# mateos.ai v7 build sources

`site/` is what GitHub Pages serves. It is **generated** from the sources in this folder. Never hand-edit `site/assets/v7.css`, `site/assets/v7.js` or the `<main>` of a v7 page. Edit the sources here, rebuild, then commit `site/` and `src/v7/` together.

## Layout
| Path | What |
|---|---|
| `v7parts/` | Every component as CSS/JS/HTML parts. `C1` is the motion core, `C2` the tokens, `M0` the app shell, `M1`–`M23` the product previews, `K1`/`S1`/`T1` the controllers, and `P-*` the page styles. `*.he.html` holds the Hebrew fragments. `v7parts/README.md` is the component and API guide. |
| `assemble.sh` | Concatenates the parts into `site/assets/v7.css` and `v7.js` in a fixed order, then runs `node --check`. |
| `phome/` | Homepage `/`. Its `<main>` is built from `main.tpl.html`; the head, header and footer come from `index.orig.html`. |
| `tools/pprod-build.mjs` | Product page `/mateos/`, built from `mateos-index.orig.html`. |
| `pind/` | Industries hub and the 4 industry pages (`build-hub.py`, `build-industries.py`). |
| `phww/`, `psec/`, `pabout/` | How we work, Security and control, About. |
| `phe/` | All 10 Hebrew pages (`build-*.py`, `build-product.mjs`, `*.he.tpl.html`, `he_text.py`). |
| `tools/ind/m1data/` | Hero preview goal data (`m1-goals*.json`). `m1frag.mjs` regenerates `v7parts/M1.<industry>*.html`. |
| `tools/about/build/m23frag.py` | Regenerates the "100 Israeli businesses" grid (`v7parts/M23.html`). |
| `navupdate.py` | The one-off site-wide nav change from 27 Oct 2026 (Security replaced Field stories). Kept as an example of a scripted header change. |
| `he-glossary.md` | Hebrew voice and terms. "On track" is **כמתוכנן**. |

The `*.orig.html` / `orig/` files hold each page's head metadata, header and footer, which the generators copy byte-for-byte. **To change the header or footer site-wide, edit these originals too**, or the next rebuild will undo the change.

## Rebuild everything
Run from the repo root (needs python3 and node):
```sh
cd src/v7
bash assemble.sh
for p in phome/build.py pind/build-hub.py pind/build-industries.py phww/build.py psec/build.py pabout/build.py \
         phe/build-home.py phe/build-hub-he.py phe/build-industries-he.py phe/build-hww-he.py phe/build-security.py phe/build-about.py; do
  python3 -I "$p"; done
node tools/pprod-build.mjs && node phe/build-product.mjs
```
Then check the changes locally:
```sh
python3 -m http.server 4747 --directory site
```
Open http://localhost:4747/ and http://localhost:4747/he/. Pushing to `main` deploys.

## Typical edits
- **Change copy on a page:** edit that page's template or generator data (for example `phome/main.tpl.html`, or the dicts in `pind/build-industries.py` and `phe/he_text.py`). Re-run that page's generator.
- **Change a product preview:** edit `v7parts/Mxx.*` (and `Mxx.he.html` for Hebrew). Run `assemble.sh` and the generators of the pages that embed it.
- **Change styles or motion:** edit the part, then run `assemble.sh`.

Respect `prefers-reduced-motion`, keep the "Product preview" / "Sample data" labels on mocks, and use sample data only.
