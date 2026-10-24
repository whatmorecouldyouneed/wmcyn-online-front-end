import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/lib/firebase', () => ({ db: undefined }));

const { newsletterKey } = await import('./newsletter');

describe('newsletter keys', () => {
  it('give one key per address regardless of case or spacing', async () => {
    const key = await newsletterKey('Fan@Example.com ');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await newsletterKey('fan@example.com')).toBe(key);
    expect(await newsletterKey('other@example.com')).not.toBe(key);
  });

  it('never contain the address itself', async () => {
    expect(await newsletterKey('fan@example.com')).not.toContain('fan');
  });
});
