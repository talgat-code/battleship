// Public deployment probe. No credentials, passwords, user creation or session logging.
const site='https://flot-sector.netlify.app';
const endpoint='https://ztimlpcqwbsxqfmetbpe.supabase.co/functions/v1/login-auth';
let reachable=true;
for(const method of ['OPTIONS','POST']){
  const response=await fetch(endpoint,{
    method,signal:AbortSignal.timeout(20000),
    headers:{Origin:site,'Content-Type':'application/json',...(method==='OPTIONS'?{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type,x-client-info'}:{})},
    ...(method==='POST'?{body:'{}'}:{}),
  });
  let code;try{code=(await response.json()).code;}catch{}
  const origin=response.headers.get('access-control-allow-origin');
  console.log(JSON.stringify({method,status:response.status,code,allowOrigin:origin,allowHeaders:response.headers.get('access-control-allow-headers')}));
  if(origin!==site||(method==='OPTIONS'?response.status!==204:response.status!==400||code!=='invalid_login'))reachable=false;
}
console.log(reachable?'Function handler and CORS reached. Real signup/session/profile still need testing.':'Deployment or CORS probe failed; inspect status and Supabase configuration.');
process.exitCode=reachable?0:1;
