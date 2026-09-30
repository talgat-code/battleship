import { tr, t, dateLocale } from '../i18n';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import { flushResults } from './results';
import type { Result } from './storage';
import { ranking,type RankRow } from '../network/api';
export default function Profile({ user, back, logout }: { user: User; back: () => void; logout: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Result[]>([]);
  const [counts, setCounts] = useState([0, 0]);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [network,setNetwork]=useState<RankRow|null>(null);
  const [networkStatus,setNetworkStatus]=useState('Загрузка сетевой статистики…');
  async function load() {
    void ranking().then(r=>{setNetwork(r.me);setNetworkStatus(r.me?'':'Сетевых матчей пока нет.');}).catch(()=>setNetworkStatus('Сетевая статистика недоступна. Проверьте миграцию 004 и подключение.'));
    setBusy(true); setMessage('');
    try {
      await flushResults(user.id);
      const results = await Promise.all([
        supabase!.from('profiles').select('nickname').eq('id', user.id).single(),
        supabase!.from('matches').select('*').eq('user_id', user.id).order('finished_at', { ascending: false }).limit(100),
        supabase!.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('outcome', 'win'),
        supabase!.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('outcome', 'loss'),
      ]);
      for (const r of results) if (r.error) throw r.error;
      setName(results[0].data?.nickname || 'Командир'); setRows((results[1].data || []) as Result[]);
      setCounts([results[2].count || 0, results[3].count || 0]);
      setLoaded(true);
    } catch { setMessage('Не удалось загрузить профиль. Проверьте подключение и настройку базы. Результаты, ожидающие отправки, сохранены на устройстве.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [user.id]);
  return <section className="entry-card profile-card"><small>{t("ЛИЧНОЕ ДЕЛО")}</small><h1>{t("Профиль командира")}</h1><p>{tr(user.app_metadata?.fleet_login || user.email)}</p><p>{t("На службе с ")}{tr(new Date(user.created_at).toLocaleDateString(dateLocale()))}</p>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { const { error } = await supabase!.from('profiles').update({ nickname: name.trim() }).eq('id', user.id); if (error) throw error; setMessage('Имя сохранено.'); } catch { setMessage('Не удалось сохранить имя. Попробуйте ещё раз.'); } finally { setBusy(false); } }}>
      <label>{t("Позывной")}<input value={name} onChange={e => setName(e.target.value)} disabled={busy || !loaded} required minLength={2} maxLength={40} /></label><button className="button secondary" disabled={busy || !loaded}>{t("Сохранить имя")}</button>
    </form><p aria-live="polite">{tr(busy ? 'Загрузка…' : message)}</p>
    <section className="network-profile"><h2>Матчи с другом</h2><p>{network?`Место ${network.position} · Рейтинг ${network.rating} · Игр ${network.games} · Побед ${network.wins} · Поражений ${network.losses}`:networkStatus}</p></section><h2>Матчи с ботом</h2>
    <div className="profile-score"><span>{t("Сыграно ")}<b>{tr(loaded ? counts[0]+counts[1] : '—')}</b></span><span>{t("Победы ")}<b>{tr(loaded ? counts[0] : '—')}</b></span><span>{t("Поражения ")}<b>{tr(loaded ? counts[1] : '—')}</b></span></div>
    <h2>{t("Последние 100 партий против бота")}</h2><ul className="match-history">{tr(rows.map(r => <li key={r.id}><strong>{tr(r.outcome === 'win' ? 'Победа' : 'Поражение')}</strong><time>{tr(new Date(r.finished_at).toLocaleString(dateLocale()))}</time><span>{tr(r.shots)}{t(" выстрелов")}</span></li>))}</ul>{tr(loaded && !rows.length && !busy && <p>{t("Завершённых партий пока нет. Начните первую операцию против бота.")}</p>)}
    <div className="entry-actions"><button className="button primary" onClick={back}>{t("Вернуться к игре")}</button><button className="button secondary" onClick={() => void load()} disabled={busy}>{t("Обновить профиль")}</button><button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await logout(); } catch { setMessage('Не удалось выйти. Проверьте подключение и повторите.'); } finally { setBusy(false); } }}>{t("Выйти из аккаунта")}</button></div>
  </section>;
}
