import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sharkPose } from './motion';

function Fin({ dorsal = false }: { dorsal?: boolean }) {
  const vertices = dorsal ? [-.12, 0, 0, .13, .23, 0, .25, 0, 0] : [-.13, 0, 0, .21, 0, .43, .22, 0, 0];
  return <mesh raycast={() => {}}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(vertices), 3]} /></bufferGeometry><meshBasicMaterial color="#143443" side={THREE.DoubleSide} /></mesh>;
}
function Shark({ index, moving }: { index: number; moving: boolean }) {
  const body = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const pose = sharkPose(index, 0);
  useFrame(({ clock }) => {
    if (!moving || !body.current) return;
    const p = sharkPose(index, clock.elapsedTime);
    body.current.position.set(p.x, p.y, p.z); body.current.rotation.y = p.heading;
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * 1.6 + index) * .19;
  });
  return <group ref={body} name={`decorative-shark-${index}`} position={[pose.x, pose.y, pose.z]} rotation={[0, pose.heading, 0]} scale={.72 + index * .07}>
    <mesh scale={[.58, .1, .14]} raycast={() => {}}><sphereGeometry args={[1, 12, 6]} /><meshBasicMaterial color="#061c30" /></mesh>
    <Fin dorsal /><Fin /><group scale={[1, 1, -1]}><Fin /></group>
    <group ref={tail} position={[.48, 0, 0]}><mesh rotation={[Math.PI / 2, 0, 0]} scale={[.17, .3, .045]} raycast={() => {}}><coneGeometry args={[1, 1, 3]} /><meshBasicMaterial color="#173b48" /></mesh></group>
  </group>;
}
export default function Sharks({ enemy, moving }: { enemy: boolean; moving: boolean }) {
  // Three sharks across the two sectors; no hidden board data enters this component.
  return <group>{(enemy ? [2] : [0, 1]).map(index => <Shark key={index} index={index} moving={moving} />)}</group>;
}
