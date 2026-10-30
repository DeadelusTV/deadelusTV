// Aucun jeton ni réponse fournisseur n'est journalisé.
export const BROADCASTER_ID = '99977368';
const PORTAL_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
const PORTAL_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
// Domaine Cloudflare stable : la branche Production Pages est Phasmo V2, pas main.
const PREVIEW = 'https://deadelustv.pages.dev';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createHandler(env, http = fetch) {
  const base = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const publicKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
  const origins = (env.CREW_ALLOWED_ORIGINS || PREVIEW).split(',').map(x=>x.trim()).filter(Boolean);
  return async req => {
    const origin=req.headers.get('origin') || '';
    const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin',
      'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',
      ...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
    const respond=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(!origins.includes(origin))return respond(403,{error:'origin_forbidden'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
    if(!base||!serviceKey||!publicKey)return respond(503,{error:'server_unconfigured'});
    const authorization=req.headers.get('authorization')||'';
    if(!/^Bearer \S+$/i.test(authorization))return respond(401,{error:'unauthorized'});
    const deadline=Date.now()+25000;
    const request=async(url,options={})=>{
      const left=deadline-Date.now();if(left<=0)throw Error('timeout');
      return http(url,{...options,signal:AbortSignal.timeout(Math.min(6000,left))});
    };
    const serverHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
    try{
      // Auth distant, URL fixe : ne jamais accepter un projet ou une identité du client.
      const verified=await request(PORTAL_URL+'/auth/v1/user',{headers:{Authorization:authorization,apikey:PORTAL_KEY}});
      if(!verified.ok)return respond(verified.status===401||verified.status===403?401:503,{error:'portal_auth_unavailable'});
      const user=await verified.json();
      const identities=(user.identities||[]).filter(i=>i.provider==='twitch');
      const twitchId=identities.length===1?identities[0].provider_id:null;
      if(!UUID.test(user.id||'')||!/^[0-9]{1,32}$/.test(twitchId||''))return respond(403,{error:'twitch_identity_required'});
      const raw=await req.text();if(raw.length>10000)return respond(413,{error:'invalid_request'});
      let payload;try{payload=JSON.parse(raw);}catch{return respond(400,{error:'invalid_request'});}
      const action=payload?.action||'status';
      if(!['status','session','link','revoke'].includes(action))return respond(400,{error:'invalid_request'});
      let moderator=false,ttl=300,notice=null,linkUser=null;
      if(action==='link'){
        if(typeof payload.legacy_token!=='string'||!/^\S{1,8192}$/.test(payload.legacy_token))return respond(400,{error:'legacy_session_required'});
        const legacy=await request(base+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:'Bearer '+payload.legacy_token}});
        if(!legacy.ok)return respond(403,{error:'legacy_session_required'});
        linkUser=(await legacy.json()).id;
        if(!UUID.test(linkUser||''))return respond(403,{error:'legacy_session_required'});
      }
      if(twitchId!==BROADCASTER_ID&&action!=='revoke'){
        const token=payload.provider_token;
        if(typeof token==='string'&&/^[A-Za-z0-9_-]{1,4096}$/.test(token)){
          const validation=await request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:'OAuth '+token}});
          if(validation.ok){
            const checked=await validation.json();
            // Le jeton appartient impérativement à l'identité OAuth du portail.
            if(checked.user_id!==twitchId||typeof checked.client_id!=='string'||!checked.client_id||!Number.isFinite(checked.expires_in)||checked.expires_in<1)
              return respond(403,{error:'identity_mismatch'});
            ttl=Math.min(300,Math.floor(checked.expires_in));
            if(checked.scopes?.includes('user:read:moderated_channels')){
              let cursor='';const seen=new Set();
              for(let page=0;page<20;page++){
                const params=new URLSearchParams({user_id:twitchId,first:'100'});if(cursor)params.set('after',cursor);
                const response=await request('https://api.twitch.tv/helix/moderation/channels?'+params,{headers:{Authorization:'Bearer '+token,'Client-Id':checked.client_id}});
                if(!response.ok)return respond(503,{error:'twitch_unavailable'});
                const result=await response.json();if(!Array.isArray(result.data))return respond(503,{error:'twitch_unavailable'});
                moderator=result.data.some(c=>c.broadcaster_id===BROADCASTER_ID);if(moderator)break;
                const next=result.pagination?.cursor;if(!next)break;
                if(typeof next!=='string'||seen.has(next)||page===19)return respond(503,{error:'twitch_unavailable'});
                seen.add(next);cursor=next;
              }
            }else notice='twitch_reconnect_required';
          }else if(validation.status===401)notice='twitch_reconnect_required';
          else return respond(503,{error:'twitch_unavailable'});
        }else notice='twitch_reconnect_required';
      }
      const resolve=async(extra={})=>{
        const r=await request(base+'/rest/v1/rpc/crew_portal_access',{method:'POST',headers:serverHeaders,
          body:JSON.stringify({p_portal_user_id:user.id,p_twitch_user_id:twitchId,p_is_moderator:moderator,
            p_ttl_seconds:ttl,p_crew_user_id:linkUser,p_link:action==='link',p_revoke:action==='revoke',...extra})});
        if(!r.ok)throw Error(r.status===403||r.status===409?'association_refused':'backend_unavailable');
        return r.json();
      };
      let access=await resolve();
      if(access.role!==null&&!['admin','helper'].includes(access.role))throw Error('backend_unavailable');
      if(action==='revoke'||!access.role||action==='status')return respond(200,{role:access.role,expires_at:access.expires_at||null,notice});
      // Une session Crew propre, émise par Auth Crew, garde les RLS existantes.
      // Pas de migration des données, pas de JWT fabriqué ni de clé serveur client.
      const email=access.email||('portal-'+user.id.toLowerCase()+'@crew.deadelustv.invalid');
      const generated=await request(base+'/auth/v1/admin/generate_link',{method:'POST',headers:serverHeaders,body:JSON.stringify({type:'magiclink',email})});
      if(!generated.ok)throw Error('session_unavailable');
      const link=await generated.json();
      if(!UUID.test(link.id||'')||typeof link.hashed_token!=='string'||!link.hashed_token)throw Error('session_unavailable');
      if(access.crew_user_id&&access.crew_user_id!==link.id)throw Error('identity_mismatch');
      if(!access.crew_user_id)access=await resolve({p_crew_user_id:link.id});
      if(access.crew_user_id!==link.id||!access.role)throw Error('identity_mismatch');
      const exchanged=await request(base+'/auth/v1/verify',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},
        body:JSON.stringify({token_hash:link.hashed_token,type:link.verification_type||'magiclink'})});
      if(!exchanged.ok)throw Error('session_unavailable');
      const session=await exchanged.json();
      if(session.user?.id!==access.crew_user_id||!session.access_token||!session.refresh_token)throw Error('session_unavailable');
      return respond(200,{role:access.role,expires_at:access.expires_at,notice,
        session:{access_token:session.access_token,refresh_token:session.refresh_token}});
    }catch(error){return respond(503,{error:['association_refused','identity_mismatch'].includes(error.message)?error.message:'verification_unavailable'});}
  };
}
