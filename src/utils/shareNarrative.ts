import type { ARShareMetadata } from '@/types/arSessions';

/** eyebrow line — keep in sync with canvas overlay in shareARCapture */
export const SHARE_CARD_EYEBROW = 'captured in augmented reality on wmcyn.online';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

function ordinalDay(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/** e.g. december 18th, 2025 */
export function formatShareDateLong(dateString: string): string {
  const date = new Date(dateString);
  const m = MONTHS[date.getMonth()];
  const d = ordinalDay(date.getDate());
  const y = date.getFullYear();
  return `${m} ${d}, ${y}`;
}

// expand trailing ", ga" style to ", georgia" for share copy
const US_STATE_NAMES: Record<string, string> = {
  al: 'alabama',
  ak: 'alaska',
  az: 'arizona',
  ar: 'arkansas',
  ca: 'california',
  co: 'colorado',
  ct: 'connecticut',
  de: 'delaware',
  fl: 'florida',
  ga: 'georgia',
  hi: 'hawaii',
  id: 'idaho',
  il: 'illinois',
  in: 'indiana',
  ia: 'iowa',
  ks: 'kansas',
  ky: 'kentucky',
  la: 'louisiana',
  me: 'maine',
  md: 'maryland',
  ma: 'massachusetts',
  mi: 'michigan',
  mn: 'minnesota',
  ms: 'mississippi',
  mo: 'missouri',
  mt: 'montana',
  ne: 'nebraska',
  nv: 'nevada',
  nh: 'new hampshire',
  nj: 'new jersey',
  nm: 'new mexico',
  ny: 'new york',
  nc: 'north carolina',
  nd: 'north dakota',
  oh: 'ohio',
  ok: 'oklahoma',
  or: 'oregon',
  pa: 'pennsylvania',
  ri: 'rhode island',
  sc: 'south carolina',
  sd: 'south dakota',
  tn: 'tennessee',
  tx: 'texas',
  ut: 'utah',
  vt: 'vermont',
  va: 'virginia',
  wa: 'washington',
  wv: 'west virginia',
  wi: 'wisconsin',
  wy: 'wyoming',
  dc: 'district of columbia',
};

export function formatLocationForShare(location: string | undefined): string {
  if (!location?.trim()) return '';
  const trimmed = location.trim();
  const m = trimmed.match(/^(.+),\s*([a-zA-Z]{2})\s*$/);
  if (m) {
    const place = m[1].trim();
    const abbr = m[2].toLowerCase();
    const full = US_STATE_NAMES[abbr];
    if (full) return `${place.toLowerCase()}, ${full}`;
  }
  return trimmed.toLowerCase();
}

function formatPriceClause(meta: ARShareMetadata): string | null {
  if (!meta.priceAmount) return null;
  const a = (meta.priceAmount || '').toLowerCase();
  if (a === 'priceless') return '$priceless';
  if (meta.priceCurrency === 'USD' && /^\d/.test(meta.priceAmount))
    return `$${meta.priceAmount}`;
  return `$${meta.priceAmount}`;
}

/** one flowing block — shared by ARShareCard and canvas share overlay */
export function buildNarrativeLine(meta: ARShareMetadata): string {
  const isProduct = meta.kind === 'product' || meta.printDate != null;

  if (isProduct) {
    const head =
      meta.printDate != null
        ? meta.printLocation?.trim()
          ? `this piece was printed ${formatShareDateLong(meta.printDate)} in ${formatLocationForShare(meta.printLocation)}`
          : `this piece was printed ${formatShareDateLong(meta.printDate)}`
        : meta.printLocation?.trim()
          ? `this piece was printed in ${formatLocationForShare(meta.printLocation)}`
          : '';

    const mid: string[] = [];
    if (meta.editionNumber != null && meta.quantity != null) {
      mid.push(`piece number ${meta.editionNumber} of ${meta.quantity}`);
    } else if (meta.quantity != null) {
      mid.push(`limited to ${meta.quantity}`);
    }

    const price = formatPriceClause(meta);
    if (price) mid.push(price);

    if (meta.isClaimed) mid.push('already claimed');
    else mid.push('swipe up to shop!');

    const tail = mid.join(', ');
    let line = head && tail ? `${head}. ${tail}` : tail || head;
    if (meta.isClaimed && line.includes('already claimed') && !line.endsWith('.')) line += '.';

    return line;
  }

  const clauses: string[] = [];
  if (meta.createdAt) clauses.push(`created ${formatShareDateLong(meta.createdAt)}`);
  if (meta.campaign) clauses.push(`from the ${meta.campaign} drop`);

  return clauses.join(', ');
}
