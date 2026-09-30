import { useEffect,useState } from 'react';
import { ranking,type Ranking } from './api';
import { supabase } from '../account/client';
export default function Leaderboard({userId,onProfile}:{userId?:string;onProfile:()=>void}) {
  const [data,setData]=useState<Ranking|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){if(!userId||!supabase)return;setBusy(true);setError('');try{setData(await ranking());}catch{setError('Не удалось загрузить рейтинг. Проверьте связь и миграцию 004 в Supabase.');}finally{setBusy(false);}}
  useEffect(()=>{void refresh();},[userId]);
  return <section className="duel-page leaderboard"><h1>Таблица лидеров</h1><p>Только завершённые матчи с другом. Рейтинг: 1000 + 25 за победу − 15 за поражение. Игры с ботом не учитываются.</p>
    {!supabase?<p role="status">Сетевой сервис не настроен. Нужны переменные Supabase и миграции из README.</p>:!userId?<p>Войдите в аккаунт, чтобы открыть таблицу лидеров.</p>:<>
      <div className="duel-controls"><button className="button secondary" disabled={busy} onClick={()=>void refresh()}>Обновить таблицу</button><button className="button secondary" onClick={onProfile}>Мой профиль</button></div>
      <p role="status">{busy?'Загрузка…':error|| (data?.me?`Ваша позиция: ${data.me.position} · Рейтинг ${data.me.rating} · Победы ${data.me.wins} · Поражения ${data.me.losses}`:'Сыграйте первую партию с другом, чтобы попасть в рейтинг.')}</p>
      <div className="ranking-scroll"><table><thead><tr><th>Место</th><th>Позывной</th><th>Победы</th><th>Поражения</th><th>Игры</th><th>Рейтинг</th></tr></thead><tbody>{data?.rows.map(r=><tr key={r.id} className={r.id===userId?'my-ranking':''}><td>{r.position}</td><td>{r.id===userId?<button className="rank-profile" onClick={onProfile}>{r.nickname} · вы</button>:r.nickname}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.games}</td><td>{r.rating}</td></tr>)}</tbody></table></div>
      {data&&!data.rows.length&&<p>Завершённых сетевых матчей пока нет.</p>}</>}
  </section>;
}
