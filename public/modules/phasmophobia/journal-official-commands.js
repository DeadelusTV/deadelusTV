'use strict';
/* Atelier Phasmo V7 : commandes OFFICIELLES admin.
 * Aucun déverrouillage côté navigateur : seul le serveur décide.
 * Les actions sensibles exigent toutes une nouvelle confirmation.
 */
(() => {
 if(new URLSearchParams(location.search).get('viewer')==='1')return;
 const $=id=>document.getElementById(id);
 const status=$('journal-admin-commands-status');
 const publish=$('journal-official-publish');
 const rights=$('journal-official-rights-confirm');
 const publishPhrase=$('journal-official-publish-phrase');
 const restore=$('journal-official-restore');
 const restorePhrase=$('journal-official-restore-phrase');
 const history=$('journal-official-history');
 const offline=$('journal-official-offline');
 const refresh=$('journal-official-commands-refresh');
 if([status,publish,rights,publishPhrase,restore,restorePhrase,history,offline,refresh].some(x=>!x))return;

 let info=null,busy=false,clientPromise=null;
 const say=msg=>{status.textContent=msg;};
 const dateText=value=>{
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'date inconnue':date.toLocaleDateString('fr-FR');
 };
 const records=()=>Array.isArray(info?.history)?info.history:[];
 function controls(){
  const ready=!!info&&!busy;
  const canRelease=ready&&!info.locked&&!info.reserved&&!!info.candidate;
  const chosen=Number(history.value);
  publish.disabled=!(canRelease&&rights.checked&&
   publishPhrase.value==='PUBLIER-OFFICIELLEMENT');
  restore.disabled=!(ready&&!info.locked&&!info.reserved&&
   Number.isSafeInteger(chosen)&&chosen>0&&
   records().some(item=>item.release_number===chosen)&&
   restorePhrase.value==='RESTAURER-OFFICIELLEMENT');
  offline.disabled=!(ready&&info.official?.visibility==='live');
  refresh.disabled=busy;
 }
 function renderState(next){
  info=next;
  const previous=history.value;
  const newOptions=[new Option('Choisir une ancienne publication','')];
  for(const item of records()){
   if(!Number.isSafeInteger(item.release_number)||item.release_number<1)continue;
   const label='Version n°'+item.release_number+
     ' · source révision '+item.source_preview_revision+
     ' · '+dateText(item.published_at||item.approved_at);
   newOptions.push(new Option(label,String(item.release_number)));
  }
  history.replaceChildren(...newOptions);
  if(newOptions.some(option=>option.value===previous))history.value=previous;
  else history.value='';
  const official=next.official;
  const candidate=next.candidate;
  const label=next.locked?'Verrou public fermé':'Publication autorisée par le serveur';
  const candidateText=candidate
   ?' Candidat : test n°'+candidate.source_preview_release+
     ', révision '+candidate.source_preview_revision+'.'
   :' Aucun candidat officiel préparé.';
  const live=official
   ?' Dernière version officielle n°'+official.release_number+
     ' ('+(official.visibility==='live'?'en ligne':'hors ligne')+').'
   :' Aucune version officielle.';
  const reserved=next.reserved?' Une publication est déjà réservée, commandes de publication suspendues.':'';
  say(label+'.'+candidateText+live+' Historique : '+records().length+' version(s).'+reserved);
  controls();
 }
 async function getClient(){
  if(!clientPromise)clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const tag=document.createElement('script');
     tag.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     tag.onload=()=>window.supabase?.createClient?resolve():reject(Error('Supabase indisponible.'));
     tag.onerror=()=>reject(Error('Bibliothèque Supabase indisponible.'));
     document.head.append(tag);
    });
   }
   return window.supabase.createClient('https://eodtxlhnfzyapkyvvxdi.supabase.co',
     'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z',{
     auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
   });
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
 }
 async function invoke(action,body={}){
  const client=await getClient();
  const identity=await client.auth.getUser();
  if(identity.error||!identity.data?.user)throw Error('Connexion Twitch requise.');
  const session=await client.auth.getSession();
  if(session.error||!session.data?.session?.access_token)
   throw Error('Session Twitch expirée : reconnecte-toi.');
  const {data,error}=await client.functions.invoke('phasmo-journal-release',{
   body:{action,...body},
   headers:{Authorization:'Bearer '+session.data.session.access_token}
  });
  if(error){
   let message=typeof data?.error==='string'?data.error:error.message;
   const response=error.context;
   if(typeof response?.status==='number'){
    try{
     const detail=await response.clone().json();
     if(typeof detail?.error==='string')message=detail.error;
    }catch{}
    message='HTTP '+response.status+' : '+message;
   }
   throw Error(message||'Action refusée.');
  }
  if(data?.ok!==true)throw Error(data?.error||'Réponse serveur invalide.');
  return data;
 }
 async function task(work){
  if(busy)return;
  busy=true;controls();
  try{await work();}
  catch(error){
   // Après un refus ou une coupure, ne pas réutiliser un ancien état autorisé.
   info=null;
   say('Action non validée : '+(error?.message||'erreur inconnue')+
     '. Actualise le statut officiel avant toute autre action.');
  }finally{busy=false;controls();}
 }
 async function loadStatus(){
  return task(async()=>{
   say('Vérification administrateur du verrou et de l’historique…');
   const next=await invoke('status');
   renderState(next);
  });
 }
 refresh.addEventListener('click',()=>{void loadStatus();});
 for(const element of [rights,publishPhrase,restorePhrase,history]){
  element.addEventListener('change',controls);
  element.addEventListener('input',controls);
 }
 publish.addEventListener('click',()=>{void task(async()=>{
  if(!info||info.locked||info.reserved||!info.candidate||
    !rights.checked||publishPhrase.value!=='PUBLIER-OFFICIELLEMENT')
   throw Error('Publication verrouillée ou confirmation incomplète.');
  const rev=info.candidate.source_preview_revision;
  const release=info.candidate.source_preview_release;
  if(!confirm('DERNIÈRE CONFIRMATION : rendre PUBLIC le carnet du test n°'+release+
     ', révision '+rev+', y compris ses images et polices ?'))return;
  const result=await invoke('activate',{
   confirmation:'PUBLIER-OFFICIELLEMENT',rightsApproved:true,
   expected_revision:rev,expected_preview_release:release
  });
  rights.checked=false;publishPhrase.value='';
  say('Publication officielle confirmée : version n°'+
    (result.published?.[0]?.release_number||'?')+'.');
  info=null;
  const next=await invoke('status');
  renderState(next);
 });});
 restore.addEventListener('click',()=>{void task(async()=>{
  const target=Number(history.value);
  if(!info||info.locked||info.reserved||
     !Number.isSafeInteger(target)||target<1||
     !records().some(x=>x.release_number===target)||
     restorePhrase.value!=='RESTAURER-OFFICIELLEMENT')
    throw Error('Restauration verrouillée ou version non sélectionnée.');
  if(!confirm('Restaurer l’ancienne version n°'+target+
    ' comme NOUVELLE publication officielle visible par tous ?'))return;
  const result=await invoke('restore',{
   confirmation:'RESTAURER-OFFICIELLEMENT',target_release:target
  });
  restorePhrase.value='';
  say('Restauration confirmée : '+(result.restored?.[0]?.release_number||'version créée')+'.');
  info=null;
  const next=await invoke('status');
  renderState(next);
 });});
 offline.addEventListener('click',()=>{void task(async()=>{
  if(!info||info.official?.visibility!=='live')
    throw Error('Aucune publication en ligne à masquer.');
  const number=info.official.release_number;
  const typed=prompt('Pour masquer immédiatement la publication officielle n°'+number+
   ', saisis exactement METTRE-HORS-LIGNE :','');
  if(typed!== 'METTRE-HORS-LIGNE')return;
  if(!confirm('Dernière confirmation : retirer immédiatement le carnet n°'+number+
    ' de la lecture publique ? Les fichiers médias déjà publics resteront accessibles par leurs liens directs.'))return;
  const result=await invoke('offline',{
   confirmation:'METTRE-HORS-LIGNE',expected_release:number
  });
  if(!result.disabled)throw Error('La mise hors ligne n’est pas confirmée.');
  say('Le carnet officiel est désormais hors ligne.');
  info=null;
  const next=await invoke('status');
  renderState(next);
 });});
 // Un contrôle ou une préparation réalisés dans le module existant
 // actualisent cette interface sans clic supplémentaire.
 window.addEventListener('phasmo:official-status',event=>{
  if(!busy&&event.detail?.ok===true)renderState(event.detail);
 });
 window.addEventListener('phasmo:official-prepared',()=>{void loadStatus();});
 controls();
 // L'utilisateur peut également forcer un nouveau contrôle depuis ce bouton.
 void loadStatus();
})();
