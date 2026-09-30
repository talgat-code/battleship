import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Vessel from './Vessel';
import HarborDetails from './HarborDetails';
import { BEACON_SOURCE, BEACON_TILT, beaconDirection, type BeamState } from './beacon';

// Decorative coordinates only; this scene never receives the game state.
export function cruisePose(t: number, mobile: boolean) {
  const a = t * .055;
  return { x: Math.sin(a) * (mobile ? 1.1 : 5.5), z: 10.5 + Math.cos(a) * .3, heading: Math.atan2(-.3 * Math.sin(a), -(mobile ? 1.1 : 5.5) * Math.cos(a)), y: Math.sin(t * .75) * .035 };
}
const vertex = `varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const glow = `varying vec2 v; uniform vec3 tint; void main(){float r=length(v-.5)*2.;gl_FragColor=vec4(tint,pow(max(0.,1.-r),3.)*.35);}`;
function Halo({ at, size, color }: { at: [number,number,number]; size: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => { ref.current?.quaternion.copy(camera.quaternion); });
  return <mesh ref={ref} position={at}><planeGeometry args={[size,size]} /><shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{ tint: { value: new THREE.Color(color) } }} vertexShader={vertex} fragmentShader={glow} /></mesh>;
}
function Moon({mobile}:{mobile:boolean}) {
  const disc=useRef<THREE.Mesh>(null);
  const at:[number,number,number]=mobile?[12,22,-160]:[60,26,-160];
  useFrame(({camera})=>{disc.current?.quaternion.copy(camera.quaternion);});
  const stars=useMemo(()=>{
    const positions=[];
    for(let i=0;i<24;i++)positions.push(Math.sin(i*14.3)*100,25+(Math.sin(i*8.7)+1)*14,-175);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g;
  },[]);
  return <>
    <points geometry={stars}><pointsMaterial color="#bdcce0" size={.22} transparent opacity={.48} depthWrite={false} fog={false}/></points>
    <Halo at={at} size={16} color="#99bce3" />
    <mesh ref={disc} position={at}><planeGeometry args={[7,7]}/><shaderMaterial transparent depthWrite={false} vertexShader={vertex} fragmentShader={`varying vec2 v;void main(){vec2 q=(v-.5)*2.;float r=length(q);float alpha=1.-smoothstep(.94,1.,r);float maria=exp(-length(q-vec2(-.25,.13))*7.)*.12+exp(-length(q-vec2(.3,-.28))*9.)*.07;vec3 c=vec3(.76,.82,.89)*(1.-maria-.07*r);gl_FragColor=vec4(c,alpha);}`}/></mesh>
  </>;
}
function Sea({ moving, mobile, beam }: { moving: boolean; mobile: boolean; beam: BeamState }) {
  const uniforms = useMemo(() => ({ time: { value: 0 }, beamDirection: { value: beam.direction }, beamLength: beam.length, beamSource: { value: BEACON_SOURCE } }), [beam]);
  useFrame(({ clock }) => { if(moving) uniforms.time.value=clock.elapsedTime; });
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.18,-32]}><planeGeometry args={[220,200,mobile ? 60 : 110,mobile ? 60 : 110]} />
    <shaderMaterial uniforms={uniforms} vertexShader={`uniform float time; varying vec3 p; void main(){vec3 q=position; q.z+=sin(q.x*.27+time*.35)*cos(q.y*.22-time*.24)*.11; p=vec3(q.x,q.y,q.z); gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);}`}
      fragmentShader={`uniform float time; uniform vec3 beamDirection; uniform vec3 beamSource; uniform float beamLength; varying vec3 p; void main(){
        float wave=sin(p.x*.6+p.y*.95-time*.55)+sin(p.x*1.3-p.y*.5+time*.4)*.45;
        float ripple=sin(p.y*8.+sin(p.x*1.9+time*.3)+time*.8);
        vec3 c=mix(vec3(.015,.075,.16),vec3(.025,.28,.33),.5+wave*.18);
        float ribbon=pow(max(0.,sin(p.y*2.4+sin(p.x*.8)+time*.5)),22.);
        c+=vec3(.22,.46,.5)*ribbon*.2*(.5+.5*ripple);
        vec2 world=vec2(p.x,-p.y-32.);
        float reflectionX=29.*(18.-world.y)/83.;
        float moon=exp(-pow((p.x-reflectionX)/(.6+abs(p.y+50.)*.015),2.));
        c+=vec3(.32,.48,.62)*moon*ribbon*.12;
        vec3 fromBeacon=vec3(world.x,-.18,world.y)-beamSource;
        float distanceToLight=length(fromBeacon);
        float sweep=smoothstep(cos(.17),cos(.04),dot(normalize(fromBeacon),beamDirection));
        float reach=1.-smoothstep(beamLength*.7,beamLength,distanceToLight);
        c+=vec3(.35,.18,.06)*sweep*reach*exp(-distanceToLight*.045)*(.35+ribbon*.25);
        float distanceFog=smoothstep(20.,90.,p.y); c=mix(c,vec3(.25,.36,.48),distanceFog*.7);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`} />
  </mesh>;
}
function terrainHeight(x: number, z: number, seed: number) {
  const angle = Math.atan2(z,x);
  const contour=1+.1*Math.sin(angle*3+seed)+.07*Math.cos(angle*5-seed);
  const r=Math.hypot(x,z)/contour;
  const dome=Math.max(0,1-r*r);
  return Math.pow(dome,.7)*(.86+.12*Math.sin(x*3+seed)*Math.cos(z*2)) + (r<.81?.085:0) + (r<.55?.1:0) + (r<.28?.045:0);
}
function Coast({ at, scale, seed, distant = false, mobile, moving }: { at:[number,number,number];scale:[number,number,number];seed:number;distant?:boolean;mobile:boolean;moving:boolean }) {
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(2.4,2.4,mobile?28:44,mobile?28:44);
    const p=g.attributes.position; const colors=[]; const color=new THREE.Color();
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), z=p.getY(i), h=terrainHeight(x,z,seed);
      p.setXYZ(i,x,h > 0 ? h : -.15,z);
      const layer=Math.sin(h*48+x*3+z)*.5+.5;
      const crack=Math.pow(Math.max(0,Math.cos(x*15+z*3+seed)),32)*.16;
      color.set(distant?'#72879e':layer>.78?'#7b8b89':'#425d68').multiplyScalar(.65+layer*.25+h*.23-crack);
      colors.push(color.r,color.g,color.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  },[seed,distant,mobile]);
  const foam = useMemo(()=>({time:{value:seed}}),[seed]);
  useFrame(({clock})=>{if(moving)foam.time.value=clock.elapsedTime*.4;});
  return <group position={at} scale={scale}>
    <mesh name="beam-occluder" geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.94} side={THREE.DoubleSide} /></mesh>
    {!distant && <><mesh rotation={[-Math.PI/2,0,0]} position={[0,.018,0]}><planeGeometry args={[2.65,2.65]} /><shaderMaterial transparent depthWrite={false} uniforms={foam} vertexShader={vertex} fragmentShader={`varying vec2 v; uniform float time; void main(){vec2 q=(v-.5)*2.65;float a=atan(q.y,q.x);float r=length(q)/(1.+.1*sin(a*3.+${seed.toFixed(1)})+.07*cos(a*5.-${seed.toFixed(1)}));float f=exp(-pow((r-1.03)/.05,2.));f*=.4+.6*pow(.5+.5*sin(a*25.+time),3.);gl_FragColor=vec4(.68,.87,.85,f*.45);}`} /></mesh>
    <Trees seed={seed} mobile={mobile} scale={scale} /> </>}
  </group>;
}
function Trees({ seed,mobile,scale }: { seed:number;mobile:boolean;scale:[number,number,number] }) {
  const trunks=useRef<THREE.InstancedMesh>(null), crowns=useRef<THREE.InstancedMesh>(null);
  const count=mobile?7:16;
  useEffect(()=>{
    const o=new THREE.Object3D();
    for(let i=0;i<count;i++) {
      const a=i*2.399+seed,r=.22+(i%5)*.065,x=Math.cos(a)*r,z=Math.sin(a)*r;
      const h=.72+(Math.sin(i*7+seed)+1)*.35;
      o.position.set(x,terrainHeight(x,z,seed)+h*.42/scale[1],z);o.rotation.set(.025*Math.sin(i),0,.04*Math.cos(i*3));o.scale.set(.055/scale[0],h/scale[1],.055/scale[2]);o.updateMatrix();trunks.current?.setMatrixAt(i,o.matrix);
      for(let j=0;j<3;j++) {o.position.y=terrainHeight(x,z,seed)+(h*.5+j*h*.21)/scale[1];o.scale.set((.28-j*.055)/scale[0],h*.65/scale[1],(.28-j*.055)/scale[2]);o.updateMatrix();crowns.current?.setMatrixAt(i*3+j,o.matrix);}
    }
    if(trunks.current)trunks.current.instanceMatrix.needsUpdate=true;if(crowns.current)crowns.current.instanceMatrix.needsUpdate=true;
  },[seed,count,scale]);
  return <><instancedMesh ref={trunks} args={[undefined,undefined,count]}><cylinderGeometry args={[1,1,1,5]} /><meshStandardMaterial color="#554b3d" /></instancedMesh><instancedMesh ref={crowns} args={[undefined,undefined,count*3]}><coneGeometry args={[1,1,6]} /><meshStandardMaterial color="#173e39" roughness={.9} /></instancedMesh></>;
}
function Beacon({ beam,mobile }: {beam:BeamState;mobile:boolean}) {
  const rotor=useRef<THREE.Group>(null);
  const volume=useRef<THREE.Mesh>(null), spot=useRef<THREE.SpotLight>(null);
  useFrame(()=>{
    if(rotor.current)rotor.current.rotation.y=beam.angle;
    const length=beam.length.value;
    if(volume.current){volume.current.position.x=length/2;volume.current.scale.setScalar(length);}
    if(spot.current)spot.current.distance=length;
  });
  const target=useMemo(()=>{const o=new THREE.Object3D();o.position.set(30,0,0);return o;},[]);
  return <group position={[BEACON_SOURCE.x,BEACON_SOURCE.y-3.2,BEACON_SOURCE.z]}>
    <mesh position={[0,.1,0]}><cylinderGeometry args={[.8,.95,.3,12]} /><meshStandardMaterial color="#778182" /></mesh>
    <mesh position={[0,1.4,0]}><cylinderGeometry args={[.34,.56,2.6,20]} /><meshStandardMaterial color="#e2d6bb" roughness={.75} /></mesh>
    <mesh position={[0,1.8,0]}><cylinderGeometry args={[.4,.43,.35,20]} /><meshStandardMaterial color="#805c52" /></mesh>
    <mesh position={[0,2.85,0]}><cylinderGeometry args={[.58,.58,.12,16]} /><meshStandardMaterial color="#293644" /></mesh>
    <mesh position={[0,3.2,0]}><cylinderGeometry args={[.4,.4,.6,16]} /><meshStandardMaterial color="#ffe4a8" emissive="#ffbb53" emissiveIntensity={3} /></mesh>
    <mesh position={[0,3.64,0]}><coneGeometry args={[.68,.35,16]} /><meshStandardMaterial color="#26394c" /></mesh>
    <pointLight position={[0,3.2,0]} color="#ffcc83" intensity={5} distance={4} decay={2} />
    <Halo at={[0,3.2,0]} size={5} color="#ffbe64" />
    <group ref={rotor} name="harbor-beacon" position={[0,3.2,0]}>
      <group rotation={[0,0,-Math.atan(BEACON_TILT)]}>
      <primitive object={target} />
      <spotLight ref={spot} position={[0,0,0]} color="#ffd39a" intensity={mobile?35:55} distance={30} angle={.17} penumbra={1} decay={1} target={target} />
      <mesh position={[.43,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.19,.24,.25,12]} /><meshBasicMaterial color="#fff0c1" /></mesh>
      <mesh ref={volume} rotation={[0,0,Math.PI/2]}><coneGeometry args={[Math.tan(.14),1,mobile?12:24,1,true]} /><shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} vertexShader={vertex} fragmentShader={`varying vec2 v;void main(){float edge=pow(sin(v.x*3.14159),4.);float fade=pow(v.y,2.)*(1.-smoothstep(.9,1.,v.y));gl_FragColor=vec4(1.,.73,.36,edge*fade*.09);}`} /></mesh>
      </group>
    </group>
  </group>;
}
function Cruiser({moving,mobile}:{moving:boolean;mobile:boolean}) {
  const group=useRef<THREE.Group>(null);
  const uniforms=useMemo(()=>({time:{value:0}}),[]);
  useFrame(({clock})=>{
    const t=moving?clock.elapsedTime:0,p=cruisePose(t,mobile);
    if(group.current){group.current.position.set(p.x,p.y,p.z);group.current.rotation.set(Math.sin(t*.5)*.018,p.heading,Math.sin(t*.7)*.012);}
    uniforms.time.value=t;
  });
  return <group ref={group} name="harbor-cruiser" scale={mobile?.38:.65}>
    <group position={[-.5,0,-.5]}><Vessel ship={{id:0,length:3,cells:[{x:4,y:5},{x:5,y:5},{x:6,y:5}]}} sunk={false} moving={false} detailed={!mobile} lite={mobile}/></group>
    <mesh position={[3,.015,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[6,2.5]} /><shaderMaterial transparent depthWrite={false} uniforms={uniforms} vertexShader={vertex} fragmentShader={`varying vec2 v;uniform float time;void main(){float edge=abs(v.y-.5);float wing=exp(-pow((edge-v.x*.32)/.04,2.));float churn=pow(.5+.5*sin(v.x*60.-time*3.+v.y*24.),3.);float a=(wing*.35+exp(-edge*14.)*churn*.25)*pow(1.-v.x,1.6);gl_FragColor=vec4(.67,.91,.91,a);}`} /></mesh>
  </group>;
}
export default function Harbor({moving,mobile,quiet=false}:{moving:boolean;mobile:boolean;quiet?:boolean}) {
  const {camera,invalidate,gl,scene}=useThree();
  const frames=useRef(0);
  const beam=useMemo<BeamState>(()=>({angle:-1,direction:beaconDirection(-1),length:{value:30}}),[]);
  const ray=useMemo(()=>new THREE.Raycaster(),[]);
  useFrame(({clock})=>{
    const query=new URLSearchParams(location.search), override=query.has('diagnostics')?Number(query.get('beamAngle')):NaN;
    beam.angle=query.has('beamAngle') && Number.isFinite(override)?override:moving?clock.elapsedTime*.12-1:-1;
    beam.direction.copy(beaconDirection(beam.angle));
    scene.updateMatrixWorld(true);
    const coasts:THREE.Object3D[]=[];scene.traverse(o=>{if(o.name==='beam-occluder')coasts.push(o);});
    let length=30;
    for(const offset of mobile?[0]:[-.08,0,.08]) {
      const direction=beaconDirection(beam.angle+offset);
      ray.set(BEACON_SOURCE,direction);ray.near=.15;ray.far=30;
      const hit=ray.intersectObjects(coasts,false)[0];if(hit)length=Math.min(length,hit.distance);
    }
    beam.length.value=Math.max(.2,length);
  },-1);
  useEffect(()=>{camera.lookAt(0,-5,-18);invalidate();},[camera,invalidate]);
  useEffect(()=>{if(!moving)return;const id=setInterval(()=>{if(!document.hidden)invalidate();},1000/(quiet?15:mobile?24:30));return()=>clearInterval(id);},[moving,mobile,quiet,invalidate]);
  useFrame(({clock})=>{if(new URLSearchParams(location.search).has('diagnostics')){const d=gl.domElement.dataset;d.frames=String(++frames.current);d.time=String(moving?clock.elapsedTime:0);d.beacon=String(scene.getObjectByName('harbor-beacon')?.rotation.y);d.shipX=String(scene.getObjectByName('harbor-cruiser')?.position.x);d.drawCalls=String(gl.info.render.calls);d.triangles=String(gl.info.render.triangles);}});
  return <>
    <fog attach="fog" args={['#506781',40,115]} />
    <hemisphereLight args={['#99b6d8','#17283d',1.4]} />
    <directionalLight position={[22,20,-35]} color="#a2c9ff" intensity={2.2} />
    <directionalLight position={[-25,9,2]} color="#f1bb82" intensity={.65} />
    <Sea moving={moving} mobile={mobile||quiet} beam={beam} />
    <Moon mobile={mobile} />
    <Coast at={[-28,0,-68]} scale={[32,10,12]} seed={2} distant mobile={mobile} moving={moving}/>
    <Coast at={[27,0,-76]} scale={[29,13,14]} seed={6} distant mobile={mobile} moving={moving}/>
    {!mobile && <Coast at={[-26,0,-39]} scale={[15,9,9]} seed={9} distant mobile={mobile} moving={moving}/>}
    <Coast at={[30,0,-44]} scale={[19,12,9]} seed={4} distant mobile={mobile} moving={moving}/>
    <Coast at={[-18,0,-14]} scale={[8,5,6]} seed={12} mobile={mobile} moving={moving}/>
    <Coast at={[21,0,-20]} scale={[8,6.5,8]} seed={18} mobile={mobile} moving={moving}/>
    <Beacon beam={beam} mobile={mobile}/>{!quiet&&<Cruiser moving={moving} mobile={mobile}/>}
    <HarborDetails moving={moving} mobile={mobile} quiet={quiet}/>
  </>;
}
