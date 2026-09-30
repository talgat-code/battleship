import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AbilityEvent } from '../abilities';
export default function AbilityEffect({event,lite}:{event:AbilityEvent;lite:boolean}) {
  const group=useRef<THREE.Group>(null),start=useRef<number|null>(null);
  const x=event.cells.reduce((n,c)=>n+c.x,0)/(event.cells.length||1)-4.5;
  const z=event.cells.reduce((n,c)=>n+c.y,0)/(event.cells.length||1)-4.5;
  const curves=useMemo(()=>Array.from({length:lite?3:5},(_,i)=>{
    const a=i*Math.PI*2/(lite?3:5);
    return new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*1.3,-.4,Math.sin(a)*1.3),new THREE.Vector3(Math.cos(a),.8,Math.sin(a)),new THREE.Vector3(Math.cos(a)*.65,1.25,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a)*.3,.65,Math.sin(a)*.3)]);
  }),[lite]);
  useFrame(({clock})=>{
    start.current ??= clock.elapsedTime;
    const t=clock.elapsedTime-start.current;
    if(!group.current)return;
    group.current.visible=t<2.4;
    group.current.children.forEach((child,i)=>{if(child.name==='tentacle'){child.scale.y=Math.max(.05,Math.sin(Math.min(t/2.4,1)*Math.PI));child.rotation.y=Math.sin(t*2+i)*.09;}else{child.scale.setScalar(.4+t*1.5);( (child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity=Math.max(0,.7-t*.3);}});
  });
  return <group ref={group} position={[x,0,z]}>{[0,1].map(i=><mesh key={i} position={[0,.3+i*.015,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.5+i*.3,.55+i*.3,32]}/><meshBasicMaterial color={event.card==='kraken'?'#c497ef':'#6df7dd'} transparent depthWrite={false}/></mesh>)}{event.card==='kraken'&&curves.map((curve,i)=><mesh name="tentacle" key={i}><tubeGeometry args={[curve,lite?8:16,.09,5,false]}/><meshStandardMaterial color="#766699" roughness={.35} metalness={.2}/></mesh>)}</group>;
}
