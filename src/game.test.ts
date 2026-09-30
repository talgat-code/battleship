import { describe, expect, it } from 'vitest';
import { botTarget, canPlace, decodeSave, fire, freshGame, Game, isSunk, place, randomFleet, same } from './game';

describe('расстановка', () => {
  it('запрещает выход за границы и касание по диагонали', () => {
    const ships = place([], 6, { x: 0, y: 0 }, false);
    expect(place(ships, 7, { x: 1, y: 1 }, false)).toBe(ships);
    expect(place(ships, 0, { x: 8, y: 3 }, false)).toBe(ships);
    expect(place(ships, 7, { x: 2, y: 2 }, false)).toHaveLength(2);
    expect(place(ships, 6, { x: 5, y: 5 }, false)).toBe(ships);
  });
  it('генерирует полный корректный флот из 20 клеток', () => {
    for (let n = 0; n < 50; n++) {
      const ships = randomFleet();
      expect(ships).toHaveLength(10);
      expect(ships.flatMap(s => s.cells)).toHaveLength(20);
      ships.forEach(s => expect(canPlace(ships.filter(a => a !== s), s.cells)).toBe(true));
    }
  });
});
function battle(): Game { const g = freshGame(); return { ...g, phase: 'battle', player: { ships: randomFleet(), shots: [] } }; }
describe('бой', () => {
  it('попадание сохраняет ход, повторный и чужой выстрел ничего не меняют', () => {
    const g = battle(); const cell = g.bot.ships[0].cells[0]; const next = fire(g, 'player', cell);
    expect(next.turn).toBe('player'); expect(next.bot.shots[0].result).toBe('hit');
    expect(fire(next, 'player', cell)).toBe(next);
    expect(fire(next, 'bot', { x: 0, y: 0 })).toBe(next);
  });
  it('промах передаёт ход; бот также сохраняет ход при попадании', () => {
    const g = battle(); const water = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) })).find(c => !g.bot.ships.some(s => s.cells.some(p => same(p, c))))!;
    const next = fire(g, 'player', water); expect(next.turn).toBe('bot'); expect(next.bot.shots[0].result).toBe('miss');
    const hit = fire(next, 'bot', next.player.ships[0].cells[0]); expect(hit.turn).toBe('bot');
  });
  it('потопление всех кораблей завершает партию', () => {
    let g = battle(); const fleet = g.bot.ships;
    for (const ship of fleet) for (const cell of ship.cells) g = fire(g, 'player', cell);
    expect(g.phase).toBe('finished'); expect(g.winner).toBe('player');
    expect(g.bot.ships.every(s => isSunk(s, g.bot.shots))).toBe(true);
    expect(g.bot.shots.every(s => s.result === 'sunk')).toBe(true);
    expect(fire(g, 'player', { x: 0, y: 0 })).toBe(g);
  });
  it('бот добивает по открытой информации и не повторяет выстрел', () => {
    const shots = [{ x: 5, y: 5, result: 'hit' as const }, { x: 4, y: 5, result: 'miss' as const }];
    for (let n = 0; n < 20; n++) { const c = botTarget(shots); expect(Math.abs(c.x - 5) + Math.abs(c.y - 5)).toBe(1); expect(shots.some(s => same(s, c))).toBe(false); }
  });
  it('сохраняет и восстанавливает партию, отбрасывает повреждённые данные', () => {
    const g = battle(); expect(decodeSave(JSON.stringify(g))).toEqual(g);
    expect(decodeSave('{broken')).toBeNull(); expect(decodeSave(JSON.stringify({ ...g, version: 2 }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...g, player: { ships: [], shots: [] } }))).toBeNull();
  });
  it('полные партии ботов всегда заканчиваются допустимой победой', () => {
    for (let run = 0; run < 5; run++) {
      let g = battle(); let turns = 0;
      while (g.phase !== 'finished' && turns < 200) { const side = g.turn; const target = side === 'player' ? g.bot : g.player; g = fire(g, side, botTarget(target.shots)); turns++; }
      expect(g.phase).toBe('finished'); expect(turns).toBeLessThanOrEqual(200);
    }
  });
});
