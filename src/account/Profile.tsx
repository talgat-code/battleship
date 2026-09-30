import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import { flushResults } from './results';
import type { Result } from './storage';
export default function Profile({ user, back, logout }: { user: User; back: () => void; logout: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Result[]>([]);
  const [counts, setCounts] = useState([0, 0]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  async function load() {
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
    } catch { setMessage('Не удалось загрузить профиль. Проверьте подключение и настройку базы. Результаты, ожидающие отправки, сохранены на устройстве.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [user.id]);
  return <section className="entry-card profile-card"><small>ЛИЧНОЕ ДЕЛО</small><h1>Профиль командира</h1><p>{user.email}</p>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { const { error } = await supabase!.from('profiles').update({ nickname: name.trim() }).eq('id', user.id); if (error) throw error; setMessage('Имя сохранено.'); } catch { setMessage('Не удалось сохранить имя. Попробуйте ещё раз.'); } finally { setBusy(false); } }}>
      <label>Позывной<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={40} /></label><button className="button secondary" disabled={busy}>Сохранить имя</button>
    </form><p aria-live="polite">{busy ? 'Загрузка…' : message}</p>
    <div className="profile-score"><span>Победы <b>{counts[0]}</b></span><span>Поражения <b>{counts[1]}</b></span></div>
    <h2>Последние 100 партий против бота</h2><ul className="match-history">{rows.map(r => <li key={r.id}><strong>{r.outcome === 'win' ? 'Победа' : 'Поражение'}</strong><time>{new Date(r.finished_at).toLocaleString('ru-RU')}</time><span>{r.shots} выстрелов</span></li>)}</ul>{!rows.length && !busy && <p>Завершённых партий пока нет.</p>}
    <div className="entry-actions"><button className="button primary" onClick={back}>Вернуться к игре</button><button className="button secondary" onClick={() => void load()} disabled={busy}>Обновить профиль</button><button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await logout(); } catch { setMessage('Не удалось выйти. Проверьте подключение и повторите.'); } finally { setBusy(false); } }}>Выйти из аккаунта</button></div>
  </section>;
}
