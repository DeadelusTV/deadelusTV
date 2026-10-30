const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');

(async () => {
  const {createHandler, BROADCASTER_ID} = await import(pathToFileURL(path.resolve('supabase/functions/crew-twitch-access/core.js')));
  const env = {SUPABASE_URL:'https://crew.example', SUPABASE_SERVICE_ROLE_KEY:'server-test',
    SUPABASE_ANON_KEY:'public-test', CREW_TWITCH_CLIENT_ID:'client-test', CREW_ALLOWED_ORIGINS:'https://preview.example'};
  const req = (body = {provider_token:'twitch-test'}, extra = {}) => new Request('https://crew.example/functions/v1/crew-twitch-access', {
    method:'POST', headers:{origin:'https://preview.example', authorization:'Bearer session-test', 'Content-Type':'application/json', ...extra},
    body:JSON.stringify(body)
  });
  const json = (data, status = 200) => new Response(JSON.stringify(data), {status});
  function setup(options = {}) {
    const calls = [];
    let page = 0;
    const http = async (url, init) => {
      calls.push({url:String(url), init});
      if (String(url).endsWith('/auth/v1/user')) return options.authError ? json({}, 401) : json({id:'user-test',
        user_metadata:{role:'admin', twitch_user_id:BROADCASTER_ID}});
      if (String(url).endsWith('/validate')) return json({client_id:options.client || 'client-test',
        user_id:options.owner ? BROADCASTER_ID : '123', expires_in:options.ttl ?? 3600,
        scopes:options.noScope ? [] : ['user:read:moderated_channels']}, options.tokenError ? 401 : 200);
      if (String(url).includes('/moderation/channels?')) {
        page++;
        if (options.twitchError) return json({}, 503);
        if (options.loop) return json({data:[], pagination:{cursor:'same'}});
        if (options.secondPage && page === 1) return json({data:[], pagination:{cursor:'page-2'}});
        return json({data:options.viewer ? [{broadcaster_id:'other-channel'}] : [{broadcaster_id:BROADCASTER_ID}], pagination:{}});
      }
      if (String(url).endsWith('/crew_set_twitch_access')) {
        const payload = JSON.parse(init.body);
        assert.equal(init.headers.Authorization, 'Bearer server-test');
        assert.equal(payload.p_user_id, 'user-test');
        assert.ok(!Object.hasOwn(payload, 'role'));
        return options.mismatch ? json({},403) : json({role:options.manualAdmin || options.owner ? 'admin' : payload.p_is_moderator ? 'helper' : null,
          expires_at:'2026-10-30T12:05:00Z'});
      }
      throw new Error('Unexpected URL ' + url);
    };
    return {handler:createHandler(env, http), calls};
  }
  let count = 0;
  async function check(name, options, expected, verify = () => {}) {
    const {handler,calls} = setup(options);
    const response = await handler(req({provider_token:'twitch-test',role:'admin',user_id:BROADCASTER_ID}));
    const data = await response.json();
    assert.equal(response.status, expected, name);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(!JSON.stringify(data).includes('server-test'));
    verify(data,calls);
    count++;
  }
  await check('modérateur = helper', {}, 200, d => assert.equal(d.role,'helper'));
  await check('viewer, fausses métadonnées ignorées', {viewer:true}, 200, d => assert.equal(d.role,null));
  await check('propriétaire de chaîne = admin', {owner:true,noScope:true}, 200, (d,c) => {
    assert.equal(d.role,'admin'); assert.ok(!c.some(x=>x.url.includes('/moderation/channels')));
  });
  await check('admin manuel conservé', {manualAdmin:true}, 200, d => assert.equal(d.role,'admin'));
  await check('pagination', {secondPage:true}, 200, (d,c) => assert.ok(c.some(x=>x.url.includes('after=page-2'))));
  await check('jeton Supabase invalide', {authError:true}, 401, (d,c) => assert.equal(c.length,1));
  await check('jeton Twitch révoqué', {tokenError:true}, 401);
  await check('autre application Twitch', {client:'attacker-client'}, 401);
  await check('permission Twitch manquante', {noScope:true}, 403);
  await check('Twitch indisponible : aucun octroi', {twitchError:true}, 503, (d,c)=>assert.ok(!c.some(x=>x.url.endsWith('/crew_set_twitch_access'))));
  await check('pagination cyclique', {loop:true}, 503);
  await check('identité différente refusée en SQL', {mismatch:true}, 403);
  await check('durée limitée par le jeton', {ttl:25}, 200, (d,c)=>assert.equal(JSON.parse(c.at(-1).init.body).p_ttl_seconds,25));
  await check('durée plafonnée à cinq minutes', {}, 200, (d,c)=>assert.equal(JSON.parse(c.at(-1).init.body).p_ttl_seconds,300));
  await check('jeton expiré', {ttl:0}, 401);
  const {handler,calls} = setup();
  assert.equal((await handler(req({}, {origin:'https://evil.example'}))).status,403);
  assert.equal(calls.length,0);
  assert.equal((await handler(req({provider_token:123}))).status,400);
  const unavailable = createHandler({...env,CREW_TWITCH_CLIENT_ID:''},()=>assert.fail('No network when unconfigured'));
  assert.equal((await unavailable(req())).status,503);
  console.log(`${count + 3} contrôles serveur Twitch réussis.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
