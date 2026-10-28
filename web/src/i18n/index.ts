// i18n: locales, copy lookup (t), and link helpers. Copy lives in src/i18n/<locale>/<namespace>.json.
// Strings may contain inline HTML (<bdi>, <span class="v7-nw">, &nbsp;); render those with set:html (see <T>).

export type Locale = 'en' | 'he';
export const LOCALES: Locale[] = ['en', 'he'];
export const DEFAULT_LOCALE: Locale = 'en';
export const SITE = 'https://mateos.ai';

export const LOCALE_META: Record<Locale, { lang: string; dir: 'ltr' | 'rtl'; og: string; prefix: string }> = {
  en: { lang: 'en', dir: 'ltr', og: 'en_US', prefix: '/' },
  he: { lang: 'he', dir: 'rtl', og: 'he_IL', prefix: '/he/' },
};

const files = import.meta.glob<Record<string, unknown>>('./*/*.json', { eager: true, import: 'default' });
const DATA: Record<string, Record<string, unknown>> = {};
for (const [p, v] of Object.entries(files)) {
  const m = /^\.\/(\w+)\/([\w-]+)\.json$/.exec(p);
  if (m) DATA[`${m[1]}/${m[2]}`] = v;
}

function dig(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

export interface Translator {
  /** The string at `key` (dotted path) in `<locale>/<ns>.json`. Throws at build time if missing. */
  (key: string): string;
  /** Any value (array, object) at `key`. Throws if missing. */
  raw<T = unknown>(key: string): T;
  has(key: string): boolean;
  locale: Locale;
}

/** Build a translator for one namespace, e.g. useT('he', 'home'). Keys may also be 'ns:key' to reach another namespace. */
export function useT(locale: Locale, ns = 'common'): Translator {
  const look = (key: string) => {
    let n = ns, k = key;
    const i = key.indexOf(':');
    if (i > 0) { n = key.slice(0, i); k = key.slice(i + 1); }
    const file = DATA[`${locale}/${n}`];
    if (!file) throw new Error(`i18n: no file src/i18n/${locale}/${n}.json`);
    return dig(file, k);
  };
  const t = ((key: string) => {
    const v = look(key);
    if (typeof v !== 'string') throw new Error(`i18n: missing string ${locale}:${ns}:${key}`);
    return v;
  }) as Translator;
  t.raw = <T,>(key: string) => {
    const v = look(key);
    if (v === undefined) throw new Error(`i18n: missing ${locale}:${ns}:${key}`);
    return v as T;
  };
  t.has = (key: string) => look(key) !== undefined;
  t.locale = locale;
  return t;
}

/** Locale of a URL pathname: /he/... is Hebrew, everything else English. */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/he' || pathname.startsWith('/he/') ? 'he' : 'en';
}

/** Locale-agnostic route of a pathname: '/he/about/' -> '/about/', '/he/' -> '/'. */
export function routeFromPath(pathname: string): string {
  let p = pathname.endsWith('/') || /\.\w+$/.test(pathname) ? pathname : pathname + '/';
  if (p === '/he/' ) return '/';
  if (p.startsWith('/he/')) p = p.slice(3);
  return p;
}

/** Absolute localized path of a route: localePath('he', '/about/') -> '/he/about/'. */
export function localePath(locale: Locale, route: string): string {
  const r = route.startsWith('/') ? route : '/' + route;
  return locale === 'en' ? r : '/he' + r;
}

/** Absolute URL on mateos.ai for a route (canonical, hreflang, og:url). */
export function absUrl(locale: Locale, route: string): string {
  return SITE + localePath(locale, route);
}

/**
 * Relative href from the current page to an absolute site path, the way today's site writes links
 * (from /about/: '/mateos/' -> '../mateos/'; from /: '/' -> './'; from /he/: '/he/contact/' -> '../he/contact/').
 * Hash and query are kept. With absolute=true (the 404 page, served at any depth) the path is returned as is.
 */
export function relHref(fromPathname: string, to: string, absolute = false): string {
  if (absolute || /^[a-z]+:|^#|^\/\//i.test(to)) return to;
  const depth = fromPathname.split('/').filter(Boolean).length - (/\.\w+$/.test(fromPathname) ? 1 : 0);
  const rel = '../'.repeat(depth) + to.replace(/^\//, '');
  return rel === '' ? './' : rel.startsWith('#') || rel.startsWith('?') ? './' + rel : rel;
}

/** Typographic apostrophes in English copy (don't -> don’t), as the old pprod-build curly(). Hebrew is returned as is. */
export function curly(s: string, locale: Locale): string {
  return locale === 'en' ? s.replace(/(?<=[A-Za-z])'(?=[A-Za-z])/g, '’') : s;
}

/** Hebrew: keep a short Hebrew prefix glued to the Latin word or number after it (ב-X-ray, ה-ERP, מ-990). */
export function nw(html: string): string {
  return html
    .split(/(<[^>]+>)/)
    .map((p) => (p.startsWith('<') ? p : p.replace(/(?<![א-ת\w-])((?:[א-ת]{1,3}-)?X-ray|[א-ת]{1,3}-[A-Za-z0-9][A-Za-z0-9,%]*)/g, '<span class="v7-nw">$1</span>')))
    .join('');
}
