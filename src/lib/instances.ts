import type { PublicInstance } from '@/types/instances';

export function editionLabel(instance: Pick<PublicInstance, 'editionNumber' | 'editionSize'>): string | null {
  if (instance.editionNumber && instance.editionSize) return `${instance.editionNumber} of ${instance.editionSize}`;
  if (instance.editionNumber) return `no. ${instance.editionNumber}`;
  return null;
}

// printed codes are XXXX-XXXX-XXXX-XXXX; the server ignores case, spaces, and dashes
export function formatClaimCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 16);
  return compact.match(/.{1,4}/g)?.join('-') ?? '';
}

// holds a claim code across the sign-in round trip without putting it in a url
export const pendingClaimKey = (publicId: string) => `wmcyn_pending_claim:${publicId}`;
