/* DeadelusTV V2 : registre des autorisations en PRÉPARATION.
 * Le registre ne modifie PAS les droits réels des modules.
 * Identité du propriétaire vérifiée à chaque appel, jamais via user_metadata.
 * Les écritures sont désactivées par défaut, y compris après déploiement.
 */
const PORTAL_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
const PORTAL_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWITCH_ID = /^[0-9]{1,32}$/;
const SLUG = /^[a-z][a-z0-9-]{1,60}$/;
const CODE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*){2,}$/;
const ACTIONS = new Set(['bootstrap', 'previewModerators', 'syncModerators', 'addCategory', 'addSection', 'addPermission', 'setGrant']);
const LABEL_LIMIT = 70;

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);
}

function verifyAction(action, payload) {
  if (!ACTIONS.has(action)) return null;
  if (action === 'bootstrap' || action === 'previewModerators' || action === 'syncModerators') return {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const label = typeof payload.label === 'string' ? payload.label.trim() : '';
  if (action === 'setGrant') {
    const user_id = payload.user_id, code = payload.code, enabled = payload.enabled;
    if (typeof user_id !== 'string' || !TWITCH_ID.test(user_id) ||
        typeof code !== 'string' || !CODE.test(code) || /^(portal|site|system)\./.test(code) ||
        typeof enabled !== 'boolean') return null;
    return {user_id, code, enabled};
  }
  if (!label || label.length > LABEL_LIMIT) return null;
  if (action === 'addCategory') {
    const id = slug(label);
    return SLUG.test(id) ? {id, label} : null;
  }
  if (action === 'addSection') {
    const category_id = payload.category_id, id = slug(label);
    return typeof category_id === 'string' && SLUG.test(category_id) && SLUG.test(id)
      ? {category_id, id, label} : null;
  }
  if (action === 'addPermission') {
    const {category_id,section_id,code} = payload;
    return typeof category_id === 'string' && SLUG.test(category_id) &&
      typeof section_id === 'string' && SLUG.test(section_id) &&
      typeof code === 'string' && code.length <= 90 && CODE.test(code) &&
      !/^(portal|site|system)\./.test(code) ?
      {category_id,section_id,code,label} : null;
  }
  return null;
}


const BROADCASTER_ID = '99977368';
const MAX_PAGES = 20; // 100 modérateurs/page : une liste au-delà du plafond échoue, jamais tronquée.
const DISPLAY_LIMIT = 70;

/** Liste Twitch complète, vérifiée côté serveur. Ne journaliser ni jeton ni réponse OAuth. */
export async function getTwitchModerators(env, http = fetch) {
  const token = env.SITE_ACCESS_TWITCH_BROADCASTER_TOKEN || '';
  const clientId = env.SITE_ACCESS_TWITCH_CLIENT_ID || '';
  if (!/^[A-Za-z0-9_-]{20,4096}$/.test(token) || !/^[a-z0-9]{10,64}$/i.test(clientId))
    throw new Error('twitch_not_configured');

  const checkedResponse = await http('https://id.twitch.tv/oauth2/validate', {
    headers: {Authorization: 'OAuth '+token},
    signal: AbortSignal.timeout(7000)
  });
  if (!checkedResponse.ok) throw new Error('twitch_token_unavailable');
  const checked = await checkedResponse.json();
  if (checked?.user_id !== BROADCASTER_ID ||
      checked.client_id !== clientId ||
      !Array.isArray(checked.scopes) || !checked.scopes.includes('moderation:read') ||
      !Number.isInteger(checked.expires_in) || checked.expires_in < 30)
    throw new Error('twitch_authorization_invalid');

  const moderators = [], ids = new Set(), cursors = new Set();
  let cursor = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = 'broadcaster_id='+BROADCASTER_ID+'&first=100'+
      (cursor ? '&after='+encodeURIComponent(cursor) : '');
    const result = await http('https://api.twitch.tv/helix/moderation/moderators?'+query,{
      headers:{Authorization:'Bearer '+token,'Client-Id':clientId},
      signal:AbortSignal.timeout(7000)
    });
    if (!result.ok) throw new Error('twitch_mod_list_unavailable');
    const body = await result.json();
    if (!Array.isArray(body?.data) || body.data.length > 100)
      throw new Error('twitch_invalid_response');
    for (const entry of body.data) {
      const id = entry?.user_id, name = entry?.user_name;
      if (typeof id !== 'string' || !TWITCH_ID.test(id) ||
          typeof name !== 'string' || !name.trim() || name.trim().length > DISPLAY_LIMIT ||
          ids.has(id)) throw new Error('twitch_invalid_response');
      ids.add(id);
      moderators.push({user_id:id,user_name:name.trim()});
    }
    const next = body.pagination?.cursor;
    if (next === undefined || next === null || next === '') return moderators;
    if (typeof next !== 'string' || next.length > 2048 ||
        cursors.has(next) || page === MAX_PAGES-1)
      throw new Error('twitch_pagination_incomplete');
    cursors.add(next);
    cursor=next;
  }
  throw new Error('twitch_pagination_incomplete');
}

