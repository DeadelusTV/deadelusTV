/* Tests isolés du backend de préparation (Node >=18).
 * Aucun accès au réseau ou à Supabase. N'exécute aucune migration.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const src=fs.readFileSync(path.join(__dirname,'../supabase/functions/site-access-admin/core.js'),'utf8');
  const {createHandler}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
  const origin='https://deadelustv.pages.dev',base='https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const valid={
    SITE_ACCESS_ADMIN_TWITCH_IDS:'12345,67890',
    SITE_ACCESS_ALLOWED_ORIGINS:origin,
    SUPABASE_URL:base,
    SUPABASE_SERVICE_ROLE_KEY:'FAKE-NOT-A-SECRET'
  };
  const audit=[];
  const snapshot={authorized:true,phase:'draft_registry',rights_effective:false,categories:[],people:[]};
  const mkHttp=(twitch='12345',authStatus=200,rpcStatus=200)=>async(url,options)=>{
    if(url===base+'/auth/v1/user')return new Response(JSON.stringify({
      id:'11111111-2222-4333-8444-555555555555',
      identities:[{provider:'twitch',id:twitch}]
    }),{status:authStatus});
    assert.equal(url,base+'/rest/v1/rpc/site_access_admin_action');
    assert.equal(options.headers.apikey,valid.SUPABASE_SERVICE_ROLE_KEY);
    audit.push(JSON.parse(options.body));
    return new Response(JSON.stringify(snapshot),{status:rpcStatus});
  };
  const invoke=async(handler,body={action:'bootstrap'},currentOrigin=origin,token='owner')=>{
    const req=new Request('https://service.invalid/functions/v1/site-access-admin',{
      method:'POST',headers:{origin:currentOrigin,authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify(body)
    });
    return handler(req);
  };
  assert.equal((await invoke(createHandler({},mkHttp()))).status,403,'origine absente = refus');
  assert.equal((await invoke(createHandler({SITE_ACCESS_ALLOWED_ORIGINS:origin},mkHttp()))).status,503,'identités et service manquants');
  assert.equal((await invoke(createHandler(valid,mkHttp()),{action:'bootstrap'},'https://evil.invalid')).status,403);
  assert.equal((await invoke(createHandler(valid,mkHttp('55555')))).status,403,'non propriétaire refusé');
  assert.equal((await invoke(createHandler(valid,mkHttp('12345',401)))).status,401,'JWT invalide');
  assert.equal((await invoke(createHandler({...valid,SUPABASE_URL:'https://crew.invalid'},mkHttp()))).status,503,'mauvaise base');
  assert.equal((await invoke(createHandler(valid,mkHttp()),{action:'setGrant',user_id:'33333',code:'crew.roles.admin',enabled:true})).status,403,'écritures désactivées');
  assert.equal((await invoke(createHandler(valid,mkHttp()),{action:'addPermission',label:'Admin',code:'portal.root.admin',category_id:'crew',section_id:'roles'})).status,400,'code privilégié interdit');
  assert.equal((await invoke(createHandler(valid,mkHttp()),{action:'unknown'})).status,400);
  const read=await invoke(createHandler(valid,mkHttp()));
  assert.equal(read.status,200);
  const readData=await read.json();
  assert.equal(readData.rights_effective,false);
  assert.equal(readData.mutations_enabled,false);
  assert.deepEqual(readData.people,[],'aucune personne inventée');
  const writable=createHandler({...valid,SITE_ACCESS_WRITES_ENABLED:'true'},mkHttp());
  assert.equal((await invoke(writable,{action:'setGrant',user_id:'33333',code:'crew.roles.admin',enabled:'true'})).status,400,'booléen exigé');
  assert.equal((await invoke(writable,{action:'addCategory',label:'Jeux de rôle'})).status,200);
  const last=audit.at(-1);
  assert.equal(last.p_action,'addCategory');
  assert.equal(last.p_payload.id,'jeux-de-role');
  assert.equal(last.p_actor_twitch_id,'12345','auteur pris depuis Auth');
  assert.equal((await invoke(writable,{action:'setGrant',user_id:'33333',code:'crew.roles.admin',enabled:true})).status,200);
  assert.equal((await invoke(createHandler(valid,mkHttp('12345',200,503)))).status,503,'registre non disponible = refus');
  console.log('Centre des accès V2 : 14 scénarios backend simulés réussis.');
})().catch(err=>{console.error(err);process.exitCode=1;});
