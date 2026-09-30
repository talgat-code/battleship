// One unlocked Web Audio context survives page navigation. Remote reactions and
// delayed RPC results can play without another user gesture on mobile browsers.
type Channel='voice'|'impact'|'shot';
let context:AudioContext|undefined;
let unlocked=false;
const cache=new Map<string,Promise<AudioBuffer>>();
const playing=new Map<Channel,AudioBufferSourceNode>();
const revisions:Record<Channel,number>={voice:0,impact:0,shot:0};
function engine(){
  if(!context||context.state==='closed'){context=new AudioContext();cache.clear();}
  return context;
}
function buffer(src:string,ctx:AudioContext){
  if(!cache.has(src))cache.set(src,fetch(src).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).catch(e=>{cache.delete(src);throw e;}));
  return cache.get(src)!;
}
export function unlockClips(){
  unlocked=true;
  try{void engine().resume().catch(()=>{});}catch{/* Browser may not support Web Audio. */}
}
export function preloadClips(sources:string[]){
  try{const ctx=engine();for(const src of sources)void buffer(src,ctx).catch(()=>{});}catch{}
}
export function stopClip(channel:Channel){
  revisions[channel]++;
  try{playing.get(channel)?.stop();}catch{}
  playing.delete(channel);
}
export async function playClip(channel:Channel,src:string,volume:number,fallback?:string){
  stopClip(channel);
  const revision=revisions[channel];
  if(!unlocked||document.hidden)return;
  try{
    const ctx=engine();
    const audio=await buffer(src,ctx).catch(e=>{if(fallback)return buffer(fallback,ctx);throw e;});
    if(revision!==revisions[channel]||document.hidden)return;
    await ctx.resume();
    if(revision!==revisions[channel]||document.hidden)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=audio;gain.gain.value=volume;source.connect(gain);gain.connect(ctx.destination);
    source.onended=()=>{source.disconnect();gain.disconnect();if(playing.get(channel)===source)playing.delete(channel);};
    playing.set(channel,source);source.start();
  }catch{/* Missing audio never interrupts the game. Retry on the next gesture. */}
}
export function pauseClips(){stopClip('voice');stopClip('impact');stopClip('shot');}
