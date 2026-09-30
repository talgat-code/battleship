import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Sailor({ x, z, phase, moving }: { x: number; z: number; phase: number; moving: boolean }) {
  const arm = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = moving ? -.25 + Math.max(0, Math.sin(clock.elapsedTime * .35 + phase)) ** 12 * .65 : -.25;
  });
  return <group position={[x, .34, z]} name="deck-crew">
    <mesh position={[0, .08, 0]}><boxGeometry args={[.055, .09, .045]} /><meshStandardMaterial color="#e6ac54" /></mesh>
    <mesh position={[0, .148, 0]}><sphereGeometry args={[.027, 6, 4]} /><meshStandardMaterial color="#f4e4bc" /></mesh>
    {[-.016, .016].map(a => <mesh key={a} position={[a, .027, 0]}><boxGeometry args={[.018, .055, .025]} /><meshStandardMaterial color="#233347" /></mesh>)}
    <mesh ref={arm} position={[.045, .092, 0]} rotation={[0, 0, -.25]}><boxGeometry args={[.065, .018, .02]} /><meshStandardMaterial color="#e6ac54" /></mesh>
  </group>;
}
export default function Crew({ moving, lite }: { moving: boolean; lite: boolean }) {
  return <group name="visible-deck-crew">{(lite ? [-.65, .15] : [-.65, .15, .92]).map((x, i) => <Sailor key={x} x={x} z={.26} phase={i * 2} moving={moving} />)}</group>;
}
