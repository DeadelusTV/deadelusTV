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
const ACTIONS = new Set(['bootstrap', 'addCategory', 'addSection', 'addPermission', 'setGrant']);
const LABEL_LIMIT = 70;

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);
}

function verifyAction(action, payload) {
  if (!ACTIONS.has(action)) return null;
  if (action === 'bootstrap') return {};
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
    if (action !== 'bootstrap' && !mutationsEnabled)
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

      // Seul le serveur détient la clé service role. RPC SECURITY INVOKER :
      // les changements sont atomiques avec leur entrée dans l'audit.
      const rpc = await http(base+'/rest/v1/rpc/site_access_admin_action',{
        method:'POST',
        headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
        body:JSON.stringify({
          p_action:action,
          p_payload:checkedPayload,
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
      return respond(200,{...snapshot,mutations_enabled:mutationsEnabled});
    } catch {
      return respond(503,{error:'temporarily_unavailable'});
    }
  };
}
