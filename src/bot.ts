import { type Cell, type Shot, FLEET, cellsFor, inside, same } from './game';
export const LEVELS = { rookie: { name: 'Новичок', description: 'Случайные выстрелы по свободным клеткам.' }, tactician: { name: 'Тактик', description: 'Ищет соседние клетки после попадания и добивает корабль.' }, admiral: { name: 'Адмирал', description: 'Оценивает возможные положения оставшихся кораблей.' } };
export type Difficulty = keyof typeof LEVELS;
export const validDifficulty = (v: unknown): v is Difficulty => typeof v === 'string' && Object.hasOwn(LEVELS, v);
// Public information only. No Board or Ship positions can be supplied.
export function chooseShot(shots: Shot[], difficulty: Difficulty, random = Math.random): Cell {
  const available = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) })).filter(c => !shots.some(s => same(s,c)));
  if (!available.length) throw new Error('Нет доступных клеток');
  const pick = (pool: Cell[]) => pool[Math.floor(random()*pool.length)];
  if (difficulty === 'rookie') return pick(available);
  const hits = shots.filter(s => s.result === 'hit');
  const neighbors = available.filter(c => hits.some(h => Math.abs(c.x-h.x)+Math.abs(c.y-h.y) === 1));
  if (difficulty === 'tactician') {
    const line = neighbors.filter(c => hits.some(a => hits.some(b => !same(a,b) && ((a.x===b.x && c.x===a.x) || (a.y===b.y && c.y===a.y)))));
    return pick(line.length ? line : neighbors.length ? neighbors : available);
  }
  const remaining = [...FLEET];
  const sunk = shots.filter(s => s.result === 'sunk');
  const visited = new Set<string>();
  for (const s of sunk) {
    const key = (c: Cell) => `${c.x},${c.y}`;
    if (visited.has(key(s))) continue;
    const group = [s]; visited.add(key(s));
    for (let i=0;i<group.length;i++) for (const other of sunk) if (!visited.has(key(other)) && Math.abs(other.x-group[i].x)+Math.abs(other.y-group[i].y)===1) { visited.add(key(other)); group.push(other); }
    const index=remaining.indexOf(group.length); if(index>=0)remaining.splice(index,1);
  }
  const scores = new Map(available.map(c => [`${c.x},${c.y}`,0]));
  for(const length of remaining) for(let y=0;y<10;y++) for(let x=0;x<10;x++) for(const vertical of length===1?[false]:[false,true]) {
    const cells=cellsFor({x,y},length,vertical);
    if(!cells.every(inside) || cells.some(c=>shots.some(s=>same(c,s)&&s.result!=='hit')) || cells.some(c=>sunk.some(s=>Math.abs(c.x-s.x)<=1&&Math.abs(c.y-s.y)<=1)))continue;
    const covered=hits.filter(h=>cells.some(c=>same(c,h)));
    if(hits.length && !covered.length)continue;
    if(hits.some(h=>!cells.some(c=>same(c,h)) && cells.some(c=>Math.abs(c.x-h.x)<=1&&Math.abs(c.y-h.y)<=1)))continue;
    for(const c of cells) {const k=`${c.x},${c.y}`; if(scores.has(k))scores.set(k,scores.get(k)!+1+covered.length*10);}
  }
  const max=Math.max(...scores.values());
  return pick(max>0?available.filter(c=>scores.get(`${c.x},${c.y}`)===max):neighbors.length?neighbors:available);
}
