import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import vectorsFile from '@/lib/wmcyn-url-vectors.json';
import { parseWmcynUrl } from '@/lib/wmcynUrl';
import { APP_ROUTABLE_RESERVED, buildAppSiteAssociation } from './appLinks';
import { RESERVED_SLUGS } from './productSlugs';

const hosted = () => JSON.parse(readFileSync(new URL('../../public/.well-known/apple-app-site-association', import.meta.url), 'utf8'));

const toPattern = (glob: string) =>
  new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

// mirrors how ios applies components: first match wins; `*` is any run of characters, `?` one
function opensApp(link: string): boolean {
  const url = new URL(link, 'https://wmcyn.online');
  const { components } = buildAppSiteAssociation().applinks.details[0];
  for (const component of components) {
    if (!toPattern(component['/']).test(url.pathname)) continue;
    const query = ('?' in component ? component['?'] : {}) as Record<string, string>;
    const queryMatches = Object.entries(query).every(([key, glob]) => {
      const value = url.searchParams.get(key);
      return value !== null && toPattern(glob).test(value);
    });
    if (!queryMatches) continue;
    return !('exclude' in component && component.exclude);
  }
  return false;
}

describe('apple-app-site-association', () => {
  it('the hosted file matches the reserved slug list', () => {
    expect(hosted(), 'regenerate public/.well-known/apple-app-site-association from buildAppSiteAssociation()').toEqual(buildAppSiteAssociation());
  });

  it('only lists app-routable names that are actually reserved', () => {
    for (const name of APP_ROUTABLE_RESERVED) expect(RESERVED_SLUGS).toContain(name);
  });

  it('opens the app for product links and leaves website pages alone', () => {
    for (const path of ['/wmcyn-og-hoodie', '/wmcyn-og-hoodie/', '/qr', '/ar/AB12CD34', '/p/7K3M9Q2XRT', '/p/7K3M9Q2XRT/claim', '/friends-and-family', '/sessions/live_1', '/shoulder-bag']) {
      expect(opensApp(path), path).toBe(true);
    }
    for (const path of ['/', '/shop', '/shop/', '/shop/friends-and-family', '/admin/product-sets', '/login/', '/privacy', '/terms', '/_next/static/x.js']) {
      expect(opensApp(path), path).toBe(false);
    }
  });

  it('home-page order claims and legacy sessions open the app; the bare home page does not', () => {
    expect(opensApp('/?orderId=1001&claimId=55-u0')).toBe(true);
    expect(opensApp('/?sessionId=live_1')).toBe(true);
    expect(opensApp('/?orderId=1001')).toBe(false);
    expect(opensApp('/?utm_source=ig')).toBe(false);
  });

  it('every app-bound vector is a link the app can route', () => {
    for (const { url, expect: expected } of vectorsFile.vectors) {
      if (!expected || !url.startsWith('https://') || expected.kind === 'web') continue;
      const { pathname, search } = new URL(url);
      expect(opensApp(`${pathname}${search}`), url).toBe(true);
      expect(parseWmcynUrl(url)).toEqual(expected);
    }
  });
});
