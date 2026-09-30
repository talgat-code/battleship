import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import useMedia from '../useMedia';
import Harbor from './Harbor';
import {SceneBoundary} from '../Recovery';

function Island({ at, scale, color, seed }: { at: [number, number, number]; scale: [number, number, number]; color: string; seed: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const contour = 1 + .13 * Math.sin(x * 5 + seed) * Math.cos(z * 4) + .06 * Math.sin(z * 11 + x * 7);
      p.setXYZ(i, x * contour, y < 0 ? y * .15 : y * contour, z * contour);
    }
    g.computeVertexNormals(); return g;
  }, [seed]);
  return <mesh position={at} scale={scale} geometry={geometry}><meshStandardMaterial color={color} roughness={.95} /></mesh>;
}
function Scenery({ moving, mobile }: { moving: boolean; mobile: boolean }) {
  const { camera, invalidate } = useThree();
  const beam = useRef<THREE.Mesh>(null);
  useEffect(() => { camera.lookAt(0, -5, -18); invalidate(); }, [camera, invalidate]);
  useEffect(() => { if (!moving) return; const t = setInterval(() => { if (!document.hidden) invalidate(); }, mobile ? 100 : 65); return () => clearInterval(t); }, [moving, mobile, invalidate]);
  useFrame(({ clock }) => { if (beam.current && moving) beam.current.rotation.y = Math.sin(clock.elapsedTime * .08) * .16; });
  return <>
    <fog attach="fog" args={['#75999f', 24, 100]} />
    <hemisphereLight args={['#bdd7e2', '#193a4b', 2]} />
    <directionalLight position={[-12, 15, 5]} color="#ffe0b4" intensity={2.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.25, -30]}><planeGeometry args={[300, 240]} /><meshStandardMaterial color="#176376" roughness={.38} metalness={.25} /></mesh>
    <Island at={[-28, 0, -68]} scale={[32, 10, 12]} color="#819bab" seed={2} />
    <Island at={[27, 0, -76]} scale={[29, 13, 14]} color="#7894aa" seed={6} />
    <Island at={[-26, 0, -39]} scale={[15, 9, 9]} color="#476e7b" seed={9} />
    <Island at={[30, 0, -44]} scale={[19, 12, 9]} color="#507a83" seed={4} />
    <Island at={[-18, -.1, -14]} scale={[8, 5, 6]} color="#294e5b" seed={12} />
    <Island at={[21, -.1, -20]} scale={[8, 6.5, 8]} color="#365d65" seed={18} />
    {!mobile && <Island at={[27, -.1, 0]} scale={[8, 3, 12]} color="#244956" seed={23} />}
    <group position={[-23, 3.8, -12]}>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[.3, .52, 2.2, 16]} /><meshStandardMaterial color="#dbd7c0" /></mesh>
      <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[.365, .4, .32, 16]} /><meshStandardMaterial color="#805b50" /></mesh>
      <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[.42, .42, .45, 12]} /><meshBasicMaterial color="#ffdd99" /></mesh>
      <mesh position={[0, 2.77, 0]}><coneGeometry args={[.65, .4, 16]} /><meshStandardMaterial color="#263c50" /></mesh>
      <mesh ref={beam} position={[6, 2.4, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.55, 12, 24, 1, true]} /><meshBasicMaterial color="#ffe6aa" transparent opacity={.08} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} /></mesh>
    </group>
  </>;
}
export default function World({ moving = true, showcase = false }: { moving?: boolean; showcase?: boolean }) {
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const mobile = useMedia('(max-width: 760px)');
  return <div className={`world-backdrop ${showcase ? 'harbor-backdrop' : ''}`} aria-hidden="true"><SceneBoundary><Canvas frameloop="demand" dpr={1} camera={{ position: [0, 6, 18], fov: mobile ? 68 : 58, near: .1, far: 220 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>{showcase ? <Harbor moving={moving && !reduced} mobile={mobile} /> : <Scenery moving={moving && !reduced} mobile={mobile} />}</Canvas></SceneBoundary><div className="world-haze" /></div>;
}
