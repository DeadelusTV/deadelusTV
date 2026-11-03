/* DeadelusTV V2 — autorisation OAuth du diffuseur, prototype non déployé.
 * Le callback reçoit le CODE Twitch et échange les jetons exclusivement côté serveur.
 * Pas de jeton dans l'URL de retour, GitHub, logs ou navigateur.
 */
import {BROADCASTER_ID,saveAuthorizedBundle,validateGrant} from '../_shared/site-access-twitch-credentials.js';

const PORTAL='https://eodtxlhnfzyapkyvvxdi.supabase.co';
const PUBLIC_KEY='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
const STATE_RE=/^[a-zA-Z0-9_-]{30,150}$/;
const CODE_RE=/^[a-zA-Z0-9_-]{10,1024}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function config(env) {
  const base=(env.SUPABASE_URL||'').replace(/\/+$/,'');
  const callback=PORTAL+'/functions/v1/site-access-twitch-oauth';
  const returnUrl=env.SITE_ACCESS_TWITCH_RETURN_URL||'';
  const origins=(env.SITE_ACCESS_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(base!==PORTAL || !env.SUPABASE_SERVICE_ROLE_KEY ||
     env.SITE_ACCESS_TWITCH_CALLBACK_URL!==callback ||
     typeof env.SITE_ACCESS_TWITCH_CLIENT_ID!=='string' ||
     !/^[a-z0-9]{10,64}$/i.test(env.SITE_ACCESS_TWITCH_CLIENT_ID) ||
     !env.SITE_ACCESS_TWITCH_CLIENT_SECRET ||
     !origins.length ||
     !origins.every(x=>/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(x)) ||
     !/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/admin\/access-center\.html$/i.test(returnUrl) ||
     !origins.includes(new URL(returnUrl).origin) ||
     !env.SITE_ACCESS_TWITCH_ENCRYPTION_KEY_B64)
    throw Error('oauth_not_configured');
  return {callback,returnUrl,origins};
}
function headers(env) {
  return {apikey:env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type':'application/json'};
}
const hex=bytes=>Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');
async function hashState(state,cryptoImpl) {
  const hash=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(state));
  return hex(new Uint8Array(hash));
}
async function request(http,url,options={}) {
  return http(url,{...options,signal:AbortSignal.timeout(8000)});
}
export function createHandler(env,http=fetch,cryptoImpl=crypto) {
  return async req=>{
    const origin=req.headers.get('origin')||'';
    const basic={'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff'};
    const json=(status,payload,allowedOrigin='')=>new Response(JSON.stringify(payload),{
      status,headers:{...basic,'Content-Type':'application/json;charset=utf-8',
        'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'authorization, apikey, content-type',
        ...(allowedOrigin?{'Access-Control-Allow-Origin':allowedOrigin}:{})}
    });
    let conf;
    try{conf=config(env);}catch{return json(503,{error:'oauth_not_configured'});}
    if(env.SITE_ACCESS_TWITCH_OAUTH_ENABLED!=='true')
      return json(503,{error:'oauth_not_activated'});
    const allowed=conf.origins.includes(origin);

    if(req.method==='OPTIONS')return allowed
      ? new Response(null,{status:204,headers:{...basic,'Access-Control-Allow-Origin':origin,
          'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'authorization, apikey, content-type'}})
      : json(403,{error:'origin_forbidden'});
    if(req.method==='POST'){
      if(!allowed)return json(403,{error:'origin_forbidden'});
      const auth=req.headers.get('authorization')||'';
      if(!/^Bearer \S+$/i.test(auth))return json(401,{error:'unauthorized'},origin);
      let payload;
      try{
        const body=await req.text();
        if(body.length>1024)return json(413,{error:'invalid_request'},origin);
        payload=JSON.parse(body);
      }catch{return json(400,{error:'invalid_request'},origin);}
      if(payload?.action!=='begin')return json(400,{error:'invalid_action'},origin);

      try{
        const u=await request(http,PORTAL+'/auth/v1/user',{
          headers:{Authorization:auth,apikey:PUBLIC_KEY}
        });
        if(!u.ok)return json(u.status===401?401:503,{error:'auth_unavailable'},origin);
        const user=await u.json();
        if(!UUID.test(user?.id||''))return json(403,{error:'forbidden'},origin);
        const identities=(user.identities||[]).filter(x=>x.provider==='twitch');
        if(identities.length!==1 || identities[0].id!==BROADCASTER_ID)
          return json(403,{error:'only_broadcaster_may_authorize'},origin);
        const bytes=cryptoImpl.getRandomValues(new Uint8Array(32));
        const state=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
        const digest=await hashState(state,cryptoImpl);
        const upsert=await request(http,
          PORTAL+'/rest/v1/site_access_twitch_pending?on_conflict=actor_twitch_id',{
            method:'POST',
            headers:{...headers(env),Prefer:'resolution=merge-duplicates'},
            body:JSON.stringify({actor_twitch_id:BROADCASTER_ID,state_sha256:digest,
              expires_at:new Date(Date.now()+5*60*1000).toISOString()})
          });
        if(!upsert.ok)throw Error('oauth_state_unavailable');
        const url=new URL('https://id.twitch.tv/oauth2/authorize');
        url.searchParams.set('response_type','code');
        url.searchParams.set('client_id',env.SITE_ACCESS_TWITCH_CLIENT_ID);
        url.searchParams.set('redirect_uri',conf.callback);
        url.searchParams.set('scope','moderation:read');
        url.searchParams.set('state',state);
        return json(200,{authorization_url:url.toString()},origin);
      }catch{return json(503,{error:'oauth_unavailable'},origin);}
    }
    if(req.method==='GET'){
      // Callback redirigé par Twitch. Aucun JWT navigateur ici : le state
      // est imprévisible, expirant et consommé de manière atomique en base.
      const back=(outcome)=>new Response(null,{
        status:303,headers:{...basic,'Location':conf.returnUrl+'?twitch_oauth='+outcome}
      });
      try{
        const q=new URL(req.url).searchParams;
        const state=q.get('state')||'',code=q.get('code')||'';
        if(!STATE_RE.test(state))return back('failed');
        const digest=await hashState(state,cryptoImpl);
        const consumed=await request(http,PORTAL+'/rest/v1/rpc/site_access_twitch_consume_state',{
          method:'POST',headers:headers(env),body:JSON.stringify({p_state_sha256:digest})
        });
        if(!consumed.ok || await consumed.json()!==BROADCASTER_ID)return back('failed');
        if(q.has('error'))return back('cancelled');
        if(!CODE_RE.test(code))return back('failed');
        const tokenResult=await request(http,'https://id.twitch.tv/oauth2/token',{
          method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({client_id:env.SITE_ACCESS_TWITCH_CLIENT_ID,
            client_secret:env.SITE_ACCESS_TWITCH_CLIENT_SECRET,
            grant_type:'authorization_code',code,redirect_uri:conf.callback}).toString()
        });
        if(!tokenResult.ok)return back('failed');
        const token=await tokenResult.json();
        if(typeof token?.access_token!=='string' || typeof token?.refresh_token!=='string')
          return back('failed');
        const valid=await request(http,'https://id.twitch.tv/oauth2/validate',{
          headers:{Authorization:'OAuth '+token.access_token}
        });
        if(!valid.ok)return back('failed');
        validateGrant(await valid.json(),env);
        await saveAuthorizedBundle(env,http,token,BROADCASTER_ID);
        return back('connected');
      }catch{return back('failed');}
    }
    return json(405,{error:'method_not_allowed'});
  };
}
