import { describe, expect, it } from 'vitest';
import { sharkPose, vesselPose } from './motion';

describe('bounded decorative motion', () => {
  it('keeps ship bob and rotations within cell-safe limits', () => {
    for (let t = 0; t < 120; t += .5) for (const x of [-4.5, 0, 4.5]) {
      const pose = vesselPose(x, 2, t);
      expect(Math.abs(pose.y - .035)).toBeLessThanOrEqual(.026);
      expect(Math.abs(pose.roll)).toBeLessThanOrEqual(.018);
      expect(Math.abs(pose.pitch)).toBeLessThanOrEqual(.011);
    }
  });
  it('gives different vessels distinct motion without changing their anchors', () => {
    expect(vesselPose(0, 0, 2, 0)).not.toEqual(vesselPose(0, 0, 2, 1));
  });
  it('keeps all three fixed shark routes in the sea and smooth', () => {
    for (let i = 0; i < 3; i++) for (let t = 0; t < 200; t++) {
      const a = sharkPose(i, t), b = sharkPose(i, t + .03);
      expect(Math.abs(a.x)).toBeLessThan(3.3);
      expect(Math.abs(a.z)).toBeLessThan(3);
      expect(a.y).toBeLessThan(0);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(.01);
    }
  });
});
