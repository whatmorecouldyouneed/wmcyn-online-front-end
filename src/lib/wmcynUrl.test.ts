import { describe, expect, it } from 'vitest';
import vectorsFile from './wmcyn-url-vectors.json';
import { fragmentParam, parseWmcynUrl } from './wmcynUrl';

describe('shared wmcyn url grammar', () => {
  it('parses every shared vector exactly like the backend', () => {
    expect(vectorsFile.vectors.length).toBeGreaterThan(20);
    for (const { url, expect: expected } of vectorsFile.vectors) {
      expect(parseWmcynUrl(url), url).toEqual(expected);
    }
  });

  it('reads claim secrets only from the fragment', () => {
    expect(fragmentParam('https://wmcyn.online/p/7K3M9Q2XRT/claim#k=ABCD', 'k')).toBe('ABCD');
    expect(fragmentParam('https://wmcyn.online/?orderId=1&claimId=2#token=abc', 'token')).toBe('abc');
    expect(fragmentParam('https://wmcyn.online/p/7K3M9Q2XRT/claim?k=ABCD', 'k')).toBeNull();
    expect(JSON.stringify(parseWmcynUrl('https://wmcyn.online/p/7K3M9Q2XRT/claim#k=ABCD'))).not.toContain('ABCD');
  });
});
