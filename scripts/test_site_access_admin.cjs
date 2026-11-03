/* Contrôles isolés du verrou d'administration. Node >= 18. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/site-access-admin/core.js'),'utf8');
  const {createHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const origin='https://deadelustv.pages.dev';
  const one='11111111',two='22222222';
  const valid={SITE_ACCESS_ADMIN_TWITCH_IDS:one+','+two,SITE_ACCESS_ALLOWED_ORIGINS:origin};
  const uuid='11111111-2222-4333-8444-555555555555';
  const auth=async(_url,options)=>new Response(JSON.stringify({
    id:uuid,identities:[{provider:'twitch',id:options.headers.Authorization==='Bearer owner'?one:'99999'}]
  }),{status:200});
  async function invoke(handler,{originValue=origin,token='owner',method='POST',body={action:'bootstrap'}}={}){
    const req=new Request('https://service.test/functions/v1/site-access-admin',{
      method,headers:{origin:originValue,authorization:'Bearer '+token,'content-type':'application/json'},
      ...(method==='POST'?{body:JSON.stringify(body)}:{})
    });
    return handler(req);
  }
  assert.equal((await invoke(createHandler({},auth))).status,403,'aucune origine configurée => refus');
  const fail=await invoke(createHandler({SITE_ACCESS_ALLOWED_ORIGINS:origin},auth));
  assert.equal(fail.status,503,'absence de DEUX IDs => refus');
  const handler=createHandler(valid,auth);
  assert.equal((await invoke(handler,{originValue:'https://example.com'})).status,403);
  assert.equal((await invoke(handler,{token:'other'})).status,403,'non propriétaire refusé');
  const ok=await invoke(handler);
  assert.equal(ok.status,200);
  const data=await ok.json();
  assert.equal(data.authorized,true);
  assert.deepEqual(data.categories.flatMap(c=>c.sections.flatMap(s=>s.permissions.map(p=>p.code))).sort(),
    ['crew.roles.admin','crew.roles.helper','phasmo.livre.edit','phasmo.news.edit'].sort());
  assert.deepEqual(data.people,[],'aucune liste de comptes artificielle');
  assert.equal((await invoke(handler,{body:{action:'setGrant',user_id:'fake',enabled:true}})).status,501,
    'aucune modification des droits autorisée');
  assert.equal((await invoke(handler,{body:{action:'addCategory',label:'Bingo'}})).status,501);
  const badToken=await invoke(createHandler(valid,async()=>new Response('{}',{status:401})));
  assert.equal(badToken.status,401,'auth Supabase refusée');
  console.log('Tests du centre des accès : OK (verrou et lecture seule).');
})().catch(err=>{console.error(err);process.exitCode=1});
