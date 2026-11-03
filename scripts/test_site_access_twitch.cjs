/* V2 : tests simulés de la récupération Twitch et de sa synchronisation.
 * Lancer : node scripts/test_site_access_twitch.cjs (Node >=18).
 * Aucun appel externe, aucune base modifiée, aucune vraie identité.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/site-access-admin/core.js'),'utf8');
  const {getTwitchModerators,createHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const base='https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const origin='https://deadelustv.pages.dev';
  const client='abcdefghij1234567890';
  const env={
    SITE_ACCESS_ADMIN_TWITCH_IDS:'123456,789012',
    SITE_ACCESS_ALLOWED_ORIGINS:origin,
    SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'FAKE-NOT-A-SECRET',
    SITE_ACCESS_WRITES_ENABLED:'true',
    SITE_ACCESS_TWITCH_CLIENT_ID:client,
    SITE_ACCESS_TWITCH_BROADCASTER_TOKEN:'abcdefghijklmnopqrstuvwxyz0123456789'
  };
  const modA={user_id:'101',user_name:'Alpha'};
  const modB={user_id:'202',user_name:'Beta'};
  const modC={user_id:'303',user_name:'Gamma'};
  const validToken={user_id:'99977368',client_id:client,scopes:['moderation:read'],expires_in:3600};
  const snapshot={authorized:true,rights_effective:false,phase:'draft_registry',people:[],categories:[]};
  const req=(body,where=origin)=>new Request('https://service.invalid/functions/v1/site-access-admin',{
    method:'POST',headers:{origin:where,authorization:'Bearer sample', 'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const factory=({owner='123456',checked=validToken,pages,authStatus=200,modStatus=200}={})=>{
    const calls=[];
    const fetcher=async(url,opts)=>{
      calls.push({url,opts});
      if(url===base+'/auth/v1/user')return Response.json({
        id:'11111111-2222-4333-8444-555555555555',
        identities:[{provider:'twitch',id:owner}]
      },{status:authStatus});
      if(url==='https://id.twitch.tv/oauth2/validate')return Response.json(checked);
      if(url.startsWith('https://api.twitch.tv/helix/moderation/moderators?')){
        if(modStatus!==200)return Response.json({error:'unavailable'},{status:modStatus});
        const result=pages===undefined
          ? (url.includes('after=next')?{data:[modC],pagination:{}}:{data:[modA,modB],pagination:{cursor:'next'}})
          : pages.shift();
        return Response.json(result);
      }
      if(url===base+'/rest/v1/rpc/site_access_admin_action')return Response.json(snapshot);
      throw Error('URL imprévue : '+url);
    };
    return {fetcher,calls};
  };

  const happy=factory();
  const moderators=await getTwitchModerators(env,happy.fetcher);
  assert.deepEqual(moderators,[
    {user_id:'101',user_name:'Alpha'},
    {user_id:'202',user_name:'Beta'},
    {user_id:'303',user_name:'Gamma'}
  ]);
  assert.equal(happy.calls.filter(x=>x.url.includes('/helix/moderation/moderators')).length,2);
  assert(happy.calls.every(x=>!x.opts?.body?.includes('FAKE-NOT-A-SECRET')));

  const noScope=factory({checked:{...validToken,scopes:[]}});
  await assert.rejects(getTwitchModerators(env,noScope.fetcher),/twitch_authorization_invalid/);
  const wrongChannel=factory({checked:{...validToken,user_id:'999'}});
  await assert.rejects(getTwitchModerators(env,wrongChannel.fetcher),/twitch_authorization_invalid/);
  const wrongClient=factory({checked:{...validToken,client_id:'fake-client'}});
  await assert.rejects(getTwitchModerators(env,wrongClient.fetcher),/twitch_authorization_invalid/);
  const expired=factory({checked:{...validToken,expires_in:0}});
  await assert.rejects(getTwitchModerators(env,expired.fetcher),/twitch_authorization_invalid/);
  const failed=factory({modStatus:503});
  await assert.rejects(getTwitchModerators(env,failed.fetcher),/twitch_mod_list_unavailable/);
  const repeated=factory({pages:[{data:[modA],pagination:{cursor:'next'}},{data:[modA],pagination:{cursor:'next'}}]});
  await assert.rejects(getTwitchModerators(env,repeated.fetcher),/twitch_invalid_response/);
  await assert.rejects(getTwitchModerators({...env,SITE_ACCESS_TWITCH_BROADCASTER_TOKEN:''},happy.fetcher),/twitch_not_configured/);

  const previewFetcher=factory();
  const handler=createHandler({...env,SITE_ACCESS_WRITES_ENABLED:'false'},previewFetcher.fetcher);
  const preview=await handler(req({action:'previewModerators'}));
  assert.equal(preview.status,200);
  assert.equal((await preview.json()).moderators_preview.length,3);
  assert.equal(previewFetcher.calls.filter(x=>x.url.includes('/rpc/')).length,1);
  assert.equal((await handler(req({action:'syncModerators'}))).status,403,'écritures bloquées');

  const malicious=factory();
  const sync=await createHandler(env,malicious.fetcher)(req({
    action:'syncModerators',
    moderators:[{user_id:'666',user_name:'Injecté par le navigateur'}]
  }));
  assert.equal(sync.status,200);
  assert.equal((await sync.json()).sync_count,3);
  const rpc=malicious.calls.find(x=>x.url.includes('/rpc/'));
  const payload=JSON.parse(rpc.opts.body);
  assert.equal(payload.p_action,'syncModerators');
  assert.equal(payload.p_actor_twitch_id,'123456');
  assert.deepEqual(payload.p_payload.moderators,moderators,'la liste vient exclusivement de Twitch');

  const noModerator=factory({pages:[{data:[],pagination:{}}]});
  assert.equal((await createHandler(env,noModerator.fetcher)(req({action:'syncModerators'}))).status,409);
  assert.equal(noModerator.calls.some(x=>x.url.includes('/rpc/')),false,'une liste vide ne démarque personne');

  const outsider=factory({owner:'555555'});
  assert.equal((await createHandler(env,outsider.fetcher)(req({action:'previewModerators'}))).status,403);
  assert.equal(outsider.calls.some(x=>x.url.includes('/oauth2/validate')),false,
    'pas de lecture Twitch pour un non-propriétaire');
  console.log('Centre des accès V2 : tests de synchronisation Twitch simulés réussis.');
})().catch(error=>{console.error(error);process.exitCode=1});
