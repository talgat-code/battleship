import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Wake({ length, moving, phase }: { length: number; moving: boolean; phase: number }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: phase } }), [phase]);
  useFrame(({ clock }) => { if (moving && ref.current) ref.current.uniforms.time.value = clock.elapsedTime * .6 + phase; });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .013, 0]} renderOrder={3} raycast={() => {}}>
    <planeGeometry args={[length, .96]} />
    <shaderMaterial ref={ref} transparent depthWrite={false} uniforms={uniforms}
      vertexShader={`varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`varying vec2 p; uniform float time; void main(){
        vec2 q=abs(p-.5)*2.;
        float edge=pow(q.x,6.)+pow(q.y,3.);
        float band=smoothstep(.55,.74,edge)*(1.-smoothstep(.85,1.03,edge));
        float breaks=.35+.65*pow(.5+.5*sin(p.x*29.+sin(p.y*17.)+time),3.);
        gl_FragColor=vec4(.72,.94,.89,band*breaks*.26);
        #include <colorspace_fragment>
      }`} />
  </mesh>;
}
