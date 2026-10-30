// Vérification serveur. Aucun jeton ni réponse brute fournisseur n'est journalisé.
export const BROADCASTER_ID = '99977368'; // DeadelusTV, configuration TCG vérifiée.
const SCOPE = 'user:read:moderated_channels';

export function createHandler(env, http = fetch) {
  const base = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const publicKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
  const clientId = env.CREW_TWITCH_CLIENT_ID || '';
  const origins = (env.CREW_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);

  return async function handler(req) {
    const origin = req.headers.get('origin') || '';
    const headers = {
      'Content-Type':'application/json;charset=utf-8', 'Cache-Control':'no-store',
      'Vary':'Origin', 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      ...(origins.includes(origin) ? {'Access-Control-Allow-Origin':origin} : {})
    };
    const respond = (status, data) => new Response(JSON.stringify(data), {status, headers});
    if (!origins.includes(origin)) return respond(403, {error:'origin_forbidden'});
    if (req.method === 'OPTIONS') return new Response(null, {status:204, headers});
    if (req.method !== 'POST') return respond(405, {error:'method_not_allowed'});
    if (!base || !serviceKey || !publicKey || !clientId) return respond(503, {error:'server_unconfigured'});
    const authorization = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/i.test(authorization)) return respond(401, {error:'unauthorized'});
    const deadline = Date.now() + 20000;
    const request = (url, options = {}) => {
      const left = deadline - Date.now();
      if (left <= 0) throw new Error('timeout');
      return http(url, {...options, signal:AbortSignal.timeout(Math.min(6000, left))});
    };
    try {
      // getUser valide la session avec Auth ; ne jamais décoder simplement le JWT.
      const userResponse = await request(base + '/auth/v1/user', {
        headers:{Authorization:authorization, apikey:publicKey}
      });
      if (!userResponse.ok) return respond(userResponse.status === 401 || userResponse.status === 403 ? 401 : 503,
        {error:userResponse.status === 401 || userResponse.status === 403 ? 'unauthorized' : 'auth_unavailable'});
      const user = await userResponse.json();
      if (typeof user?.id !== 'string') return respond(401, {error:'unauthorized'});
      const raw = await req.text();
      if (raw.length > 8192) return respond(413, {error:'invalid_request'});
      let payload;
      try { payload = JSON.parse(raw); } catch { return respond(400, {error:'invalid_request'}); }
      const token = payload?.provider_token;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{1,4096}$/.test(token))
        return respond(400, {error:'twitch_reconnect_required'});

      const validation = await request('https://id.twitch.tv/oauth2/validate', {
        headers:{Authorization:'OAuth ' + token}
      });
      if (validation.status === 401) return respond(401, {error:'twitch_reconnect_required'});
      if (!validation.ok) return respond(503, {error:'twitch_unavailable'});
      const checked = await validation.json();
      if (checked.client_id !== clientId || !/^[0-9]{1,32}$/.test(checked.user_id || '') ||
          !Number.isFinite(checked.expires_in) || checked.expires_in < 1)
        return respond(401, {error:'twitch_reconnect_required'});

      // Propriétaire de la chaîne : identité Twitch vérifiée, jamais un pseudo fourni par le navigateur.
      let moderator = false;
      if (checked.user_id !== BROADCASTER_ID) {
        if (!Array.isArray(checked.scopes) || !checked.scopes.includes(SCOPE))
          return respond(403, {error:'twitch_scope_required'});
        let cursor = '';
        const seen = new Set();
        for (let page = 0; page < 20; page++) {
          const params = new URLSearchParams({user_id:checked.user_id, first:'100'});
          if (cursor) params.set('after', cursor);
          const response = await request('https://api.twitch.tv/helix/moderation/channels?' + params, {
            headers:{Authorization:'Bearer ' + token, 'Client-Id':clientId}
          });
          if (response.status === 401) return respond(401, {error:'twitch_reconnect_required'});
          if (!response.ok) return respond(503, {error:'twitch_unavailable'});
          const result = await response.json();
          if (!Array.isArray(result.data)) return respond(503, {error:'twitch_unavailable'});
          moderator = result.data.some(channel => channel.broadcaster_id === BROADCASTER_ID);
          if (moderator) break;
          const next = result.pagination?.cursor;
          if (!next) break;
          if (typeof next !== 'string' || seen.has(next) || page === 19)
            return respond(503, {error:'twitch_unavailable'});
          seen.add(next); cursor = next;
        }
      }
      // SQL vérifie auth.identities.provider_id avant tout octroi. Aucun rôle client n'est utilisé.
      const saved = await request(base + '/rest/v1/rpc/crew_set_twitch_access', {
        method:'POST',
        headers:{apikey:serviceKey, Authorization:'Bearer ' + serviceKey, 'Content-Type':'application/json'},
        body:JSON.stringify({p_user_id:user.id, p_twitch_user_id:checked.user_id,
          p_is_moderator:moderator, p_ttl_seconds:Math.min(300, Math.floor(checked.expires_in))})
      });
      if (!saved.ok) return respond(saved.status === 403 ? 403 : 503,
        {error:saved.status === 403 ? 'identity_mismatch' : 'backend_unavailable'});
      const result = await saved.json();
      if (result?.role !== null && !['admin','helper'].includes(result?.role))
        return respond(503, {error:'backend_unavailable'});
      return respond(200, {role:result.role, expires_at:result.expires_at || null});
    } catch {
      return respond(503, {error:'verification_unavailable'});
    }
  };
}
