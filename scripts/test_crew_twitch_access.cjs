const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const {createHandler,BROADCASTER_ID}=await import(pathToFileURL(path.resolve('supabase/functions/crew-twitch-access/core.js')));
 const portal='11111111-1111-4111-8111-111111111111', crew='22222222-2222-4222-8222-222222222222';
 const env={SUPABASE_URL:'https://crew.test',SUPABASE_SERVICE_ROLE_KEY:'SERVER_SECRET',SUPABASE_ANON_KEY:'public',CREW_ALLOWED_ORIGINS:'https://preview.test'};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const req=(body={},origin='https://preview.test')=>new Request('https://crew.test/functions/v1/crew-twitch-access',{method:'POST',headers:{origin,authorization:'Bearer PORTAL_SESSION','Content-Type':'application/json'},body:JSON.stringify(body)});
 function setup(o={}){
  const calls=[];let page=0,mapped=!!o.mapped;
  const http=async(url,init)=>{
   calls.push({url,init});
   if(url==='https://eodtxlhnfzyapkyvvxdi.supabase.co/auth/v1/user'){
    assert.equal(init.headers.Authorization,'Bearer PORTAL_SESSION');
    return json({id:portal,user_metadata:{role:'admin',twitch_user_id:BROADCASTER_ID},identities:o.noIdentity?[]:o.dbShape?[{provider:'twitch',provider_id:'123'}]:[{provider:'twitch',id:o.owner?BROADCASTER_ID:'123',identity_id:'33333333-3333-4333-8333-333333333333'}]},o.authError?401:200);
   }
   if(url==='https://crew.test/auth/v1/user')return json({id:crew},o.badLegacy?401:200);
   if(url.endsWith('/validate'))return json({user_id:o.mismatch?'999':o.owner?BROADCASTER_ID:'123',client_id:'trusted-client',expires_in:o.expired?0:120,scopes:o.noScope?[]:['user:read:moderated_channels']},o.revoked?401:200);
   if(url.includes('/moderation/channels?')){
    assert.equal(init.headers['Client-Id'],'trusted-client');page++;
    if(o.twitchError)return json({},503);
    if(o.loop)return json({data:[],pagination:{cursor:'same'}});
    if(o.pages&&page===1)return json({data:[],pagination:{cursor:'second'}});
    return json({data:o.viewer?[]:[{broadcaster_id:BROADCASTER_ID}],pagination:{}});
   }
   if(url.endsWith('/rpc/crew_portal_access')){
    assert.equal(init.headers.Authorization,'Bearer SERVER_SECRET');
    const p=JSON.parse(init.body);assert.equal(p.p_portal_user_id,portal);
    assert.equal(p.p_twitch_user_id,o.owner?BROADCASTER_ID:'123');
    assert.ok(!('role'in p));
    if(o.linkRefused&&p.p_link)return json({},403);
    if(p.p_crew_user_id)mapped=true;
    const role=p.p_revoke?null:o.manual?'admin':o.owner?'admin':p.p_is_moderator?'helper':null;
    return json({crew_user_id:mapped?crew:null,email:mapped?'legacy@example.test':null,role,expires_at:new Date(Date.now()+120000).toISOString()});
   }
   if(url.endsWith('/admin/generate_link'))return json({id:o.wrongUser?portal:crew,hashed_token:'HASH_SECRET',verification_type:'magiclink'});
   if(url.endsWith('/auth/v1/verify'))return json({user:{id:crew},access_token:'CREW_ACCESS',refresh_token:'CREW_REFRESH'});
   throw Error('Unexpected URL '+url);
  };
  return {handler:createHandler(env,http),calls};
 }
 let count=0;
 async function check(name,options,body,status,verify=()=>{}){
  const t=setup(options),r=await t.handler(req({...body,role:'admin',user_id:BROADCASTER_ID})),data=await r.json();
  assert.equal(r.status,status,name);assert.equal(r.headers.get('cache-control'),'no-store');
  assert.ok(!JSON.stringify(data).includes('SERVER_SECRET'));assert.ok(!JSON.stringify(data).includes('HASH_SECRET'));
  verify(data,t.calls);count++;
 }
 const token={provider_token:'TWITCH_TOKEN'};
 await check('modo statut',{},token,200,d=>{assert.equal(d.role,'helper');assert.ok(!d.session);});
 await check('viewer et faux rôle ignoré',{viewer:true},token,200,(d,c)=>{assert.equal(d.role,null);assert.ok(!c.some(x=>x.url.includes('generate_link')));});
 await check('propriétaire sans scope',{owner:true},{},200,d=>assert.equal(d.role,'admin'));
 await check('session automatique',{}, {...token,action:'session'},200,(d,c)=>{assert.equal(d.session.access_token,'CREW_ACCESS');assert.equal(c.filter(x=>x.url.includes('/rpc/')).length,2);});
 await check('session admin associée',{mapped:true,manual:true},{action:'session'},200,d=>assert.equal(d.role,'admin'));
 await check('ancien admin association',{manual:true},{action:'link',legacy_token:'LEGACY'},200,(d,c)=>{assert.equal(d.role,'admin');assert.ok(c.some(x=>x.url==='https://crew.test/auth/v1/user'));});
 await check('faux ancien jeton',{badLegacy:true},{action:'link',legacy_token:'BAD'},403);
 await check('ancien compte sans rôle',{linkRefused:true},{action:'link',legacy_token:'LEGACY'},503);
 await check('OAuth portail invalide',{authError:true},token,401);
 await check('métadonnées insuffisantes',{noIdentity:true},token,403);
 await check('forme SQL distincte de la réponse Auth',{dbShape:true},token,403);
 await check('identité du jeton différente',{mismatch:true},token,403,(d,c)=>assert.ok(!c.some(x=>x.url.includes('/rpc/'))));
 await check('Twitch en panne',{twitchError:true},token,503,(d,c)=>assert.ok(!c.some(x=>x.url.includes('/rpc/'))));
 await check('pagination',{pages:true},token,200,(d,c)=>assert.ok(c.some(x=>x.url.includes('after=second'))));
 await check('boucle pagination',{loop:true},token,503);
 await check('scope absent',{noScope:true},token,200,d=>{assert.equal(d.role,null);assert.equal(d.notice,'twitch_reconnect_required');});
 await check('jeton révoqué',{revoked:true},token,200,d=>assert.equal(d.role,null));
 await check('jeton expiré',{expired:true},token,403);
 await check('identité session incorrecte',{wrongUser:true},{...token,action:'session'},503,d=>assert.ok(!d.session));
 await check('déconnexion',{mapped:true},{action:'revoke'},200,d=>assert.equal(d.role,null));
 const t=setup();assert.equal((await t.handler(req({},'https://evil.test'))).status,403);assert.equal(t.calls.length,0);count++;
 const defaultHandler=createHandler({...env,CREW_ALLOWED_ORIGINS:''},()=>assert.fail('No network for preflight'));
 const preflight=origin=>new Request('https://crew.test/functions/v1/crew-twitch-access',{method:'OPTIONS',headers:{origin}});
 const allowed=await defaultHandler(preflight('https://deadelustv.pages.dev'));
 assert.equal(allowed.status,204);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://deadelustv.pages.dev');count++;
 assert.equal((await defaultHandler(preflight('https://www.deadelustv.com'))).status,403);count++;
 assert.equal((await defaultHandler(preflight('https://d9a00d48.deadelustv.pages.dev'))).status,403);count++;
 console.log(count+' contrôles serveur réussis (HTTP simulé).');
})().catch(e=>{console.error(e);process.exitCode=1;});
