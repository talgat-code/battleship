import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AbilityEvent } from '../abilities';
export default function AbilityEffect({event,lite}:{event:AbilityEvent;lite:boolean}) {
  const group=useRef<THREE.Group>(null),start=useRef<number|null>(null),rig=useRef<THREE.Group>(null),particles=useRef<THREE.InstancedMesh>(null),flash=useRef<THREE.PointLight>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const x=event.cells.length?event.cells.reduce((n,c)=>n+c.x,0)/event.cells.length-4.5:0;
  const z=event.cells.length?event.cells.reduce((n,c)=>n+c.y,0)/event.cells.length-4.5:0;
  const color={sonar:'#41ffe0',chance:'#ffd879',signal:'#87cfff',bomb:'#ffb176',kraken:'#c18aff'}[event.card];
  const count=lite?24:64;
  const curves=useMemo(()=>Array.from({length:lite?4:7},(_,i)=>{
    const a=i*Math.PI*2/(lite?4:7);
    return new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*1.65,-.45,Math.sin(a)*1.65),new THREE.Vector3(Math.cos(a)*1.5,.8,Math.sin(a)*1.5),new THREE.Vector3(Math.cos(a)*1.15,1.8,Math.sin(a)*1.15),new THREE.Vector3(Math.cos(a+.45)*.75,2,Math.sin(a+.45)*.75),new THREE.Vector3(Math.cos(a+.65)*.55,1.35,Math.sin(a+.65)*.55)]);
  }),[lite]);
  useFrame(({clock})=>{
    start.current ??= clock.elapsedTime;
    const t=clock.elapsedTime-start.current;
    if(!group.current)return;
    const fade=Math.max(0,1-t/3.2);
    group.current.visible=t<3.2;
    group.current.children.filter(o=>o.name==='wave').forEach((child,i)=>{const age=Math.max(0,t-i*.2);child.scale.setScalar(.2+age*(event.card==='bomb'?2:1.4));((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity=Math.max(0,.8-age*.32);});
    if(flash.current)flash.current.intensity=Math.max(0,1-t/1.5)*(event.card==='bomb'?8:4);
    if(rig.current){
      if(event.card==='kraken'){rig.current.scale.y=Math.max(.03,Math.sin(Math.min(t/3.2,1)*Math.PI));rig.current.rotation.y=Math.sin(t*2)*.15;}
      else if(event.card==='bomb'){rig.current.position.y=Math.max(-.4,3.5-t*9);rig.current.visible=t<.6;}
      else rig.current.rotation.y=t*(event.card==='chance'?2:-1.6);
      rig.current.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.opacity=fade*(event.card==='sonar'?.25:1);}});
    }
    if(particles.current){for(let i=0;i<count;i++){const a=i*2.39996,age=Math.max(0,t-(event.card==='bomb'?.35:0)),r=age*(.45+(i%7)*.17);dummy.position.set(Math.cos(a)*r,Math.max(.05,Math.sin(Math.min(age/2,1)*Math.PI)*(event.card==='bomb'?2:1.2)),Math.sin(a)*r);dummy.rotation.set(age+i,age*.5,0);dummy.scale.setScalar(.08*fade);dummy.updateMatrix();particles.current.setMatrixAt(i,dummy.matrix);}particles.current.instanceMatrix.needsUpdate=true;(particles.current.material as THREE.MeshBasicMaterial).opacity=fade*.8;}
  });
  return <group ref={group} name={`ability-${event.card}`} position={[x,0,z]}>
    {!lite&&<pointLight ref={flash} position={[0,1.5,0]} color={color} intensity={4} distance={6}/>}
    {[0,1,2].map(i=><mesh name="wave" key={i} position={[0,.3+i*.015,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.62+i*.08,.65+i*.08,lite?32:64]}/><meshBasicMaterial color={i===1?'#efffff':color} transparent depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}
    <instancedMesh ref={particles} args={[undefined,undefined,count]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial color="#d0fff1" transparent depthWrite={false}/></instancedMesh>
    <group ref={rig}>
      {event.card==='kraken'&&curves.map((curve,i)=><group key={i}><mesh><tubeGeometry args={[curve,lite?12:22,.11,7,false]}/><meshStandardMaterial color={i%2?'#745293':'#4d477e'} emissive="#652c83" emissiveIntensity={.35} roughness={.3} metalness={.2} transparent/></mesh>{!lite&&[.35,.5,.65,.8].map(u=><mesh key={u} position={curve.getPoint(u)}><sphereGeometry args={[.065,6,4]}/><meshStandardMaterial color="#f3acdf" emissive="#b749a6" emissiveIntensity={.5} transparent/></mesh>)}</group>)}
      {event.card==='bomb'&&<group><mesh><capsuleGeometry args={[.18,.6,3,8]}/><meshStandardMaterial color="#344854" metalness={.65} roughness={.25} transparent/></mesh><mesh position={[0,-.4,0]}><sphereGeometry args={[.19,8,6]}/><meshStandardMaterial color="#ffe0a1" emissive="#ff822f" emissiveIntensity={3} transparent/></mesh></group>}
      {event.card==='chance'&&[0,1].map(i=><group key={i} rotation={[0,i*Math.PI,0]}><mesh rotation={[-Math.PI/2,0,0]} position={[0,.8,0]}><torusGeometry args={[1.15,.055,6,36,Math.PI*.8]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} transparent/></mesh><mesh position={[1.15,.8,0]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.18,.4,6]}/><meshStandardMaterial color="#fff4bd" emissive={color} emissiveIntensity={2} transparent/></mesh></group>)}
      {event.card==='sonar'&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.28,0]}><circleGeometry args={[1.9,lite?24:48,0,Math.PI*.4]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={.25} depthWrite={false} side={THREE.DoubleSide}/></mesh>}
      {event.card==='signal'&&<><mesh rotation={[-Math.PI/2,0,0]} position={[0,.35,0]}><torusGeometry args={[1.1,.025,5,40]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent/></mesh>{[0,1,2,3].map(i=><mesh key={i} position={[Math.cos(i*Math.PI/2)*1.1,.75,Math.sin(i*Math.PI/2)*1.1]}><boxGeometry args={[.04,1.4,.04]}/><meshStandardMaterial color="#dbfaff" emissive={color} emissiveIntensity={2} transparent/></mesh>)}</>}
    </group>
  </group>;
}
