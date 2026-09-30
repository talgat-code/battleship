import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import App from '../App';
import World from '../scene/World';
import { SoundButton } from '../Audio';
import { supabase } from './client';
import Profile from './Profile';

export default function Entry() {
  const [user, setUser] = useState<User | null>(null);
  const activeUser = useRef<string | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [view, setView] = useState<'home' | 'login' | 'signup' | 'game' | 'profile'>(() => { try { return localStorage.getItem('fleet:entry') === 'guest' ? 'game' : 'home'; } catch { return 'home'; } });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const callback = new URLSearchParams(window.location.hash.slice(1));
    if (callback.has('error')) {
      setMessage('Ссылка подтверждения недействительна или устарела. Попробуйте войти либо запросите регистрацию снова.');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    let live = true;
    const timer = setTimeout(() => { if (live) { setLoading(false); setMessage('Восстановление сессии задерживается. Можно играть гостем.'); } }, 10000);
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      setUser(session?.user || null); setLoading(false); clearTimeout(timer);
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) { if(event === 'INITIAL_SESSION' || activeUser.current !== session.user.id) setView('profile'); setPassword(''); }
      activeUser.current = session?.user.id || null;
      if (event === 'SIGNED_OUT') setView('home');
    });
    return () => { live = false; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);
  function guest() { try { localStorage.setItem('fleet:entry', 'guest'); } catch { /* In-memory guest remains usable. */ } setView('game'); setMessage(''); }
  function navigate(next: typeof view) { setView(next); setMessage(''); setPassword(''); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || busy) return;
    setBusy(true); setMessage('');
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { nickname: nickname.trim() }, emailRedirectTo: window.location.origin + window.location.pathname } });
        if (error) throw error;
        if (!data.session) setMessage('Проверьте почту и подтвердите адрес по ссылке. Если аккаунт уже существует, воспользуйтесь входом.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage(code === 'email_not_confirmed' ? 'Подтвердите адрес по ссылке в письме.' : code === 'invalid_credentials' ? 'Неверная почта или пароль.' : code === 'over_email_send_rate_limit' ? 'Слишком много запросов. Попробуйте позже.' : 'Не удалось выполнить запрос. Проверьте соединение, почту и пароль и повторите.');
    } finally { setBusy(false); }
  }
  if (!loading && view === 'game') return <App key={user?.id || 'guest'} userId={user?.id} onAccount={() => navigate(user ? 'profile' : 'home')} accountLabel={user ? 'Профиль' : 'Гость · Войти'} />;
  return <div className="app-shell entry-shell"><World moving={!loading} showcase /><header className="topbar"><a className="brand" href="./">⚓ ФЛОТ / СЕКТОР 10</a><div className="header-right"><span className="entry-header-label">СУМЕРЕЧНЫЙ АРХИПЕЛАГ</span><SoundButton /></div></header><main className="entry-main">
    {loading ? <section className="entry-card"><h1>Возвращаемся на борт</h1><p role="status">Восстанавливаем сессию…</p></section> : view === 'profile' && user ? <Profile user={user} back={() => setView('game')} logout={async () => { const { error } = await supabase!.auth.signOut({ scope: 'local' }); if (error) throw error; try { localStorage.removeItem('fleet:entry'); } catch {} setUser(null); setView('home'); }} /> : <section className="entry-card">
      <small>ТИХОЕ МОРЕ. БОЛЬШАЯ ОПЕРАЦИЯ.</small><h1>{view === 'signup' ? 'Создать аккаунт' : view === 'login' ? 'С возвращением, командир' : 'Ваш флот ждёт приказа.'}</h1>
      <p>Десять кораблей. Неизвестный противник. Найдите свой курс среди островов сумеречного моря.</p>
      {view === 'home' ? <div className="entry-actions"><button className="button primary" onClick={guest}>Играть без регистрации</button><button className="button secondary" onClick={() => navigate('login')}>Войти</button><button className="button secondary" onClick={() => navigate('signup')}>Создать аккаунт</button><small>Гостевая партия сохраняется на этом устройстве.</small></div> : <>
        {!supabase && <div role="status" className="account-notice"><p>Вход и регистрация пока недоступны: сервис аккаунтов не настроен. Гостевая игра полностью доступна.</p><details><summary>Как подключить регистрацию</summary><ol><li>Выполните SQL-миграцию из папки supabase/migrations в своём проекте Supabase.</li><li>Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local и перезапустите приложение.</li><li>Включите Email Auth и добавьте адрес приложения в Redirect URLs.</li></ol><p>Нужен публичный ключ, не service_role. Полная инструкция — в README.</p></details></div>}
        <form onSubmit={submit}>{view === 'signup' && <label>Позывной<input value={nickname} onChange={e => setNickname(e.target.value)} required minLength={2} maxLength={40} autoComplete="nickname" /></label>}<label>Электронная почта<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254} /></label><label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={view === 'signup' ? 'new-password' : 'current-password'} /></label><button className="button primary" disabled={busy || !supabase}>{busy ? 'Подождите…' : view === 'signup' ? 'Зарегистрироваться' : 'Войти в аккаунт'}</button></form>
        <div className="entry-actions"><button className="button secondary" disabled={busy} onClick={() => navigate(view === 'signup' ? 'login' : 'signup')}>{view === 'signup' ? 'Уже есть аккаунт — войти' : 'Создать аккаунт'}</button><button className="button secondary" disabled={busy} onClick={guest}>Играть без регистрации</button><button className="button secondary" disabled={busy} onClick={() => navigate('home')}>На стартовый экран</button></div>
      </>}
      <p role="status" aria-live="polite">{message}</p>
    </section>}
  </main><footer>ФЛОТ / СЕКТОР 10 · Одиночная игра против бота</footer></div>;
}
