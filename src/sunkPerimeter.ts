import {inside,same,type Cell,type Shot} from './game';

// Both placement authorities forbid touching, including diagonals. Only public,
// confirmed 'sunk' results enter this view; never infer a perimeter from a hit.
export function sunkPerimeter(shots:readonly Shot[]):Cell[]{
  const perimeter=new Map<string,Cell>();
  for(const shot of shots){
    if(shot.result!=='sunk')continue;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const cell={x:shot.x+dx,y:shot.y+dy};
      if(inside(cell)&&!shots.some(s=>same(s,cell)))perimeter.set(`${cell.x},${cell.y}`,cell);
    }
  }
  return [...perimeter.values()];
}
