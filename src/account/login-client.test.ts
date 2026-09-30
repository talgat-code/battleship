import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),setSession:vi.fn(),profile:vi.fn()}));
vi.mock('./client',()=>({supabase:{functions:{invoke:mocks.invoke},auth:{setSession:mocks.setSession},from:()=>({select:()=>({eq:()=>({abortSignal:()=>({single:mocks.profile})})})})}}));
import {authMessage,loginWithName} from './login';
it('normalizes surrounding spaces and reports invisible characters before any request',async()=>{
  await loginWithName('register',' qwert09_t ','test-password');
  expect(mocks.invoke.mock.calls[0][1].body.login).toBe('qwert09_t');
  mocks.invoke.mockClear();
  try{await loginWithName('register','qwert09_t\u200b','test-password');throw Error('Expected rejection');}
  catch(error){expect(authMessage(error)).toContain('U+200B');}
  expect(mocks.invoke).not.toHaveBeenCalled();
});
beforeEach(()=>{vi.clearAllMocks();mocks.invoke.mockResolvedValue({data:{session:{access_token:'test',refresh_token:'test'}},error:null});mocks.setSession.mockResolvedValue({data:{user:{id:'same-user'}},error:null});mocks.profile.mockResolvedValue({data:{id:'same-user'},error:null});});
it('confirms profile creation only after reading the same server profile',async()=>{
  expect(await loginWithName('register','captain','test-password')).toEqual({userId:'same-user',profileReady:true});
});
it('does not claim profile creation or repeat registration when the profile is unavailable',async()=>{
  mocks.profile.mockResolvedValue({data:null,error:{code:'42501'}});
  expect(await loginWithName('register','captain','test-password')).toEqual({userId:'same-user',profileReady:false});
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
});
it('a missing function never creates a successful session or profile confirmation',async()=>{
  mocks.invoke.mockResolvedValue({data:null,error:{context:{json:async()=>({code:'NOT_FOUND'})}}});
  await expect(loginWithName('register','captain','test-password')).rejects.toEqual({code:'NOT_FOUND'});
  expect(mocks.setSession).not.toHaveBeenCalled();expect(mocks.profile).not.toHaveBeenCalled();
});
