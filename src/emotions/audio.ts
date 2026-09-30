import manifest from './voices.json';
import type {EmotionId} from './catalog';

let current:HTMLAudioElement|undefined;
let generation=0;
export function stopEmotionSound(){
  generation++;
  if(current){current.pause();current.removeAttribute('src');current.load();current=undefined;}
}
// Pre-recorded assets only. Missing or invalid recordings fall back to a quiet signal.
export function playEmotionSound(id:EmotionId,language:'ru'|'kk'|'en'){
  stopEmotionSound();
  const token=generation;
  const fallback=`/audio/emotions/signals/${id}.wav`;
  const recording=(manifest[language] as Record<string,string|null>)[id];
  function play(src:string,retry:boolean){
    if(token!==generation)return;
    const audio=new Audio(src);current=audio;audio.volume=recording && retry ? .7 : .4;
    audio.onerror=()=>{if(retry&&token===generation&&current===audio)play(fallback,false);};
    void audio.play().catch(error=>{
      // Autoplay restrictions must not trigger repeated playback attempts.
      if(error.name!=='NotAllowedError'&&retry&&token===generation&&current===audio)play(fallback,false);
    });
  }
  play(recording||fallback,!!recording);
}
