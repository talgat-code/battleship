import {createPortal} from 'react-dom';
import {playEmotionSound,stopEmotionSound} from './audio';
import {useEffect,useRef,useState} from 'react';
import {t,useLanguage} from '../i18n';
import {useSound} from '../Audio';
import {supabase} from '../account/client';
import {emotions,emotionImage,isEmotion,COOLDOWN,type EmotionId} from './catalog';
import './emotions.css';

const copy={
  ru:{button:'Эмоции',voice:'Звуки эмоций',free:'Все 6 эмоций бесплатны',wait:'Следующая эмоция через 3 секунды',error:'Эмоция не отправлена. Проверьте связь и миграцию 006.',opponent:'Соперник'},
  kk:{button:'Эмоциялар',voice:'Эмоция дыбыстары',free:'Барлық 6 эмоция тегін',wait:'Келесі эмоция 3 секундтан кейін',error:'Эмоция жіберілмеді. Байланысты және 006 миграциясын тексеріңіз.',opponent:'Қарсылас'},
  en:{button:'Emotions',voice:'Reaction sounds',free:'All 6 emotions are free',wait:'Next reaction in 3 seconds',error:'Reaction not sent. Check connection and migration 006.',opponent:'Opponent'},
};
type Reaction={id:EmotionId;key:number;remote:boolean};
export default function EmotionBar({hidden=false,room}:{hidden?:boolean;room?:{id:string;round:number}}){
  const {language}=useLanguage(),{muted}=useSound(),labels=copy[language];
  const [open,setOpen]=useState(false),[active,setActive]=useState<Reaction|null>(null),[locked,setLocked]=useState(false),[error,setError]=useState('');
  const [voice,setVoice]=useState(()=>{try{return localStorage.getItem('fleet:emotion-voice')!=='false';}catch{return true;}});
  const root=useRef<HTMLDivElement>(null),nextAt=useRef(0),pending=useRef(false),seen=useRef('');
  const mounted=useRef(true);
  const settings=useRef({language,muted,voice,hidden});settings.current={language,muted,voice,hidden};
  function show(id:EmotionId,remote=false){
    const s=settings.current;if(s.hidden||!mounted.current)return;
    setActive({id,key:Date.now(),remote});
    stopEmotionSound();
    if(s.voice&&!s.muted&&!document.hidden)playEmotionSound(id,s.language);
  }
  useEffect(()=>{if(!active)return;const timer=setTimeout(()=>setActive(null),2100);return()=>clearTimeout(timer);},[active]);
  useEffect(()=>{if(!locked)return;const timer=setTimeout(()=>setLocked(false),COOLDOWN);return()=>clearTimeout(timer);},[locked]);
  useEffect(()=>{
    mounted.current=true;
    // Close after the field receives its click, so collapsing the panel cannot move the target under a finger.
    const outside=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('click',outside);document.addEventListener('keydown',key);
    return()=>{mounted.current=false;document.removeEventListener('click',outside);document.removeEventListener('keydown',key);stopEmotionSound();};
  },[]);
  useEffect(()=>{if(!voice||muted||hidden)stopEmotionSound();},[voice,muted,hidden]);
  useEffect(()=>{
    if(!room||!supabase)return;
    let alive=true,busy=false;seen.current='';
    const poll=async()=>{
      if(busy||document.hidden)return;busy=true;
      try{
        const {data,error:failure}=await supabase!.rpc('fleet_emote',{command:{type:'read',room:room.id,round:room.round}}).abortSignal(AbortSignal.timeout(8000));
        if(!alive)return;
        if(failure){setError(copy[settings.current.language].error);return;}
        if(data&&isEmotion(data.emotion)&&data.event!==seen.current){
          seen.current=data.event;
          if(Date.now()-Date.parse(data.sent_at)<5000)show(data.emotion,true);
        }
      }catch{/* Poll again on the next interval. */}finally{busy=false;}
    };
    void poll();const timer=setInterval(()=>void poll(),2000);
    return()=>{alive=false;clearInterval(timer);};
  },[room?.id,room?.round]);
  async function select(id:EmotionId){
    if(pending.current||Date.now()<nextAt.current)return;
    pending.current=true;nextAt.current=Date.now()+COOLDOWN;setLocked(true);setOpen(false);setError('');
    try{
      if(room){
        if(!supabase)throw Error('Unavailable');
        const {error:failure}=await supabase.rpc('fleet_emote',{command:{type:'send',room:room.id,round:room.round,emotion:id,event:crypto.randomUUID()}}).abortSignal(AbortSignal.timeout(8000));
        if(failure)throw failure;
      }
      show(id);
    }catch{setError(labels.error);}finally{pending.current=false;}
  }
  if(hidden)return null;
  const reaction=active&&emotions.find(e=>e.id===active.id);
  return <div className="fleet-emotions" ref={root}>
    <div className="fleet-emotions-toolbar"><button className="button secondary" aria-expanded={open} onClick={()=>setOpen(!open)}><img src={emotionImage('salute')} alt="" width="28" height="28"/>{labels.button}</button>
      {open&&<div className="fleet-emotions-menu"><label><input type="checkbox" checked={voice} onChange={e=>{setVoice(e.target.checked);try{localStorage.setItem('fleet:emotion-voice',String(e.target.checked));}catch{}}}/>{labels.voice}</label>
      <small>{locked?labels.wait:labels.free}</small>
    <div className="fleet-emotions-picker" aria-label={labels.button}>{emotions.map(e=><button key={e.id} disabled={locked} onClick={()=>void select(e.id)}><img src={emotionImage(e.id)} alt="" width="64" height="64"/><span>{t(e.name)}</span></button>)}</div></div>}
    </div>
    {reaction&&active&&root.current?.closest('.board-container')?.querySelector('.cell-grid')&&createPortal(<div className="fleet-emotions-reaction" role="status" key={active.key}><img src={emotionImage(reaction.id)} alt={t(reaction.name)} width="96" height="96"/><span>{active.remote&&<small>{labels.opponent} · </small>}{reaction.phrases[language]}</span></div>,root.current!.closest('.board-container')!.querySelector('.cell-grid')!)}
    {error&&<p role="status">{error}</p>}
  </div>;
}
