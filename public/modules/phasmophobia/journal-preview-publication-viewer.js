'use strict';
/* Livre Phasmo V7 - lecture d'une publication de test, jamais du brouillon local.
 * Uniquement pour ?viewer=1&publication=preview sur l'origine DEV.
 * Enregistrement local interdit par l'atelier pendant cette consultation.
 */
(() => {
 const params=new URLSearchParams(location.search);
 if(params.get('viewer')!=='1'||params.get('publication')!=='preview')return;
 const element=document.getElementById('journal-publication-view-status');
 const base='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const key='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 const show=message=>{if(element)element.textContent=message;};
 async function connect(){
  if(!window.supabase?.createClient){
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
    script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Bibliothèque de connexion indisponible.'));
    script.onerror=()=>reject(Error('Connexion Supabase indisponible.'));
    document.head.append(script);
   });
  }
  return window.supabase.createClient(base,key,{auth:{
   flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
  }});
 }
 (async () => {
  try {
   show('Vérification de la connexion administrateur…');
   const client=await connect();
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user)throw Error('Connecte-toi avec Twitch sur deadelustv.pages.dev, puis recharge cet aperçu.');
   const {data:role,error:accessError}=await client.from('phasmo_journal_admins')
    .select('enabled').eq('user_id',data.user.id).maybeSingle();
   if(accessError||role?.enabled!==true)throw Error('Cet aperçu est réservé aux administrateurs du carnet.');
   show('Chargement de la dernière publication privée…');
   const {data:published,error:readError}=await client.from('phasmo_journal_preview_publications')
    .select('payload,release_number,source_revision,published_at').eq('stage','preview').maybeSingle();
   if(readError)throw Error('Lecture de la publication refusée : '+readError.message);
   if(!published)throw Error('Aucune publication de test pour le moment. Publie une révision depuis l’éditeur.');
   if(published.payload?.version!==7)throw Error('Publication incompatible avec le carnet V7.');
   const bridge=window.PHASMO_JOURNAL_REMOTE_BRIDGE;
   if(!bridge?.importPayload)throw Error('Le moteur du carnet n’est pas disponible.');
   await bridge.importPayload(published.payload);
   document.documentElement.classList.add('journal-publication-ready');
   document.title='Publication de test #'+published.release_number+' · Livre Phasmophobia';
  }catch(error){
   show('Aperçu privé indisponible : '+(error?.message||'erreur inconnue'));
  }
 })();
})();