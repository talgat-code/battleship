import manifest from './voices.json';
import type {EmotionId} from './catalog';
import {playClip,stopClip,preloadClips} from '../audioClips';

export function stopEmotionSound(){
  stopClip('voice');
}
export function preloadEmotionSounds(language:'ru'|'kk'|'en'){
  preloadClips(Object.values(manifest[language]).filter((s):s is string=>!!s));
}
// Pre-recorded assets only. Missing or invalid recordings fall back to a quiet signal.
export function playEmotionSound(id:EmotionId,language:'ru'|'kk'|'en'){
  const fallback=`/audio/emotions/signals/${id}.wav`;
  const recording=(manifest[language] as Record<string,string|null>)[id];
  void playClip('voice',recording||fallback,recording?.8:.4,recording?fallback:undefined);
}
