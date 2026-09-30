import {it,expect} from 'vitest';
import {statSync} from 'node:fs';
import manifest from './voices.json';
import {emotions} from './catalog';
it('ships all eighteen localized recordings and three battle samples',()=>{
  for(const language of ['ru','kk','en'] as const)for(const {id} of emotions){
    const src=manifest[language][id];expect(src).toBe(`/audio/emotions/${language}/${id}.mp3`);
    expect(statSync(`public${src}`).size).toBeGreaterThan(3000);
  }
  for(const id of ['hit','miss','sunk'])expect(statSync(`public/audio/battle/${id}.mp3`).size).toBeGreaterThan(3000);
});
