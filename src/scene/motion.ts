// Visual motion only: never changes a game Cell or Ship.
export function swell(x: number, z: number, time: number) {
  return Math.sin(x * .75 + z * .5 + time * .65) * .018 + Math.sin(z * .9 - time * .42) * .008;
}
export function vesselPose(x: number, z: number, time: number, id = 0) {
  const phase = id * .73;
  return { y: .035 + swell(x, z, time + phase), roll: Math.sin(time * .65 + x * .75 + z * .5 + phase) * .018, pitch: Math.cos(time * .42 + z * .9 + phase) * .011 };
}
// Fixed decorative routes are deliberately independent of either fleet.
export function sharkPose(index: number, time: number) {
  const a = time * (.035 + index * .006) + index * 2.2;
  const rx = 2.6 + index * .3, rz = 2.25 + index * .24;
  return { x: Math.cos(a) * rx, z: Math.sin(a) * rz, y: -.25 - index * .11 + Math.sin(a * 2) * .19, heading: Math.atan2(rz * Math.cos(a), rx * Math.sin(a)) };
}
