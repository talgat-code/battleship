import {useEffect,useId,useRef,useState} from 'react';
import {Coins,Crown,Megaphone,X,Check,ArrowRight} from 'lucide-react';
import {useLanguage} from '../i18n';
import './membership.css';

// Product preview only. These offers never call the wallet or payment APIs.
const plans=[{id:'captain',cents:800,ads:false},{id:'admiral',cents:2000,ads:true}] as const;
const packs=[{tokens:200,cents:30},{tokens:500,cents:60},{tokens:1000,cents:110},{tokens:2500,cents:250},{tokens:5000,cents:450}];
const copy={
  ru:{eyebrow:'КЛУБ КАПИТАНОВ',title:'Больше возможностей для вашего флота',intro:'Еженедельный запас жетонов или разовое пополнение — выбирайте свой курс.',buy:'Купить подписку',topup:'Пополнить жетоны',demo:'Демонстрация тарифов',note:'Оплата пока не подключена. Деньги не списываются, жетоны и рекламные места не начисляются.',subscriptions:'Подписки',packs:'Пакеты жетонов',close:'Закрыть окно тарифов',month:'/ месяц',weekly:'30 000 жетонов каждую неделю',weeklyNote:'Новое начисление каждые 7 дней, пока подписка активна. Остаток жетонов сохраняется.',captain:'Капитан',admiral:'Адмирал',basic:'Для тех, кто любит тактику',premium:'Флот и ваша аудитория',cards:'Жетоны для карт способностей',noads:'Без размещения рекламы',ads:'Размещение рекламы на главной',duration:'Объявление показывается 2 дня (48 часов), затем исчезает.',select:'Выбрать тариф',selected:'Выбрано',once:'разово',tokens:'жетонов',packNote:'Разовое пополнение без подписки и автоматических повторных покупок.',summary:'Ваш выбор',done:'Понятно'},
  en:{eyebrow:'CAPTAINS’ CLUB',title:'More possibilities for your fleet',intro:'Weekly tokens or a one-off top-up — choose your course.',buy:'Buy a subscription',topup:'Top up tokens',demo:'Plan preview',note:'Payments are not connected. No money is charged, and no tokens or ad placements are granted.',subscriptions:'Subscriptions',packs:'Token packs',close:'Close plan window',month:'/ month',weekly:'30,000 tokens every week',weeklyNote:'A new grant every 7 days while subscribed. Unspent tokens carry over.',captain:'Captain',admiral:'Admiral',basic:'For tactical captains',premium:'Your fleet and your audience',cards:'Tokens for ability cards',noads:'No advertising placement',ads:'Place an ad on the home screen',duration:'Each ad runs for 2 days (48 hours), then disappears.',select:'Choose plan',selected:'Selected',once:'one-off',tokens:'tokens',packNote:'A one-off top-up without a subscription or automatic repeat purchases.',summary:'Your choice',done:'Got it'},
  kk:{eyebrow:'КАПИТАНДАР КЛУБЫ',title:'Флотыңызға көбірек мүмкіндік',intro:'Апта сайынғы жетондар немесе бір реттік толықтыру — өз бағытыңызды таңдаңыз.',buy:'Жазылым сатып алу',topup:'Жетондарды толықтыру',demo:'Тарифтерді таныстыру',note:'Төлем әлі қосылмаған. Ақша алынбайды, жетондар мен жарнама орындары берілмейді.',subscriptions:'Жазылымдар',packs:'Жетон топтамалары',close:'Тарифтер терезесін жабу',month:'/ ай',weekly:'Әр аптада 30 000 жетон',weeklyNote:'Жазылым белсенді кезде әр 7 күн сайын жаңа жетондар беріледі. Қалған жетондар сақталады.',captain:'Капитан',admiral:'Адмирал',basic:'Тактиканы ұнататындар үшін',premium:'Флотыңыз және аудиторияңыз',cards:'Қабілет карталарына арналған жетондар',noads:'Жарнама орналастырусыз',ads:'Басты бетте жарнама орналастыру',duration:'Хабарландыру 2 күн (48 сағат) көрсетіліп, кейін жоғалады.',select:'Тарифті таңдау',selected:'Таңдалды',once:'бір рет',tokens:'жетон',packNote:'Жазылымсыз және автоматты қайталама сатып алусыз бір реттік толықтыру.',summary:'Таңдауыңыз',done:'Түсінікті'},
};

