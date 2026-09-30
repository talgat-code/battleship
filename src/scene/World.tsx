import { Canvas } from '@react-three/fiber';
import useMedia from '../useMedia';
import Harbor from './Harbor';
import {SceneBoundary} from '../Recovery';

export default function World({ moving = true, showcase = false }: { moving?: boolean; showcase?: boolean }) {
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const mobile = useMedia('(max-width: 760px)');
  return <div className={`world-backdrop harbor-backdrop`} aria-hidden="true"><SceneBoundary><Canvas frameloop="demand" dpr={1} camera={{ position: [0, 6, 18], fov: mobile ? 68 : 58, near: .1, far: 220 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}><Harbor moving={moving && !reduced} mobile={mobile} quiet={!showcase} /></Canvas></SceneBoundary><div className="world-haze" /></div>;
}
