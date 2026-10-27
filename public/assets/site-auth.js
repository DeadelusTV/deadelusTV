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
  if (!root || !toggle || !menu || !signin || !signout || !status || !note || !newsLink || !journalLink) return;

  // Clé publiable uniquement. Le même projet Auth est déjà utilisé par les News.
  const PROJECT_URL = 'https://eodtxlhnfzyapkyvvxdi.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_HwLsESqtQglS7FoSTxBX-Q_GzxyLX_Z';
  const RETURN_KEY = 'deadelustv.site.oauth-return.v1';
  let client = null, sdkPromise = null, clientPromise = null, requestNumber = 0;
  let lastIdentity = null;

  function showNote(message) {
    note.textContent = message || '';
    note.hidden = !message;
  }
  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  function setAnonymous() {
    status.textContent = 'Non connecté';
    signin.hidden = false;
    signout.hidden = true;
    newsLink.hidden = true;
    journalLink.hidden = true;
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
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      });
      // Le callback est synchrone ; éviter les appels asynchrones Supabase dedans.
      auth.auth.onAuthStateChange((event) => {
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
    // Table dédiée à créer via migration validée ; en son absence, aucun droit accordé.
    const {data,error} = await auth.from('phasmo_journal_admins')
      .select('enabled').eq('user_id',userId).maybeSingle();
    if (error) return false;
    return data?.enabled === true;
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
      toggle.title = 'Compte · connecté';
      newsLink.hidden = true;
      journalLink.hidden = true;
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
        journalLink.hidden = true;
      }
    } catch {
      if (currentRequest !== requestNumber) return;
      setAnonymous();
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
        options: { redirectTo: window.location.origin + window.location.pathname }
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
    showNote('');
    try {
      const auth = await getClient();
      const { error } = await auth.auth.signOut();
      if (error) throw error;
      setAnonymous();
      notifyAuth(null);
      setOpen(false);
    } catch {
      showNote('Déconnexion impossible. Réessaie.');
    } finally {
      signout.disabled = false;
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
  // Ne charge pas le fournisseur chez un visiteur anonyme tant qu'il n'ouvre pas
  // le compte/News, sauf au retour d'une redirection OAuth.
  if (returning || new URLSearchParams(window.location.search).has('code')) refresh();
  window.DEADELUSTV_AUTH = Object.freeze({ getClient, refresh, canManageNews, canManageJournal });
})();
