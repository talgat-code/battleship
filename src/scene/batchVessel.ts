import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake the static parts into one vertex-coloured draw per vessel.
 * The parent still rocks as a single rigid object; emissive navigation lights
 * stay separate. No game coordinates or source geometries are modified. */
export function batchVessel(root: THREE.Group) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const source: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial) || object.material.emissiveIntensity > 1) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    const color = object.material.color;
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.clearGroups();
    geometries.push(geometry); source.push(object);
  });
  const combined = mergeGeometries(geometries);
  geometries.forEach(g => g.dispose());
  if (!combined) return () => {};
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .3 });
  const mesh = new THREE.Mesh(combined, material);
  mesh.name = 'batched-vessel'; mesh.castShadow = true;
  // Water receives the ship shadow. Avoid noisy self-shadowing on tiny details.
  mesh.receiveShadow = false;
  source.forEach(m => { m.visible = false; });
  root.add(mesh);
  return () => {
    root.remove(mesh); combined.dispose(); material.dispose();
    source.forEach(m => { m.visible = true; });
  };
}