export default function Membership(){
  const {language}=useLanguage(),c=copy[language],locale=language==='ru'?'ru-RU':language==='kk'?'kk-KZ':'en-US';
  const [tab,setTab]=useState<'subscriptions'|'packs'>('subscriptions'),[plan,setPlan]=useState('captain'),[pack,setPack]=useState(500);
  const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),heading=useId();
  const price=(cents:number)=>`$${(cents/100).toLocaleString(locale,{minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2})}`;
  const amount=(n:number)=>n.toLocaleString(locale);
  function open(next:typeof tab){opener.current=document.activeElement as HTMLElement;setTab(next);dialog.current?.showModal();}
  function close(){dialog.current?.close();}
  useEffect(()=>{
    const el=dialog.current;if(!el)return;
    const restore=()=>{document.body.style.overflow=previous;opener.current?.focus();};
    let previous=document.body.style.overflow;
    const observer=new MutationObserver(()=>{if(el.open){previous=document.body.style.overflow;document.body.style.overflow='hidden';}else restore();});
    observer.observe(el,{attributes:true,attributeFilter:['open']});
    return()=>{observer.disconnect();document.body.style.overflow=previous;};
  },[]);
  const chosenPlan=plans.find(p=>p.id===plan)!,chosenPack=packs.find(p=>p.tokens===pack)!;
  return <>
    <section className="membership-banner" aria-label={c.eyebrow}>
      <div className="membership-badge" aria-hidden="true"><Crown size={24}/></div>
      <div className="membership-banner-copy"><small>{c.eyebrow} · {c.demo}</small><h2>{c.title}</h2><p>{c.intro}</p></div>
      <div className="membership-actions"><button className="button primary" onClick={()=>open('subscriptions')}><Crown size={16}/>{c.buy}</button><button className="button secondary" onClick={()=>open('packs')}><Coins size={16}/>{c.topup}</button></div>
    </section>
    <dialog ref={dialog} className="membership-dialog" aria-labelledby={heading} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
      <div className="membership-content">
        <header><div><small>{c.demo}</small><h2 id={heading}>{c.eyebrow}</h2></div><button className="membership-close" aria-label={c.close} onClick={close}><X size={20}/></button></header>
        <div className="membership-tabs" role="group" aria-label={c.demo}><button aria-pressed={tab==='subscriptions'} onClick={()=>setTab('subscriptions')}>{c.subscriptions}</button><button aria-pressed={tab==='packs'} onClick={()=>setTab('packs')}>{c.packs}</button></div>
        <p className="membership-demo-note">{c.note}</p>
        {tab==='subscriptions'?<>
          <div className="membership-plans">{plans.map(p=><article key={p.id} className={`membership-plan${plan===p.id?' is-selected':''}`}>
            <div className="membership-plan-icon" aria-hidden="true">{p.ads?<Megaphone size={23}/>:<Crown size={23}/>}</div><h3>{c[p.id]}</h3><p>{p.ads?c.premium:c.basic}</p><div className="membership-price"><strong>{price(p.cents)}</strong><span>{c.month}</span></div>
            <ul><li><Check size={15}/><b>{c.weekly}</b></li><li><Check size={15}/>{c.cards}</li><li>{p.ads?<Megaphone size={15}/>:<Coins size={15}/>}<span>{p.ads?c.ads:c.noads}</span></li></ul>
            {p.ads&&<p className="membership-ad-duration">{c.duration}</p>}
            <button className={`button ${plan===p.id?'primary':'secondary'}`} aria-pressed={plan===p.id} onClick={()=>setPlan(p.id)}>{plan===p.id?c.selected:c.select} · {c[p.id]}</button>
          </article>)}</div><p className="membership-footnote">{c.weeklyNote}</p>
        </>:<><p className="membership-footnote">{c.packNote}</p><div className="membership-packs">{packs.map(p=><button key={p.tokens} aria-pressed={p.tokens===pack} onClick={()=>setPack(p.tokens)}><Coins size={20}/><span><strong>{amount(p.tokens)}</strong> {c.tokens}</span><b>{price(p.cents)}</b>{p.tokens===pack?<Check size={18}/>:<ArrowRight size={18}/>}</button>)}</div></>}
        <div className="membership-selection" aria-live="polite"><span>{c.summary}</span><strong>{tab==='subscriptions'?`${c[chosenPlan.id]} · ${price(chosenPlan.cents)} ${c.month}`:`${amount(chosenPack.tokens)} ${c.tokens} · ${price(chosenPack.cents)} · ${c.once}`}</strong></div>
        <button className="button primary membership-done" onClick={close}>{c.done}</button>
      </div>
    </dialog>
  </>;
}
