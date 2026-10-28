// Per-page context helper for .astro files: const { locale, t, u, route } = pageCtx(Astro, 'home');
import type { AstroGlobal } from 'astro';
import { localeFromPath, routeFromPath, relHref, localePath, useT, type Locale } from './index';

export function isNotFoundPage(pathname: string) {
  return /^\/(he\/)?404(\.html|\/)?$/.test(pathname);
}

export function pageCtx(Astro: AstroGlobal, ns = 'common') {
  const pathname = Astro.url.pathname;
  const locale: Locale = localeFromPath(pathname);
  const route = routeFromPath(pathname);
  const absolute = isNotFoundPage(pathname);
  const t = useT(locale, ns);
  /** href to a route in this page's locale (u('/contact/')), or in another (u('/', 'en')). Relative like today's site. */
  const u = (r: string, loc: Locale = locale) => {
    if (/^[a-z]+:|^#/i.test(r)) return r;
    const i = r.search(/[#?]/);
    const path = i < 0 ? r : r.slice(0, i), hash = i < 0 ? '' : r.slice(i);
    return relHref(pathname, localePath(loc, path) + hash, absolute);
  };
  /** href to a root asset (asset('assets/site.css')), relative to this page. */
  const asset = (p: string) => relHref(pathname, '/' + p.replace(/^\//, ''), absolute);
  return { locale, route, pathname, t, u, asset, absolute };
}
