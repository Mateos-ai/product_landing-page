// Concatenates the v7 parts into v7.css and v7.js, exactly like src/v7/assemble.sh did for site/assets.
// Order matters: core first, components by id, page parts, then ZZ-boot.js last.
// The web-only design-review fixes are applied on the way (web-patches.mjs); parts/ itself stays a copy of ../src/v7/v7parts.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { patchPart } from './web-patches.mjs';

export const PARTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'parts');
export const ORDER = 'C1 C2 M0 M1 M3 M4 M5 M6 M7 M8 M9 M10 M11 M12 M13 M14 M15 M16 M17 M18 M19 M20 M21 M22 M23 K1 K2 S1 T1 P-HOME P-PROD P-IND P-INDX P-HWW P-SEC P-ABOUT P-HE P-HE2'.split(' ');

export function assemble(dir = PARTS_DIR) {
  let css = '/* Mateos v7 styles. Built from parts by assemble.sh; edit the parts, not this file. */\n';
  let js = '/* Mateos v7 motion and components. Built from parts by assemble.sh; edit the parts, not this file. */\n';
  for (const id of ORDER) {
    const c = join(dir, `${id}.css`), j = join(dir, `${id}.js`);
    if (existsSync(c)) css += patchPart(`${id}.css`, readFileSync(c, 'utf8')) + '\n';
    if (existsSync(j)) js += patchPart(`${id}.js`, readFileSync(j, 'utf8')) + ';\n';
  }
  const boot = join(dir, 'ZZ-boot.js');
  if (existsSync(boot)) js += readFileSync(boot, 'utf8');
  return { css, js };
}

/** Minify for production. JS stays a classic script (no format), CSS keeps its syntax (no lowering). */
export async function minify({ css, js }) {
  const { transform } = await import('esbuild');
  const [c, j] = await Promise.all([
    transform(css, { loader: 'css', minify: true, target: 'esnext', legalComments: 'none' }),
    transform(js, { loader: 'js', minify: true, target: 'esnext', legalComments: 'none' }),
  ]);
  return { css: c.code, js: j.code };
}
