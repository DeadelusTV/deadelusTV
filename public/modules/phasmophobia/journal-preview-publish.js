'use strict';
/* Publication de test privee du carnet Phasmo. Aucune publication publique. */
(() => {
 const params=new URLSearchParams(location.search);
 if(params.get('viewer')==='1')return;
 const button=document.getElementById('journal-publish-preview');
 const output=document.getElementById('journal-publish-status');
 if(!button||!output)return;
 const project='https://eodtxlhnfzyapkyvvxdi.supabase.co';
 const key='sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
 const show=message=>{output.textContent=message;};
 let clientPromise;
 function getClient(){
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
   return window.supabase.createClient(project,key,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
   }});
  })().catch(error=>{clientPromise=null;throw error;});
  return clientPromise;
 }
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   show('Vérification des droits de publication…');
   const client=await getClient();
   const {data:identity,error:identityError}=await client.auth.getUser();
   if(identityError||!identity?.user)
    throw Error('Connecte-toi sur le site DEV avec Twitch avant de publier.');
   const {data:role,error:roleError}=await client.from('phasmo_journal_admins')
    .select('enabled').eq('user_id',identity.user.id).maybeSingle();
   if(roleError||role?.enabled!==true)
    throw Error('Seul un administrateur du carnet peut publier une version de test.');
   const {data:draft,error:draftError}=await client.from('phasmo_journal_preview_drafts')
    .select('revision').eq('stage','preview').maybeSingle();
   if(draftError)throw Error('Impossible de lire la révision enregistrée : '+draftError.message);
   if(!draft)throw Error('Aucun brouillon Supabase à publier. Enregistre-le d’abord.');
   const version=draft.revision;
   show('Dernier brouillon Supabase : révision '+version+'. Publication en attente de confirmation.');
   if(!confirm('Créer une publication de TEST PRIVÉE de la révision '+version+' ? Seul le brouillon déjà enregistré sur Supabase sera copié, pas les modifications locales non sauvegardées. Aucun visiteur public n’y aura accès.'))return;
   // Le trigger SQL verifie a nouveau la revision et copie le payload depuis la base.
   const {data:published,error:publishError}=await client.from('phasmo_journal_preview_publications')
    .upsert({stage:'preview',source_revision:version},{onConflict:'stage'})
    .select('release_number,source_revision').single();
   if(publishError)throw Error('Publication refusée : '+publishError.message+'. Vérifie la dernière révision du brouillon.');
   if(!published)throw Error('La publication ne renvoie pas de résultat. Recharge et vérifie son état.');
   show('Version privée publiée pour test n°'+published.release_number+
    ' · brouillon source révision '+published.source_revision+
    '. Clique sur « Voir le livre publié en test » pour contrôler le rendu.');
  }catch(error){show('Erreur : '+(error?.message||'publication impossible'));}
  finally{button.disabled=false;}
 });
 show('Aucune publication automatique : publier ici copie uniquement le dernier brouillon Supabase enregistré.');
})();