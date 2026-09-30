import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Demand rendering means static/hidden scenes do not consume continuous GPU work.
export default function RenderLoop({ moving, lite, onSlow }: { moving: boolean; lite: boolean; onSlow: () => void }) {
  const { invalidate, gl, scene, size } = useThree();
  const diagnostics = useMemo(() => new URLSearchParams(window.location.search).has('diagnostics'), []);
  const sample = useRef({ start: 0, frames: 0 });
  useEffect(() => {
    sample.current = { start: 0, frames: 0 };
    if (!moving) return;
    const timer = window.setInterval(() => { if (!document.hidden) invalidate(); }, 1000 / (lite ? 24 : 30));
    return () => window.clearInterval(timer);
  }, [moving, lite, invalidate]);
  useFrame(() => {
    if (moving && lite) {
      const now = performance.now();
      if (!sample.current.start) sample.current.start = now;
      sample.current.frames++;
      const elapsed = now - sample.current.start;
      if (elapsed > 3500) {
        if (sample.current.frames / (elapsed / 1000) < 17) onSlow();
        sample.current = { start: now, frames: 0 };
      }
    }
    // Opt-in diagnostics used by the repeatable browser performance check.
    if (diagnostics) {
      const d = gl.domElement.dataset;
      d.frames = String(Number(d.frames || 0) + 1);
      d.sceneWidth = String(size.width);
      d.drawCalls = String(gl.info.render.calls);
      d.triangles = String(gl.info.render.triangles);
      d.geometries = String(gl.info.memory.geometries);
      const vessel = scene.getObjectByName('vessel-motion');
      if (vessel) d.motion = JSON.stringify({ y: vessel.position.y, roll: vessel.rotation.x, pitch: vessel.rotation.z, x: vessel.parent!.position.x, z: vessel.parent!.position.z });
      else delete d.motion;
      let crew = 0;
      scene.traverse(o => { if (o.name === 'deck-crew') crew++; });
      d.crew = String(crew);
    }
  });
  return null;
}
