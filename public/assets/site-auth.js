/* Auth Twitch commune au portail DeadelusTV.
 * Identité Supabase existante (TCG/News) ; permissions vérifiées côté serveur.
 * Ne pas utiliser les métadonnées Twitch pour attribuer des droits.
 */
(() => {
  'use strict';
  const root = document.getElementById('site-account');
  const toggle = document.getElementById('site-account-toggle');
  const menu = document.getElementById('site-account-menu');
  const signin = document.getElementById('site-account-signin');
  const signout = document.getElementById('site-account-signout');
  const status = document.getElementById('site-account-status');
  const note = document.getElementById('site-account-note');
  const newsLink = document.getElementById('site-account-news-link');
  const journalLink = document.getElementById('site-account-journal-link');
  const crewLink = document.getElementById('site-account-crew-link');
  if (!root || !toggle || !menu || !signin || !signout || !status || !note || !newsLink || !journalLink || !crewLink) return;

  // Clé publiable uniquement. Le même projet Auth est déjà utilisé par les News.
  const PROJECT_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  const RETURN_KEY = 'deadelustv.site.oauth-return.v1';
  let client = null, sdkPromise = null, clientPromise = null, requestNumber = 0;
  let lastIdentity = null;
  let providerToken = null, providerUser = null, crewCache = null;
  let authGeneration = 0, signingOut = false;
  function captureSession(event, session) {
    if (event === 'SIGNED_OUT' || (providerUser || lastIdentity) && (providerUser || lastIdentity) !== session?.user?.id) {
      providerToken = null; crewCache = null; ++authGeneration; ++requestNumber;
      notifyAuth(null);
    }
    providerUser = session?.user?.id || null;
    if (session?.provider_token) providerToken = session.provider_token;
  }
  async function getCrewAccess({action='status', legacyToken=null, force=false}={}) {
    if(signingOut && action!=='revoke')return {role:null};
    const generation = authGeneration;
    const auth = await getClient();
    const {data,error} = await auth.auth.getSession();
    if(error)throw error;
    const session=data?.session;
    if(!session)return {role:null};
    captureSession('READ', session);
    if(action==='session' && !force && crewCache?.userId===session.user.id &&
       Date.parse(crewCache.expires_at)>Date.now()+60000)return crewCache;
    const response = await fetch('https://qonkgfbxmtmmwdjzyxuf.supabase.co/functions/v1/crew-twitch-access', {
      method:'POST', cache:'no-store', signal:AbortSignal.timeout(30000),
      headers:{Authorization:'Bearer '+session.access_token, 'Content-Type':'application/json',
        apikey:'sb_publishable_mwxOhhD8qUEU66MR5lziYw_441p5KRR'},
      body:JSON.stringify({action,provider_token:providerToken, ...(legacyToken?{legacy_token:legacyToken}:{})})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error || 'crew_unavailable');
    const current=await auth.auth.getSession();
    if(generation!==authGeneration || current.data?.session?.user?.id!==session.user.id)
      throw new Error('session_changed');
    if(action==='session'||action==='link')crewCache={...result,userId:session.user.id};
    if(action==='revoke')crewCache=null;
    return result;
  }

  function showNote(message) {
    note.textContent = message || '';
    note.hidden = !message;
  }
  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  function paintAccountAvatar(button, profile, name, className) {
    const fallback = document.createElement('span');
    fallback.className = className + '-fallback';
    fallback.textContent = Array.from(name)[0]?.toLocaleUpperCase('fr-FR') || '?';
    fallback.setAttribute('aria-hidden', 'true');
    button.replaceChildren(fallback);
    const meta = profile?.user_metadata || {};
    const source = [meta.avatar_url, meta.picture, meta.profile_image_url].find(value => {
      try { return typeof value === 'string' && new URL(value).protocol === 'https:'; } catch { return false; }
    });
    if (source) {
      const image = document.createElement('img');
      image.className = className;
      image.alt = '';
      image.width = 38; image.height = 38;
      image.referrerPolicy = 'no-referrer';
      image.hidden = true;
      image.addEventListener('load', () => { image.hidden = false; fallback.hidden = true; });
      image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
      image.src = source;
      button.append(image);
    }
    button.title = 'Mon compte · ' + name;
    button.setAttribute('aria-label', 'Ouvrir le menu de mon compte · ' + name);
  }

  const anonymousToggle = Array.from(toggle.childNodes).map(node => node.cloneNode(true));
  function resetAccountAvatar() {
    toggle.replaceChildren(...anonymousToggle.map(node => node.cloneNode(true)));
    toggle.classList.remove('has-account-avatar');
    toggle.setAttribute('aria-label', 'Mon compte');
  }
  function setAnonymous() {
    resetAccountAvatar();
    status.textContent = 'Non connecté';
    signin.hidden = false;
    signout.hidden = true;
    newsLink.hidden = true;
    journalLink.hidden = true;
    crewLink.hidden = true;
    toggle.title = 'Compte · non connecté';
  }
  function notifyAuth(userId) {
    if (lastIdentity === userId) return;
    lastIdentity = userId;
    window.dispatchEvent(new CustomEvent('deadelustv:auth-change', {
      detail: { authenticated: Boolean(userId) }
    }));
  }
  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1';
      script.defer = true;
      script.onload = () => window.supabase?.createClient ? resolve() : reject(new Error('Bibliothèque absente'));
      script.onerror = () => reject(new Error('Bibliothèque indisponible'));
      document.head.append(script);
    }).catch(error => {
      sdkPromise = null;
      throw error;
    });
    return sdkPromise;
  }
  async function getClient() {
    if (client) return client;
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      await loadSdk();
      const auth = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
        auth: {
          flowType: 'pkce',
          // Le code OAuth de Crew appartient à son projet Supabase distinct.
          detectSessionInUrl: new URLSearchParams(window.location.search).get('crew_auth') !== '1',
          persistSession: true,
          autoRefreshToken: true
        }
      });
      // Le callback est synchrone ; éviter les appels asynchrones Supabase dedans.
      auth.auth.onAuthStateChange((event, session) => {
        captureSession(event, session);
        if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          setTimeout(() => refresh(), 0);
        }
      });
      client = auth;
      return auth;
    })().catch(error => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  }
  async function canManageNews(auth, userId) {
    // Affichage uniquement ; la protection réelle repose sur les RLS des News.
    const editors = await auth.from('phasmo_news_editors')
      .select('enabled').eq('user_id', userId).maybeSingle();
    if (editors.error) throw editors.error;
    if (editors.data?.enabled === true) return true;
    const admins = await auth.from('phasmo_news_admins')
      .select('enabled').eq('user_id', userId).maybeSingle();
    if (admins.error) throw admins.error;
    return admins.data?.enabled === true;
  }
  async function canManageJournal(auth, userId) {
    // Droits du carnet attribués individuellement, indépendants de Twitch/Crew/News.
    // Les RLS et le serveur gardent la publication réservée aux admins du carnet.
    const [admins, editors] = await Promise.all([
      auth.from('phasmo_journal_admins').select('enabled').eq('user_id',userId).maybeSingle(),
      auth.from('phasmo_journal_editors').select('enabled').eq('user_id',userId).maybeSingle()
    ]);
    if (admins.error || editors.error) return false;
    return admins.data?.enabled === true || editors.data?.enabled === true;
  }
  async function refresh() {
    const currentRequest = ++requestNumber;
    status.textContent = 'Vérification de la connexion…';
    showNote('');
    try {
      const auth = await getClient();
      const { data, error } = await auth.auth.getUser();
      if (currentRequest !== requestNumber) return;
      if (error || !data?.user) {
        setAnonymous();
        notifyAuth(null);
        return;
      }
      const user = data.user;
      const username = String(user.user_metadata?.preferred_username ||
        user.user_metadata?.user_name || user.user_metadata?.name || '').slice(0, 60);
      status.textContent = username ? 'Connecté · ' + username : 'Compte Twitch connecté';
      signin.hidden = true;
      signout.hidden = false;
      paintAccountAvatar(toggle, user, username || 'Mon compte', 'site-account-avatar');
      toggle.classList.add('has-account-avatar');
      newsLink.hidden = true;
      journalLink.hidden = true;
      crewLink.hidden = true;
      notifyAuth(user.id);
      try {
        const allowed = await canManageNews(auth, user.id);
        if (currentRequest !== requestNumber) return;
        newsLink.hidden = !allowed;
      } catch {
        if (currentRequest === requestNumber) showNote('Vérification des droits News indisponible.');
      }
      // Permission du carnet indépendante du rôle de rédaction News.
      try {
        const journalAllowed = await canManageJournal(auth, user.id);
        if (currentRequest === requestNumber) journalLink.hidden = !journalAllowed;
      } catch {
        if(currentRequest === requestNumber)journalLink.hidden = true;
      }
      try {
        const crew = await getCrewAccess();
        if(currentRequest !== requestNumber)return;
        crewLink.hidden = !['admin','helper'].includes(crew.role);
        crewLink.href = crew.role === 'admin' ? '#crewmongus/admin' : '#crewmongus/entry';
        crewLink.textContent = crew.role === 'admin' ? 'Gestion Crew’mong Us' : 'Saisie Crew’mong Us';
        if(crew.notice === 'twitch_reconnect_required' && !crew.role)
          showNote('Reconnecte Twitch pour vérifier ton accès Crew.');
      } catch {
        if(currentRequest === requestNumber)showNote('Vérification des droits Crew indisponible.');
      }

    } catch {
      if (currentRequest !== requestNumber) return;
      setAnonymous();
      notifyAuth(null);
      showNote('Connexion indisponible pour le moment.');
    }
  }
  async function signIn() {
    signin.disabled = true;
    showNote('');
    try {
      const auth = await getClient();
      try {
        const news = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
        sessionStorage.setItem(RETURN_KEY, JSON.stringify({
          hash: window.location.hash || '#accueil',
          reopenNews: Boolean(news?.open)
        }));
      } catch { /* Stockage de session facultatif. */ }
      const { error } = await auth.auth.signInWithOAuth({
        provider: 'twitch',
        options: { redirectTo: window.location.origin + window.location.pathname,
          scopes: 'user:read:email user:read:moderated_channels' }
      });
      if (error) throw error;
    } catch {
      try { sessionStorage.removeItem(RETURN_KEY); } catch {}
      showNote('Connexion Twitch impossible. Vérifie les redirections OAuth.');
    } finally {
      signin.disabled = false;
    }
  }
  async function signOut() {
    signout.disabled = true;
    signingOut=true;++authGeneration;++requestNumber;crewCache=null;
    setAnonymous();notifyAuth(null);
    showNote('');
    try {
      const auth = await getClient();
      try { await getCrewAccess({action:'revoke'}); } catch { /* Bail Crew borné à 5 minutes. */ }
      const { error } = await auth.auth.signOut();
      providerToken=null;providerUser=null;crewCache=null;++authGeneration;
      if (error) throw error;
      setAnonymous();
      notifyAuth(null);
      setOpen(false);
    } catch {
      signingOut=false;await refresh();
      showNote('Déconnexion impossible. Réessaie.');
    } finally {
      signingOut=false;signout.disabled = false;
    }
  }

  // Restaurer le parcours sur le portail après le retour OAuth, sans stocker de jeton.
  let returning = false;
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    if (saved) {
      returning = true;
      sessionStorage.removeItem(RETURN_KEY);
      const details = JSON.parse(saved);
      if (typeof details.hash === 'string' && /^#[a-z0-9/_-]{1,160}$/i.test(details.hash)) {
        window.location.hash = details.hash;
      }
      if (details.reopenNews === true) {
        const news = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
        if (news) news.open = true;
      }
    }
  } catch { /* Navigateur ou stockage indisponible. */ }

  toggle.addEventListener('click', () => {
    const next = menu.hidden;
    setOpen(next);
    if (next) refresh();
  });
  crewLink.addEventListener('click', () => setOpen(false));
  signin.addEventListener('click', signIn);
  signout.addEventListener('click', signOut);
  document.addEventListener('click', event => {
    if (!root.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  setAnonymous();
  setOpen(false);
  // Une session locale existante est revérifiée dès l'arrivée sur le site.
  // Le visiteur anonyme conserve le chargement différé du fournisseur.
  const authQuery = new URLSearchParams(window.location.search);
  let savedSession = false;
  try { savedSession = Boolean(localStorage.getItem('sb-eodtxlhnfzyapkyvvxdi-auth-token')); } catch { /* Stockage indisponible. */ }
  if (authQuery.get('crew_auth') !== '1' && (returning || authQuery.has('code') || savedSession)) refresh();
  window.DEADELUSTV_AUTH = Object.freeze({ get userId() { return lastIdentity; }, getClient, refresh, signIn, signOut, getCrewAccess, canManageNews, canManageJournal });
})();


