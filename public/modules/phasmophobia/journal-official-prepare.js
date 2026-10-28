'use strict';
/* Publication officielle : audit et preparation PRIVES exclusivement.
 * L'activation publique n'est accessible ni depuis ce module ni depuis l'atelier.
 */
(() => {
 if(new URLSearchParams(location.search).get('viewer')==='1')return;
 const status=document.getElementById('journal-official-status');
 const check=document.getElementById('journal-official-status-check');
 const prepare=document.getElementById('journal-official-prepare');
 if(!status||!check||!prepare)return;
 const show=value=>{status.textContent=value;};
 let clientPromise=null;
 async function client(){
  if(!clientPromise)clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque Supabase indisponible.'));
     script.onerror=()=>reject(Error('Connexion Supabase indisponible.'));
     document.head.append(script);
    });
   }
   return window.supabase.createClient('https://eodtxlhnfzyapkyvvxdi.supabase.co',
    'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z',
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  })().catch(e=>{clientPromise=null;throw e});
  return clientPromise;
 }
 async function invoke(action){
  const api=await client();
  const identity=await api.auth.getUser();
  if(identity.error||!identity.data?.user)throw Error('Connecte-toi d’abord avec Twitch.');
  // Ne pas supposer que l'instance Functions a récupéré automatiquement le JWT.
  // Le serveur revérifie de toute façon le JWT avec auth.getUser(token)
  // et le rôle Phasmo en base.
  const session=await api.auth.getSession();
  if(session.error||!session.data?.session?.access_token)
   throw Error('Session Twitch non disponible pour cette action. Reconnecte-toi et réessaie.');
  const {data,error}=await api.functions.invoke('phasmo-journal-release',{
   body:{action},
   headers:{Authorization:'Bearer '+session.data.session.access_token}
  });
  if(error){
   let message=typeof data?.error==='string'?data.error:'';
   let httpCode='';
   const response=error.context;
   if(response&&typeof response.status==='number'){
    httpCode='HTTP '+response.status;
    const errorCode=response.headers?.get?.('sb-error-code');
    if(errorCode)httpCode+=' ('+errorCode+')';
    try{
     const value=await response.clone().json();
     if(typeof value?.error==='string')message=value.error;
     else if(typeof value?.message==='string')message=value.message;
     else if(typeof value?.msg==='string')message=value.msg;
    }catch{
     try{
      const value=(await response.clone().text()).trim();
      if(value&&!/^</.test(value))message=value.slice(0,200);
     }catch{/* Réponse HTTP sans corps lisible. */}
    }
   }
   throw Error([httpCode,message||error.message||'Publication indisponible.'].filter(Boolean).join(' : '));
  }
  if(!data?.ok)throw Error(data?.error||'Réponse de publication invalide.');
  return data;
 }
 async function busy(action){
  check.disabled=true;prepare.disabled=true;
  try{return await action()}
  catch(e){show('Contrôle refusé : '+(e?.message||'erreur inconnue'))}
  finally{check.disabled=false;prepare.disabled=false}
 }
 check.addEventListener('click',()=>busy(async()=>{
  show('Vérification des permissions et de l’état des publications…');
  const info=await invoke('status');
  window.dispatchEvent(new CustomEvent('phasmo:official-status',{detail:info}));
  const candidate=info.candidate;
  const official=info.official;
  show((info.locked?'Publication publique verrouillée. ':'Publication publique autorisée sur le serveur. ')+
    (candidate?'Candidat privé prêt : révision '+candidate.source_preview_revision+
       ', publication de test n°'+candidate.source_preview_release+'. ':
      'Aucun candidat officiel préparé. ')+
    (official?'État public : '+official.visibility+'.':'Aucune version publique en ligne.'));
 }));
 prepare.addEventListener('click',()=>busy(async()=>{
  if(!confirm('Préparer PRIVÉMENT la dernière version publiée en test ? Le serveur va vérifier ses images et polices, mais ne rendra rien public.'))return;
  show('Vérification du snapshot figé et des fichiers privés sur Supabase…');
  const data=await invoke('prepare');
  window.dispatchEvent(new CustomEvent('phasmo:official-prepared',{detail:data}));
  const m=data.media;
  show('Version officielle préparée en privé : révision '+data.prepared.source_preview_revision+
    ', publication de test n°'+data.prepared.source_preview_release+
    '. Médias vérifiés : '+m.images+' image(s), '+m.fonts+' police(s). '+
    'Aucune publication publique effectuée. Activation toujours verrouillée.');
 }));
 show('Préparation uniquement : aucune publication officielle ni transfert vers le bucket public.');
})();