import {Canvas, useThree} from '@react-three/fiber';
import {useEffect, useMemo} from 'react';
import {FontLoader, type FontData} from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import {OrthographicCamera} from 'three';
import fontData from './title-font.json';
import {SceneBoundary} from '../Recovery';
import useMedia from '../useMedia';

const font=new FontLoader().parse(fontData as unknown as FontData);
function Lettering({text,y,size,color}:{text:string;y:number;size:number;color:string}){
  const geometry=useMemo(()=>{
    const g=new TextGeometry(text,{font,size,depth:.22,curveSegments:3,bevelEnabled:true,bevelThickness:.035,bevelSize:.025,bevelSegments:2});
    g.computeBoundingBox();g.translate(-(g.boundingBox!.max.x+g.boundingBox!.min.x)/2,0,0);return g;
  },[text,size]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} position={[0,y,0]}>
    <meshStandardMaterial attach="material-0" color={color} roughness={.3} metalness={.55}/>
    <meshStandardMaterial attach="material-1" color="#537485" roughness={.4} metalness={.7}/>
  </mesh>;
}
function Title({mobile}:{mobile:boolean}){
  const {camera,size,invalidate}=useThree();
  useEffect(()=>{(camera as OrthographicCamera).zoom=size.width/(mobile?16:26);camera.updateProjectionMatrix();invalidate();},[camera,size.width,mobile,invalidate]);
  return <>
    <ambientLight intensity={1.2}/><directionalLight position={[-8,6,12]} intensity={3} color="#ffdfab"/>
    <directionalLight position={[7,-2,6]} intensity={2} color="#66e6dc"/>
    <group rotation={[.15,-.035,0]}>
      {mobile?<><Lettering text="NARXOZ" y={1.5} size={1.65} color="#f7ead0"/><Lettering text="INCUBATOR" y={-.25} size={1.5} color="#f7ead0"/></>:<Lettering text="NARXOZ  INCUBATOR" y={.3} size={1.6} color="#f7ead0"/>}
      <Lettering text="- ШАГ ВПЕРЕД" y={mobile?-1.9:-1.15} size={.86} color="#70e6d2"/>
    </group>
  </>;
}
export default function IncubatorTitle(){
  const mobile=useMedia('(max-width:760px)');
  return <div className="incubator-title" role="img" aria-label="NARXOZ  INCUBATOR - ШАГ ВПЕРЕД">
    <SceneBoundary fallback={<strong>NARXOZ INCUBATOR<br/><span>— ШАГ ВПЕРЕД</span></strong>}>
      <Canvas aria-hidden="true" frameloop="demand" orthographic dpr={[1,1.5]} camera={{position:[0,.25,30],near:.1,far:60}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}}><Title mobile={mobile}/></Canvas>
    </SceneBoundary>
  </div>;
}
