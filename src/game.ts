export type Cell = { x: number; y: number };
export type Ship = { id: number; length: number; cells: Cell[] };
export type Shot = Cell & { result: 'miss' | 'hit' | 'sunk' };
export type Board = { ships: Ship[]; shots: Shot[] };
export type Side = 'player' | 'bot';
export type Game = { version: 1; matchId?: string; difficulty?: 'rookie' | 'tactician' | 'admiral'; phase: 'setup' | 'battle' | 'finished'; turn: Side; player: Board; bot: Board; winner?: Side; log: string[] };
export const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
export const LETTERS = 'АБВГДЕЖЗИК';
export const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const inside = (c: Cell) => Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10;
export const cellsFor = (c: Cell, length: number, vertical: boolean): Cell[] => Array.from({ length }, (_, i) => ({ x: c.x + (vertical ? 0 : i), y: c.y + (vertical ? i : 0) }));
export function canPlace(ships: Ship[], cells: Cell[]) {
  return cells.every(inside) && !ships.some(s => s.cells.some(a => cells.some(b => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1)));
}
export function place(ships: Ship[], id: number, cell: Cell, vertical: boolean): Ship[] {
  if (id < 0 || id >= FLEET.length || ships.some(s => s.id === id)) return ships;
  const cells = cellsFor(cell, FLEET[id], vertical);
  return canPlace(ships, cells) ? [...ships, { id, length: FLEET[id], cells }] : ships;
}
export function randomFleet(): Ship[] {
  for (;;) {
    let ships: Ship[] = [];
    for (let id = 0; id < FLEET.length; id++) {
      for (let attempt = 0; attempt < 300; attempt++) {
        const next = place(ships, id, { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) }, Math.random() < .5);
        if (next !== ships) { ships = next; break; }
      }
      if (ships.length !== id + 1) break;
    }
    if (ships.length === 10) return ships;
  }
}
export const freshGame = (): Game => ({ version: 1, phase: 'setup', turn: 'player', player: { ships: [], shots: [] }, bot: { ships: randomFleet(), shots: [] }, log: [] });
export const isSunk = (ship: Ship, shots: Shot[]) => ship.cells.every(c => shots.some(s => same(c, s) && s.result !== 'miss'));
export function fire(game: Game, side: Side, cell: Cell): Game {
  const target = side === 'player' ? 'bot' : 'player';
  const board = game[target];
  if (game.phase !== 'battle' || game.turn !== side || !inside(cell) || board.shots.some(s => same(s, cell))) return game;
  const ship = board.ships.find(s => s.cells.some(c => same(c, cell)));
  let shots: Shot[] = [...board.shots, { ...cell, result: ship ? 'hit' : 'miss' }];
  const sunk = ship && isSunk(ship, shots);
  if (sunk) shots = shots.map(s => ship.cells.some(c => same(c, s)) ? { ...s, result: 'sunk' } : s);
  const won = board.ships.every(s => isSunk(s, shots));
  const message = `${side === 'player' ? 'Вы' : 'Противник'} → ${LETTERS[cell.x]}${cell.y + 1}: ${sunk ? 'корабль потоплен' : ship ? 'попадание' : 'мимо'}`;
  return { ...game, [target]: { ...board, shots }, turn: ship ? side : target, phase: won ? 'finished' : 'battle', winner: won ? side : undefined, log: [message, ...game.log].slice(0, 30) };
}
// Only public shot information enters the targeting algorithm.
export function botTarget(shots: Shot[], random = Math.random): Cell {
  const available = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) })).filter(c => !shots.some(s => same(c, s)));
  const adjacent = available.filter(c => shots.some(s => s.result === 'hit' && Math.abs(s.x - c.x) + Math.abs(s.y - c.y) === 1));
  const pool = adjacent.length ? adjacent : available;
  if (!pool.length) throw new Error('Нет доступных клеток');
  return pool[Math.floor(random() * pool.length)];
}
export const STORAGE_KEY = 'fleet-sector-10:v1';
export function decodeSave(raw: string): Game | null {
  try {
    const g = JSON.parse(raw) as Game;
    if (g.version !== 1 || !['setup', 'battle', 'finished'].includes(g.phase) || !['player', 'bot'].includes(g.turn) || !Array.isArray(g.log) || !g.log.every(s => typeof s === 'string')) return null;
    for (const side of ['player', 'bot'] as const) {
      const b = g[side];
      if (!b || !Array.isArray(b.ships) || !Array.isArray(b.shots) || b.ships.length > 10) return null;
      let verified: Ship[] = [];
      for (const s of b.ships) {
        if (!Number.isInteger(s.id) || s.length !== FLEET[s.id] || !Array.isArray(s.cells) || s.cells.length !== s.length || verified.some(v => v.id === s.id)) return null;
        const expected = cellsFor(s.cells[0], s.length, s.length > 1 && s.cells[0].x === s.cells[1].x);
        if (!expected.every((c, i) => same(c, s.cells[i])) || !canPlace(verified, s.cells)) return null;
        verified.push(s);
      }
      if ((side === 'bot' || g.phase !== 'setup') && verified.length !== 10) return null;
      if (b.shots.some((s, i) => !inside(s) || !['hit', 'miss', 'sunk'].includes(s.result) || b.shots.slice(0, i).some(c => same(c, s)))) return null;
    }
    return g;
  } catch { return null; }
}
