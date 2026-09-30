import { tr, t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LanguageSwitch, useLanguage } from '../i18n';
import Shop from '../shop/Shop';
import App from '../App';
import World from '../scene/World';
import { SoundButton } from '../Audio';
import { supabase } from './client';
import Profile from './Profile';

export default function Entry() {
  const {language,setLanguage}=useLanguage();
  const languageUser=useRef<string|null>(null);
  const [user, setUser] = useState<User | null>(null);
  const activeUser = useRef<string | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [view, setView] = useState<'home' | 'login' | 'signup' | 'game' | 'profile' | 'shop'>(() => { try { return localStorage.getItem('fleet:entry') === 'guest' ? 'game' : 'home'; } catch { return 'home'; } });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(()=>{
    languageUser.current=null;
    if(!user||!supabase)return;
    let live=true;
    void supabase.from('profiles').select('language').eq('id',user.id).single().then(({data,error})=>{
      if(!live)return;
      if(!error&&['ru','kk','en'].includes(data?.language)){setLanguage(data!.language);languageUser.current=user.id;}
    });
    return()=>{live=false;};
  },[user?.id]);
  useEffect(()=>{
    if(user&&supabase&&languageUser.current===user.id)void supabase.from('profiles').update({language}).eq('id',user.id).then(({error})=>{if(error)setMessage('Не удалось сохранить язык в профиле. Выбор сохранён на устройстве.');});
  },[language,user?.id]);
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
  if (!loading && view === 'game') return <App key={user?.id || 'guest'} userId={user?.id} onShop={() => navigate('shop')} onAccount={() => navigate(user ? 'profile' : 'home')} accountLabel={user ? 'Профиль' : 'Гость · Войти'} />;
  return <div className="app-shell entry-shell"><World moving={!loading} showcase /><header className="topbar"><a className="brand" href="./">{t("⚓ ФЛОТ / СЕКТОР 10")}</a><div className="header-right"><span className="entry-header-label">{t("СУМЕРЕЧНЫЙ АРХИПЕЛАГ")}</span><LanguageSwitch /><button className="button secondary" onClick={() => navigate('shop')}>{t("Магазин")}</button><SoundButton /></div></header><main className="entry-main">
    {tr(loading ? <section className="entry-card"><h1>{t("Возвращаемся на борт")}</h1><p role="status">{t("Восстанавливаем сессию…")}</p></section> : view === 'shop' ? <Shop userId={user?.id} back={() => setView('game')} /> : view === 'profile' && user ? <Profile user={user} back={() => setView('game')} logout={async () => { const { error } = await supabase!.auth.signOut({ scope: 'local' }); if (error) throw error; try { localStorage.removeItem('fleet:entry'); } catch {} setUser(null); setView('home'); }} /> : <section className="entry-card">
      <small>{t("ТИХОЕ МОРЕ. БОЛЬШАЯ ОПЕРАЦИЯ.")}</small><h1>{tr(view === 'signup' ? 'Создать аккаунт' : view === 'login' ? 'С возвращением, командир' : 'Ваш флот ждёт приказа.')}</h1>
      <p>{t("Десять кораблей. Неизвестный противник. Найдите свой курс среди островов сумеречного моря.")}</p>
      {tr(view === 'home' ? <div className="entry-actions"><button className="button primary" onClick={guest}>{t("Играть без регистрации")}</button><button className="button secondary" onClick={() => navigate('login')}>{t("Войти")}</button><button className="button secondary" onClick={() => navigate('signup')}>{t("Создать аккаунт")}</button><small>{t("Гостевая партия сохраняется на этом устройстве.")}</small></div> : <>
        {tr(!supabase && <div role="status" className="account-notice"><p>{t("Вход и регистрация пока недоступны: сервис аккаунтов не настроен. Гостевая игра полностью доступна.")}</p><details><summary>{t("Как подключить регистрацию")}</summary><ol><li>{t("Выполните SQL-миграцию из папки supabase/migrations в своём проекте Supabase.")}</li><li>{t("Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local и перезапустите приложение.")}</li><li>{t("Включите Email Auth и добавьте адрес приложения в Redirect URLs.")}</li></ol><p>{t("Нужен публичный ключ, не service_role. Полная инструкция — в README.")}</p></details></div>)}
        <form onSubmit={submit}>{tr(view === 'signup' && <label>{t("Позывной")}<input value={nickname} onChange={e => setNickname(e.target.value)} required minLength={2} maxLength={40} autoComplete="nickname" /></label>)}<label>{t("Электронная почта")}<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254} /></label><label>{t("Пароль")}<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={view === 'signup' ? 'new-password' : 'current-password'} /></label><button className="button primary" disabled={busy || !supabase}>{tr(busy ? 'Подождите…' : view === 'signup' ? 'Зарегистрироваться' : 'Войти в аккаунт')}</button></form>
        <div className="entry-actions"><button className="button secondary" disabled={busy} onClick={() => navigate(view === 'signup' ? 'login' : 'signup')}>{tr(view === 'signup' ? 'Уже есть аккаунт — войти' : 'Создать аккаунт')}</button><button className="button secondary" disabled={busy} onClick={guest}>{t("Играть без регистрации")}</button><button className="button secondary" disabled={busy} onClick={() => navigate('home')}>{t("На стартовый экран")}</button></div>
      </>)}
      <p role="status" aria-live="polite">{tr(message)}</p>
    </section>)}
  </main><footer>{t("ФЛОТ / СЕКТОР 10 · Одиночная игра против бота")}</footer></div>;
}
