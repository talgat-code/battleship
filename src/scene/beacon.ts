import { Vector3 } from 'three';
export const BEACON_SOURCE = new Vector3(-17, 8.5, -14);
export const BEACON_TILT = .14;
export function beaconDirection(angle: number) { return new Vector3(Math.cos(angle),-BEACON_TILT,-Math.sin(angle)).normalize(); }
export type BeamState = { angle: number; direction: Vector3; length: { value: number } };
