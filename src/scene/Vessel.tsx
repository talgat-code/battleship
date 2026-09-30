import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Ship } from '../game';
import Wake from './Wake';
import { vesselPose } from './motion';
import { batchVessel } from './batchVessel';
import Crew from './Crew';

type Vec = [number, number, number];
function Part({ at, size, color = '#b7cbd2', rotation = [0, 0, 0] }: { at: Vec; size: Vec; color?: string; rotation?: Vec }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.55} metalness={.28} />
  </mesh>;
}
function Radar({ x, y }: { x: number; y: number }) {
  return <group position={[x, y, 0]}>
    <Part at={[0, .16, 0]} size={[.045, .32, .045]} color="#344c5c" />
    <Part at={[0, .29, 0]} size={[.3, .055, .13]} color="#d6e4e5" />
    <Part at={[0, .3, -.075]} size={[.24, .035, .018]} color="#397185" />
    <Part at={[0, .32, 0]} size={[.035, .19, .035]} color="#e0f6f3" />
  </group>;
}
function Turret({ x, y = .37, dual = false }: { x: number; y?: number; dual?: boolean }) {
  return <group position={[x, y, 0]}>
    <mesh castShadow><cylinderGeometry args={[.12, .16, .13, 8]} /><meshStandardMaterial color="#c6d7d9" metalness={.4} roughness={.5} /></mesh>
    <Part at={[-.015, .08, 0]} size={[.21, .11, .23]} color="#9fb2b7" rotation={[0, 0, -.13]} />
    {(dual ? [-.055, .055] : [0]).map(z => <Part key={z} at={[-.2, .105, z]} size={[.37, .043, .035]} color="#415165" />)}
  </group>;
}
function Airplane({ x, z }: { x: number; z: number }) {
  return <group position={[x, .38, z]}>
    <Part at={[0, 0, 0]} size={[.32, .045, .062]} color="#e1e7dc" />
    <mesh position={[-.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.032, .12, 6]} /><meshStandardMaterial color="#cad6d2" /></mesh>
    <Part at={[.025, .02, 0]} size={[.13, .027, .33]} color="#d6e4df" rotation={[0, .2, 0]} />
    <Part at={[.13, .05, 0]} size={[.075, .095, .02]} color="#78c9c6" />
    <Part at={[.13, .01, 0]} size={[.07, .02, .17]} color="#c9ded9" />
    <Part at={[-.08, .034, 0]} size={[.06, .025, .04]} color="#314c69" />
  </group>;
}
// Each hull is contained within length × 1 cells, including bevels and details.
export default function Vessel({ ship, sunk, moving, detailed = false, lite = false }: { ship: Ship; sunk: boolean; moving: boolean; detailed?: boolean; lite?: boolean }) {
  const n = ship.length;
  const placement=useRef<THREE.Group>(null);
  const sinkStart=useRef<number|null>(null);
  const rocking = useRef<THREE.Group>(null);
  const structure = useRef<THREE.Group>(null);
  const width = n === 4 ? .4 : n === 1 ? .27 : n === 2 ? .31 : .36;
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-n / 2 + .09, 0);
    s.lineTo(-n / 2 + .21, -width * .5);
    s.lineTo(-n / 2 + Math.min(.48, n * .35), -width);
    s.lineTo(n / 2 - .16, -width);
    s.lineTo(n / 2 - .08, -width * .65);
    s.lineTo(n / 2 - .08, width * .65);
    s.lineTo(n / 2 - .16, width);
    s.lineTo(-n / 2 + Math.min(.48, n * .35), width);
    s.lineTo(-n / 2 + .21, width * .5);
    s.closePath();
    return s;
  }, [n, width]);
  const vertical = n > 1 && ship.cells[0].x === ship.cells[1].x;
  const x = ship.cells.reduce((sum, c) => sum + c.x, 0) / n - 4.5;
  const z = ship.cells.reduce((sum, c) => sum + c.y, 0) / n - 4.5;
  useLayoutEffect(() => {
    if (structure.current) return batchVessel(structure.current);
  }, [n, sunk, detailed, lite]);
  useLayoutEffect(()=>{if(placement.current)placement.current.rotation.y=vertical?-Math.PI/2:0;},[]);
  useFrame(({ clock }) => {
    if(placement.current){const target=vertical?-Math.PI/2:0;placement.current.rotation.y=moving?THREE.MathUtils.lerp(placement.current.rotation.y,target,.22):target;}
    if (!rocking.current) return;
    const pose = vesselPose(x, z, moving ? clock.elapsedTime : 0, ship.id);
    if(sunk&&sinkStart.current===null)sinkStart.current=clock.elapsedTime;
    const sinking=moving&&sunk?Math.min(1,(clock.elapsedTime-(sinkStart.current||0))/1.4):1;
    rocking.current.position.y = sunk ? .035-.225*sinking : moving ? pose.y : .035;
    rocking.current.rotation.set(sunk ? .035 : moving ? pose.roll : 0, 0, sunk ? 0 : moving ? pose.pitch : 0);
  });
  return <group ref={placement} name={`vessel-${ship.id}`} position={[x, 0, z]}>
    {!sunk && <Wake length={n} moving={moving} phase={ship.id * .7} />}
    <group ref={rocking} name="vessel-motion" position={[0, sunk ? -.19 : .035, 0]}>
    <group ref={structure}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: .23, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, steps: 1 }]} />
      <meshStandardMaterial color={sunk ? '#65474b' : n === 1 ? '#68898f' : n === 2 ? '#466981' : n === 3 ? '#3a4e73' : '#4f6282'} roughness={.38} metalness={.48} />
    </mesh>
    <mesh position={[0, .266, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} /><meshStandardMaterial color={sunk ? '#64433e' : n === 4 ? '#4e6579' : n === 1 ? '#c4c4ad' : '#a8b4b8'} roughness={.65} metalness={.16} />
    </mesh>
    {/* Low, broad deck edges stay readable at phone scale. */}
    {[-1, 1].map(side => <Part key={`rail-${side}`} at={[.06, .295, side * (width - .035)]} size={[n * .58, .047, .027]} color={sunk ? '#65474b' : '#c6c1a7'} />)}
    {detailed && n > 1 && [-1, 1].flatMap(side => [-.55, 0, .55].map(x => <Part key={`post-${side}-${x}`} at={[x * n * .45, .325, side * (width - .035)]} size={[.023, .11, .023]} color="#e0d7b9" />))}
    {n === 1 && <>
      <Part at={[.12, .36, 0]} size={[.35, .21, .39]} color="#eef0dc" />
      <Part at={[-.06, .4, 0]} size={[.02, .09, .31]} color="#117e96" />
      <Part at={[.1, .49, 0]} size={[.22, .045, .28]} color="#365869" />
      <Part at={[.19, .6, 0]} size={[.024, .21, .024]} color="#dae4dd" />
      <Part at={[-.29, .28, 0]} size={[.16, .035, .11]} color="#f7b15f" />
      {[-.225, .225].map(z => <Part key={z} at={[.28, .29, z]} size={[.15, .065, .07]} color="#daaa6b" />)}
    </>}
    {(n === 2 || n === 3) && <>
      <Part at={[.08, .36, 0]} size={[n === 3 ? .85 : .54, .2, .48]} color="#829ea9" />
      <Part at={[-.05, .54, 0]} size={[.38, .19, .37]} color="#e3e9dd" />
      <Part at={[-.25, .56, 0]} size={[.02, .07, .31]} color="#14798a" />
      {[-.193, .193].map(z => <Part key={z} at={[-.06, .56, z]} size={[.26, .07, .012]} color="#167c91" />)}
      <Radar x={.06} y={.64} />
      {[-1,1].map(side=><group key={`launch-${side}`} position={[.3,.32,side*(width-.09)]}>
        <mesh rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[.045,n===3?.25:.16,2,6]}/><meshStandardMaterial color="#d4b281"/></mesh>
        <Part at={[0,.05,0]} size={[.12,.035,.06]} color="#3e5964"/>
      </group>)}
      <Turret x={-n / 2 + .55} dual={n === 3} />
      <Part at={[-.055, .674, 0]} size={[.45, .055, .41]} color="#647e8a" />
      <Part at={[n === 3 ? .59 : .48, .47, 0]} size={[.22, .32, .26]} color="#3e5663" />
      <Part at={[n === 3 ? .59 : .48, .64, 0]} size={[.25, .025, .28]} color="#253643" />
      {n === 3 ? <>
        <Part at={[.99, .29, 0]} size={[.54, .035, .52]} color="#5f8392" />
        <Part at={[.99, .315, 0]} size={[.25, .008, .03]} color="#f0d690" />
        {[-.13, .13].map(z => <Part key={z} at={[.99, .315, z]} size={[.03, .008, .26]} color="#f0d690" />)}
        {detailed&&!lite&&<group position={[1.03,.39,0]}>
          <mesh scale={[1.5,.7,.7]}><sphereGeometry args={[.095,8,6]}/><meshStandardMaterial color="#b8cbd0"/></mesh>
          <Part at={[-.085,.025,0]} size={[.07,.065,.085]} color="#216277"/>
          <Part at={[.15,.015,0]} size={[.2,.035,.035]} color="#829ea9"/>
          <Part at={[.23,.055,0]} size={[.04,.09,.02]} color="#d4d8b9"/>
          <Part at={[0,.115,0]} size={[.4,.015,.025]} color="#263e51" rotation={[0,.5,0]}/>
          <Part at={[0,.115,0]} size={[.025,.015,.4]} color="#263e51" rotation={[0,.5,0]}/>
        </group>}
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
      <Part at={[-.12, .33, .06]} size={[3.22, .012, .024]} color="#e7e9cb" rotation={[0, -.045, 0]} />
      {[.9, 1.08, 1.26].map(x => <Part key={`wire-${x}`} at={[x, .335, .14]} size={[.015, .008, .28]} color="#c6cbb5" />)}
      {Array.from({ length: 9 }, (_, i) => <Part key={i} at={[-1.48 + i * .34, .332, .18]} size={[.16, .012, .015]} color="#f5db91" />)}
      {[-1.05, -.33, 1.2].map(a => <Airplane key={a} x={a} z={a === 1.2 ? -.04 : -.12} />)}
    </>}
    {!sunk && n > 1 && [-1, 1].map(side => <Part key={side} at={[n / 2 - .27, .29, side * (width - .035)]} size={[.19, .025, .025]} color={side === 1 ? '#35d6cf' : '#ff825c'} />)}
    {!sunk && <mesh position={[n === 4 ? .27 : -.08, n === 4 ? .78 : .52, 0]}><sphereGeometry args={[.035, 6, 4]} /><meshStandardMaterial color="#ffe1a1" emissive="#ffb95a" emissiveIntensity={2} /></mesh>}
    {n >= 2 && <group position={[.13, n === 4 ? .79 : .72, .13]}><Part at={[0, -.035, 0]} size={[.035, .065, .035]} color="#455365" /><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.042, .055, .085, 8]} /><meshStandardMaterial color="#ebdcc0" /></mesh></group>}
    </group>
    {detailed && n === 4 && !sunk && <Crew moving={moving} lite={lite} />}
    </group>
  </group>;
}
