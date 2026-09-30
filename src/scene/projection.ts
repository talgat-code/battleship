// One projection contract for the camera, DOM hit targets and browser tests.
export const PROJECTION = { span: 11.4, aspect: 1.02, targetZ: -.45, cameraY: 20, cameraZ: 12 };
const distance = Math.hypot(PROJECTION.cameraY, PROJECTION.cameraZ);
const upY = PROJECTION.cameraZ / distance;
const upZ = -PROJECTION.cameraY / distance;
export function projectPoint(x: number, y: number, z: number) {
  const height = PROJECTION.span / PROJECTION.aspect;
  return { x: .5 + x / PROJECTION.span, y: .5 - (y * upY + (z - PROJECTION.targetZ) * upZ) / height };
}
const topLeft = projectPoint(-5, 0, -5);
const bottomRight = projectPoint(5, 0, 5);
export const GRID = { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
