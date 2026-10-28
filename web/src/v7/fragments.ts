// Access to the v7 HTML fragments in src/v7/parts (<ID>[.<variant>][.he].html) and the M0 app-shell composer.
// Ports the page assemblers in src/v7 (phome/build.py, phe/build-home.py, tools/pprod-build.mjs) so the
// rendered markup is identical to today's site.
import { useT, type Locale } from '../i18n';

const RAW = import.meta.glob<string>('./parts/*.html', { query: '?raw', import: 'default', eager: true });

/** Raw fragment file, e.g. frag('M1', 'he', 'insurance') -> parts/M1.insurance.he.html. Throws if missing. */
export function frag(id: string, locale: Locale = 'en', variant?: string): string {
  const name = `${id}${variant ? '.' + variant : ''}${locale === 'he' ? '.he' : ''}.html`;
  const s = RAW[`./parts/${name}`];
  if (s === undefined) throw new Error(`v7: no fragment src/v7/parts/${name}`);
  return s;
}

export const stripLead = (s: string) => s.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
export const noComments = (s: string) => s.replace(/<!--[\s\S]*?-->\s*/g, '').trim();

/** Indent every non-blank line by n spaces (the assemblers pasted fragments indented by 4). */
export function indent(s: string, n = 4): string {
  const pad = ' '.repeat(n);
  return s.split('\n').map((l) => (l.trim() ? pad + l : l)).join('\n');
}

/** A fragment as pasted on a page: leading dev comment stripped (the page builders never pasted it), trimmed, optionally indented. */
export function fragment(id: string, locale: Locale, opts: { variant?: string; indent?: number } = {}): string {
  const s = stripLead(frag(id, locale, opts.variant)).trim();
  return opts.indent ? indent(s, opts.indent) : s;
}

/** The sr-only caption of a hosted screen (its "<!-- figcaption: ... -->" comment). */
export function caption(id: string, locale: Locale): string {
  const m = /<!--\s*figcaption:\s*([\s\S]*?)\s*-->/.exec(frag(id, locale));
  if (!m) throw new Error(`v7: no figcaption comment in ${id}`);
  return m[1];
}

/** A hosted screen root without comments; `extra` attributes go on its root div. */
export function screen(id: string, locale: Locale, extra = ''): string {
  let s = noComments(frag(id, locale));
  if (extra) s = s.replace(/^<div /, `<div ${extra} `);
  return s;
}

/** Add attributes to a fragment's root <figure>. */
export const addAttrs = (fig: string, attrs: string) => fig.trim().replace(/^<figure /, `<figure ${attrs} `);

function once(s: string, a: string, b: string, what: string): string {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`v7 shell: expected exactly one ${what}`);
  return s.slice(0, i) + b + s.slice(i + a.length);
}

/** The shell's pause button; its aria-label is common.json `pauseLabel` in the locale. */
export const pauseButton = (locale: Locale) =>
  `<button class="v7-pause" type="button" aria-label="${useT(locale)('pauseLabel')}"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>`;

export interface ShellOpts {
  locale: Locale;
  /** Screen ids (M3 M4 M5 M6 M8 M9 M10 M13) in tab order, or pre-built screen HTML via `screensHtml`. */
  screens?: string[];
  screensHtml?: string;
  /** Active nav item and narrow-shell title; default: the first screen's data-nav / data-title. */
  nav?: string;
  title?: string;
  /** sr-only caption; default: the first screen's figcaption comment. */
  cap?: string;
  /** --v7-app-h (516px; the tour uses 556px). */
  h?: string;
  /** Extra classes on the figure (e.g. "v7-how-win") and attributes after the style (e.g. data-v7-reveal). */
  figClass?: string;
  figAttrs?: string;
  /** Attributes right after the class (the home How windows put data-step="n" there). */
  preAttrs?: string;
  pause?: boolean;
  /** Screens joined with '\n' and wrapped in newlines (product page style) instead of pasted bare (home style). */
  newlineScreens?: boolean;
}

/** The M0 app shell around one or more screens. */
export function shell(o: ShellOpts): string {
  const ids = o.screens ?? [];
  const screensHtml = o.screensHtml ?? ids.map((id) => screen(id, o.locale)).join('\n');
  const first = ids[0] ? noComments(frag(ids[0], o.locale)) : '';
  const nav = o.nav ?? /data-nav="([a-z]+)"/.exec(first)?.[1];
  const title = o.title ?? /data-title="([^"]*)"/.exec(first)?.[1];
  const cap = o.cap ?? (ids[0] ? caption(ids[0], o.locale) : '');
  if (!nav || title === undefined) throw new Error('v7 shell: nav/title unknown');
  let m = stripLead(frag('M0', o.locale)).trim();
  const oldFig = '<figure class="v7-figure v7-fig-app" style="--v7-app-h:516px">';
  const cls = 'v7-figure v7-fig-app' + (o.figClass ? ' ' + o.figClass : '');
  m = once(m, oldFig, `<figure class="${cls}"${o.preAttrs ? ' ' + o.preAttrs : ''} style="--v7-app-h:${o.h ?? '516px'}"${o.figAttrs ? ' ' + o.figAttrs : ''}>`, 'figure');
  m = m.replace(/(<span class="v7-nav-item" data-nav="[a-z]+") data-active>/g, '$1>');
  m = once(m, `<span class="v7-nav-item" data-nav="${nav}">`, `<span class="v7-nav-item" data-nav="${nav}" data-active>`, 'nav ' + nav);
  m = m.replace(/<span class="v7-app-title">[^<]*<\/span>/, `<span class="v7-app-title">${title}</span>`);
  m = once(m, '<!-- FIGCAPTION -->', cap, 'figcaption slot');
  if (o.pause) m = once(m, '<figcaption', pauseButton(o.locale) + '\n  <figcaption', 'figcaption');
  m = once(m, '<!-- SCREENS -->', o.newlineScreens ? '\n' + screensHtml + '\n' : screensHtml, 'screens slot');
  return m;
}

/** Hebrew page copy: rebase fragment-relative asset URLs ("../assets/...") to the current page root. */
export function rebase(html: string, root: string): string {
  return html.replace(/(\s(?:src|href)=")\.\.\/(?=assets\/)/g, `$1${root}`);
}
