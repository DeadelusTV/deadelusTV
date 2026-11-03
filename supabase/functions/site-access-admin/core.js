/* Centre des accès V2 : première étape serveur EN LECTURE SEULE.
 * Aucun droit n'est créé ou modifié. Aucun secret n'est renvoyé au navigateur.
 * Liste des deux propriétaires configurée exclusivement par variable serveur.
 */
const PORTAL_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
const PORTAL_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWITCH_ID = /^[0-9]{1,32}$/;
const CATALOG = [
  {id:'phasmo',label:'Phasmophobia',sections:[
    {id:'livre',label:'Livre',permissions:[{code:'phasmo.livre.edit',label:'Éditeur du livre'}]},
    {id:'news',label:'News',permissions:[{code:'phasmo.news.edit',label:'Rédacteur News'}]}
  ]},
  {id:'crew',label:'Crew’mong Us',sections:[
    {id:'roles',label:'Rôles',permissions:[{code:'crew.roles.helper',label:'Helper (saisie)'},{code:'crew.roles.admin',label:'Admin (gestion)'}]}
  ]}
];

export function createHandler(env, http = fetch) {
  const owners = (env.SITE_ACCESS_ADMIN_TWITCH_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
  const origins = (env.SITE_ACCESS_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  const configured = owners.length === 2 && new Set(owners).size === 2 && owners.every(v => TWITCH_ID.test(v)) && origins.length > 0;
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
    const response = (status, body) => new Response(JSON.stringify(body), {status,headers});
    if (!allowed) return response(403,{error:'origin_forbidden'});
    if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (req.method!=='POST') return response(405,{error:'method_not_allowed'});
    if (!configured) return response(503,{error:'not_configured'});
    const authorization = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/i.test(authorization)) return response(401,{error:'unauthorized'});
    const raw = await req.text();
    if (raw.length > 4096) return response(413,{error:'invalid_request'});
    let payload;
    try {payload=JSON.parse(raw);}catch{return response(400,{error:'invalid_request'});}
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof payload.action !== 'string')
      return response(400,{error:'invalid_request'});
    try {
      // Auth vérifiée directement par le serveur auprès de Supabase, jamais à partir
      // d'un pseudo, d'une claim user_metadata ou d'un identifiant fourni par le client.
      const auth = await http(PORTAL_URL+'/auth/v1/user',{
        headers:{Authorization:authorization,apikey:PORTAL_KEY},
        signal:AbortSignal.timeout(7500)
      });
      if (!auth.ok) return response(auth.status===401||auth.status===403?401:503,{error:'auth_unavailable'});
      const user = await auth.json();
      if (!UUID.test(user?.id||'')) return response(403,{error:'forbidden'});
      const twitch = (user.identities||[]).filter(i=>i.provider==='twitch');
      const twitchId=twitch.length===1?twitch[0].id:null;
      if (!TWITCH_ID.test(twitchId||'') || !owners.includes(twitchId))
        return response(403,{error:'forbidden'});
      if (payload.action!=='bootstrap') return response(501,{error:'write_backend_not_implemented'});
      // Pas de liste Twitch ni de droits simulés dans la réponse serveur réelle :
      // intégration de l'API Twitch, registre et passerelles de droits à venir.
      return response(200,{authorized:true,categories:CATALOG,people:[],phase:'read_only'});
    } catch {
      return response(503,{error:'temporarily_unavailable'});
    }
  };
}
