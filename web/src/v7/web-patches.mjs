// Web-only changes to the v7 parts, applied by assemble.mjs while it concatenates them.
// Until cutover, parts/ must stay byte-identical to ../src/v7/v7parts (`npm run check:parts`), so the design-review
// fixes that exist only in web/ (docs/design-review-apple.md, "Applied": H1, M1) live here as exact string
// replacements. Each one replaces the rule in place, so the cascade order is the same as editing the part.
// A `from` that is no longer found fails the build: then the part changed upstream and the patch needs a look.
// After cutover, apply these to the parts and delete this file.
export const WEB_PATCHES = {
  'C2.css': [
    // M1: rem-based small text (12px / 12.5px / 13px at a 16px root).
    ['.v7-label{font-family:var(--font-mono);font-size:12px;', '.v7-label{font-family:var(--font-mono);font-size:.75rem;'],
    ['.v7-micro{font-family:var(--font-mono);font-size:12.5px;', '.v7-micro{font-family:var(--font-mono);font-size:.78125rem;'],
    ['html[lang=he] .v7-label{font-family:var(--font-body);font-size:13px;', 'html[lang=he] .v7-label{font-family:var(--font-body);font-size:.8125rem;'],
  ],
  'P-HOME.css': [
    // M1
    ['.v7-story-q{display:flex;align-items:flex-start;gap:8px;margin-top:auto;padding-top:24px;font-family:var(--font-mono);font-size:12px;',
     '.v7-story-q{display:flex;align-items:flex-start;gap:8px;margin-top:auto;padding-top:24px;font-family:var(--font-mono);font-size:.75rem;'],
  ],
  'P-HWW.css': [
    // M1
    ['font:400 12px/1.5 var(--font-mono);color:var(--text-muted)}', 'font:400 .75rem/1.5 var(--font-mono);color:var(--text-muted)}'],
    // H1: the "From $990" tag text is amber-800 in light mode (5.45:1); dark mode keeps --v7-you-ink.
    ['.v7-hww-stop[data-tone=you] .v7-hww-tag{border-color:transparent;background:var(--amber-100);color:var(--v7-you-ink)}',
     '.v7-hww-stop[data-tone=you] .v7-hww-tag{border-color:transparent;background:var(--amber-100);color:var(--amber-800)}\n[data-theme=dark] .v7-hww-stop[data-tone=you] .v7-hww-tag{color:var(--v7-you-ink)}'],
  ],
  'P-HE2.css': [
    // M1
    ['html[lang=he] .v7-hww-fine{font-size:13px}', 'html[lang=he] .v7-hww-fine{font-size:.8125rem}'],
  ],
};

/** Apply the patches for one part file. Throws when a patch no longer matches exactly once. */
export function patchPart(name, text) {
  for (const [from, to] of WEB_PATCHES[name] ?? []) {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`web-patches: expected 1 match in ${name}, found ${n}: ${from.slice(0, 70)}`);
    text = text.replace(from, () => to);
  }
  return text;
}
