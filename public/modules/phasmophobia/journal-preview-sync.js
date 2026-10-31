'use strict';
/* Carnet Phasmo V7 : synchronisation volontaire du brouillon PREVIEW.
 * Chaque sauvegarde passe par une révision attendue. Aucun accès à la production.
 * Le stockage local et les exports JSON continuent indépendamment.
 */
(() => {
 const PROJECT='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const KEY='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 const TABLE='phasmo_journal_preview_drafts';
 const $=id=>document.getElementById(id);
 const status=$('journal-remote-status');
 const load=$('journal-remote-load');
 const save=$('journal-remote-save');
 if(!status||!load||!save||new URLSearchParams(location.search).get('viewer')==='1')return;

 let clientPromise=null;
 let loadedRevision=null;
 let busy=false;
 const update=message=>{status.textContent=message;};
 const bridge=()=> {
  const api=window.PHASMO_JOURNAL_REMOTE_BRIDGE;
  if(!api||typeof api.importPayload!=='function'||typeof api.exportPayload!=='function')
   throw Error('Connexion au carnet indisponible. Actualise la page.');
  return api;
 };
 function getClient(){
  if(!clientPromise) clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque Supabase indisponible.'));
     script.onerror=()=>reject(Error('Impossible de charger la connexion Supabase.'));
     document.head.append(script);
    });
   }
   return window.supabase.createClient(PROJECT,KEY,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
   }});
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
 }
 async function authorized(){
  const client=await getClient();
  const {data,error}=await client.auth.getUser();
  const user=data?.user;
  if(error||!user)throw Error('Connecte-toi sur le site de prévisualisation avec Twitch (menu Compte), puis reviens ici.');
  const [admin,editor]=await Promise.all([
   client.from('phasmo_journal_admins').select('enabled').eq('user_id',user.id).maybeSingle(),
   client.from('phasmo_journal_editors').select('enabled').eq('user_id',user.id).maybeSingle()
  ]);
  if(admin.error||editor.error)throw Error('Impossible de vérifier tes droits sur le carnet.');
  if(!admin.data?.enabled&&!editor.data?.enabled)throw Error('Ce compte Twitch n’a pas accès aux brouillons du carnet.');
  return {client,user};
 }
 async function run(task){
  if(busy)return;
  busy=true;load.disabled=save.disabled=true;
  try{await task();}
  catch(error){update('Erreur : '+(error?.message||'Opération impossible'));}
  finally{busy=false;load.disabled=save.disabled=false;}
 }
 load.addEventListener('click',()=>run(async()=>{
  update('Lecture du brouillon partagé…');
  const {client}=await authorized();
  const {data,error}=await client.from(TABLE).select('payload,revision').eq('stage','preview').maybeSingle();
  if(error)throw Error('Lecture Supabase refusée : '+error.message);
  if(!data){
   loadedRevision=0;
   update('Aucun brouillon partagé pour le moment. Tu peux créer la première version avec « Enregistrer sur Supabase ».');
   return;
  }
  if(data.payload?.version!==7)throw Error('Version du brouillon distant incompatible avec la V7.');
  if(!confirm('Charger la révision '+data.revision+' ? Elle remplacera l’affichage local actuel.')) {
   update('Chargement annulé. Tes données locales restent inchangées.');
   return;
  }
  const media=window.PHASMO_JOURNAL_STORAGE_MEDIA;
  if(!media)throw Error('Module Storage du carnet absent. Actualise la page.');
  const hydrated=await media.restoreForEditor(data.payload,client,update);
  await bridge().importPayload(hydrated);
  loadedRevision=data.revision;
  update('Brouillon partagé chargé · révision '+loadedRevision+'.');
 }));
 save.addEventListener('click',()=>run(async()=>{
  if(loadedRevision===null)
   throw Error('Commence par « Charger le brouillon partagé » pour vérifier sa dernière révision.');
  const {client,user}=await authorized();
  const payload=bridge().exportPayload();
  if(payload?.version!==7)throw Error('Seul le format du carnet V7 peut être enregistré.');
  if(!confirm('Enregistrer cette version du carnet dans le brouillon partagé ? Elle restera privée et ne sera pas publiée. Les images et polices seront transférées dans Storage privé.'))return;
  const media=window.PHASMO_JOURNAL_STORAGE_MEDIA;
  if(!media)throw Error('Module Storage du carnet absent. Actualise la page.');
  const remotePayload=await media.prepareForSave(payload,client,user.id,update);
  const bytes=new TextEncoder().encode(JSON.stringify(remotePayload)).byteLength;
  if(bytes>7500000)throw Error('Le JSON distant dépasse 7,5 Mo malgré Storage. Aucun brouillon n’a été écrasé.');
  if(loadedRevision===0){
   const {error}=await client.from(TABLE).insert({stage:'preview',payload:remotePayload,revision:1,updated_by:user.id});
   if(error){
    loadedRevision=null;
    throw Error('Le brouillon a peut-être été créé ailleurs. Recharge sa dernière version avant d’enregistrer.');
   }
   loadedRevision=1;
  }else{
   const expected=loadedRevision;
   const {data,error}=await client.from(TABLE)
    .update({payload:remotePayload,revision:expected+1,updated_by:user.id,updated_at:new Date().toISOString()})
    .eq('stage','preview').eq('revision',expected).select('revision').maybeSingle();
   if(error||!data){
    loadedRevision=null;
    throw Error('Conflit de sauvegarde : un autre éditeur a enregistré depuis ton dernier chargement. Tes données locales sont conservées. Recharge le brouillon partagé avant de réessayer.');
   }
   loadedRevision=data.revision;
  }
  update('Brouillon privé enregistré sur Supabase · révision '+loadedRevision+'.');
 }));
 // Bridge dédié à la navigation dans l'historique des brouillons.
 // On ne modifie jamais les anciennes versions : seule une nouvelle sauvegarde
 // du brouillon peut appliquer l'une de leurs copies.
 window.PHASMO_JOURNAL_REMOTE_SYNC=Object.freeze({
  listVersions:async()=>{
   const {client}=await authorized();
   const {data,error}=await client.from('phasmo_journal_preview_revisions')
    .select('revision,saved_at').order('revision',{ascending:false}).limit(100);
   if(error)throw Error('Historique indisponible : '+error.message);
   return data||[];
  },
  loadRevision:async requested=>{
   if(busy)throw Error('Une opération de brouillon est déjà en cours.');
   const rev=Number(requested);
   if(!Number.isSafeInteger(rev)||rev<1)throw Error('Révision historique invalide.');
   busy=true;load.disabled=save.disabled=true;
   try{
    const {client}=await authorized();
    const [historical,current]=await Promise.all([
     client.from('phasmo_journal_preview_revisions')
      .select('revision,payload').eq('revision',rev).maybeSingle(),
     client.from(TABLE).select('revision').eq('stage','preview').maybeSingle()
    ]);
    if(historical.error||!historical.data)throw Error('Cette version n’est plus accessible dans l’historique.');
    if(current.error)throw Error('Impossible de vérifier la révision actuelle.');
    if(!confirm('Charger l’ancienne révision '+rev+' ? Elle remplacera les modifications locales non enregistrées. L’historique distant restera intact.'))return false;
    const media=window.PHASMO_JOURNAL_STORAGE_MEDIA;
    if(!media)throw Error('Stockage des médias indisponible.');
    update('Récupération de la révision '+rev+' et de ses médias privés…');
    const hydrated=await media.restoreForEditor(historical.data.payload,client,update);
    await bridge().importPayload(hydrated);
    loadedRevision=current.data?.revision??0;
    update('Révision '+rev+' chargée dans l’atelier. Pour la conserver comme nouveau brouillon, clique sur « Enregistrer le brouillon ».');
    return true;
   }catch(error){update('Erreur : '+(error?.message||'Chargement historique impossible'));throw error;}
   finally{busy=false;load.disabled=save.disabled=false;}
  },
  invalidateLocalRevision:()=>{loadedRevision=null;}
 });
 update('Mode local actif. Le brouillon partagé envoie images et polices vers Storage privé. Charge sa dernière révision avant d’enregistrer.');
})();
