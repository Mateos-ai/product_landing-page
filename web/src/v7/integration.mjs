// Astro integration: serves the assembled v7.css / v7.js in dev (re-assembled on every request, so part edits
// show on reload) and writes them, minified, to dist/assets/ at build time. Set V7_MINIFY=0 to ship unminified.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { assemble, minify } from './assemble.mjs';

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
      },
    },
  };
}
