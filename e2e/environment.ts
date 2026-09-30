import {loadEnv} from 'vite';
const env=loadEnv('development',process.cwd(),'VITE_');
export const authUrl=env.VITE_SUPABASE_URL||'';
export const hasSupabase=Boolean(authUrl&&env.VITE_SUPABASE_PUBLISHABLE_KEY&&!authUrl.includes('YOUR_')&&!env.VITE_SUPABASE_PUBLISHABLE_KEY.includes('YOUR_'));
