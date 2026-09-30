import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A flat, inexpensive shader keeps the cell projection exact. No textures/assets.
export default function Ocean({ enemy, moving }: { enemy: boolean; moving: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, deep: { value: new THREE.Color(enemy ? '#122b4e' : '#10314c') }, light: { value: new THREE.Color(enemy ? '#087184' : '#078f94') } }), [enemy]);
  useFrame(({ clock }) => { if (moving && material.current) material.current.uniforms.time.value = clock.elapsedTime; });
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.04, 0]} renderOrder={2}>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} vertexShader={`varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
        varying vec2 p; uniform float time; uniform vec3 deep; uniform vec3 light;
        void main(){
          float swell=sin(p.x*7.5+p.y*5.+time*.65)*.55+sin(p.y*9.-time*.42)*.3;
          float drift=p.y*118.+sin(p.x*19.+time*.15)*2.+swell*3.-time*.55;
          float ripples=pow(max(0.,sin(drift)),18.);
          float patches=smoothstep(-.1,.9,sin(p.x*29.-p.y*17.+time*.18));
          float waves=ripples*patches;
          float gradient=.36+.19*swell+.14*p.y;
          vec3 water=mix(deep,light,gradient)+vec3(.022,.085,.081)*waves;
          float cloud=.96-.065*sin(p.x*4.+p.y*3.+time*.025);
          water*=cloud;
          float glow=exp(-pow((p.x-.24-sin(p.y*10.+time*.22)*.035)*8.,2.));
          water+=vec3(.055,.038,.014)*glow*(.18+waves)*smoothstep(.25,1.,p.y);
          float edge=smoothstep(.0,.07,min(min(p.x,1.-p.x),min(p.y,1.-p.y)));
          gl_FragColor=vec4(water*mix(.65,1.,edge),.78);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
    </mesh>
    {/* Offset the deep plane along z so its projection stays inside the sea. */}
    <mesh position={[0, -.84, -.48]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshBasicMaterial color="#175361" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.021, 0]} receiveShadow renderOrder={3}><planeGeometry args={[10, 10]} /><shadowMaterial transparent opacity={.24} depthWrite={false} /></mesh>
    <gridHelper args={[10, 10, '#c3e2d7', '#70aaaf']} position={[0, .006, 0]} renderOrder={4} material-transparent material-opacity={.4} material-depthWrite={false} />
  </group>;
}
