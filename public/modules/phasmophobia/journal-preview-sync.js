'use strict';
/* Pilote Supabase PREVIEW uniquement. Ne jamais charger ni enregistrer automatiquement. */
(() => {
 const PROJECT='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const KEY='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 const TABLE='phasmo_journal_preview_drafts';
 const $=id=>document.getElementById(id);
 const status=$('journal-remote-status');
 const load=$('journal-remote-load');
 const save=$('journal-remote-save');
 if(!status||!load||!save||new URLSearchParams(location.search).get('viewer')==='1')return;
 let clientPromise=null,loadedRevision=null,busy=false;
 const update=(str)=>{status.textContent=str};
 function getClient(){
  if(!clientPromise)clientPromise=(async()=>{
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=resolve;script.onerror=()=>reject(Error('Bibliothèque Supabase inaccessible.'));
     document.head.append(script);
    });
   }
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   return window.supabase.createClient(PROJECT,KEY,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
   }});
  })();
  return clientPromise;
 }
 async function authorized(){
  const client=await getClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw Error('Connecte-toi avec Twitch depuis le menu Compte du site.');
  const [admin,editor]=await Promise.all([
   client.from('phasmo_journal_admins').select('enabled').eq('user_id',user.id).maybeSingle(),
   client.from('phasmo_journal_editors').select('enabled').eq('user_id',user.id).maybeSingle()
  ]);
  if(admin.error||editor.error)throw Error('Vérification des permissions indisponible.');
  if(!admin.data?.enabled&&!editor.data?.enabled)throw Error('Aucun droit carnet attribué à ce compte.');
  return {client,user};
 }
 async function run(fn){
  if(busy)return;busy=true;load.disabled=true;save.disabled=true;
  try{await fn();}catch(error){update('Erreur : '+error.message);}
  finally{busy=false;load.disabled=false;save.disabled=false;}
 }
 load.addEventListener('click',()=>run(async()=>{
  if(!confirm('Charger le brouillon partagé ? Les modifications locales non exportées seront remplacées. Télécharge le JSON local avant de continuer.'))return;
  const {client}=await authorized();
  const {data,error}=await client.from(TABLE).select('payload,revision').eq('stage','preview').maybeSingle();
  if(error)throw Error('Lecture Supabase refusée : '+error.message);
  if(!data){update('Aucun brouillon partagé : conserve tes réglages locaux et enregistre-les lorsque tu es prêt.');loadedRevision=0;return;}
  if(data.payload?.version!==7)throw Error('Version de brouillon distant incompatible.');
  await window.PHASMO_JOURNAL_REMOTE_BRIDGE.importPayload(data.payload);
  loadedRevision=data.revision;
  update('Brouillon partagé chargé · révision '+loadedRevision+'.');
 }));
 save.addEventListener('click',()=>run(async()=>{
  const {client,user}=await authorized();
  const payload=window.PHASMO_JOURNAL_REMOTE_BRIDGE.exportPayload();
  const bytes=new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if(bytes>7500000)throw Error('JSON trop volumineux pour ce pilote. Conserve l’export local ; migration Storage requise pour les médias.');
  if(loadedRevision===null)throw Error('Clique d’abord sur « Charger le brouillon partagé » pour connaître sa version.');
  if(!confirm('Enregistrer le brouillon V7 partagé sur Supabase ? Aucun contenu ne sera publié.'))return;
  if(loadedRevision===0){
   const {error}=await client.from(TABLE).insert({stage:'preview',payload,revision:1,updated_by:user.id});
   if(error)throw Error('Conflit ou refus : '+error.message+' ; recharge la dernière version avant de réessayer.');
   loadedRevision=1;
  }else{
   const {data,error}=await client.from(TABLE)
    .update({payload,revision:loadedRevision+1,updated_by:user.id,updated_at:new Date().toISOString()})
    .eq('stage','preview').eq('revision',loadedRevision).select('revision').maybeSingle();
   if(error||!data)throw Error('Conflit : une autre personne a enregistré entre-temps. Exporte ton JSON puis recharge le brouillon partagé.');
   loadedRevision=data.revision;
  }
  update('Brouillon partagé enregistré · révision '+loadedRevision+' (non publié).');
 }));
 update('Mode local actif · synchronisation Supabase facultative, uniquement en prévisualisation.');
})();