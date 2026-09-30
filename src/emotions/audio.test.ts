import {afterEach,it,expect,vi} from 'vitest';
import {playEmotionSound,stopEmotionSound} from './audio';
import manifest from './voices.json';
afterEach(()=>{stopEmotionSound();vi.unstubAllGlobals();manifest.ru.salute=null;});
it('plays static signals, stops the previous sound and never uses speech synthesis',()=>{
  const created:any[]=[];
  vi.stubGlobal('Audio',class{pause=vi.fn();load=vi.fn();removeAttribute=vi.fn();play=vi.fn(()=>Promise.resolve());constructor(public src:string){created.push(this);}});
  playEmotionSound('laugh','ru');playEmotionSound('salute','kk');
  expect(created[0].src).toBe('/audio/emotions/signals/laugh.wav');expect(created[0].pause).toHaveBeenCalledOnce();
  expect(created[1].src).toBe('/audio/emotions/signals/salute.wav');stopEmotionSound();expect(created[1].pause).toHaveBeenCalledOnce();
});
it('falls back once for an invalid recording and ignores stale errors after mute',()=>{
  const created:any[]=[];
  vi.stubGlobal('Audio',class{pause=vi.fn();load=vi.fn();removeAttribute=vi.fn();play=vi.fn(()=>Promise.resolve());constructor(public src:string){created.push(this);}});
  (manifest.ru as Record<string,string|null>).salute='/audio/emotions/ru/salute.mp3';
  playEmotionSound('salute','ru');expect(created[0].src).toContain('/ru/salute.mp3');
  created[0].onerror();created[0].onerror();expect(created).toHaveLength(2);expect(created[1].src).toContain('/signals/salute.wav');
  stopEmotionSound();created[0].onerror();expect(created).toHaveLength(2);
});
