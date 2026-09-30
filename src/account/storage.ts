import { STORAGE_KEY } from '../game';
export const gameKey = (userId?: string) => userId ? `fleet-account:${userId}:v1` : STORAGE_KEY;
export type Result = { id: string; user_id: string; outcome: 'win' | 'loss'; shots: number; finished_at: string };
export const queueKey = (userId: string) => `fleet-results:${userId}:v1`;
export function enqueue(result: Result) {
  const key = queueKey(result.user_id);
  const queue: Result[] = JSON.parse(localStorage.getItem(key) || '[]');
  if (!queue.some(r => r.id === result.id)) localStorage.setItem(key, JSON.stringify([...queue, result]));
}
