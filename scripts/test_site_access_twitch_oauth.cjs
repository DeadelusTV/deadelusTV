/* Tests isolés OAuth V2, sans réseau ni clé réelle. Node >=22.
 * node scripts/test_site_access_twitch_oauth.cjs
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {webcrypto,randomBytes}=require('node:crypto');
(async()=>{
  const root=path.join(__dirname,'../supabase/functions');
  const shared=await import(pathToFileURL(path.join(root,'_shared/site-access-twitch-credentials.js')).href);
  const {createHandler}=await import(pathToFileURL(path.join(root,'site-access-twitch-oauth/core.js')).href);
  const portal='https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const origin='https://deadelustv.pages.dev';
  const callback=portal+'/functions/v1/site-access-twitch-oauth';
  const client='abcdefghij1234567890';
  const env={
    SUPABASE_URL:portal,
    SUPABASE_SERVICE_ROLE_KEY:'FAKE-SERVER-KEY',
    SITE_ACCESS_ALLOWED_ORIGINS:origin,
    SITE_ACCESS_TWITCH_CLIENT_ID:client,
    SITE_ACCESS_TWITCH_CLIENT_SECRET:'FAKE-CLIENT-SECRET',
    SITE_ACCESS_TWITCH_ENCRYPTION_KEY_B64:randomBytes(32).toString('base64'),
    SITE_ACCESS_TWITCH_CALLBACK_URL:callback,
    SITE_ACCESS_TWITCH_RETURN_URL:origin+'/admin/access-center.html',
    SITE_ACCESS_TWITCH_OAUTH_ENABLED:'true'
  };
  const official={user_id:'99977368',client_id:client,scopes:['moderation:read'],expires_in:3600};
  const access='access_token_abcdefghijklmnopqrstuvwxyz';
  const refresh='refresh%token/abc_def-0123456789';
  const nextAccess='new_access_token_abcdefghijklmnopqrstuvwxyz';
  const nextRefresh='new_refresh_token/100%_abc';
  let pending=null,stored=null,identity='99977368',permitScope=true,expiredOld=false;
  const calls=[];
  const json=(body,status=200)=>Response.json(body,{status});
  const http=async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});
    if(url===portal+'/auth/v1/user')return json({
      id:'11111111-2222-4333-8444-555555555555',
      identities:[{provider:'twitch',id:identity}]
    });
    if(url.includes('/site_access_twitch_pending?')){
      pending=JSON.parse(options.body);return json({});
    }
    if(url.endsWith('/rpc/site_access_twitch_consume_state')){
      const hash=JSON.parse(options.body).p_state_sha256;
      const actor=pending && pending.state_sha256===hash && Date.parse(pending.expires_at)>Date.now()
        ?pending.actor_twitch_id:null;
      if(actor)pending=null;
      return json(actor);
    }
    if(url==='https://id.twitch.tv/oauth2/token'){
      const form=new URLSearchParams(options.body);
      if(form.get('grant_type')==='authorization_code'){
        assert.equal(form.get('redirect_uri'),callback);
        return json({access_token:access,refresh_token:refresh,expires_in:3600,scope:['moderation:read']});
      }
      assert.equal(form.get('grant_type'),'refresh_token');
      assert.equal(form.get('refresh_token'),refresh);
      return json({access_token:nextAccess,refresh_token:nextRefresh,expires_in:3600,scope:['moderation:read']});
    }
    if(url==='https://id.twitch.tv/oauth2/validate'){
      const oauth=options.headers.Authorization.slice('OAuth '.length);
      if(expiredOld&&oauth===access)return json({error:'expired'},401);
      return json({...official,scopes:permitScope?['moderation:read']:[]});
    }
    if(url.endsWith('/rpc/site_access_twitch_store')){
      const body=JSON.parse(options.body);
      assert.equal(body.p_actor_twitch_id,'99977368');
      stored={sealed_bundle:body.p_sealed_bundle,revision:stored?stored.revision+1:1};
      return json(null);
    }
    if(url.includes('/site_access_twitch_credentials?')){
      return json(stored?[stored]:[]);
    }
    if(url.endsWith('/rpc/site_access_twitch_compare_swap')){
      const body=JSON.parse(options.body);
      if(stored?.revision!==body.p_expected_revision)return json(false);
      stored={sealed_bundle:body.p_sealed_bundle,revision:stored.revision+1};
      return json(true);
    }
    throw Error('URL non simulée : '+url);
  };
  const handler=()=>createHandler(env,http,webcrypto);
  const begin=()=>new Request(callback,{
    method:'POST',headers:{origin,authorization:'Bearer demo','Content-Type':'application/json'},
    body:JSON.stringify({action:'begin'})
  });
  const start=await handler()(begin());
  assert.equal(start.status,200);
  const beginData=await start.json();
  const authorize=new URL(beginData.authorization_url);
  assert.equal(authorize.origin,'https://id.twitch.tv');
  assert.equal(authorize.searchParams.get('scope'),'moderation:read');
  assert.equal(authorize.searchParams.get('response_type'),'code');
  assert.equal(authorize.searchParams.get('redirect_uri'),callback);
  assert(pending && !JSON.stringify(pending).includes(authorize.searchParams.get('state')),
    'seule une empreinte de state doit être conservée');

  const state=authorize.searchParams.get('state');
  const completed=await handler()(new Request(callback+'?state='+state+'&code=abcdefghijklmnopqrstuvwxyz012345'));
  assert.equal(completed.status,303);
  assert.equal(completed.headers.get('Location'),origin+'/admin/access-center.html?twitch_oauth=connected');
  assert(stored?.sealed_bundle?.startsWith('v1.'));
  assert(!JSON.stringify(stored).includes(access),'jeton chiffré seulement');
  const decrypted=await shared.unsealBundle(stored.sealed_bundle,env,webcrypto);
  assert.deepEqual(decrypted,{access_token:access,refresh_token:refresh});
  assert.equal(pending,null,'state consommé');

  const replay=await handler()(new Request(callback+'?state='+state+'&code=abcdefghijklmnopqrstuvwxyz012345'));
  assert.equal(replay.headers.get('Location'),origin+'/admin/access-center.html?twitch_oauth=failed');
  const forged=await handler()(new Request(callback+'?state='+('f'.repeat(64))+'&code=abcdefghijklmnopqrstuvwxyz012345'));
  assert.equal(forged.headers.get('Location'),origin+'/admin/access-center.html?twitch_oauth=failed');

  identity='55555';
  const denied=await handler()(begin());
  assert.equal(denied.status,403,'un autre compte ne peut pas autoriser');
  identity='99977368';
  const wrongOrigin=await handler()(new Request(callback,{
    method:'POST',headers:{origin:'https://evil.invalid',authorization:'Bearer demo'},
    body:JSON.stringify({action:'begin'})
  }));
  assert.equal(wrongOrigin.status,403);
  const disabled=await createHandler({...env,SITE_ACCESS_TWITCH_OAUTH_ENABLED:'false'},http,webcrypto)(begin());
  assert.equal(disabled.status,503);

  // Il faut consommer state puis refuser tout consentement dont le scope a changé.
  permitScope=false;
  const start2=await handler()(begin());
  const url2=new URL((await start2.json()).authorization_url);
  const noScope=await handler()(new Request(callback+'?state='+url2.searchParams.get('state')+'&code=abcdefghijklmnopqrstuvwxyz012345'));
  assert.equal(noScope.headers.get('Location'),origin+'/admin/access-center.html?twitch_oauth=failed');
  permitScope=true;

  // Un jeton expiré déclenche un renouvellement chiffré, avec comparaison de révision.
  expiredOld=true;
  const valid=await shared.getBroadcasterToken(env,http);
  assert.equal(valid,nextAccess);
  assert.equal(stored.revision,2);
  const rotated=await shared.unsealBundle(stored.sealed_bundle,env,webcrypto);
  assert.equal(rotated.refresh_token,nextRefresh);
  assert.equal(calls.filter(x=>x.url.endsWith('/rpc/site_access_twitch_compare_swap')).length,1);
  assert(!JSON.stringify({returned:beginData}).includes(refresh),'aucun refresh token envoyé au navigateur');

  // Intégrité AES-GCM : modifier le chiffré doit faire échouer le déchiffrement.
  const sealed=stored.sealed_bundle;
  const tamper=sealed.slice(0,-2)+(sealed.at(-2)==='A'?'B':'A')+sealed.at(-1);
  await assert.rejects(shared.unsealBundle(tamper,env,webcrypto),/credentials_invalid/);
  console.log('OAuth Twitch V2 : consentement, state, chiffrement et renouvellement simulés OK.');
})().catch(error=>{console.error(error);process.exitCode=1});
