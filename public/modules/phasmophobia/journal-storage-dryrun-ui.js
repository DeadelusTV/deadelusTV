'use strict';
/* Les copies du test Storage restent dans un bucket PRIVATE et sont supprimées.
 * Aucune action de mise en ligne officielle n'est exposée ici.
 */
(() => {
 if(new URLSearchParams(location.search).get('viewer')==='1')return;
 const status=document.getElementById('journal-staging-transfer-status');
 const run=document.getElementById('journal-staging-transfer-test');
 const fault=document.getElementById('journal-staging-transfer-fault');
 if(!status||!run||!fault)return;
 let clientPromise=null,working=false;
 const show=msg=>{status.textContent=msg;};
 async function getClient(){
  if(!clientPromise)clientPromise=(async()=>{
   if(window.DEADELUSTV_AUTH?.getClient)return window.DEADELUSTV_AUTH.getClient();
   if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
     script.onload=()=>window.supabase?.createClient?resolve():reject(Error('Connexion Supabase indisponible.'));
     script.onerror=()=>reject(Error('Bibliothèque Supabase indisponible.'));
     document.head.append(script);
    });
   }
   return window.supabase.createClient('https://eodtxlhnfzyapkyvvxdi.supabase.co',
    'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z',
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  })().catch(e=>{clientPromise=null;throw e;});
  return clientPromise;
 }
 async function invoke(mode){
  const api=await getClient();
  const identity=await api.auth.getUser();
  if(identity.error||!identity.data?.user)throw Error('Connecte-toi à Twitch avant de lancer ce test.');
  const session=await api.auth.getSession();
  if(session.error||!session.data?.session?.access_token)
   throw Error('Session Twitch indisponible. Reconnecte-toi et réessaie.');
  const {data,error}=await api.functions.invoke('phasmo-journal-storage-test',{
   body:{mode},headers:{Authorization:'Bearer '+session.data.session.access_token}
  });
  if(error){
   let msg=data?.error||error.message||'Test refusé.';
   const response=error.context;
   if(typeof response?.status==='number'){
    try{
     const json=await response.clone().json();
     if(typeof json?.error==='string')msg=json.error;
     if(typeof json?.note==='string')msg+=' '+json.note;
    }catch{}
    msg='HTTP '+response.status+' : '+msg;
   }
   throw Error(msg);
  }
  if(!data?.ok)throw Error(data?.error||'Réponse du test invalide.');
  return data;
 }
 async function execute(mode){
  if(working)return;
  if(!confirm(mode==='normal'
   ?'Tester la copie privée, la vérification SHA-256 et la suppression de chaque média préparé ? Aucun fichier ne sera public.'
   :'Simuler une interruption après le premier transfert privé, puis vérifier son nettoyage ? Aucun fichier ne sera public.'))return;
  working=true;run.disabled=fault.disabled=true;
  show(mode==='normal'?'Copie privée et vérification des médias en cours…':
   'Interruption contrôlée et nettoyage du test privé en cours…');
  try{
   const data=await invoke(mode);
   if(mode==='normal')show('Test privé réussi : publication de test n°'+data.release+
     ', révision '+data.revision+' · '+data.images+' image(s), '+data.fonts+
     ' police(s) · '+data.bytes+' octets vérifiés. Copies de test supprimées. Publication publique toujours verrouillée.');
   else if(data.simulated_failure&&data.cleaned)
    show('Test d’échec réussi : interruption volontaire après le premier transfert. Copie privée supprimée et aucun média rendu public.');
   else throw Error('Échec du test de nettoyage attendu.');
  }catch(error){show('Test non validé : '+(error?.message||'Erreur inconnue'));}
  finally{working=false;run.disabled=fault.disabled=false;}
 }
 run.addEventListener('click',()=>execute('normal'));
 fault.addEventListener('click',()=>execute('fault'));
})();

