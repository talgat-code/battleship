import { createClient } from '@supabase/supabase-js';
const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Only a publishable/legacy anon key belongs in a browser bundle. RLS is the authority.
export const supabase = (() => {
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) return null;
  try { return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
  catch { return null; } // Invalid configuration must not prevent guest play.
})();
