import { describe, it, expect, vi, afterEach } from 'vitest';
import { gameKey, queueKey, enqueue, Result } from './storage';
import { STORAGE_KEY } from '../game';
describe('account isolation', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('retains the legacy guest save and separates users and result queues', () => {
    expect(gameKey()).toBe(STORAGE_KEY);
    expect(gameKey('alice')).not.toBe(gameKey('bob'));
    expect(gameKey('alice')).not.toBe(STORAGE_KEY);
    expect(queueKey('alice')).not.toBe(queueKey('bob'));
  });
  it('queues a finished match once and preserves guest data and other users', () => {
    const values = new Map([[STORAGE_KEY, 'existing guest game']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) || null, setItem: (k: string, v: string) => values.set(k, v) });
    const result: Result = { id: 'match-1', user_id: 'alice', outcome: 'win', shots: 40, finished_at: '2026-09-30T00:00:00Z' };
    enqueue(result); enqueue(result); enqueue({ ...result, user_id: 'bob' });
    expect(JSON.parse(values.get(queueKey('alice'))!)).toEqual([result]);
    expect(JSON.parse(values.get(queueKey('bob'))!)).toHaveLength(1);
    expect(values.get(STORAGE_KEY)).toBe('existing guest game');
  });
});
