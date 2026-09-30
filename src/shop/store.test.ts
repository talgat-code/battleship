import {afterEach,expect,it,vi} from 'vitest';
import {readWallet,saveGame,walletKey} from './store';
import {newWallet} from './economy';
import {freshGame} from '../game';
afterEach(()=>vi.unstubAllGlobals());
function storage(){const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});vi.stubGlobal('window',{dispatchEvent:()=>{}});return data;}
it('guest and account inventories stay isolated when entering and saving a battle',()=>{
  const data=storage();data.set(walletKey(),JSON.stringify({...newWallet(),items:{sonar:2}}));data.set(walletKey('captain'),JSON.stringify({...newWallet(),items:{kraken:1},balance:777}));
  saveGame(freshGame(),'captain');
  expect(readWallet('captain').items).toEqual({kraken:1});expect(readWallet('captain').balance).toBe(777);expect(readWallet().items).toEqual({sonar:2});expect(readWallet().game).toBeUndefined();
});
it('does not grant local test money to an account whose server snapshot lacks the marker',()=>{
  const data=storage();data.set(walletKey('captain'),JSON.stringify({...newWallet(),testingGrant:undefined,balance:7,items:{bomb:1}}));expect(readWallet('captain').balance).toBe(7);expect(readWallet('captain').items.bomb).toBe(1);
});
