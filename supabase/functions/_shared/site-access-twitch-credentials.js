/* DeadelusTV V2 : jetons Twitch du diffuseur, chiffrés et stockés côté serveur.
 * PRÉPARATION NON DÉPLOYÉE. Ne pas écrire de jeton dans les logs, le client ou Git.
 * Requiert Supabase REST avec la clé service_role legacy (serveur uniquement).
 */
const PORTAL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
export const BROADCASTER_ID = '99977368';
const TOKEN_RE = /^[a-zA-Z0-9_-]{10,4096}$/;
const MAX_SEALED = 15000;

function bytesFromB64(text) {
  if(typeof text !== 'string' || !/^[a-zA-Z0-9+/]+={0,2}$/.test(text)) throw Error('key_invalid');
  return Uint8Array.from(atob(text), c=>c.charCodeAt(0));
}
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const un64url = text => bytesFromB64(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4));

function configured(env) {
  if ((env.SUPABASE_URL||'').replace(/\/+$/,'') !== PORTAL ||
      typeof env.SUPABASE_SERVICE_ROLE_KEY !== 'string' || !env.SUPABASE_SERVICE_ROLE_KEY ||
      typeof env.SITE_ACCESS_TWITCH_CLIENT_ID !== 'string' ||
      typeof env.SITE_ACCESS_TWITCH_CLIENT_SECRET !== 'string' ||
      !env.SITE_ACCESS_TWITCH_CLIENT_SECRET) throw Error('oauth_server_not_configured');
  const raw=bytesFromB64(env.SITE_ACCESS_TWITCH_ENCRYPTION_KEY_B64 || '');
  if(raw.length!==32) throw Error('encryption_key_invalid');
  return raw;
}
function adminHeaders(env) {
  if ((env.SUPABASE_URL||'').replace(/\/+$/,'')!==PORTAL||!env.SUPABASE_SERVICE_ROLE_KEY)
    throw Error('oauth_server_not_configured');
  return {'apikey':env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization':'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type':'application/json'};
}
async function call(http,url,options={}) {
  return http(url,{...options,signal:AbortSignal.timeout(7500)});
}
function isBundle(bundle) {
  return !!(bundle && typeof bundle === 'object' && TOKEN_RE.test(bundle.access_token||'') &&
    typeof bundle.refresh_token === 'string' && bundle.refresh_token.length>=10 &&
    bundle.refresh_token.length<=4096);
}
export async function sealBundle(bundle, env, cryptoImpl=crypto) {
  const raw=configured(env);
  if(!isBundle(bundle)) throw Error('tokens_invalid');
  const key=await cryptoImpl.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt']);
  const iv=cryptoImpl.getRandomValues(new Uint8Array(12));
  const plain=new TextEncoder().encode(JSON.stringify({
    access_token:bundle.access_token,refresh_token:bundle.refresh_token
  }));
  const encrypted=new Uint8Array(await cryptoImpl.subtle.encrypt({name:'AES-GCM',iv},key,plain));
  return 'v1.'+b64url(iv)+'.'+b64url(encrypted);
}
export async function unsealBundle(sealed,env,cryptoImpl=crypto) {
  const raw=configured(env);
  if(typeof sealed!=='string'||sealed.length>MAX_SEALED||!/^v1\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(sealed))
    throw Error('credentials_invalid');
  const pieces=sealed.split('.');
  const iv=un64url(pieces[1]), bytes=un64url(pieces[2]);
  if(iv.length!==12||bytes.length<16)throw Error('credentials_invalid');
  const key=await cryptoImpl.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
  try {
    const plain=await cryptoImpl.subtle.decrypt({name:'AES-GCM',iv},key,bytes);
    const data=JSON.parse(new TextDecoder().decode(plain));
    if(!isBundle(data))throw Error('credentials_invalid');
    return {access_token:data.access_token,refresh_token:data.refresh_token};
  }catch{throw Error('credentials_invalid');}
}
export function validateGrant(data,env) {
  if(!data||data.user_id!==BROADCASTER_ID||
     data.client_id!==env.SITE_ACCESS_TWITCH_CLIENT_ID||
     !Array.isArray(data.scopes)||!data.scopes.includes('moderation:read')||
     !Number.isInteger(data.expires_in)||data.expires_in<30)
    throw Error('twitch_authorization_invalid');
  return true;
}
async function readStored(env,http) {
  const r=await call(http,PORTAL+'/rest/v1/site_access_twitch_credentials?select=sealed_bundle%2Crevision&id=eq.1',
    {headers:adminHeaders(env)});
  if(!r.ok)throw Error('credentials_store_unavailable');
  const data=await r.json();
  if(!Array.isArray(data)||data.length!==1 ||
     typeof data[0].sealed_bundle!=='string' ||
     !Number.isSafeInteger(data[0].revision))throw Error('twitch_authorization_missing');
  return {revision:data[0].revision,bundle:await unsealBundle(data[0].sealed_bundle,env)};
}
async function validateAccess(token,env,http) {
  const r=await call(http,'https://id.twitch.tv/oauth2/validate',
    {headers:{Authorization:'OAuth '+token}});
  if(r.status===401)return null;
  if(!r.ok)throw Error('twitch_validation_unavailable');
  validateGrant(await r.json(),env);
  return true;
}
async function persistNew(env,http,oldRevision,newBundle) {
  const sealed=await sealBundle(newBundle,env);
  const r=await call(http,PORTAL+'/rest/v1/rpc/site_access_twitch_compare_swap',{
    method:'POST',headers:adminHeaders(env),
    body:JSON.stringify({p_expected_revision:oldRevision,p_sealed_bundle:sealed})
  });
  if(!r.ok)throw Error('credentials_store_unavailable');
  const val=await r.json();
  if(typeof val!=='boolean')throw Error('credentials_store_unavailable');
  return val;
}
async function refreshStored(env,http,old) {
  const data=new URLSearchParams({
    client_id:env.SITE_ACCESS_TWITCH_CLIENT_ID,
    client_secret:env.SITE_ACCESS_TWITCH_CLIENT_SECRET,
    grant_type:'refresh_token',
    refresh_token:old.bundle.refresh_token
  });
  const r=await call(http,'https://id.twitch.tv/oauth2/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data.toString()
  });
  if(!r.ok)return null;
  const next=await r.json();
  if(!isBundle(next))throw Error('twitch_refresh_invalid');
  if(!(await validateAccess(next.access_token,env,http)))throw Error('twitch_refresh_invalid');
  const won=await persistNew(env,http,old.revision,next);
  return won?next:null;
}
export async function getBroadcasterToken(env,http=fetch,{forceRefresh=false}={}) {
  configured(env);
  for(let attempt=0;attempt<2;attempt++){
    const stored=await readStored(env,http);
    if(!forceRefresh && await validateAccess(stored.bundle.access_token,env,http))
      return stored.bundle.access_token;
    const refreshed=await refreshStored(env,http,stored);
    if(refreshed)return refreshed.access_token;
    // Une rotation concurrente peut gagner : relire l'enregistrement une seule fois.
    const newer=await readStored(env,http);
    if(newer.revision===stored.revision)throw Error('twitch_reauthorization_required');
    forceRefresh=false;
  }
  throw Error('twitch_reauthorization_required');
}
export async function saveAuthorizedBundle(env,http,bundle,actorTwitchId) {
  if(actorTwitchId!==BROADCASTER_ID)throw Error('forbidden');
  const sealed=await sealBundle(bundle,env);
  const r=await call(http,PORTAL+'/rest/v1/rpc/site_access_twitch_store',{
    method:'POST',headers:adminHeaders(env),
    body:JSON.stringify({p_sealed_bundle:sealed,p_actor_twitch_id:actorTwitchId})
  });
  if(!r.ok)throw Error('credentials_store_unavailable');
}
