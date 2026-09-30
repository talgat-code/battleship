import { catalog } from './catalog';
import artwork from './artwork.json';
import type { Wallet } from './economy';
import type { Game } from '../game';
import { abilityMessage, type Card } from '../abilities';
import { t } from '../i18n';
const images:Record<string,string>=artwork;
export default function AbilityPanel({game,wallet,ready,busy,card,onSelect,onCancel,onApply,onShop,error}:{game:Game;wallet:Wallet;ready:boolean;busy:boolean;card:Card|null;onSelect:(card:Card)=>void;onCancel:()=>void;onApply:()=>void;onShop:()=>void;error:string}) {
  const items=catalog.filter(i=>i.kind==='card'&&Object.hasOwn(wallet.items,i.id));
  const playerTurn=game.phase==='battle'&&game.turn==='player';
  const selected=catalog.find(i=>i.id===card);
  const targeted=card==='sonar'||card==='bomb';
  return <section className="ability-deck" aria-label={t('Карты способностей')}>
    <div className="ability-deck-heading"><div><small>{t('АРСЕНАЛ КОМАНДИРА')}</small><h2>{t('Карты способностей')}</h2></div><button className="button secondary" onClick={onShop}>{t('Магазин')}</button></div>
    <p className="ability-availability">{t(!ready?'Инвентарь аккаунта недоступен. Проверьте подключение.':game.phase==='finished'?'Бой завершён. Карты доступны в следующей партии.':!playerTurn?'Ход противника — карты временно недоступны.':'Выберите карту. Обычный выстрел не расходует карточку.')}</p>
    {ready&&!items.some(i=>wallet.items[i.id]>0)&&<p className="empty-arsenal">{t('У вас пока нет карт. Купите их в магазине и вернитесь в этот бой.')}</p>}
    {ready&&<div className="battle-card-grid">{items.map(item=>{
      const disabled=!playerTurn||busy||!wallet.items[item.id]||(item.id==='chance'&&!!game.bonus);
      return <button className={`battle-ability-card ${card===item.id?'selected':''}`} key={item.id} aria-label={`${t(item.name)} ×${wallet.items[item.id]}`} aria-pressed={card===item.id} disabled={disabled} onClick={()=>onSelect(item.id as Card)}>
        {images[item.id]&&<img src={images[item.id]} alt=""/>}<span className="battle-card-title">{t(item.name)}<b>×{wallet.items[item.id]}</b></span><span className="battle-card-description">{t(item.description)}</span><span className="battle-card-state">{t(item.id==='chance'&&game.bonus?'Бонус уже активен':disabled?'Недоступно сейчас':card===item.id?'Карта выбрана':'Готова к применению')}</span>
      </button>;
    })}</div>}
    {selected&&<div className={`ability-confirm targeting-${card}`} role="status"><strong>{t(selected.name)}</strong><p>{t(targeted?'Прицеливание: наведите на верхнюю левую клетку области и нажмите на поле. На телефоне первое касание выбирает область, второе подтверждает.':'Нажмите «Применить карту» для подтверждения.')}</p>{!targeted&&<button className="button primary" disabled={!playerTurn||busy} onClick={onApply}>{t('Применить карту')}</button>}<button className="button secondary" disabled={busy} onClick={onCancel}>{t('Отмена')} · Esc</button></div>}
    {game.bonus&&<p className="bonus-ready" role="status">{t('Бонус активен: следующий выстрел сохраняет ход.')}</p>}
    {game.ability&&<p className="ability-outcome" role="status">{t(abilityMessage(game.ability))}</p>}
    {error&&<p className="placement-notice" role="alert">{t(error)}</p>}
  </section>;
}
