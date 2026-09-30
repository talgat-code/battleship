import { expect,it } from 'vitest';
import { dictionary } from './translations';
import { catalog } from './shop/catalog';
it('has complete Kazakh and English catalog translations with matching placeholders',()=>{
  for(const item of catalog)for(const key of [item.name,item.description])expect(dictionary[key]).toHaveLength(2);
  for(const [key,values] of Object.entries(dictionary))for(const value of values){
    expect(value.trim().length).toBeGreaterThan(0);
    expect(value.match(/\{\d+\}/g)||[]).toEqual(key.match(/\{\d+\}/g)||[]);
  }
});
