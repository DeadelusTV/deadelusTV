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
  const IMAGE_BUCKET='phasmo-news-draft-images';
  const MAX_IMAGE_SIZE=10*1024*1024;
  const IMAGE_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  const imageCache=new Map();
  let verifiedUserId=null;
  const imagePath=ref=>{
    if(typeof ref!=='string'||!/^phasmo-media:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/.test(ref))return null;
    return ref.slice('phasmo-media:'.length);
  };

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
    const existing=new Set(rows.map(row=>row.id).filter(Boolean));
    let pending=Promise.resolve();
    function enqueue(callback) {
      const result=pending.then(callback);
      pending=result.catch(()=>{});
      return result;
    }
    return {
      validImageRef:ref=>!!imagePath(ref),
      async uploadImage(file){
        if(!verifiedUserId||!IMAGE_TYPES[file?.type]||!file.size||file.size>MAX_IMAGE_SIZE)
          throw new Error('Image refusée : PNG, JPEG, WebP animé ou GIF, 10 Mo maximum.');
        const path=verifiedUserId+'/'+crypto.randomUUID()+'.'+IMAGE_TYPES[file.type];
        const {error}=await client.storage.from(IMAGE_BUCKET).upload(path,file,{
          contentType:file.type,upsert:false,cacheControl:'3600'
        });
        if(error)throw new Error('Envoi de l’image refusé par Supabase ('+(error.statusCode||error.message||'erreur')+').');
        const ref='phasmo-media:'+path;
        // Affichage local après l'envoi, puis rechargement possible depuis
        // le bucket privé lors du prochain F5.
        imageCache.set(ref,Promise.resolve(URL.createObjectURL(file)));
        return ref;
      },
      imageUrl(ref){
        const path=imagePath(ref);
        if(!path)return Promise.reject(new Error('Référence image invalide.'));
        if(!imageCache.has(ref)){
          const job=(async()=>{
            const {data,error}=await client.storage.from(IMAGE_BUCKET).download(path);
            if(error||!data)throw new Error('Lecture de l’image privée impossible.');
            return URL.createObjectURL(data);
          })();
          imageCache.set(ref,job);
          job.catch(()=>imageCache.delete(ref));
        }
        return imageCache.get(ref);
      },
      initial:{
        drafts:rows.filter(item=>item?.payload&&typeof item.payload==='object').map(item=>item.payload),
        selectedId:rows[0]?.payload?.id||null
      },
      save(draft){
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.id))
          return Promise.reject(new Error('Identifiant du brouillon invalide (HTTPS nécessaire).'));
        return enqueue(async()=>{
          const updated_at=new Date().toISOString();
          if(existing.has(draft.id)){
            // Ne pas modifier id ni owner_id : seuls les champs éditoriaux
            // sont modifiables par le client (privilèges SQL par colonne).
            const {data,error}=await client.from('phasmo_news_drafts')
              .update({payload:draft,updated_at}).eq('id',draft.id)
              .select('id').maybeSingle();
            if(error)throw error;
            if(!data)throw new Error('Le brouillon est devenu inaccessible ou son accès a été révoqué.');
          }else{
            const {error}=await client.from('phasmo_news_drafts')
              .insert({id:draft.id,payload:draft,updated_at});
            if(error)throw error;
            existing.add(draft.id);
          }
        });
      },
      remove(id){
        return enqueue(async()=>{
          const {error}=await client.from('phasmo_news_drafts').delete().eq('id',id);
          if(error)throw error;
          existing.delete(id);
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
      verifiedUserId=user.id;
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
      if(!window.PhasmoNewsPublication)throw new Error('Module de publication indisponible.');
      const pub=window.PhasmoNewsPublication(client,user.id);
      const published=await pub.list();
      if(seq!==requestId)return;
      window.PhasmoDraftBackend=Object.assign(enqueueBackend(rows||[]),{
        viewerId:user.id,
        canEditAll:isNewsAdmin,
        published,
        listPublished:()=>pub.list(),
        publish:draft=>pub.publish(draft),
        unpublish:id=>pub.unpublish(id)
      });
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
        verifiedUserId=null;
        imageCache.clear();
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