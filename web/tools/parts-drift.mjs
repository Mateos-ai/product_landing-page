#!/usr/bin/env node
// Until cutover, ../src/v7/v7parts is still the live source. This lists v7 part files that differ between it and
// web/src/v7/parts, so a change made on one side can be carried over. Exit code 1 when anything differs.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const A = resolve(HERE, '../../src/v7/v7parts'), B = resolve(HERE, '../src/v7/parts');
const names = [...new Set([...readdirSync(A), ...readdirSync(B)])].sort();
let n = 0;
for (const f of names) {
  const a = join(A, f), b = join(B, f);
  const s = !existsSync(a) ? 'only in web/src/v7/parts' : !existsSync(b) ? 'only in src/v7/v7parts' : readFileSync(a, 'utf8') === readFileSync(b, 'utf8') ? '' : 'differs';
  if (s) { n++; console.log(`${s.padEnd(26)} ${f}`); }
}
console.log(n ? `${n} file(s) differ` : `in sync (${names.length} files)`);
process.exitCode = n ? 1 : 0;
