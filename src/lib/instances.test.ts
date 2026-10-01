import { describe, expect, it } from 'vitest';
import { editionLabel, formatClaimCode, pendingClaimKey } from './instances';

describe('product instance helpers', () => {
  it('formats typed claim codes into four groups and drops junk', () => {
    expect(formatClaimCode('abcd efgh-jkmn pqrs')).toBe('ABCD-EFGH-JKMN-PQRS');
    expect(formatClaimCode('ab')).toBe('AB');
    expect(formatClaimCode('ABCDEFGHJKMNPQRSTVWX')).toBe('ABCD-EFGH-JKMN-PQRS');
    expect(formatClaimCode('')).toBe('');
  });

  it('labels editions only when they are known', () => {
    expect(editionLabel({ editionNumber: 3, editionSize: 25 })).toBe('3 of 25');
    expect(editionLabel({ editionNumber: 3, editionSize: null })).toBe('no. 3');
    expect(editionLabel({ editionNumber: null, editionSize: null })).toBeNull();
  });

  it('keys pending claims by item', () => {
    expect(pendingClaimKey('7K3M9Q2XRT')).toBe('wmcyn_pending_claim:7K3M9Q2XRT');
  });
});
