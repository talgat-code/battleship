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
import {Eye,EyeOff} from 'lucide-react';
import {authMessage,loginWithName} from './login';
import Duel from '../network/Duel';
import Leaderboard from '../network/Leaderboard';
import '../network/network.css';

export default function Entry() {
  const {language,setLanguage}=useLanguage();
  const languageUser=useRef<string|null>(null);
  const [user, setUser] = useState<User | null>(null);
  const activeUser = useRef<string | null>(null);
  const friendIntent=useRef(new URLSearchParams(location.search).has('invite')||new URLSearchParams(location.search).has('room'));
  const [loading, setLoading] = useState(!!supabase);
  const [view, setView] = useState<'home' | 'login' | 'signup' | 'game' | 'profile' | 'shop' | 'friend' | 'leaders'>(() => { const recovery=new URLSearchParams(location.search).get('recovery'); if(recovery==='login')return 'login';if(recovery==='guest')return 'game';if(friendIntent.current)return 'friend'; try { return localStorage.getItem('fleet:entry') === 'guest' ? 'game' : 'home'; } catch { return 'home'; } });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword,setShowPassword]=useState(false);
  const immediateGame=useRef(false);
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
    void supabase.auth.getSession().then(({error})=>{if(live&&error){setLoading(false);setMessage('Не удалось восстановить вход. Войдите снова или играйте гостем.');}}).catch(()=>{if(live){setLoading(false);setMessage('Не удалось восстановить вход. Войдите снова или играйте гостем.');}});
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      setUser(session?.user || null); setLoading(false); clearTimeout(timer);
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) { if(event === 'INITIAL_SESSION' || activeUser.current !== session.user.id) setView(friendIntent.current?'friend':immediateGame.current?'game':'profile'); setPassword('');setShowPassword(false); }
      activeUser.current = session?.user.id || null;
      if (event === 'SIGNED_OUT') setView('home');
    });
    return () => { live = false; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);
  function guest() { try { localStorage.setItem('fleet:entry', 'guest'); } catch { /* In-memory guest remains usable. */ } setLoading(false);setView('game'); setMessage(''); }
  function navigate(next: typeof view) { setView(next); setMessage(''); setPassword('');setShowPassword(false); }
  function friend(){friendIntent.current=true;navigate('friend');}
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || busy) return;
    setBusy(true); setMessage('');
    try {
      immediateGame.current=view==='signup';
      if(view==='signup')await loginWithName('register',email,password);
      else if(email.includes('@')){
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
      }else await loginWithName('login',email,password);
      setPassword('');setShowPassword(false);
    } catch(error){immediateGame.current=false;setMessage(authMessage(error));
    } finally { setBusy(false); }
  }
  if (!loading && view === 'game') return <App key={user?.id || 'guest'} userId={user?.id} onShop={() => navigate('shop')} onAccount={() => navigate(user ? 'profile' : 'home')} accountLabel={user ? 'Профиль' : 'Гость · Войти'} />;
  return <div className="app-shell entry-shell"><World moving={!loading} showcase /><header className="topbar"><a className="brand" href="./">{t("⚓ ФЛОТ / СЕКТОР 10")}</a><div className="header-right"><span className="entry-header-label">{t("СУМЕРЕЧНЫЙ АРХИПЕЛАГ")}</span><LanguageSwitch /><button className="button secondary" onClick={()=>navigate('leaders')}>{t('Таблица лидеров')}</button>{view!=='home'&&<><button className="button secondary" onClick={guest}>{t('Играть с ботом')}</button><button className="button secondary" onClick={friend}>{t('Играть с другом')}</button></>}<button className="button secondary" onClick={() => navigate('shop')}>{t("Магазин")}</button><SoundButton /></div></header><main className="entry-main">
    {tr(loading ? <section className="entry-card"><h1>{t("Возвращаемся на борт")}</h1><p role="status">{t("Восстанавливаем сессию…")}</p><div className="auth-recovery-actions"><button className="button secondary" onClick={()=>{setLoading(false);navigate('login');}}> {t("Войти")} </button><button className="button primary" onClick={guest}>{t("Играть без регистрации")}</button></div></section> : view === 'friend' ? <FriendGate user={user} login={()=>navigate('login')} signup={()=>navigate('signup')}><Duel key={user?.id} userId={user?.id||''} onLeaders={()=>navigate('leaders')}/></FriendGate> : view === 'leaders' ? <Leaderboard userId={user?.id} onProfile={()=>navigate(user?'profile':'login')}/> : view === 'shop' ? <Shop userId={user?.id} back={() => setView('game')} /> : view === 'profile' && user ? <Profile user={user} back={() => setView('game')} logout={async () => { const { error } = await supabase!.auth.signOut({ scope: 'local' }); if (error) throw error; try { localStorage.removeItem('fleet:entry'); } catch {} setUser(null); setView('home'); }} /> : <section className="entry-card">
      <small>{t("ТИХОЕ МОРЕ. БОЛЬШАЯ ОПЕРАЦИЯ.")}</small><h1>{tr(view === 'signup' ? 'Создать аккаунт' : view === 'login' ? 'С возвращением, командир' : 'Ваш флот ждёт приказа.')}</h1>
      <p>{t("Десять кораблей. Неизвестный противник. Найдите свой курс среди островов сумеречного моря.")}</p>
      {tr(view === 'home' ? <div className="entry-actions"><button className="button primary" onClick={guest}>{t('Играть с ботом')}</button><button className="button primary" onClick={friend}>{t('Играть с другом')}</button><small>{t('С другом — по ссылке, после входа. Классические правила без карт способностей.')}</small><button className="button secondary" onClick={guest}>{t("Играть без регистрации")}</button><button className="button secondary" onClick={() => navigate('login')}>{t("Войти")}</button><button className="button secondary" onClick={() => navigate('signup')}>{t("Создать аккаунт")}</button><small>{t("Гостевая партия сохраняется на этом устройстве.")}</small></div> : <>
        {tr(!supabase && <div role="status" className="account-notice"><p>{t("Вход и регистрация пока недоступны: сервис аккаунтов не настроен. Гостевая игра полностью доступна.")}</p><details><summary>{t("Как подключить регистрацию")}</summary><ol><li>{t("Выполните SQL-миграцию из папки supabase/migrations в своём проекте Supabase.")}</li><li>{t("Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local и перезапустите приложение.")}</li><li>{t("Включите Email Auth и добавьте адрес приложения в Redirect URLs.")}</li></ol><p>{t("Нужен публичный ключ, не service_role. Полная инструкция — в README.")}</p></details></div>)}
        <form onSubmit={submit}><label>{t(view==='signup'?'Логин':'Логин или почта')}<input type="text" value={email} onChange={e=>setEmail(e.target.value)} required minLength={view==='signup'?3:1} maxLength={view==='signup'?24:254} pattern={view==='signup'?'[A-Za-z0-9_]{3,24}':undefined} autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>{view==='signup'&&<p className="auth-hint">{t('3–24 символа: латинские буквы, цифры и _. Регистр не важен. Почта не нужна.')}</p>}<label htmlFor="account-password">{t('Пароль')}</label><div className="password-field"><input id="account-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={view==='signup'?8:1} maxLength={view==='signup'?72:undefined} autoComplete={view==='signup'?'new-password':'current-password'}/><button type="button" className="password-eye" aria-label={t(showPassword?'Скрыть пароль':'Показать пароль')} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>{view==='signup'&&<p className="auth-hint">{t('Пароль: 8–72 символа. Сохраните его: восстановление через почту для тестовых логинов недоступно.')}</p>}<button className="button primary" disabled={busy||!supabase}>{tr(busy?'Подождите…':view==='signup'?'Зарегистрироваться':'Войти в аккаунт')}</button></form>
        <div className="entry-actions"><button className="button secondary" disabled={busy} onClick={() => navigate(view === 'signup' ? 'login' : 'signup')}>{tr(view === 'signup' ? 'Уже есть аккаунт — войти' : 'Создать аккаунт')}</button><button className="button secondary" disabled={busy} onClick={guest}>{t("Играть без регистрации")}</button><button className="button secondary" disabled={busy} onClick={() => navigate('home')}>{t("На стартовый экран")}</button></div>
      </>)}
      <p role="status" aria-live="polite">{tr(message)}</p>
    </section>)}
  </main><footer>{t('ФЛОТ / СЕКТОР 10 · С ботом или с другом')}</footer></div>;
}

function FriendGate({user,login,signup,children}:{user:User|null;login:()=>void;signup:()=>void;children:React.ReactNode}){
  if(user&&supabase)return children;
  return <section className="entry-card"><h1>{t('Играть с другом')}</h1><p>{t('Пригласите друга по ссылке. Для обоих игроков нужен отдельный аккаунт. Классические правила, без купленных способностей.')}</p>{!supabase&&<p role="status">{t('Сервис аккаунтов и сетевой игры не настроен. Подключите Supabase и выполните миграции по инструкции в README. Локальной замены сетевого матча нет.')}</p>}<div className="entry-actions"><button className="button primary" onClick={login}>{t('Войти')}</button><button className="button secondary" onClick={signup}>{t('Создать аккаунт')}</button></div></section>;
}
