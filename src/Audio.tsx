import { tr, t } from './i18n';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {unlockClips,playClip,stopClip,pauseClips,preloadClips} from './audioClips';
import {preloadEmotionSounds,stopEmotionSound} from './emotions/audio';
import {useLanguage} from './i18n';

type Mix={ambient:boolean;battle:boolean;voice:boolean};
const defaultMix:Mix={ambient:true,battle:true,voice:true};
type Impact=boolean|'hit'|'miss'|'sunk';
const Sound = createContext({ muted: false, toggle: () => {}, shoot: () => {},impact:(_hit:Impact)=>{},mix:defaultMix,setMix:(_key:keyof Mix,_value:boolean)=>{} });
export function AudioProvider({ children }: { children: ReactNode }) {
  const {language}=useLanguage(),languageRef=useRef(language);languageRef.current=language;
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('fleet:muted') === 'true'; } catch { return false; } });
  const ambient = useRef<HTMLAudioElement>(null);
  const cannon = useRef<HTMLAudioElement>(null);
  const mutedRef = useRef(muted);
  const [mix,updateMix]=useState<Mix>(()=>{try{return {...defaultMix,...JSON.parse(localStorage.getItem('fleet:audio:v2')||'{}')};}catch{return defaultMix;}});
  const mixRef=useRef(mix);mixRef.current=mix;
  const effectTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const warmed=useRef(new Set<string>());
  function warm(){unlockClips();if(!warmed.current.has(languageRef.current)){warmed.current.add(languageRef.current);preloadEmotionSounds(languageRef.current);preloadClips(['/audio/cannon.mp3',...['hit','miss','sunk'].map(id=>`/audio/battle/${id}.mp3`)]);}}
  const unlocked = useRef(false);
  const playAmbient = () => {
    if (!mutedRef.current && mixRef.current.ambient && unlocked.current && !document.hidden && ambient.current) {
      if(ambient.current.error)ambient.current.load();
      void ambient.current.play().catch(() => { /* A later gesture or reconnect retries. */ });
    }
  };
  useEffect(() => {
    if (ambient.current) ambient.current.volume = .3;
    if (cannon.current) cannon.current.volume = .55;
    const gesture = (e: Event) => {
      if ((e.target as Element)?.closest?.('[data-audio-toggle]')) return;
      if (e instanceof KeyboardEvent && (e.repeat || !['Enter', ' '].includes(e.key))) return;
      unlocked.current = true; playAmbient();
      warm();
    };
    const visibility = () => {
      if (document.hidden) { ambient.current?.pause(); cannon.current?.pause();pauseClips();clearTimeout(effectTimer.current); }
      else {playAmbient();if(unlocked.current)unlockClips();}
    };
    window.addEventListener('pointerdown', gesture, true);
    window.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility);
    const resume=()=>{if(unlocked.current){playAmbient();unlockClips();}};
    window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('online',resume);
    return () => {
      window.removeEventListener('pointerdown', gesture, true);
      window.removeEventListener('keydown', gesture, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);
      ambient.current?.pause(); cannon.current?.pause();
      clearTimeout(effectTimer.current);pauseClips();
    };
  }, []);
  function toggle() {
    const next = !mutedRef.current;
    mutedRef.current = next; setMuted(next); unlocked.current = true;
    try { localStorage.setItem('fleet:muted', String(next)); } catch { /* Session setting still works. */ }
    if (next) { ambient.current?.pause(); cannon.current?.pause();pauseClips();clearTimeout(effectTimer.current); }
    else {warm();playAmbient();}
  }
  function setMix(key:keyof Mix,value:boolean){
    const next={...mixRef.current,[key]:value};mixRef.current=next;updateMix(next);unlocked.current=true;
    try{localStorage.setItem('fleet:audio:v2',JSON.stringify(next));}catch{}
    if(!next.ambient)ambient.current?.pause();else playAmbient();
    if(!next.battle){cannon.current?.pause();clearTimeout(effectTimer.current);stopClip('impact');stopClip('shot');}
    if(!next.voice)stopEmotionSound();
    if(value)warm();
  }
  function impact(hit:Impact){
    clearTimeout(effectTimer.current);
    effectTimer.current=setTimeout(()=>{
      if(mutedRef.current||!mixRef.current.battle||!unlocked.current||document.hidden)return;
      const result=typeof hit==='boolean'?(hit?'hit':'miss'):hit;
      void playClip('impact',`/audio/battle/${result}.mp3`,.7);
    },160);
  }
  function shoot() {
    if (mutedRef.current || !mixRef.current.battle || !unlocked.current || document.hidden || !cannon.current) return;
    cannon.current.currentTime = 0;
    void cannon.current.play().catch(() => {
      // Safari can reject a media element after an async RPC. The context was
      // already unlocked by the player's first gesture, including for remote shots.
      if(!mutedRef.current&&mixRef.current.battle&&!document.hidden)void playClip('shot','/audio/cannon.mp3',.55);
    });
  }
  return <Sound.Provider value={{ muted, toggle, shoot,impact,mix,setMix }}>
    <audio ref={ambient} data-sound="ambient" src="/audio/sea-gulls.mp3" loop preload="none" />
    <audio ref={cannon} data-sound="cannon" src="/audio/cannon.mp3" preload="auto" />
    {tr(children)}
  </Sound.Provider>;
}
export function SoundButton() {
  const { muted, toggle,mix,setMix } = useContext(Sound);
  return <div className="sound-controls"><button className="icon-button" data-audio-toggle aria-label={tr(muted ? 'Включить звук' : 'Выключить звук')} title={tr(muted ? 'Включить звук' : 'Выключить звук')} aria-pressed={!muted} onClick={toggle}>{tr(muted ? <VolumeX size={20} /> : <Volume2 size={20} />)}</button><details className="sound-settings"><summary aria-label="Настройки звука">♫</summary><div>{([['ambient','Море и чайки'],['battle','Эффекты боя'],['voice','Звуки эмоций']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={mix[key]} onChange={e=>setMix(key,e.target.checked)}/>{t(label)}</label>)}</div></details></div>;
}
export function useShotSound(shots: number,hit:Impact=false) {
  const { shoot,impact } = useContext(Sound);
  const previous = useRef(shots);
  useEffect(() => {
    if (shots > previous.current) {shoot();impact(hit);}
    previous.current = shots;
  }, [shots, shoot]);
}

export const useSound = () => useContext(Sound);
