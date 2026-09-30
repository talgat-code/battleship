import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

function Dock(){
  return <group position={[-14,-.12,-8]} rotation={[0,-.3,0]} name="harbor-dock">
    <mesh position={[0,.44,0]}><boxGeometry args={[1.6,.2,5]}/><meshStandardMaterial color="#756550" roughness={.9}/></mesh>
    {[-.65,.65].flatMap(x=>[-2,-.6,.8,2].map(z=><mesh key={`${x}-${z}`} position={[x,.4,z]}><cylinderGeometry args={[.11,.14,1.2,6]}/><meshStandardMaterial color="#384b4f"/></mesh>))}
    {[-1.7,-1,-.3,.4,1.1,1.8].map(z=><mesh key={z} position={[0,.55,z]}><boxGeometry args={[1.6,.035,.025]}/><meshStandardMaterial color="#343b3e"/></mesh>)}
    {[-.65,.65].map(x=><group key={x} position={[x,.55,1.95]}>
      <mesh position={[0,.55,0]}><cylinderGeometry args={[.03,.05,1.1,6]}/><meshStandardMaterial color="#334753"/></mesh>
      <mesh position={[0,1.12,0]}><boxGeometry args={[.19,.23,.19]}/><meshStandardMaterial color="#ffe1a0" emissive="#ffc15c" emissiveIntensity={2}/></mesh>
    </group>)}
    <group position={[0,1.02,-2.9]}>
      <mesh><boxGeometry args={[1.7,1,1.6]}/><meshStandardMaterial color="#4e696c"/></mesh>
      <mesh position={[0,.64,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[1.45,.55,4]}/><meshStandardMaterial color="#22384b"/></mesh>
      <mesh position={[0,.05,.81]}><planeGeometry args={[.65,.4]}/><meshStandardMaterial color="#ffe2a0" emissive="#f9bb64" emissiveIntensity={1.7}/></mesh>
    </group>
  </group>;
}
function Buoy({x,z,phase,moving}:{x:number;z:number;phase:number;moving:boolean}){
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(ref.current){const t=moving?clock.elapsedTime:0;ref.current.position.y=Math.sin(t*.6+phase)*.07;ref.current.rotation.z=Math.sin(t*.65+phase)*.045;}});
  return <group ref={ref} position={[x,0,z]} name="harbor-buoy">
    <mesh position={[0,.05,0]}><cylinderGeometry args={[.23,.38,.24,8]}/><meshStandardMaterial color="#bd8055" metalness={.35} roughness={.5}/></mesh>
    <mesh position={[0,.48,0]}><coneGeometry args={[.17,.74,6]}/><meshStandardMaterial color="#768e8c" metalness={.5}/></mesh>
    <mesh position={[0,.87,0]}><sphereGeometry args={[.08,6,4]}/><meshStandardMaterial color="#aaffd5" emissive="#49e7ba" emissiveIntensity={2.2}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.014,0]}><ringGeometry args={[.52,.55,28]}/><meshBasicMaterial color="#a6e4dd" transparent opacity={.22} depthWrite={false}/></mesh>
  </group>;
}
function Birds({moving}:{moving:boolean}){
  const flock=useRef<THREE.Group>(null);
  useFrame(({clock})=>{const t=moving?clock.elapsedTime:0;if(flock.current){flock.current.position.set(17+Math.sin(t*.035)*5,8+Math.sin(t*.06),-36);flock.current.rotation.y=Math.sin(t*.035)*.35;}});
  return <group ref={flock} name="harbor-gulls">{[0,1,2].map(i=><group key={i} position={[i*1.1,i*.3,i*-.7]} rotation={[.1,.2,i*.1]}>{[-1,1].map(s=><mesh key={s} position={[0,0,s*.18]} rotation={[s*.22,0,0]}><boxGeometry args={[.08,.025,.42]}/><meshStandardMaterial color="#c3d5dc"/></mesh>)}</group>)}</group>;
}
export default function HarborDetails({moving,mobile,quiet}:{moving:boolean;mobile:boolean;quiet:boolean}){
  return <><Dock/><Buoy x={mobile?-3:-7} z={5} phase={1} moving={moving}/>{!mobile&&!quiet&&<><Buoy x={9} z={-2} phase={3} moving={moving}/><Birds moving={moving}/></>}</>;
}
