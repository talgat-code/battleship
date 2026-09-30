import { tr, t } from './i18n';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const Sound = createContext({ muted: false, toggle: () => {}, shoot: () => {} });
export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('fleet:muted') === 'true'; } catch { return false; } });
  const ambient = useRef<HTMLAudioElement>(null);
  const cannon = useRef<HTMLAudioElement>(null);
  const mutedRef = useRef(muted);
  const unlocked = useRef(false);
  const playAmbient = () => {
    if (!mutedRef.current && unlocked.current && !document.hidden && ambient.current) void ambient.current.play().catch(() => { /* A later gesture can retry browser autoplay permission. */ });
  };
  useEffect(() => {
    if (ambient.current) ambient.current.volume = .3;
    if (cannon.current) cannon.current.volume = .55;
    const gesture = (e: Event) => {
      if ((e.target as Element)?.closest?.('[data-audio-toggle]')) return;
      if (e instanceof KeyboardEvent && (e.repeat || !['Enter', ' '].includes(e.key))) return;
      unlocked.current = true; playAmbient();
    };
    const visibility = () => {
      if (document.hidden) { ambient.current?.pause(); cannon.current?.pause(); }
      else playAmbient();
    };
    window.addEventListener('pointerdown', gesture, true);
    window.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', gesture, true);
      window.removeEventListener('keydown', gesture, true);
      document.removeEventListener('visibilitychange', visibility);
      ambient.current?.pause(); cannon.current?.pause();
    };
  }, []);
  function toggle() {
    const next = !mutedRef.current;
    mutedRef.current = next; setMuted(next); unlocked.current = true;
    try { localStorage.setItem('fleet:muted', String(next)); } catch { /* Session setting still works. */ }
    if (next) { ambient.current?.pause(); cannon.current?.pause(); }
    else playAmbient();
  }
  function shoot() {
    if (mutedRef.current || !unlocked.current || document.hidden || !cannon.current) return;
    cannon.current.currentTime = 0;
    void cannon.current.play().catch(() => { /* Sound must never interrupt a turn. */ });
  }
  return <Sound.Provider value={{ muted, toggle, shoot }}>
    <audio ref={ambient} data-sound="ambient" src="/audio/sea-gulls.mp3" loop preload="none" />
    <audio ref={cannon} data-sound="cannon" src="/audio/cannon.mp3" preload="auto" />
    {tr(children)}
  </Sound.Provider>;
}
export function SoundButton() {
  const { muted, toggle } = useContext(Sound);
  return <button className="icon-button" data-audio-toggle aria-label={tr(muted ? 'Включить звук' : 'Выключить звук')} title={tr(muted ? 'Включить звук' : 'Выключить звук')} aria-pressed={!muted} onClick={toggle}>{tr(muted ? <VolumeX size={20} /> : <Volume2 size={20} />)}</button>;
}
export function useShotSound(shots: number) {
  const { shoot } = useContext(Sound);
  const previous = useRef(shots);
  useEffect(() => {
    if (shots > previous.current) shoot();
    previous.current = shots;
  }, [shots, shoot]);
}

export const useSound = () => useContext(Sound);
