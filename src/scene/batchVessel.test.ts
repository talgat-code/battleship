import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { batchVessel } from './batchVessel';

describe('vessel geometry batching', () => {
  it('preserves local shape, colours and source geometry under a rotated parent', () => {
    const root = new THREE.Group(); root.position.set(3, .035, -2); root.rotation.y = Math.PI / 2;
    const red = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .3), new THREE.MeshStandardMaterial({ color: '#c84422' }));
    const blue = new THREE.Mesh(new THREE.BoxGeometry(.2, .4, .1), new THREE.MeshStandardMaterial({ color: '#2244bb' }));
    blue.position.set(.3, .2, 0); root.add(red, blue);
    const originalPositions = Array.from(red.geometry.attributes.position.array);
    const cleanup = batchVessel(root);
    const combined = root.getObjectByName('batched-vessel') as THREE.Mesh;
    combined.geometry.computeBoundingBox();
    expect(combined.geometry.boundingBox!.min.x).toBeCloseTo(-.2);
    expect(combined.geometry.boundingBox!.max.x).toBeCloseTo(.4);
    expect(combined.geometry.boundingBox!.max.y).toBeCloseTo(.4);
    const colors = combined.geometry.getAttribute('color');
    expect(colors.getX(0)).toBeCloseTo(red.material.color.r);
    expect(colors.getZ(colors.count - 1)).toBeCloseTo(blue.material.color.b);
    expect(red.visible).toBe(false); expect(blue.visible).toBe(false);
    expect(Array.from(red.geometry.attributes.position.array)).toEqual(originalPositions);
    cleanup();
    expect(root.getObjectByName('batched-vessel')).toBeUndefined();
    expect(red.visible).toBe(true); expect(blue.visible).toBe(true);
    red.geometry.dispose(); blue.geometry.dispose(); red.material.dispose(); blue.material.dispose();
  });
});
