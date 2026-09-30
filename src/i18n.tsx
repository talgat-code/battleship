import { createContext, useContext, useState, type ReactNode } from 'react';
import { dictionary } from './translations';
export { dictionary } from './translations';
export type Language='ru'|'kk'|'en';
let current:Language='ru';
const Context=createContext({language:'ru' as Language,setLanguage:(_v:Language)=>{}});
export function I18n({children}:{children:ReactNode}) {
  const [language,set]=useState<Language>(()=>{try{const saved=localStorage.getItem('fleet:language');return saved==='kk'||saved==='en'?saved:'ru';}catch{return 'ru';}});
  current=language;document.documentElement.lang=language;
  return <Context.Provider value={{language,setLanguage:(v)=>{try{localStorage.setItem('fleet:language',v);}catch{}set(v);}}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export const coordinateLetters=()=>current==='en'?'ABCDEFGHIJ':'АБВГДЕЖЗИК';
export const dateLocale=()=>current==='kk'?'kk-KZ':current==='en'?'en-GB':'ru-RU';
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(dictionary).filter(([key])=>key.includes('{0}')).map(([key,translations])=>({regex:new RegExp('^'+key.split(/\{\d+\}/).map(escape).join('(.+?)')+'$'),translations}));
const fragments=Object.keys(dictionary).filter(key=>!key.includes('{')).sort((a,b)=>b.length-a.length);
export function t(value:string):string {
  if(current==='ru')return value;
  const index=current==='kk'?0:1,key=value.trim();
  if(dictionary[key])return value.replace(key,dictionary[key][index]);
  for(const {regex,translations} of patterns){const match=key.match(regex);if(match)return translations[index].replace(/\{(\d+)\}/g,(_,n)=>t(match[Number(n)+1]));}
  // Old saved battle logs contain source-language prose; translate their public events on display.
  const log=key.match(/^(Вы|Противник) → (.+): (.+)$/);
  if(log)return `${t(log[1])} → ${current==='en'?log[2].replace(/[АБВГДЕЖЗИК]/g,c=>'ABCDEFGHIJ'['АБВГДЕЖЗИК'.indexOf(c)]):log[2]}: ${t(log[3])}`;
  let result=value;
  for(const fragment of fragments)if(result.includes(fragment))result=result.split(fragment).join(dictionary[fragment][index]);
  return result;
}
export function tr<T>(value:T):T {return (typeof value==='string'?t(value):Array.isArray(value)?value.map(tr):value) as T;}
export function LanguageSwitch(){const {language,setLanguage}=useLanguage();return <select aria-label={t('Язык')} className="language-switch" value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="kk">KZ</option><option value="ru">RU</option><option value="en">EN</option></select>;}
