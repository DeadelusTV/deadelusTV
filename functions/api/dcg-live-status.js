// Relais de lecture du statut public du site OVH, sans compte joueur ni secret.
// Seule la chaîne actuellement raccordée est connue de l'API historique.
const OWNER='99977368';
const UPSTREAM='https://www.deadelustv.com/api/twitch-status';
const response=(statuses,status=200,ttl=0)=>new Response(JSON.stringify({statuses}),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':ttl?'public, max-age='+ttl:'no-store','X-Content-Type-Options':'nosniff'}
});
export async function onRequestGet({request}){
  const url=new URL(request.url),ids=url.searchParams.getAll('broadcaster_id');
  if(!ids.length||ids.length>100||ids.some(id=>!/^\d{1,40}$/.test(id)))return response({},400);
  if(!ids.includes(OWNER))return response({}); // Inconnu, jamais assimilé à un live.
  const key=new Request(new URL('/api/dcg-live-status?broadcaster_id='+OWNER,url));
  const cache=globalThis.caches?.default;
  try{const hit=await cache?.match(key);if(hit)return hit;}catch{/* Cache facultatif. */}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const upstream=await fetch(UPSTREAM,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal});
    if(!upstream.ok)throw Error('Statut indisponible');
    const data=await upstream.json();if(typeof data?.live!=='boolean')throw Error('Statut invalide');
    const result=response({[OWNER]:data.live},200,15);
    try{await cache?.put(key,result.clone());}catch{/* Le statut reste exploitable sans cache. */}
    return result;
  }catch{return response({},503);}
  finally{clearTimeout(timer);}
}
