(() => {
  'use strict';
  /*
   * Raccordement du bouton « Gérer les actualités » au compte Auth partagé
   * DeadelusTV/TCG. Aucune permission n'est déduite d'un pseudo Twitch.
   * Ce module ne charge le SDK qu'à l'ouverture de la rubrique News.
   * La sécurité effective des brouillons est gérée dans les politiques RLS.
   */
  const root = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
  const panel = document.getElementById('phasma-news-editor-access');
  const manage = document.getElementById('phasma-news-editor-link');
  const login = document.getElementById('phasma-news-editor-login');
  const logout = document.getElementById('phasma-news-editor-logout');
  const note = document.getElementById('phasma-news-editor-note');
  if (!root || !panel || !manage || !login || !logout || !note) return;

  const PROJECT_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  const RETURN_MARK = 'deadelustv.phasmo.news.oauth-return';
  let client = null;
  let sdkPromise = null;
  let requestId = 0;

  function show({signin=false,editor=false,signout=false,message=''} = {}) {
    panel.hidden = !(signin || editor || signout || message);
    login.hidden = !signin;
    manage.hidden = !editor;
    logout.hidden = !signout;
    note.textContent = message;
    note.hidden = !message;
  }
  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
      script.defer = true;
      script.onload = () => window.supabase?.createClient ? resolve() : reject(new Error('SDK absent'));
      script.onerror = () => reject(new Error('SDK indisponible'));
      document.head.append(script);
    }).catch(error => { sdkPromise = null; throw error; });
    return sdkPromise;
  }
  async function getClient() {
    if (client) return client;
    await loadSdk();
    if (!client) {
      client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
        auth: {
          flowType:'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      });
      client.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') {
          ++requestId;
          show({signin:true});
        }
      });
    }
    return client;
  }
  async function refresh() {
    if (!root.open) return;
    const request = ++requestId;
    show({message:'Vérification de la connexion Twitch…'});
    try {
      const auth = await getClient();
      const {data, error} = await auth.auth.getUser();
      if (request !== requestId || !root.open) return;
      if (error || !data?.user) {
        show({signin:true});
        return;
      }
      // Ce filtre sert uniquement à l'affichage. Les tables News ont leurs
      // propres RLS et refusent toute action si la permission n'existe pas.
      const {data:permission, error:aclError} = await auth.from('phasmo_news_editors')
        .select('enabled').eq('user_id',data.user.id).maybeSingle();
      if (request !== requestId || !root.open) return;
      if (aclError) {
        show({signout:true,message:'Vérification de l’accès rédaction indisponible.'});
        return;
      }
      let canManageNews=permission?.enabled===true;
      if(!canManageNews){
        // Droit d'administration du blog indépendant de tout rôle TCG.
        const {data:adminPermission,error:adminError}=await auth.from('phasmo_news_admins')
          .select('enabled').eq('user_id',data.user.id).maybeSingle();
        if(request !== requestId || !root.open)return;
        if(adminError){
          show({signout:true,message:'Vérification du rôle administrateur News indisponible.'});
          return;
        }
        canManageNews=adminPermission?.enabled===true;
      }
      show({
        editor:canManageNews,
        signout:true,
        message:canManageNews ? '' : 'Connexion Twitch active · rédaction réservée aux comptes autorisés.'
      });
    } catch {
      if (request === requestId && root.open)
        show({signin:!client,message:'Connexion temporairement indisponible.'});
    }
  }
  login.addEventListener('click',async () => {
    login.disabled=true;
    try {
      const auth = await getClient();
      // Le retour sur le portail est autorisé dans Supabase Auth après
      // ajout explicite de son URL, sans toucher au callback du TCG.
      try { sessionStorage.setItem(RETURN_MARK,'1'); }
      catch { /* Le navigateur peut interdire le stockage session. */ }
      const {error} = await auth.auth.signInWithOAuth({
        provider:'twitch',
        options:{redirectTo:window.location.origin + window.location.pathname}
      });
      if (error) throw error;
    } catch {
      sessionStorage.removeItem(RETURN_MARK);
      show({signin:true,message:'Connexion Twitch impossible. Vérifiez la redirection OAuth.'});
    } finally {
      login.disabled=false;
    }
  });
  logout.addEventListener('click',async () => {
    logout.disabled=true;
    try {
      const auth = await getClient();
      await auth.auth.signOut();
      show({signin:true});
    } catch {
      show({signout:true,message:'Déconnexion impossible. Réessayez.'});
    } finally {
      logout.disabled=false;
    }
  });

  root.addEventListener('toggle',() => { if(root.open) refresh(); });
  // Retour OAuth : rouvrir exactement la page Phasmo et la rubrique News.
  // Le marqueur de session ne contient aucun identifiant ni jeton.
  try {
    if (sessionStorage.getItem(RETURN_MARK)==='1') {
      sessionStorage.removeItem(RETURN_MARK);
      if(!window.location.hash.startsWith('#phasmophobia'))
        window.location.hash = '#phasmophobia';
      root.open=true;
      refresh();
    }
  } catch { /* Le stockage peut être bloqué en navigation privée. */ }
  if(root.open) refresh();
})();