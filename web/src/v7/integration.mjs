// Astro integration: serves the assembled v7.css / v7.js in dev (re-assembled on every request, so part edits
// show on reload) and writes them, minified, to dist/assets/ at build time. Set V7_MINIFY=0 to ship unminified.
// Also writes dist/sitemap.xml from the built pages (see sitemap() below).
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { assemble, minify } from './assemble.mjs';

// sitemap.xml from what was actually built: every page with a canonical URL and no noindex (so /lab/, the 404 page and,
// while it is noindex, /he/ stay out on their own). Each URL is its own canonical, so the sitemap never lists a redirect.
function sitemap(out) {
  const urls = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') {
        const html = readFileSync(p, 'utf8');
        if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
        const canon = /<link rel="canonical" href="([^"]+)"/.exec(html);
        if (canon) urls.push(canon[1]);
      }
    }
  };
  walk(out);
  urls.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
  const esc = (u) => u.replace(/&/g, '&amp;');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  return urls.length;
}

export default function v7() {
  return {
    name: 'mateos-v7',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const m = /^\/assets\/v7\.(css|js)(\?.*)?$/.exec(req.url || "");
          if (!m) return next();
          const out = assemble();
          res.setHeader('Content-Type', m[1] === 'css' ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(out[m[1]]);
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const raw = assemble();
        new Function(raw.js); // syntax check, like `node --check` in assemble.sh
        const files = process.env.V7_MINIFY === '0' ? raw : await minify(raw);
        mkdirSync(join(out, 'assets'), { recursive: true });
        writeFileSync(join(out, 'assets', 'v7.css'), files.css);
        writeFileSync(join(out, 'assets', 'v7.js'), files.js);
        const size = (k) => `${Buffer.byteLength(raw[k])} -> ${Buffer.byteLength(files[k])} bytes (gzip ${gzipSync(files[k]).length})`;
        logger.info(`v7 assets: css ${size('css')}, js ${size('js')}`);
        logger.info(`sitemap.xml: ${sitemap(out)} urls`);
      },
    },
  };
}