export function createHandler(env, http = fetch) {
  const owners = (env.SITE_ACCESS_ADMIN_TWITCH_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
  const origins = (env.SITE_ACCESS_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const configured = owners.length === 2 && new Set(owners).size === 2 &&
    owners.every(v => TWITCH_ID.test(v)) && origins.length > 0 &&
    origins.every(v => /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(v)) &&
    base === PORTAL_URL && !!serviceKey;
  const mutationsEnabled = env.SITE_ACCESS_WRITES_ENABLED === 'true';
  const twitchConfigured = Boolean(env.SITE_ACCESS_TWITCH_BROADCASTER_TOKEN && env.SITE_ACCESS_TWITCH_CLIENT_ID);

  return async function handle(req) {
    const origin = req.headers.get('origin') || '';
    const allowed = origins.includes(origin);
    const headers = {
      'Content-Type':'application/json;charset=utf-8',
      'Cache-Control':'no-store',
      'Vary':'Origin',
      'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
      'Access-Control-Allow-Methods':'POST,OPTIONS',
      ...(allowed ? {'Access-Control-Allow-Origin':origin} : {})
    };
    const respond = (status,body) => new Response(JSON.stringify(body),{status,headers});
    if (!allowed) return respond(403,{error:'origin_forbidden'});
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (req.method !== 'POST') return respond(405,{error:'method_not_allowed'});
    if (!configured) return respond(503,{error:'server_unconfigured'});

    const authorization = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/i.test(authorization)) return respond(401,{error:'unauthorized'});
    let payload;
    try {
      const raw = await req.text();
      if (raw.length > 4096) return respond(413,{error:'request_too_large'});
      payload = JSON.parse(raw);
    } catch {return respond(400,{error:'invalid_request'});}
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        typeof payload.action !== 'string') return respond(400,{error:'invalid_request'});
    const action = payload.action;
    if (!ACTIONS.has(action)) return respond(400,{error:'unknown_action'});
    const checkedPayload = verifyAction(action,payload);
    if (!checkedPayload) return respond(400,{error:'invalid_fields'});
    if (action !== 'bootstrap' && action !== 'previewModerators' && !mutationsEnabled)
      return respond(403,{error:'registry_writes_disabled'});

    try {
      // Le JWT doit être validé par Supabase Auth du PORTAIL, pas par les métadonnées du client.
      const verified = await http(PORTAL_URL+'/auth/v1/user',{
        headers:{Authorization:authorization,apikey:PORTAL_KEY},
        signal:AbortSignal.timeout(8000)
      });
      if (!verified.ok) return respond(verified.status === 401 || verified.status === 403 ? 401 : 503,
        {error:'portal_auth_unavailable'});
      const user = await verified.json();
      if (!UUID.test(user?.id || '')) return respond(403,{error:'forbidden'});
      const identity = (user.identities || []).filter(i => i.provider === 'twitch');
      const twitchId = identity.length === 1 ? identity[0].id : null;
      if (typeof twitchId !== 'string' || !TWITCH_ID.test(twitchId) || !owners.includes(twitchId))
        return respond(403,{error:'forbidden'});

      // L'aperçu et la synchronisation lisent Twitch UNIQUEMENT après l'autorisation du propriétaire.
      // Le navigateur ne fournit ni token ni liste de modérateurs au serveur.
      let moderators = null;
      if (action === 'previewModerators' || action === 'syncModerators') {
        try {moderators = await getTwitchModerators(env,http);}
        catch (error) {
          const msg=String(error?.message||'');
          const code=['twitch_not_configured','twitch_authorization_invalid','twitch_token_unavailable',
            'twitch_mod_list_unavailable','twitch_invalid_response',
            'twitch_pagination_incomplete'].includes(msg)?msg:'twitch_unavailable';
          return respond(503,{error:code});
        }
        // Interdire de convertir une réponse accidentellement vide en "tous anciens modérateurs".
        if (action === 'syncModerators' && moderators.length===0)
          return respond(409,{error:'empty_moderator_list_requires_review'});
      }
      const rpcAction = action === 'previewModerators' ? 'bootstrap' : action;
      const rpcPayload = action === 'syncModerators' ? {moderators} : checkedPayload;

      // Seul le serveur détient la clé service role. RPC SECURITY INVOKER :
      // les changements sont atomiques avec leur entrée dans l'audit.
      const rpc = await http(base+'/rest/v1/rpc/site_access_admin_action',{
        method:'POST',
        headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
        body:JSON.stringify({
          p_action:rpcAction,
          p_payload:rpcPayload,
          p_actor_twitch_id:twitchId
        }),
        signal:AbortSignal.timeout(8000)
      });
      if (!rpc.ok) return respond(rpc.status === 400 || rpc.status === 409 ? 409 : 503,
        {error:'registry_unavailable_or_rejected'});
      const snapshot = await rpc.json();
      if (snapshot?.authorized !== true || snapshot?.rights_effective !== false ||
          !Array.isArray(snapshot.categories) || !Array.isArray(snapshot.people))
        return respond(503,{error:'invalid_registry_response'});
      return respond(200,{
        ...snapshot,
        mutations_enabled:mutationsEnabled,
        twitch_configured:twitchConfigured,
        ...(moderators && action==='previewModerators' ? {moderators_preview:moderators} : {}),
        ...(moderators && action==='syncModerators' ? {sync_count:moderators.length} : {})
      });
    } catch {
      return respond(503,{error:'temporarily_unavailable'});
    }
  };
}
