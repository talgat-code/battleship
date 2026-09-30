import { describe, expect, it } from 'vitest';
import { OrthographicCamera, Vector3 } from 'three';
import { GRID, PROJECTION, projectPoint } from './projection';

describe('landscape and gameplay projection', () => {
  it('maps all 100 cell centres exactly to the real orthographic camera', () => {
    const width = PROJECTION.span, height = width / PROJECTION.aspect;
    const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 100);
    camera.position.set(0, PROJECTION.cameraY, PROJECTION.cameraZ + PROJECTION.targetZ);
    camera.lookAt(0, 0, PROJECTION.targetZ); camera.updateMatrixWorld();
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const actual = new Vector3(x - 4.5, 0, y - 4.5).project(camera);
      expect(GRID.left + (x + .5) * GRID.width / 10).toBeCloseTo((actual.x + 1) / 2, 8);
      expect(GRID.top + (y + .5) * GRID.height / 10).toBeCloseTo((1 - actual.y) / 2, 8);
    }
  });
  it('keeps the entire compact grid and coordinate gutter inside the canvas', () => {
    expect(GRID.top - .055).toBeGreaterThan(0);
    expect(GRID.left).toBeGreaterThan(0);
    expect(projectPoint(5, 0, 5).x).toBeLessThan(1);
    expect(projectPoint(5, 0, 5).y).toBeLessThan(1);
  });
});
