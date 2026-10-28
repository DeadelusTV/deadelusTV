'use strict';
/* Lecture VISITEUR du carnet officiellement publie : aucun brouillon,
 * aucune publication preview, aucun stockage local ou session Twitch requis.
 * Tant qu'aucune version n'est active, la visionneuse reste fermee.
 */
(() => {
 const params=new URLSearchParams(location.search);
 if(params.get('viewer')!=='1'||params.get('publication')!=='public')return;
 const status=document.getElementById('journal-publication-view-status');
 const show=message=>{if(status)status.textContent=message;};
 const project='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const key='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 (async()=>{
  try{
   show('Recherche de la dernière version officielle du carnet…');
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque Supabase indisponible.'));
     script.onerror=()=>reject(Error('Connexion à la bibliothèque indisponible.'));
     document.head.append(script);
    });
   }
   // Client sans session persistante, même lorsque le lecteur est connecté à Twitch ailleurs.
   const client=window.supabase.createClient(project,key,{auth:{
    persistSession:false,autoRefreshToken:false,detectSessionInUrl:false
   }});
   const {data,error}=await client.from('phasmo_journal_production_publications')
    .select('payload,release_number,published_at')
    .eq('stage','production').eq('visibility','live').maybeSingle();
   if(error)throw Error('Impossible de vérifier le carnet publié : '+error.message);
   if(!data){
    show('Le carnet des enquêteurs est en préparation. Aucune version publique n’a encore été publiée.');
    return;
   }
   const media=window.PHASMO_JOURNAL_PUBLIC_MEDIA;
   const bridge=window.PHASMO_JOURNAL_REMOTE_BRIDGE;
   if(!media?.restore||!bridge?.importPayload)throw Error('La visionneuse du carnet est indisponible.');
   show('Chargement de la version publique et de ses illustrations…');
   const payload=await media.restore(data.payload,client,show);
   await bridge.importPayload(payload);
   document.documentElement.classList.add('journal-publication-ready');
   document.title='Carnet des enquêteurs · Publication '+data.release_number;
   // Le parent n'est averti qu'une fois le contenu officiel réellement chargé.
   try{window.parent.postMessage({type:'deadelustv:journal-ready'},window.location.origin);}catch{}
  }catch(err){
   show('Le carnet public est momentanément indisponible : '+(err?.message||'erreur inconnue'));
  }
 })();
})();