import {beforeEach,afterEach,it,expect,vi} from 'vitest';
beforeEach(()=>{vi.resetModules();vi.stubGlobal('document',{hidden:false});});
afterEach(()=>vi.unstubAllGlobals());
it('cancels a voice still decoding when muted; a later gesture can play again',async()=>{
  let resolve!:(b:object)=>void;
  const start=vi.fn(),stop=vi.fn();
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})));
  vi.stubGlobal('AudioContext',class{state='running';destination={};resume=async()=>{};decodeAudioData=()=>new Promise(r=>{resolve=r;});createBufferSource=()=>({connect:vi.fn(),start,stop});createGain=()=>({gain:{value:1},connect:vi.fn()});});
  const clips=await import('./audioClips');clips.unlockClips();
  const pending=clips.playClip('voice','/test.mp3',.8);await vi.waitFor(()=>expect(resolve).toBeDefined());
  clips.stopClip('voice');resolve({});await pending;expect(start).not.toHaveBeenCalled();
  await clips.playClip('voice','/test.mp3',.8);expect(start).toHaveBeenCalledOnce();
  clips.pauseClips();expect(stop).toHaveBeenCalledOnce();
});
it('uses a signal if a voice file fails and never stacks two reactions',async()=>{
  const start=vi.fn(),stop=vi.fn();
  vi.stubGlobal('fetch',vi.fn(async(src:string)=>({ok:src!=='/missing.mp3',arrayBuffer:async()=>new ArrayBuffer(1)})));
  vi.stubGlobal('AudioContext',class{state='running';destination={};resume=async()=>{};decodeAudioData=async()=>({});createBufferSource=()=>({connect:vi.fn(),start,stop});createGain=()=>({gain:{value:1},connect:vi.fn()});});
  const clips=await import('./audioClips');clips.unlockClips();
  await clips.playClip('voice','/missing.mp3',.8,'/signal.wav');expect(start).toHaveBeenCalledOnce();
  await clips.playClip('voice','/second.mp3',.8);expect(stop).toHaveBeenCalledOnce();expect(start).toHaveBeenCalledTimes(2);
});
