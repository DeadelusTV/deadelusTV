'use strict';
/* Phasmo V7 : interface éditoriale simplifiée.
 * Les outils de recette restent connectés mais masqués.
 * Les actions publiques passent exclusivement par les verrous serveur existants.
 */
(() => {
 if(new URLSearchParams(location.search).get('viewer')==='1')return;
 const $=id=>document.getElementById(id);
 const panel=$('journal-simple-controls');
 if(!panel)return;
 const status=$('journal-simple-status');
 const note=$('journal-simple-publish-note');
 const history=$('journal-simple-history');
 const load=$('journal-simple-load');
 const save=$('journal-simple-save');
 const preview=$('journal-simple-preview');
 const publish=$('journal-simple-publish');
 const unpublish=$('journal-simple-unpublish');
 const remove=$('journal-simple-delete');
 const oldLoad=$('journal-remote-load');
 const oldSave=$('journal-remote-save');
 const remoteStatus=$('journal-remote-status');
 let clientPromise=null,official=null,loading=false;
 const show=value=>{status.textContent=value;};

 // L'image et la police gardent leurs contrôles existants.
 // Un seul panneau ouvert évite sept pages de réglages à l'écran.
 const aside=document.querySelector('main > aside');
 if(aside){
  const blocks=Array.from(aside.children).filter(el=>el.classList.contains('block'));
  const layers=blocks.find(b=>b.querySelector(':scope > h3')?.textContent.includes('Calques de cette page'));
  const imageBlock=blocks.find(b=>b.querySelector(':scope > h3')?.textContent.includes("Calques d'images"));
  if(layers&&imageBlock){
   const imageButtons=imageBlock.querySelector('.buttons');
   const multiInput=$('multi-image-input');
   if(imageButtons){
    $('make-detail-template')?.remove();
    const heading=document.createElement('h4');
    heading.textContent='Images de cette page';
    heading.className='journal-inline-heading';
    layers.append(heading,imageButtons);
   }
   if(multiInput)layers.append(multiInput);
   imageBlock.remove();
  }
  const panels=Array.from(aside.children).filter(el=>el.classList.contains('block'));
  for(const [index,block] of panels.entries()){
   const heading=block.querySelector(':scope > h3');
   if(!heading)continue;
   const details=document.createElement('details');
   details.className='journal-editor-panel';
   details.open=index===0;
   const summary=document.createElement('summary');
   summary.textContent=heading.textContent;
   aside.insertBefore(details,block);
   details.append(summary,block);
   details.addEventListener('toggle',()=>{
    if(!details.open)return;
    for(const item of aside.querySelectorAll(':scope > details.journal-editor-panel'))
     if(item!==details)item.open=false;
   });
  }
 }
 function getClient(){
  if(!clientPromise)clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return await window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const tag=document.createElement('script');
     tag.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     tag.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque Supabase absente.'));
     tag.onerror=()=>reject(Error('Connexion Supabase inaccessible.'));
     document.head.append(tag);
    });
   }
   return window.supabase.createClient('https://eodtxlhnfzyapkyvvxdi.supabase.co',
    'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z',{
    auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
   });
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
 }
 async function authorized(){
  const client=await getClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)throw Error('Connecte-toi au site avec Twitch pour accéder au carnet partagé.');
  const session=await client.auth.getSession();
  if(session.error||!session.data?.session?.access_token)throw Error('Session Twitch expirée.');
  return {client,token:session.data.session.access_token};
 }
 async function request(action,fields={}){
  const {client,token}=await authorized();
  const {data,error}=await client.functions.invoke('phasmo-journal-release',{
   body:{action,...fields},
   headers:{Authorization:'Bearer '+token}
  });
  if(error){
   let reason=error.message||'Opération refusée';
   try{
    const json=await error.context?.clone?.().json();
    if(json?.error)reason=json.error;
   }catch{}
   throw Error(reason);
  }
  if(data?.ok!==true)throw Error(data?.error||'Réponse serveur invalide.');
  return data;
 }
 const run=async(work)=>{
  if(loading)return;
  loading=true;
  for(const button of [load,save,preview,remove])button.disabled=true;
  try{await work();}
  catch(error){show('Erreur : '+(error?.message||'Opération impossible'));}
  finally{loading=false;for(const button of [load,save,preview,remove])button.disabled=false;}
 };
 async function refreshHistory(){
  const bridge=window.PHASMO_JOURNAL_REMOTE_SYNC;
  if(!bridge?.listVersions)return;
  const previous=history.value;
  const versions=await bridge.listVersions();
  const options=[new Option('Dernier brouillon partagé','current')];
  for(const row of versions){
   const day=row.saved_at?new Date(row.saved_at).toLocaleString('fr-FR'):'date inconnue';
   options.push(new Option('Révision '+row.revision+' · '+day,String(row.revision)));
  }
  history.replaceChildren(...options);
  history.value=options.some(o=>o.value===previous)?previous:'current';
 }
 async function refreshOfficial(){
  try{
   const latest=await request('status');
   official=latest;
   publish.disabled=latest.locked||latest.reserved;
   unpublish.disabled=latest.official?.visibility!=='live';
   note.textContent=latest.locked
    ?'Publication publique momentanément verrouillée. Le brouillon et son aperçu restent utilisables.'
    :latest.reserved
     ?'Une publication est en cours. Publication et restauration suspendues.'
     :'La publication concerne uniquement le dernier brouillon enregistré, après confirmation.';
  }catch{
   official=null;publish.disabled=true;unpublish.disabled=true;
   note.textContent='Publication réservée aux administrateurs connectés. Les brouillons restent privés.';
  }
 }
 load.addEventListener('click',()=>{
  const revision=history.value;
  if(revision==='current'){oldLoad.click();return;}
  void run(async()=>{
   const bridge=window.PHASMO_JOURNAL_REMOTE_SYNC;
   if(!bridge?.loadRevision)throw Error('Historique indisponible, actualise la page.');
   const loaded=await bridge.loadRevision(Number(revision));
   if(loaded)show('Ancienne révision '+revision+' chargée. Enregistre le brouillon pour conserver ces changements.');
  });
 });
 save.addEventListener('click',()=>{oldSave.click();});
 preview.addEventListener('click',()=>{
  $('test-mode').click();
  show('Aperçu activé dans le livre : teste les clics et la navigation. Reviens dans « Mode de travail » pour modifier.');
  document.querySelector('.workspace')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 });
 history.addEventListener('focus',()=>{void refreshHistory().catch(()=>{});});
 // La suppression simple ne détruit ni le brouillon partagé ni l'historique.
 remove.addEventListener('click',()=>{void run(async()=>{
  if(!confirm('Supprimer la COPIE LOCALE actuellement affichée et repartir sur un carnet vierge ? Les sauvegardes et l’historique partagés ne seront PAS supprimés.'))return;
  const bridge=window.PHASMO_JOURNAL_REMOTE_BRIDGE;
  if(typeof bridge?.resetLocalDraft!=='function')throw Error('Réinitialisation locale indisponible.');
  bridge.resetLocalDraft();
  window.PHASMO_JOURNAL_REMOTE_SYNC?.invalidateLocalRevision?.();
  show('Copie locale effacée. Les sauvegardes et versions partagées restent intactes. Charge un brouillon avant de réenregistrer.');
 });});
 publish.addEventListener('click',()=>{void run(async()=>{
  const check=await request('status');
  if(check.locked||check.reserved)
   throw Error('Publication publique verrouillée : aucune mise en ligne possible.');
  if(!confirm('Publier le DERNIER BROUILLON ENREGISTRÉ ? Les modifications non sauvegardées ne seront pas incluses.'))return;
  if(!confirm('Je confirme avoir les droits de diffusion sur les textes, images et polices du carnet. Cette publication sera visible par tous.'))return;
  const {client}=await authorized();
  const {data:draft,error:draftError}=await client.from('phasmo_journal_preview_drafts')
    .select('revision').eq('stage','preview').single();
  if(draftError||!draft)throw Error('Enregistre d’abord le brouillon partagé.');
  show('Préparation de la publication enregistrée…');
  const {error:snapError}=await client.from('phasmo_journal_preview_publications')
    .upsert({stage:'preview',source_revision:draft.revision},{onConflict:'stage'})
    .select('source_revision').single();
  if(snapError)throw Error('Création de l’aperçu privé refusée : '+snapError.message);
  const prepared=await request('prepare');
  show('Vérification des images et polices avant publication…');
  const result=await request('activate',{
   confirmation:'PUBLIER-OFFICIELLEMENT',rightsApproved:true,
   expected_revision:prepared.prepared.source_preview_revision,
   expected_preview_release:prepared.prepared.source_preview_release
  });
  show('Carnet publié : version n°'+(result.published?.[0]?.release_number||'?')+'.');
  await refreshOfficial();
 });});
 unpublish.addEventListener('click',()=>{void run(async()=>{
  const check=await request('status');
  if(check.official?.visibility!=='live')throw Error('Aucune publication en ligne à retirer.');
  const number=check.official.release_number;
  if(!confirm('Dépublier le carnet officiel n°'+number+' ? Les visiteurs ne verront plus le carnet, mais les fichiers déjà publics peuvent rester accessibles par leur lien direct.'))return;
  const response=await request('offline',{
   confirmation:'METTRE-HORS-LIGNE',expected_release:number
  });
  if(!response.disabled)throw Error('La dépublication n’a pas été confirmée.');
  show('Le carnet a été retiré de la lecture publique.');
  await refreshOfficial();
 });});
 const observer=new MutationObserver(()=>{
  const message=remoteStatus?.textContent||'';
  if(message&&(/chargé|enregistré|Erreur|Conflit|annulé|Chargement|Récupération|Lecture/i).test(message)){
   show(message);
   if(/enregistré sur Supabase|chargé · révision/i.test(message))
    void refreshHistory().catch(()=>{});
  }
 });
 if(remoteStatus)observer.observe(remoteStatus,{childList:true,characterData:true,subtree:true});
 window.addEventListener('phasmo:official-prepared',()=>{void refreshOfficial();});
 window.addEventListener('phasmo:official-status',()=>{void refreshOfficial();});
 void refreshHistory().catch(error=>{
  show('Historique disponible après connexion Twitch : '+error.message);
 });
 void refreshOfficial();
})();

