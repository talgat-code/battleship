import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A flat, inexpensive shader keeps the cell projection exact. No textures/assets.
export default function Ocean({ enemy, moving }: { enemy: boolean; moving: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, deep: { value: new THREE.Color(enemy ? '#113d65' : '#0a5367') }, light: { value: new THREE.Color(enemy ? '#207895' : '#279f9b') } }), [enemy]);
  useFrame(({ clock }) => { if (moving && material.current) material.current.uniforms.time.value = clock.elapsedTime; });
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.04, 0]}>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
        varying vec2 p; uniform float time; uniform vec3 deep; uniform vec3 light;
        void main(){
          float drift=p.y*155.+sin(p.x*18.+time*.16)*1.8+sin(p.x*7.)*2.-time*.65;
          float ripples=pow(max(0.,sin(drift)),22.);
          float patches=smoothstep(.2,.9,sin(p.x*31.-p.y*13.+time*.1));
          float waves=ripples*patches;
          float gradient=.22+.26*p.y+.09*sin(p.x*5.+p.y*3.);
          vec3 water=mix(deep,light,gradient)+vec3(.025,.065,.065)*waves;
          float edge=smoothstep(.0,.07,min(min(p.x,1.-p.x),min(p.y,1.-p.y)));
          gl_FragColor=vec4(water*mix(.65,1.,edge),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
    </mesh>
    <mesh position={[0, -.13, 0]} receiveShadow><boxGeometry args={[10.12, .16, 10.12]} /><meshStandardMaterial color="#284e61" roughness={.55} metalness={.4} /></mesh>
    <gridHelper args={[10, 10, '#8bc9d4', '#5894a9']} position={[0, 0, 0]} material-transparent material-opacity={.45} />
  </group>;
}
