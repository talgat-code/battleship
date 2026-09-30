import { useMemo } from 'react';
import * as THREE from 'three';
import type { Ship } from '../game';

type Vec = [number, number, number];
function Part({ at, size, color = '#b7cbd2', rotation = [0, 0, 0] }: { at: Vec; size: Vec; color?: string; rotation?: Vec }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.55} metalness={.28} />
  </mesh>;
}
function Radar({ x, y }: { x: number; y: number }) {
  return <group position={[x, y, 0]}>
    <Part at={[0, .16, 0]} size={[.045, .32, .045]} color="#344c5c" />
    <Part at={[0, .29, 0]} size={[.25, .045, .13]} color="#d6e4e5" />
    <Part at={[0, .32, 0]} size={[.035, .19, .035]} color="#e0f6f3" />
  </group>;
}
function Turret({ x, y = .37 }: { x: number; y?: number }) {
  return <group position={[x, y, 0]}>
    <mesh castShadow><cylinderGeometry args={[.12, .16, .13, 8]} /><meshStandardMaterial color="#c6d7d9" metalness={.4} roughness={.5} /></mesh>
    <Part at={[-.16, .06, 0]} size={[.3, .045, .045]} color="#3e5666" />
  </group>;
}
// Each hull is contained within length × 1 cells, including bevels and details.
export default function Vessel({ ship, sunk }: { ship: Ship; sunk: boolean }) {
  const n = ship.length;
  const width = n === 4 ? .4 : n === 1 ? .3 : .35;
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-n / 2 + .09, 0);
    s.lineTo(-n / 2 + Math.min(.48, n * .35), -width);
    s.lineTo(n / 2 - .16, -width);
    s.lineTo(n / 2 - .08, -width * .65);
    s.lineTo(n / 2 - .08, width * .65);
    s.lineTo(n / 2 - .16, width);
    s.lineTo(-n / 2 + Math.min(.48, n * .35), width);
    s.closePath();
    return s;
  }, [n, width]);
  const vertical = n > 1 && ship.cells[0].x === ship.cells[1].x;
  const x = ship.cells.reduce((sum, c) => sum + c.x, 0) / n - 4.5;
  const z = ship.cells.reduce((sum, c) => sum + c.y, 0) / n - 4.5;
  return <group position={[x, sunk ? -.2 : .025, z]} rotation={[0, vertical ? -Math.PI / 2 : 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: .23, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, steps: 1 }]} />
      <meshStandardMaterial color={sunk ? '#754e46' : '#506d81'} roughness={.42} metalness={.5} />
    </mesh>
    <mesh position={[0, .255, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} /><meshStandardMaterial color={sunk ? '#64433e' : n === 4 ? '#536c80' : '#d1ddda'} roughness={.7} />
    </mesh>
    {n === 1 && <>
      <Part at={[.12, .36, 0]} size={[.35, .21, .39]} color="#eef0dc" />
      <Part at={[-.06, .4, 0]} size={[.02, .09, .31]} color="#117e96" />
      <Part at={[.1, .49, 0]} size={[.22, .045, .28]} color="#365869" />
      <Part at={[.19, .6, 0]} size={[.024, .21, .024]} color="#dae4dd" />
      <Part at={[-.29, .28, 0]} size={[.16, .035, .11]} color="#f7b15f" />
      {[-.25, .25].map(z => <Part key={z} at={[.28, .29, z]} size={[.15, .065, .07]} color="#f29c61" />)}
    </>}
    {(n === 2 || n === 3) && <>
      <Part at={[.08, .36, 0]} size={[n === 3 ? .85 : .54, .2, .48]} color="#829ea9" />
      <Part at={[-.05, .54, 0]} size={[.38, .19, .37]} color="#e3e9dd" />
      <Part at={[-.25, .56, 0]} size={[.02, .07, .31]} color="#14798a" />
      {[-.193, .193].map(z => <Part key={z} at={[-.06, .56, z]} size={[.26, .07, .012]} color="#167c91" />)}
      <Radar x={.06} y={.64} />
      <Turret x={-n / 2 + .55} />
      <Part at={[n === 3 ? .59 : .48, .47, 0]} size={[.22, .32, .26]} color="#3e5663" />
      <Part at={[n === 3 ? .59 : .48, .64, 0]} size={[.25, .025, .28]} color="#253643" />
      {n === 3 ? <>
        <Part at={[.99, .29, 0]} size={[.54, .035, .52]} color="#5f8392" />
        <Part at={[.99, .315, 0]} size={[.25, .008, .03]} color="#f0d690" />
        {[-.13, .13].map(z => <Part key={z} at={[.99, .315, z]} size={[.03, .008, .26]} color="#f0d690" />)}
        {[-.18, 0, .18].map(z => <Part key={z} at={[-.57, .38, z]} size={[.23, .15, .1]} color="#394f5e" rotation={[0, 0, -.25]} />)}
      </> : <Part at={[.7, .31, 0]} size={[.18, .1, .31]} color="#e4ad6d" />}
    </>}
    {n === 4 && <>
      <Part at={[.02, .29, 0]} size={[3.64, .065, .76]} color="#526777" />
      {[-.34, .34].map(z => <Part key={z} at={[0, .326, z]} size={[3.5, .012, .018]} color="#f3bf68" />)}
      <Part at={[.59, .48, -.22]} size={[.84, .31, .25]} color="#a4bbc3" />
      <Part at={[.45, .69, -.22]} size={[.41, .12, .29]} color="#e0e7d9" />
      <Part at={[.24, .7, -.22]} size={[.02, .06, .24]} color="#147f93" />
      <group position={[0, 0, -.2]}><Radar x={.64} y={.75} /></group>
      <Part at={[-.12, .33, .08]} size={[3.22, .012, .024]} color="#e7e9cb" />
      {Array.from({ length: 9 }, (_, i) => <Part key={i} at={[-1.48 + i * .34, .332, .18]} size={[.16, .012, .015]} color="#f5db91" />)}
      {[-1.05, -.33, 1.2].map(a => <group key={a} position={[a, .38, a === 1.2 ? -.04 : -.12]}>
        <Part at={[0, 0, 0]} size={[.37, .045, .065]} color="#d9e9e5" />
        <Part at={[.045, .025, 0]} size={[.13, .035, .3]} color="#d9e9e5" rotation={[0, .2, 0]} />
        <Part at={[.13, .055, 0]} size={[.08, .09, .022]} color="#59c6c0" />
      </group>)}
    </>}
    {!sunk && n > 1 && [-1, 1].map(side => <Part key={side} at={[n / 2 - .27, .29, side * (width - .035)]} size={[.19, .025, .025]} color={side === 1 ? '#35d6cf' : '#ff825c'} />)}
  </group>;
}
