import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Crosshair } from 'lucide-react';
import * as THREE from 'three';
import { Board as BoardData, Cell, Shot, LETTERS, isSunk, same } from './game';
import Vessel from './scene/Vessel';
import Ocean from './scene/Ocean';
import useMedia from './useMedia';

function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as THREE.OrthographicCamera;
    c.zoom = size.width / 11.4; c.lookAt(0, 0, 0); c.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
function Impact({ shot }: { shot: Shot }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const tracer = useRef<THREE.Mesh>(null);
  const burst = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const hit = shot.result !== 'miss';
  const sunk = shot.result === 'sunk';
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    if (group.current) group.current.visible = t < 1.35;
    if (ring.current) { ring.current.scale.setScalar(.2 + t * (sunk ? 3 : 1.8)); (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t); }
    if (tracer.current) { tracer.current.position.y = Math.max(.25, 3 - t * 23); tracer.current.visible = t < .14; }
    burst.current?.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const angle = i * Math.PI * 2 / 8;
      const radius = t * (sunk ? .8 : .5);
      mesh.position.set(Math.cos(angle) * radius, .25 + Math.sin(Math.min(t, 1) * Math.PI) * (hit ? .6 : .9), Math.sin(angle) * radius);
      mesh.scale.setScalar(Math.max(.01, (hit ? .17 : .08) * (1 - t / 1.3)));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t / 1.3);
    });
  });
  return <group ref={group} position={[shot.x - 4.5, 0, shot.y - 4.5]}>
    <mesh ref={tracer}><boxGeometry args={[.045, .7, .045]} /><meshBasicMaterial color="#fff5b4" /></mesh>
    <mesh ref={ring} position={[0, .29, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.22, .28, 24]} /><meshBasicMaterial color={hit ? '#ff9e59' : '#c2f9ff'} transparent depthWrite={false} /></mesh>
    <group ref={burst}>{Array.from({ length: 8 }, (_, i) => <mesh key={i}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={hit ? sunk && i % 2 ? '#8c9399' : '#ffb65b' : '#b9f4ff'} transparent depthWrite={false} /></mesh>)}</group>
  </group>;
}
type Props = { data: BoardData; enemy?: boolean; active: boolean; onCell: (c: Cell) => void; preview?: Cell[]; valid?: boolean; onHover?: (c: Cell | null) => void; label: string; moving: boolean };
export default function Board({ data, enemy = false, active, onCell, preview = [], valid = true, onHover, label, moving }: Props) {
  const [focused, setFocused] = useState<Cell | null>(null);
  const [zoom, setZoom] = useState(false);
  const touch = useMedia('(pointer: coarse)');
  const last = data.shots.at(-1);
  const occupied = focused && data.shots.some(s => same(s, focused));
  const aim = active && focused && !occupied;
  return <div className="board-container">
    <div className="board-tools"><span><Crosshair size={14} />{aim ? `${LETTERS[focused.x]}${focused.y + 1} · ${enemy ? 'цель выбрана' : valid ? 'позиция доступна' : 'нельзя разместить'}` : 'Сетка 10 × 10'}</span><button className="zoom-button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{zoom ? 'Всё поле' : 'Крупные клетки'}</button></div>
    <div className={`board-scroll ${zoom ? 'zoomed' : ''}`} tabIndex={zoom ? 0 : -1} aria-label={`${label}: область просмотра`}>
      <div className={`board ${enemy ? 'enemy-board' : ''} ${active ? 'board-active' : ''}`}>
        <div className="column-labels">{[...LETTERS].map((l, i) => <span className={aim && focused.x === i ? 'coordinate-active' : ''} key={l}>{l}</span>)}</div>
        <div className="row-labels">{Array.from({ length: 10 }, (_, i) => <span className={aim && focused.y === i ? 'coordinate-active' : ''} key={i}>{i + 1}</span>)}</div>
        <Canvas orthographic frameloop={moving ? 'always' : 'demand'} camera={{ position: [0, 20, 12], zoom: 35, near: .1, far: 100 }} dpr={moving ? [1, 1.5] : 1} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={<div className="canvas-fallback">3D недоступно — клетки остаются доступны</div>}>
          <FitCamera /><hemisphereLight args={['#d5f7ff', '#163948', 1.6]} /><directionalLight position={[-4, 9, 4]} intensity={3.2} color="#ffeed1" /><directionalLight position={[4, 4, -3]} intensity={1.1} color="#45e0ed" />
          <Ocean enemy={enemy} moving={moving} />
          {data.ships.filter(s => !enemy || isSunk(s, data.shots)).map(s => <Vessel key={s.id} ship={s} sunk={isSunk(s, data.shots)} />)}
          {last && moving && <Impact key={`${last.x}-${last.y}-${data.shots.length}`} shot={last} />}
        </Canvas>
        <div className="cell-grid" role="group" aria-label={label} onMouseLeave={() => { if (!touch) { setFocused(null); onHover?.(null); } }}>
          {Array.from({ length: 100 }, (_, i) => {
            const c = { x: i % 10, y: Math.floor(i / 10) };
            const shot = data.shots.find(s => same(s, c));
            const selected = preview.some(p => same(p, c));
            const isFocused = aim && same(focused, c);
            return <button key={i} type="button" aria-label={`${label} ${LETTERS[c.x]}${c.y + 1}${shot ? ` ${shot.result === 'miss' ? 'мимо' : shot.result === 'sunk' ? 'потоплен' : 'попадание'}` : ''}`} disabled={!active || !!shot} className={`cell ${shot?.result || ''} ${selected ? valid ? 'preview' : 'invalid' : ''} ${isFocused ? 'focused' : ''} ${last && same(last, c) ? 'last-shot' : ''}`}
              onMouseEnter={() => { if (!touch) { setFocused(c); onHover?.(c); } }} onFocus={() => { setFocused(c); onHover?.(c); }}
              onClick={() => { setFocused(c); onHover?.(c); if (!touch) onCell(c); }}>
              {shot ? shot.result === 'miss' ? <i /> : <span>{shot.result === 'sunk' ? '×' : '✦'}</span> : isFocused && enemy ? <Crosshair /> : null}
            </button>;
          })}
        </div>
        {enemy && !data.shots.length && <div className="radar-watermark"><div /><span>ПОИСК КОНТАКТА</span><small>Корабли противника скрыты</small></div>}
      </div>
    </div>
    {zoom && <p className="pan-hint">Сдвигайте поле в сторону, чтобы увидеть другие клетки.</p>}
    {touch && active && <button className="button primary touch-confirm" disabled={!aim || (!enemy && !valid)} onClick={() => { if (aim) { onCell(focused); setFocused(null); onHover?.(null); } }}>{aim ? `${enemy ? 'Огонь' : 'Разместить'} · ${LETTERS[focused.x]}${focused.y + 1}` : 'Коснитесь клетки на поле'}<Crosshair size={18} /></button>}
  </div>;
}
