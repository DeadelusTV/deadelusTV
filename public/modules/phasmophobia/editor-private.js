(() => {
  'use strict';
  /*
   * Accès rédaction Phasmo : Supabase Auth Twitch + ACL serveur.
   * La page HTML est publique par nature. Seuls les droits RLS protègent
   * les véritables brouillons et leurs modifications.
   * Ne jamais stocker des clés privées ou des jetons Twitch ici.
   */
  const SUPABASE_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  const $ = selector => document.querySelector(selector);
  const gate=$('#editor-private-gate'), content=$('#editor-private-content');
  const account=$('#editor-private-account'), name=$('#editor-private-name');
  const login=$('#editor-private-login'), retry=$('#editor-private-retry'), logout=$('#editor-private-logout');
  const message=$('#editor-private-message');
  let client=null, booted=false, requestId=0;

  function update(messageText, options = {}) {
    message.textContent = messageText;
    login.hidden=!options.login;
    retry.hidden=!options.retry;
    account.hidden=!options.account;
    gate.hidden=!!options.account;
    content.hidden=!options.account;
  }
  function friendlyError(error){
    // Pas de réponse contenant des données privées ou des jetons.
    const code=String(error?.code||'');
    if(code==='42P01'||code==='PGRST205'||code==='PGRST116'||code==='42501')
      return 'L’accès au blog n’est pas encore configuré sur Supabase. Les règles doivent être installées.';
    return 'Impossible de vérifier les droits ou de charger les brouillons. Réessayez plus tard.';
  }
  function enqueueBackend(rows){
    let pending=Promise.resolve();
    function enqueue(callback) {
      const result=pending.then(callback);
      pending=result.catch(()=>{});
      return result;
    }
    return {
      initial:{
        drafts:rows.filter(item=>item?.payload&&typeof item.payload==='object').map(item=>item.payload),
        selectedId:rows[0]?.payload?.id||null
      },
      save(draft){
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.id))
          return Promise.reject(new Error('Identifiant du brouillon invalide (HTTPS nécessaire).'));
        return enqueue(async()=>{
          const {error}=await client.from('phasmo_news_drafts').upsert({
            id:draft.id,payload:draft,updated_at:new Date().toISOString()
          },{onConflict:'id'});
          if(error)throw error;
        });
      },
      remove(id){
        return enqueue(async()=>{
          const {error}=await client.from('phasmo_news_drafts').delete().eq('id',id);
          if(error)throw error;
        });
      }
    };
  }
  function loadEditor(){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='editor-native.js';
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Fichier de rédaction indisponible.'));
      document.body.append(script);
    });
  }
  async function verify(){
    const seq=++requestId;
    if(booted)return;
    update('Vérification du compte Twitch…');
    try{
      const {data,error:authError}=await client.auth.getUser();
      if(seq!==requestId)return;
      if(authError||!data?.user){
        update('Connectez-vous avec Twitch pour accéder au bureau de rédaction.',{login:true});
        return;
      }
      const user=data.user;
      const {data:role,error:roleError}=await client.from('phasmo_news_editors')
        .select('enabled').eq('user_id',user.id).maybeSingle();
      if(seq!==requestId)return;
      if(roleError)throw roleError;
      let isNewsAdmin=false;
      if(role?.enabled!==true){
        // Le compte d'administration de secours n'est pas un deuxième
        // rédacteur et ne dépend pas du statut de modérateur Twitch/TCG.
        const {data:adminRole,error:adminError}=await client.from('phasmo_news_admins')
          .select('enabled').eq('user_id',user.id).maybeSingle();
        if(seq!==requestId)return;
        if(adminError)throw adminError;
        isNewsAdmin=adminRole?.enabled===true;
        if(!isNewsAdmin){
          update('Ce compte Twitch n’est pas autorisé à gérer les actualités Phasmophobia.');
          account.hidden=false;
          content.hidden=true;
          gate.hidden=false;
          name.textContent='Compte connecté, sans permission rédaction';
          return;
        }
      }
      update('Chargement des brouillons privés…');
      const {data:rows,error:listError}=await client.from('phasmo_news_drafts')
        .select('id,payload,updated_at').order('updated_at',{ascending:false}).limit(40);
      if(seq!==requestId)return;
      if(listError)throw listError;
      window.PhasmoDraftBackend=enqueueBackend(rows||[]);
      name.textContent=(isNewsAdmin?'Administration du blog · ':'Rédaction du blog · ')+(String(user.user_metadata?.preferred_username||
        user.user_metadata?.user_name||user.user_metadata?.name||'connecté').slice(0,60));
      await loadEditor();
      if(seq!==requestId)return;
      if($('#wys-editor')?.getAttribute('contenteditable')!=='true')
        throw new Error('L’éditeur ne s’est pas initialisé.');
      booted=true;
      update('',{account:true});
    }catch(error){
      if(seq!==requestId)return;
      console.error('Accès rédaction Phasmo :',error?.code||'vérification impossible');
      update(friendlyError(error),{retry:true});
    }
  }
  async function signIn(){
    if(!client)return;
    login.disabled=true;
    try{
      const {error}=await client.auth.signInWithOAuth({
        provider:'twitch',
        options:{redirectTo:window.location.origin+window.location.pathname}
      });
      if(error)throw error;
    }catch(error){
      console.error('Connexion Twitch rédaction :',error?.code||'erreur');
      update('La connexion Twitch a échoué. Vérifiez les URL de redirection autorisées.',{login:true});
    }finally{login.disabled=false;}
  }
  login.addEventListener('click',signIn);
  retry.addEventListener('click',()=>{if(client)verify();});
  logout.addEventListener('click',async()=>{
    if(!client)return;
    logout.disabled=true;
    try{await client.auth.signOut();}finally{window.location.reload();}
  });
  if(!window.supabase?.createClient){
    update('Bibliothèque Supabase indisponible. Rechargez la page.',{retry:true});
    return;
  }
  try{
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
    });
    // Quand les droits sont retirés, une nouvelle écriture est refusée par la
    // RLS. La page est également bloquée après déconnexion.
    client.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_OUT'){
        requestId++;
        gate.hidden=false;account.hidden=true;content.hidden=true;
        update('Session terminée. Reconnectez-vous avec Twitch.',{login:true});
      }
    });
    verify();
  }catch(error){
    console.error('Initialisation accès Phasmo :',error?.code||'erreur');
    update('Connexion au service de comptes indisponible.',{retry:true});
  }
})();