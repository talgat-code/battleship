import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const allowed = (Deno.env.get('ALLOWED_ORIGINS') || 'https://flot-sector.netlify.app,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173').split(',');
const url=Deno.env.get('SUPABASE_URL')!;
const adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('FLEET_PUBLISHABLE_KEY');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}};
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin');
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(origin&&allowed.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const answer=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.includes(origin))return answer(403,{code:'origin_denied'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return answer(405,{code:'method_not_allowed'});
  if(!url||!adminKey||!publicKey)return answer(503,{code:'service_unavailable'});
  try{
    // Bound the input before parsing; never log bodies, passwords or tokens.
    const reader=req.body?.getReader();if(!reader)return answer(400,{code:'invalid_request'});
    let text='',bytes=0;const decoder=new TextDecoder();
    for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>4096){await reader.cancel();return answer(413,{code:'invalid_request'});}text+=decoder.decode(part.value,{stream:true});}
    text+=decoder.decode();
    let body;try{body=JSON.parse(text);}catch{return answer(400,{code:'invalid_request'});}
    const {action,password}=body;const login=typeof body.login==='string'?body.login.trim().toLowerCase():'';
    if(!['register','login'].includes(action)||!/^[a-z0-9_]{3,24}$/.test(login))return answer(400,{code:'invalid_login'});
    if(typeof password!=='string'||password.length<8||password.length>72)return answer(400,{code:'invalid_password'});
    const admin=createClient(url,adminKey,options);
    const auth=createClient(url,publicKey,options);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
    for(const [bucket,limit,seconds] of [
      [`ip:${action}:${await hash(ip)}`,action==='register'?10:60,action==='register'?3600:300],
      [`login:${action}:${await hash(login)}`,action==='register'?5:12,300],
    ] as [string,number,number][]){
      const {data,error}=await admin.rpc('fleet_auth_limit',{bucket_key:bucket,max_attempts:limit,seconds});
      if(error)return answer(503,{code:'service_unavailable'});
      if(!data)return answer(429,{code:'rate_limited'});
    }
    const {data:identity,error:lookupError}=await admin.from('login_accounts').select('user_id').eq('login',login).maybeSingle();
    if(lookupError)return answer(503,{code:'service_unavailable'});
    let email:string;
    if(action==='register'){
      if(identity)return answer(409,{code:'login_taken'});
      // Random internal address is NOT a username-derived public login credential.
      // Only this new account is confirmed; existing email accounts are unchanged.
      email=`${crypto.randomUUID()}@fleet.invalid`;
      const {error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nickname:login},app_metadata:{fleet_login:login}});
      if(error){
        const {data:duplicate}=await admin.from('login_accounts').select('user_id').eq('login',login).maybeSingle();
        return answer(duplicate?409:503,{code:duplicate?'login_taken':'service_unavailable'});
      }
    }else{
      if(!identity){
        // Same Auth password path for an unknown login; no account is created on sign-in.
        await auth.auth.signInWithPassword({email:`${crypto.randomUUID()}@fleet.invalid`,password});
        return answer(401,{code:'invalid_credentials'});
      }
      const {data,error}=await admin.auth.admin.getUserById(identity.user_id);
      if(error||!data.user?.email)return answer(401,{code:'invalid_credentials'});
      email=data.user.email;
    }
    const {data,error}=await auth.auth.signInWithPassword({email,password});
    if(error||!data.session)return answer(action==='register'?503:401,{code:action==='register'?'account_created':'invalid_credentials'});
    return answer(200,{session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}});
  }catch{return answer(503,{code:'service_unavailable'});}
});
