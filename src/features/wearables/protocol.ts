export const TARGET_ID = 'wmcyn-hq-banner';
export const STALE_MS = 500;
export type Pose = {
  v: 1; seq: number; receivedAtMs: number; publishedAtMs: number;
  processingMs: number; tracking: boolean; synthetic: boolean;
  targetId: string; matrix: number[]; width: number; height: number;
};
export function parsePose(value: unknown): Pose | null {
  const p = value as Pose;
  if (!p || p.v !== 1 || p.targetId !== TARGET_ID || typeof p.tracking !== 'boolean' || typeof p.synthetic !== 'boolean') return null;
  if (![p.seq, p.receivedAtMs, p.publishedAtMs, p.processingMs, p.width, p.height].every(n => Number.isFinite(n) && n >= 0)) return null;
  if (!Number.isSafeInteger(p.seq) || !Array.isArray(p.matrix) || p.matrix.length !== 16 || !p.matrix.every(n => Number.isFinite(n) && Math.abs(n) <= 1e6)) return null;
  return p;
}
export function isFresh(p: Pose, now: number, lastSeq: number): boolean {
  return p.seq > lastSeq && now - p.publishedAtMs <= STALE_MS && now >= p.publishedAtMs - 1000;
}
