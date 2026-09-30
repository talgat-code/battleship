import { tr, t } from '../i18n';
import { useRef, useState } from 'react';
import { catalog } from './catalog';
import { useWallet } from './store';
import { LanguageSwitch } from '../i18n';
import artwork from './artwork.json';
const images:Record<string,string>=artwork;
export default function Shop({userId,back}:{userId?:string;back:()=>void}) {
  const {wallet,error,busy,ready,run}=useWallet(userId);
  const [tab,setTab]=useState('emotion');
  const gate=useRef(false);
  return <section className="shop-page"><header><div><small>{t("СНАБЖЕНИЕ ФЛОТА")}</small><h1>{t("Морской арсенал")}</h1></div><LanguageSwitch/><strong className="token-balance">◈ {tr(ready?wallet.balance:'—')} <span>{t("жетонов")}</span></strong><button className="button secondary" onClick={back}>{t("Вернуться к игре")}</button></header>
    <p>{t("Жетоны можно получить за завершённые партии")}</p><p>{tr(userId?'Покупки сохраняются в аккаунте после подтверждения сервера.':'Гостевая коллекция хранится на этом устройстве.')}</p>
    <nav className="shop-tabs">{tr([['emotion','Эмоции'],['card','Карточки'],['owned','Мои предметы']].map(([id,name])=><button className="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{tr(name)}</button>))}</nav>
    <p role="status">{tr(error)}</p><p>{t("Выберите до четырёх купленных эмоций для боя.")}</p><label><input type="checkbox" checked={wallet.hidden} disabled={!ready||busy} onChange={e=>void run({type:'hide',value:e.target.checked})}/>{t(" Скрыть эмоции")}</label>
    <div className="shop-grid">{tr(catalog.filter(item=>tab==='owned'?wallet.items[item.id]>0:item.kind===tab).map(item=><article className={`shop-item art-${item.id}`} key={item.id}>
      <div className={`item-art ${images[item.id] ? 'has-art' : ''}`}><svg viewBox="0 0 240 140" aria-hidden="true"><path d="M0 103 Q40 73 80 103 T160 103 T240 103 V140 H0Z"/><circle cx="120" cy="64" r="44"/><text x="120" y="84" textAnchor="middle">{tr(item.icon)}</text></svg>{images[item.id]&&<img src={images[item.id]} alt="" decoding="async" onError={e=>{e.currentTarget.hidden=true;}}/>}</div>
      <h2>{tr(item.name)}</h2><p>{tr(item.description)}</p><strong>◈ {tr(item.price)}</strong><p>{tr(item.kind==='emotion'?(wallet.items[item.id]?'Куплено навсегда':'Постоянная эмоция'):`В наличии: ${wallet.items[item.id]||0}`)}</p>
      <button className="button primary" disabled={!ready||busy||(item.kind==='emotion'&&!!wallet.items[item.id])} onClick={async()=>{if(gate.current)return;gate.current=true;try{await run({type:'buy',item:item.id,id:crypto.randomUUID()});}finally{gate.current=false;}}}>{tr(item.kind==='emotion'&&wallet.items[item.id]?'Куплено':'Купить')}</button>
      {tr(item.kind==='emotion'&&!!wallet.items[item.id]&&<button className="button secondary" disabled={busy} aria-pressed={wallet.equipped.includes(item.id)} onClick={()=>void run({type:'equip',item:item.id})}>{tr(wallet.equipped.includes(item.id)?'Убрать с панели':'Добавить на панель')}</button>)}
    </article>))}</div>{tr(tab==='owned'&&!catalog.some(i=>wallet.items[i.id])&&<p>{t("Коллекция пока пуста.")}</p>)}
  </section>;
}
