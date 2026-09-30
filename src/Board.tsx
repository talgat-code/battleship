import { tr, t, coordinateLetters } from './i18n';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Crosshair } from 'lucide-react';
import * as THREE from 'three';
import { Board as BoardData, Cell, Shot, isSunk, same } from './game';
import AbilityEffect from './scene/AbilityEffect';
import { abilityMessage, type AbilityEvent } from './abilities';
import Vessel from './scene/Vessel';
import Ocean from './scene/Ocean';
import Sharks from './scene/Sharks';
import RenderLoop from './scene/RenderLoop';
import { PROJECTION, GRID } from './scene/projection';
import useMedia from './useMedia';
import {SceneBoundary} from './Recovery';

function FitCamera() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const c = camera as THREE.OrthographicCamera;
    c.zoom = size.width / PROJECTION.span; c.lookAt(0, 0, PROJECTION.targetZ); c.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}
function Impact({ shot, lite }: { shot: Shot; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const tracer = useRef<THREE.Mesh>(null);
  const burst = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  const trail = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const hit = shot.result !== 'miss';
  const sunk = shot.result === 'sunk';
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    if (group.current) group.current.visible = t < 1.8;
    if (flash.current) flash.current.intensity = Math.max(0, 1 - t * 3.5) * (sunk ? 7 : 4);
    if (trail.current) { trail.current.scale.setScalar(.3 + t * 1.6); (trail.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, .38 - t * .23); }
    if (ring.current) { ring.current.scale.setScalar(.2 + t * (sunk ? 3 : 1.8)); (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t); }
    if (tracer.current) { tracer.current.position.y = Math.max(.25, 3 - t * 23); tracer.current.visible = t < .14; }
    burst.current?.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const angle = i * Math.PI * 2 / (lite ? 4 : 8);
      const radius = t * (sunk ? .8 : .5);
      mesh.position.set(Math.cos(angle) * radius, .25 + Math.sin(Math.min(t, 1) * Math.PI) * (hit ? .6 : .9), Math.sin(angle) * radius);
      mesh.scale.setScalar(Math.max(.01, (hit ? .17 : .08) * (1 - t / 1.3)));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t / 1.3);
    });
  });
  return <group ref={group} position={[shot.x - 4.5, 0, shot.y - 4.5]}>
    <mesh ref={tracer}><boxGeometry args={[.045, .7, .045]} /><meshBasicMaterial color="#fff5b4" /></mesh>
    <mesh ref={ring} position={[0, .29, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.22, .28, 24]} /><meshBasicMaterial color={hit ? '#ff9e59' : '#c2f9ff'} transparent depthWrite={false} /></mesh>
    <mesh ref={trail} position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}><ringGeometry args={[.28, .33, 24]} /><meshBasicMaterial color={sunk ? '#99c6c5' : '#cff8e9'} transparent depthWrite={false} /></mesh>
    {tr(hit && !lite && <pointLight ref={flash} position={[0, .65, 0]} color="#ffae52" intensity={4} distance={3} decay={2} />)}
    <group ref={burst}>{tr(Array.from({ length: lite ? 4 : 8 }, (_, i) => <mesh key={i}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={hit ? sunk && i % 2 ? '#77788e' : '#ffd187' : '#d0ffed'} transparent depthWrite={false} /></mesh>))}</group>
  </group>;
}
type Props = { targeting?:boolean; revealed?:number[]; ability?:AbilityEvent; allowUsed?:boolean; rotateOnTouch?:boolean; data: BoardData; enemy?: boolean; active: boolean; onCell: (c: Cell) => void; preview?: Cell[]; valid?: boolean; onHover?: (c: Cell | null) => void; label: string; moving: boolean };
export default function Board({ targeting=false, revealed=[], ability, allowUsed=false, rotateOnTouch=false, data, enemy = false, active, onCell, preview = [], valid = true, onHover, label, moving }: Props) {
  const touchTarget=useRef<Cell|null>(null);
  useEffect(()=>{touchTarget.current=null;setFocused(null);},[targeting,ability?.id]);
  const LETTERS=coordinateLetters();
  const [focused, setFocused] = useState<Cell | null>(null);
  const [zoom, setZoom] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [strained, setStrained] = useState(false);
  const mobile = useMedia('(max-width: 760px)');
  const weak = navigator.hardwareConcurrency <= 4 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const lite = mobile || weak;
  const animated = moving && inView && !strained;
  useEffect(() => { if (moving) setStrained(false); }, [moving]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '80px' });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const coarse = useMedia('(pointer: coarse)');
  const [touchInput, setTouchInput] = useState(() => navigator.maxTouchPoints > 0);
  const touch = coarse || touchInput;
  const last = data.shots.at(-1);
  const occupied = !allowUsed && focused && data.shots.some(s => same(s, focused));
  const aim = active && focused && !occupied;
  return <div className="board-container" ref={host} data-quality={strained ? 'static-auto' : lite ? 'lite' : 'full'} data-animated={animated}>
    {ability&&<div className={`board-ability-message effect-${ability.card}`} key={ability.id}>{t(abilityMessage(ability))}</div>}
    <div className="board-tools"><span><Crosshair size={14} />{tr(aim ? `${LETTERS[focused.x]}${focused.y + 1} · ${targeting ? 'Применить карту' : enemy ? 'цель выбрана' : valid ? 'позиция доступна' : 'нельзя разместить'}` : 'Сетка 10 × 10')}</span><button className="zoom-button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{tr(zoom ? <Minimize2 size={14} /> : <Maximize2 size={14} />)}{tr(zoom ? 'Всё поле' : 'Крупные клетки')}</button></div>
    <div className={`board-scroll ${zoom ? 'zoomed' : ''}`} tabIndex={zoom ? 0 : -1} aria-label={tr(`${label}: область просмотра`)}>
      <div className={`board ${enemy ? 'enemy-board' : ''} ${active ? 'board-active' : ''}`} style={{ aspectRatio: PROJECTION.aspect }}>
        <div className="column-labels" style={{ top: `${(GRID.top - .055) * 100}%` }}>{tr([...LETTERS].map((l, i) => <span className={aim && focused.x === i ? 'coordinate-active' : ''} key={l}>{tr(l)}</span>))}</div>
        <div className="row-labels" style={{ top: `${GRID.top * 100}%`, height: `${GRID.height * 100}%` }}>{tr(Array.from({ length: 10 }, (_, i) => <span className={aim && focused.y === i ? 'coordinate-active' : ''} key={i}>{tr(i + 1)}</span>))}</div>
        <SceneBoundary fallback={<div className="scene-fallback">2D</div>}><Canvas orthographic frameloop="demand" resize={{ debounce: 0 }} shadows={!lite && moving} camera={{ position: [0, PROJECTION.cameraY, PROJECTION.cameraZ + PROJECTION.targetZ], zoom: 35, near: .1, far: 100 }} dpr={lite || !moving ? 1 : [1, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={<div className="canvas-fallback">{t("3D недоступно — клетки остаются доступны")}</div>}>
          <color attach="background" args={['#263d56']} /><fog attach="fog" args={['#718495', 26, 39]} />
          <RenderLoop moving={animated} lite={lite} onSlow={() => setStrained(true)} /><FitCamera />
          <hemisphereLight args={['#a6c0f5', '#101a3c', 1.25]} />
          <directionalLight position={[-5, 7, 3]} intensity={3.1} color="#ffd29a" castShadow={!lite && moving} shadow-mapSize={[512, 512]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.04} shadow-bias={-.0003} />
          <directionalLight position={[4, 3, -4]} intensity={1.3} color="#4ed4db" />
          <Ocean enemy={enemy} moving={animated} /><Sharks enemy={enemy} moving={animated} />
          {tr(data.ships.filter(s => !enemy || isSunk(s, data.shots)).map(s => <Vessel key={s.id} ship={s} sunk={isSunk(s, data.shots)} moving={animated} detailed={zoom && !enemy} lite={lite} />))}
          {tr(ability && animated && <AbilityEffect key={ability.id} event={ability} lite={lite}/>)}
          {tr(last && animated && <Impact key={`${last.x}-${last.y}-${data.shots.length}`} shot={last} lite={lite} />)}
        </Canvas></SceneBoundary>
        <div className="cell-grid" style={{ top: `${GRID.top * 100}%`, height: `${GRID.height * 100}%` }} role="group" aria-label={tr(label)} onMouseLeave={() => { if (!touch) { setFocused(null); onHover?.(null); } }}>
          {tr(Array.from({ length: 100 }, (_, i) => {
            const c = { x: i % 10, y: Math.floor(i / 10) };
            const shot = data.shots.find(s => same(s, c));
            const selected = preview.some(p => same(p, c));
            const isFocused = aim && same(focused, c);
            return <button key={i} type="button" data-ship={data.ships.some(s=>(!enemy||isSunk(s,data.shots))&&s.cells.some(p=>same(p,c)))||undefined} aria-label={tr(`${label} ${LETTERS[c.x]}${c.y + 1}${shot ? ` ${shot.result === 'miss' ? 'мимо' : shot.result === 'sunk' ? 'потоплен' : 'попадание'}` : ''}`)} disabled={!active || (!!shot&&!allowUsed)} className={`cell ${enemy&&data.ships.some(s=>revealed.includes(s.id)&&!isSunk(s,data.shots)&&s.cells.some(p=>same(p,c)))?'revealed':''} ${shot?.result || ''} ${selected ? valid ? 'preview' : 'invalid' : ''} ${isFocused ? 'focused' : ''} ${last && same(last, c) ? 'last-shot' : ''}`}
              onPointerDown={e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') setTouchInput(true); }}
              onMouseEnter={() => { if (!touch) { setFocused(c); onHover?.(c); } }} onFocus={() => { setFocused(c); onHover?.(c); }}
              onClick={() => { setFocused(c); onHover?.(c); if(targeting&&touch){if(touchTarget.current&&same(touchTarget.current,c)){onCell(c);touchTarget.current=null;}else touchTarget.current=c;}else if (!touch || (rotateOnTouch && data.ships.some(s=>s.cells.some(p=>same(p,c))))) onCell(c); }}>
              {tr(shot ? shot.result === 'miss' ? <i /> : <span>{tr(shot.result === 'sunk' ? '×' : '✦')}</span> : isFocused && enemy ? <Crosshair /> : null)}
            </button>;
          }))}
        </div>
        {tr(enemy && !data.shots.length && <div className="radar-watermark" style={{ top: `${GRID.top * 100}%` }}><div /><span>{t("ПОИСК КОНТАКТА")}</span><small>{t("Корабли противника скрыты")}</small></div>)}
      </div>
    </div>
    {tr(zoom && <p className="pan-hint">{t("Сдвигайте поле в сторону, чтобы увидеть другие клетки.")}</p>)}
    {tr(zoom && !enemy && data.ships.some(s => s.length === 4) && <p className="crew-caption">{t("Палубная команда видна на авианосце в увеличенном виде.")}</p>)}
    {tr(strained && moving && <p className="pan-hint">{t("Море успокоилось для плавного управления.")}</p>)}
    {tr(touch && active && <button className="button primary touch-confirm" disabled={!aim || ((!enemy||targeting) && !valid)} onClick={() => { if (aim) { onCell(focused); setFocused(null); onHover?.(null); } }}>{tr(aim ? `${targeting ? 'Применить карту' : enemy ? 'Огонь' : 'Разместить'} · ${LETTERS[focused.x]}${focused.y + 1}` : 'Коснитесь клетки на поле')}<Crosshair size={18} /></button>)}
  </div>;
}
