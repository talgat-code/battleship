import { supabase } from './client';
import { queueKey, Result } from './storage';
export async function flushResults(userId: string) {
  if (!supabase) throw new Error('Сервис аккаунтов не настроен.');
  const key = queueKey(userId);
  const queue: Result[] = JSON.parse(localStorage.getItem(key) || '[]');
  for (const result of queue) {
    const { error } = await supabase.from('matches').upsert(result, { onConflict: 'user_id,id', ignoreDuplicates: true });
    if (error) throw error;
    // Preserve results added while the request was in flight.
    const current: Result[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(current.filter(r => r.id !== result.id)));
  }
}
