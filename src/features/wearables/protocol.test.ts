import { describe, expect, it } from 'vitest';
import { isFresh, parsePose, Pose } from './protocol';
const pose: Pose = {v:1, seq:2, receivedAtMs:100, publishedAtMs:100, processingMs:10, tracking:true, synthetic:false, targetId:'wmcyn-hq-banner', matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-1,1],width:360,height:640};
describe('wearable packets', () => {
  it('rejects malformed matrices, targets and sequences', () => {
    expect(parsePose(pose)).toEqual(pose);
    expect(parsePose({...pose, matrix: [1]})).toBeNull();
    expect(parsePose({...pose, matrix: Array(16).fill(NaN)})).toBeNull();
    expect(parsePose({...pose, targetId:'other'})).toBeNull();
    expect(parsePose({...pose, seq:1.5})).toBeNull();
  });
  it('rejects old, repeated and implausibly future samples', () => {
    expect(isFresh(pose, 200, 1)).toBe(true);
    expect(isFresh(pose, 200, 2)).toBe(false);
    expect(isFresh(pose, 1000, 1)).toBe(false);
    expect(isFresh({...pose,publishedAtMs:5000}, 200, 1)).toBe(false);
  });
});
