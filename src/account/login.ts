import {supabase} from './client';
export const normalizeLogin=(value:string)=>value.trim().toLowerCase();
export const validLogin=(value:string)=>/^[a-z0-9_]{3,24}$/.test(normalizeLogin(value));
export function authMessage(error:unknown){
  const code=(error as {code?:string})?.code;
  const messages:Record<string,string>={
    invalid_login:'Логин: 3–24 символа, латинские буквы, цифры и знак _. Регистр не важен.',
    invalid_password:'Пароль должен содержать от 8 до 72 символов.',
    login_taken:'Этот логин уже занят. Выберите другой или войдите.',
    invalid_credentials:'Неверный логин, почта или пароль.',
    email_not_confirmed:'Для старого аккаунта подтвердите почту по ссылке в письме.',
    rate_limited:'Слишком много попыток. Подождите несколько минут.',
    over_email_send_rate_limit:'Слишком много попыток. Подождите несколько минут.',
    account_created:'Аккаунт создан, но вход не подтверждён. Войдите с тем же логином и паролем.',
  };
  return messages[code||'']||'Сервис входа недоступен. Проверьте связь и развёртывание функции login-auth. Можно играть гостем.';
}
export async function loginWithName(action:'register'|'login',login:string,password:string){
  if(!supabase)throw {code:'service_unavailable'};
  if(!validLogin(login))throw {code:'invalid_login'};
  if(password.length<8||password.length>72)throw {code:'invalid_password'};
  const {data,error}=await supabase.functions.invoke('login-auth',{body:{action,login:normalizeLogin(login),password},signal:AbortSignal.timeout(20000)});
  if(error){let details;try{details=await (error as {context?:Response}).context?.json();}catch{}throw details||error;}
  if(!data?.session?.access_token||!data.session.refresh_token)throw {code:'service_unavailable'};
  const result=await supabase.auth.setSession(data.session);
  if(result.error)throw result.error;
}
